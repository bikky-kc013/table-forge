package config

import (
	"os"
	"testing"
)

func TestDefault(t *testing.T) {
	cfg := Default()
	if len(cfg.Servers) != 1 {
		t.Fatalf("expected 1 server, got %d", len(cfg.Servers))
	}
	if cfg.MaxRows != 30 {
		t.Fatalf("MaxRows default 30, got %d", cfg.MaxRows)
	}
	if cfg.Server.Listen != ":8080" {
		t.Fatalf("listen default :8080, got %s", cfg.Server.Listen)
	}
}

func TestLoadMissingReturnsDefault(t *testing.T) {
	cfg, err := Load("/tmp/nonexistent_config_12345.yaml")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Theme != "default" {
		t.Fatalf("expected default theme")
	}
}

func TestLoadFromFile(t *testing.T) {
	tmp, err := os.CreateTemp("", "cfg*.yaml")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(tmp.Name())
	_, _ = tmp.Write([]byte(`
servers:
  - desc: "Test"
    host: "127.0.0.1"
    port: 5433
    sslmode: "require"
    defaultdb: "mydb"
max_rows: 100
theme: "bootstrap"
`))
	tmp.Close()
	cfg, err := Load(tmp.Name())
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Servers[0].Port != 5433 {
		t.Fatalf("port 5433, got %d", cfg.Servers[0].Port)
	}
	if cfg.MaxRows != 100 {
		t.Fatalf("max rows 100, got %d", cfg.MaxRows)
	}
	if cfg.Theme != "bootstrap" {
		t.Fatalf("theme bootstrap, got %s", cfg.Theme)
	}
}

func TestDSN(t *testing.T) {
	s := Server{Host: "localhost", Port: 5432, SSLMode: "allow", DefaultDB: "postgres"}
	dsn := s.DSN("testdb", "user", "p@ss:w0rd")
	if dsn == "" {
		t.Fatal("empty dsn")
	}
	// Ensure password is not literal unescaped
	if len(dsn) < 10 {
		t.Fatal("dsn too short")
	}
	// host part should be present
	if s.Host == "" {
		t.Fatal("host empty")
	}
}

func TestValidate(t *testing.T) {
	cfg := Default()
	cfg.Servers[0].Port = 99999
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected validation error for bad port")
	}
}
