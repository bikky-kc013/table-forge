package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/bikky-kc013/TableForge/internal/model"
	"github.com/go-chi/chi/v5/middleware"
)

func isAPIRequest(r *http.Request) bool {
	if strings.HasPrefix(r.URL.Path, "/api/") {
		return true
	}
	accept := r.Header.Get("Accept")
	if strings.Contains(accept, "application/json") {
		return true
	}
	if r.Header.Get("X-Requested-With") == "XMLHttpRequest" {
		return true
	}
	return false
}

func requestID(r *http.Request) string {
	if id := middleware.GetReqID(r.Context()); id != "" {
		return id
	}
	if id := r.Header.Get("X-Request-ID"); id != "" {
		return id
	}
	return ""
}

func (s *Server) writeAPIError(w http.ResponseWriter, r *http.Request, status int, message, details string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	resp := model.NewErrorResponse(status, message, details, requestID(r))
	_ = json.NewEncoder(w).Encode(resp)
}

func (s *Server) renderErrorPage(w http.ResponseWriter, r *http.Request, status int, message, details string) {
	if status >= 500 {
		log.Printf("[error] %d %s %s: %s | details: %s | reqID=%s", status, r.Method, r.URL.Path, message, details, requestID(r))
	}
	s.writeAPIError(w, r, status, message, details)
}

func (s *Server) handleError(w http.ResponseWriter, r *http.Request, status int, message string, err error) {
	details := ""
	if err != nil {
		details = err.Error()
	}
	s.renderErrorPage(w, r, status, message, details)
}

func (s *Server) handleNotFound(w http.ResponseWriter, r *http.Request) {
	s.renderErrorPage(w, r, http.StatusNotFound,
		"The page you requested could not be found.",
		"Path: "+r.URL.Path,
	)
}

func (s *Server) handleMethodNotAllowed(w http.ResponseWriter, r *http.Request) {
	s.renderErrorPage(w, r, http.StatusMethodNotAllowed,
		"The method "+r.Method+" is not allowed for "+r.URL.Path+".",
		"",
	)
}
