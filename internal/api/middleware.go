package api

import (
	"context"
	"net/http"

	"github.com/bikky-kc013/TableForge/internal/auth"
)

type contextKey string

const ctxSessionKey contextKey = "session"
const ctxSessionIDKey contextKey = "sessionID"

func (s *Server) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookieID, ok := auth.GetCookie(r)
		if !ok {
			if isAPIRequest(r) {
				s.renderErrorPage(w, r, http.StatusUnauthorized, "Authentication is required. Please log in.", "")
				return
			}
			http.Redirect(w, r, "/app/login", http.StatusFound)
			return
		}
		sess, ok := s.sessions.Get(cookieID)
		if !ok {
			auth.ClearCookie(w)
			if isAPIRequest(r) {
				s.renderErrorPage(w, r, http.StatusUnauthorized, "Session has expired. Please log in again.", "")
				return
			}
			http.Redirect(w, r, "/app/login", http.StatusFound)
			return
		}
		ctx := context.WithValue(r.Context(), ctxSessionKey, sess)
		ctx = context.WithValue(ctx, ctxSessionIDKey, cookieID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func getSession(r *http.Request) (*auth.Session, bool) {
	sess, ok := r.Context().Value(ctxSessionKey).(*auth.Session)
	return sess, ok
}

func (s *Server) requireLogin(next http.Handler) http.Handler {
	return s.authMiddleware(next)
}

func (s *Server) csrfMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}
		sess, ok := getSession(r)
		if !ok {
			s.renderErrorPage(w, r, http.StatusUnauthorized, "Authentication is required.", "")
			return
		}
		if !auth.VerifyCSRF(r, sess) {
			s.renderErrorPage(w, r, http.StatusForbidden, "Invalid CSRF token. Please refresh the page and try again.", "")
			return
		}
		next.ServeHTTP(w, r)
	})
}

var loginAttempts = make(map[string]int)

func rateLimitCheck(r *http.Request) bool {
	ip := r.RemoteAddr
	if c, ok := loginAttempts[ip]; ok && c > 10 {
		return false
	}
	return true
}

func rateLimitInc(r *http.Request) {
	loginAttempts[r.RemoteAddr]++
}
func rateLimitReset(r *http.Request) {
	delete(loginAttempts, r.RemoteAddr)
}
