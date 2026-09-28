package api

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/bikky-kc013/TableForge/internal/auth"
	"github.com/bikky-kc013/TableForge/internal/config"
	"github.com/bikky-kc013/TableForge/internal/db"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

var spaDir = spaDirFromEnv()

func spaDirFromEnv() string {
	if v := os.Getenv("SPA_DIR"); v != "" {
		return v
	}
	return "frontend/dist"
}

type Server struct {
	cfg      *config.Config
	sessions *auth.Store
	dbMgr    *db.Manager
	router   *chi.Mux
}

func New(cfg *config.Config, sessions *auth.Store, dbMgr *db.Manager) (*Server, error) {
	s := &Server{
		cfg:      cfg,
		sessions: sessions,
		dbMgr:    dbMgr,
	}
	s.router = s.buildRouter()
	return s, nil
}

func (s *Server) Handler() http.Handler { return s.router }

func (s *Server) spaHandler() http.Handler {
	fs := http.FileServer(http.Dir(spaDir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rel := strings.TrimPrefix(r.URL.Path, "/app/")
		if rel != "" {
			if info, err := os.Stat(filepath.Join(spaDir, rel)); err == nil && !info.IsDir() {
				if strings.HasPrefix(rel, "assets/") {
					w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
				} else {
					w.Header().Set("Cache-Control", "public, max-age=3600")
				}
				http.StripPrefix("/app/", fs).ServeHTTP(w, r)
				return
			}
		}
		if _, err := os.Stat(filepath.Join(spaDir, "index.html")); err != nil {
			s.writeAPIError(w, r, http.StatusNotFound, "Frontend build not found.", "Run 'npm run build' in frontend/ to generate frontend/dist.")
			return
		}
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFile(w, r, filepath.Join(spaDir, "index.html"))
	})
}

func (s *Server) buildRouter() *chi.Mux {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5))

	r.Get("/app", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/app/", http.StatusFound)
	})
	r.Handle("/app/*", s.spaHandler())

	r.Get("/", s.handleRoot)
	r.Get("/login", s.handleLoginRedirect)
	r.Get("/logout", s.handleLogout)

	r.Group(func(r chi.Router) {
		r.Use(s.authMiddleware)
		r.Get("/export/csv", s.handleExportCSV)
		r.Get("/export/sql", s.handleExportSQL)
		r.Get("/export/dump", s.handleExportSQL)
		r.Post("/import/csv", s.csrfMiddleware(http.HandlerFunc(s.handleImportCSV)).ServeHTTP)
	})

	r.Route("/api", func(r chi.Router) {
		r.Get("/servers", s.apiServers)
		r.Post("/login", s.apiLoginJSON)
		r.Group(func(r chi.Router) {
			r.Use(s.authMiddleware)
			r.Get("/session", s.apiSession)
			r.Post("/logout", s.csrfMiddleware(http.HandlerFunc(s.apiLogoutJSON)).ServeHTTP)
			r.Get("/databases", s.apiListDatabases)
			r.Get("/schemas", s.apiListSchemas)
			r.Get("/tables", s.apiListTables)
			r.Get("/columns", s.apiListColumns)
			r.Get("/views", s.apiListViews)
			r.Get("/sequences", s.apiListSequences)
			r.Get("/functions", s.apiListFunctions)
			r.Get("/indexes", s.apiListIndexes)
			r.Get("/constraints", s.apiListConstraints)
			r.Get("/tablespaces", s.apiListTablespaces)
			r.Get("/foreign-keys", s.apiListForeignKeys)
			r.Get("/triggers", s.apiListTriggers)
			r.Get("/roles", s.apiListRoles)
			r.Get("/browse", s.apiBrowse)
			r.Get("/search", s.apiSearch)
			r.Get("/row", s.apiGetRow)
			r.Post("/sql", s.csrfMiddleware(http.HandlerFunc(s.apiRunSQL)).ServeHTTP)
			r.Post("/sql/explain", s.csrfMiddleware(http.HandlerFunc(s.apiExplain)).ServeHTTP)
			r.Post("/rows", s.csrfMiddleware(http.HandlerFunc(s.apiInsertRow)).ServeHTTP)
			r.Put("/rows", s.csrfMiddleware(http.HandlerFunc(s.apiUpdateRow)).ServeHTTP)
			r.Delete("/rows", s.csrfMiddleware(http.HandlerFunc(s.apiDeleteRow)).ServeHTTP)
			r.Post("/rows/bulk-delete", s.csrfMiddleware(http.HandlerFunc(s.apiBulkDelete)).ServeHTTP)
			r.Post("/admin/vacuum", s.csrfMiddleware(http.HandlerFunc(s.apiVacuum)).ServeHTTP)
			r.Post("/admin/reindex", s.csrfMiddleware(http.HandlerFunc(s.apiReindex)).ServeHTTP)
			r.Post("/ddl/rename-column", s.csrfMiddleware(http.HandlerFunc(s.apiRenameColumn)).ServeHTTP)
			r.Post("/ddl/alter-type", s.csrfMiddleware(http.HandlerFunc(s.apiAlterType)).ServeHTTP)
			r.Post("/ddl/alter-default", s.csrfMiddleware(http.HandlerFunc(s.apiAlterDefault)).ServeHTTP)
			r.Post("/ddl/alter-not-null", s.csrfMiddleware(http.HandlerFunc(s.apiAlterNotNull)).ServeHTTP)
			r.Post("/ddl/rename-table", s.csrfMiddleware(http.HandlerFunc(s.apiRenameTable)).ServeHTTP)
			r.Post("/ddl/truncate-table", s.csrfMiddleware(http.HandlerFunc(s.apiTruncateTable)).ServeHTTP)
			r.Post("/ddl/create-index", s.csrfMiddleware(http.HandlerFunc(s.apiCreateIndex)).ServeHTTP)
			r.Post("/ddl/drop-index", s.csrfMiddleware(http.HandlerFunc(s.apiDropIndex)).ServeHTTP)
			r.Get("/activity", s.apiActivity)
			r.Post("/activity/cancel", s.csrfMiddleware(http.HandlerFunc(s.apiCancelBackend)).ServeHTTP)
			r.Get("/variables", s.apiVariables)
		})
	})

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
	r.NotFound(s.handleNotFound)
	r.MethodNotAllowed(s.handleMethodNotAllowed)
	return r
}
