package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/bikky-kc013/TableForge/internal/api"
	"github.com/bikky-kc013/TableForge/internal/auth"
	"github.com/bikky-kc013/TableForge/internal/config"
	"github.com/bikky-kc013/TableForge/internal/db"
)

func main() {
	var (
		configPath = flag.String("config", "config/config.yaml", "path to config.yaml")
		listen     = flag.String("listen", "", "override listen address")
	)
	flag.Parse()

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}
	if *listen != "" {
		cfg.Server.Listen = *listen
	}
	if v := os.Getenv("PGADMIN_LISTEN"); v != "" {
		cfg.Server.Listen = v
	}
	if v := os.Getenv("PGADMIN_SESSION_KEY"); v != "" {
		cfg.Server.SessionKey = v
	}

	if len(cfg.Servers) > 0 {
		if v := os.Getenv("PGHOST"); v != "" {
			cfg.Servers[0].Host = v
		}
		if v := os.Getenv("PGPORT"); v != "" {
			var p int
			if _, err := fmt.Sscanf(v, "%d", &p); err == nil {
				cfg.Servers[0].Port = p
			}
		}
		if v := os.Getenv("PGSSLMODE"); v != "" {
			cfg.Servers[0].SSLMode = v
		}
		if v := os.Getenv("PGDEFAULTDB"); v != "" {
			cfg.Servers[0].DefaultDB = v
		}
	}

	sessions, err := auth.NewStore(cfg.Server.SessionKey)
	if err != nil {
		log.Fatalf("session store: %v", err)
	}
	dbMgr := db.NewManager(cfg)
	defer dbMgr.CloseAll()

	apiServer, err := api.New(cfg, sessions, dbMgr)
	if err != nil {
		log.Fatalf("api init: %v", err)
	}

	httpServer := &http.Server{
		Addr:         cfg.Server.Listen,
		Handler:      apiServer.Handler(),
		ReadTimeout:  cfg.ReadTimeout(),
		WriteTimeout: cfg.WriteTimeout(),
	}

	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			sessions.Cleanup(24 * time.Hour)
		}
	}()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		fmt.Printf("pgadmin-go listening on %s (servers: %d)\n", cfg.Server.Listen, len(cfg.Servers))
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	<-ctx.Done()
	fmt.Println("shutting down...")
	shutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}
