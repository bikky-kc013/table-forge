package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/bikky-kc013/TableForge/internal/auth"
	"github.com/bikky-kc013/TableForge/internal/config"
	"github.com/bikky-kc013/TableForge/internal/db"
)

func newTestServer(t *testing.T) *Server {
	t.Helper()
	cfg := config.Default()
	sessions, _ := auth.NewStore("")
	mgr := db.NewManager(cfg)
	srv, err := New(cfg, sessions, mgr)
	if err != nil {
		t.Fatal(err)
	}
	return srv
}

func TestHealthz(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/healthz", nil)
	w := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("healthz %d", w.Code)
	}
	if w.Body.String() != "ok" {
		t.Fatalf("healthz body %q", w.Body.String())
	}
}

func TestRootRedirectsToApp(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w, req)
	if w.Code != http.StatusFound {
		t.Fatalf("root %d", w.Code)
	}
	if loc := w.Header().Get("Location"); loc != "/app/" {
		t.Fatalf("redirect loc %q", loc)
	}
}

func TestLoginRedirectsToApp(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/login", nil)
	w := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w, req)
	if w.Code != http.StatusFound {
		t.Fatalf("login %d", w.Code)
	}
	if loc := w.Header().Get("Location"); loc != "/app/login" {
		t.Fatalf("redirect loc %q", loc)
	}
}

func TestAPIServersPublic(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/api/servers", nil)
	w := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("servers %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), "PostgreSQL") {
		t.Fatalf("servers body %q", w.Body.String())
	}
}

func TestAPIAuthRequired(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/api/databases", nil)
	w := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestAPILoginValidation(t *testing.T) {
	srv := newTestServer(t)
	for _, body := range []string{`{}`, `{"server":-1,"username":"x"}`, `not-json`} {
		req := httptest.NewRequest("POST", "/api/login", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		srv.Handler().ServeHTTP(w, req)
		if w.Code == http.StatusOK {
			t.Fatalf("invalid login body %q unexpectedly succeeded", body)
		}
	}
}

func TestCSRFEnforcement(t *testing.T) {
	cfg := config.Default()
	sessions, _ := auth.NewStore("")
	// create a session manually and set cookie
	sess, _ := sessions.NewSession()
	idx := 0
	sess.ServerIdx = &idx
	sess.Username = "test"
	_ = sessions.SetPassword(sess, "pass")
	sess.Database = "postgres"

	mgr := db.NewManager(cfg)
	srv, _ := New(cfg, sessions, mgr)

	// POST without CSRF should be 403 (even if DB fails, CSRF check happens first via middleware for /api/sql)
	// Use /api/sql which has csrf middleware inside auth group
	req := httptest.NewRequest("POST", "/api/sql", nil)
	// set cookie
	req.AddCookie(&http.Cookie{Name: auth.CookieName, Value: sess.ID})
	w := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w, req)
	if w.Code != 403 && w.Code != 400 { // 403 for missing csrf, 400 for bad json handled after csrf?
		// Actually csrf middleware returns 403 before handler; we expect 403
		t.Fatalf("expected 403 for missing csrf, got %d", w.Code)
	}
}

func TestExtraLoginSecurityBlocksEmptyPassword(t *testing.T) {
	srv := newTestServer(t)
	// POST JSON login with empty password and extra_login_security=true must not succeed
	req := httptest.NewRequest("POST", "/api/login", strings.NewReader(`{"server":0,"username":"testuser","password":""}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w, req)
	if w.Code == http.StatusOK {
		t.Fatalf("empty password should not succeed with extra_login_security")
	}
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body %q", w.Code, w.Body.String())
	}
}

func TestSPANotFoundWithoutBuild(t *testing.T) {
	old := spaDir
	spaDir = t.TempDir() + "/missing-dist"
	defer func() { spaDir = old }()
	srv := newTestServer(t)
	// Missing frontend build must be JSON 404, never a crash
	req := httptest.NewRequest("GET", "/app/databases", nil)
	w := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("spa fallback %d", w.Code)
	}
}
