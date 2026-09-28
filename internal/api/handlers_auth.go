package api

import (
	"net/http"

	"github.com/bikky-kc013/TableForge/internal/auth"
)

func (s *Server) handleRoot(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/app/", http.StatusFound)
}

func (s *Server) handleLoginRedirect(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/app/login", http.StatusFound)
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if cookieID, ok := auth.GetCookie(r); ok {
		s.sessions.Delete(cookieID)
	}
	auth.ClearCookie(w)
	http.Redirect(w, r, "/app/login", http.StatusFound)
}
