package api

import (
	"fmt"
	"log"
	"os/exec"
	"strings"

	"net/http"

	"github.com/bikky-kc013/TableForge/internal/dump"
	"github.com/bikky-kc013/TableForge/internal/pgcatalog"
	"github.com/go-chi/chi/v5"
)

func (s *Server) handleExportCSV(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	database := r.URL.Query().Get("database")
	schema := r.URL.Query().Get("schema")
	if schema == "" {
		schema = "public"
	}
	table := r.URL.Query().Get("table")
	if table == "" {
		s.handleError(w, r, http.StatusBadRequest, "Table is required for CSV export.", nil)
		return
	}
	// Validate identifiers via ExportCSV
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	filename := fmt.Sprintf("%s_%s_%s.csv", database, schema, table)
	if database == "" {
		filename = fmt.Sprintf("%s_%s.csv", schema, table)
	}
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	if err := pgcatalog.ExportCSV(r.Context(), pool, schema, table, w); err != nil {
		// Headers already sent – log and abort, cannot render error page
		log.Printf("[export csv] failed %s.%s: %v", schema, table, err)
		return
	}
}

func (s *Server) handleExportSQL(w http.ResponseWriter, r *http.Request) {
	_, sess, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	if sess.ServerIdx == nil {
		s.handleError(w, r, http.StatusBadRequest, "Server not selected.", nil)
		return
	}
	srv := s.cfg.Servers[*sess.ServerIdx]
	if !dump.IsDumpEnabled(srv, false) {
		s.handleError(w, r, http.StatusNotImplemented, "pg_dump is not enabled.", fmt.Errorf("pg_dump_path not configured for server %d", *sess.ServerIdx))
		return
	}
	password, err := s.sessions.GetPassword(sess)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to retrieve credentials.", err)
		return
	}
	database := r.URL.Query().Get("database")
	if database == "" {
		database = sess.Database
		if database == "" {
			database = srv.DefaultDB
		}
	}
	schema := r.URL.Query().Get("schema")
	table := r.URL.Query().Get("table")
	format := r.URL.Query().Get("format")
	if format == "" {
		format = "plain"
	}
	opts := dump.Options{
		Database: database,
		Schema:   schema,
		Table:    table,
		Format:   format,
	}
	args, err := dump.BuildArgs(srv, sess.Username, opts)
	if err != nil {
		s.handleError(w, r, http.StatusBadRequest, "Invalid dump options.", err)
		return
	}
	bin := srv.PgDumpPath
	if bin == "" {
		bin = "/usr/bin/pg_dump"
	}
	cmd := exec.CommandContext(r.Context(), bin, args...)
	cmd.Env = []string{
		"PGPASSWORD=" + password,
		"PGSSLMODE=" + srv.SSLMode,
	}
	// Stream dump to client
	filename := database + ".sql"
	if table != "" {
		filename = fmt.Sprintf("%s_%s_%s.sql", database, schema, table)
	} else if schema != "" {
		filename = fmt.Sprintf("%s_%s.sql", database, schema)
	}
	if format == "custom" {
		filename += ".dump"
	} else if format == "tar" {
		filename += ".tar"
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	cmd.Stdout = w
	cmd.Stderr = w
	if err := cmd.Run(); err != nil {
		log.Printf("[export sql] pg_dump failed for %s: %v", database, err)
		return
	}
}

func (s *Server) handleImportCSV(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		s.handleError(w, r, http.StatusBadRequest, "Invalid form submission.", err)
		return
	}
	schema := r.FormValue("schema")
	if schema == "" {
		schema = chi.URLParam(r, "schema")
	}
	if schema == "" {
		schema = r.URL.Query().Get("schema")
	}
	table := r.FormValue("table")
	if table == "" {
		table = chi.URLParam(r, "table")
	}
	if table == "" {
		table = r.URL.Query().Get("table")
	}
	if schema == "" {
		schema = "public"
	}
	// Import failures are JSON — the SPA surfaces them in the import form.
	failImport := func(msg string) {
		s.writeAPIError(w, r, http.StatusBadRequest, msg, "")
	}

	if table == "" {
		failImport("Schema and table are required for import.")
		return
	}
	cols, err := pgcatalog.ListColumns(r.Context(), pool, schema, table)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to load table columns.", err)
		return
	}
	if len(cols) == 0 {
		failImport("Table " + schema + "." + table + " has no columns.")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		failImport("File is required: " + err.Error())
		return
	}
	defer file.Close()

	mapping := make(map[string]string, len(cols))
	skipped := make(map[string]bool, len(cols))
	for _, c := range cols {
		if r.FormValue("skip_"+c.Name) == "on" || r.FormValue("skip_"+c.Name) == "true" {
			skipped[c.Name] = true
			continue
		}
		mapping[c.Name] = strings.TrimSpace(r.FormValue("map_" + c.Name))
	}

	var unmapped []string
	for _, c := range cols {
		if skipped[c.Name] || strings.TrimSpace(mapping[c.Name]) != "" {
			continue
		}
		if c.NotNull && (c.Default == nil || strings.TrimSpace(*c.Default) == "") {
			unmapped = append(unmapped, c.Name)
		}
	}
	if len(unmapped) > 0 {
		failImport("Cannot import: required column(s) not mapped — " + strings.Join(unmapped, ", ") +
			". Map each one to a CSV field or tick Skip (a NOT NULL column can only be skipped if it has a default).")
		return
	}
	if len(mapping) == 0 || (len(mapping) == len(skipped)) {
		failImport("Nothing to import: every column is skipped.")
		return
	}

	count, err := pgcatalog.ImportCSVMapped(r.Context(), pool, schema, table, file, mapping, skipped)
	if err != nil {
		if count > 0 {
			failImport(fmt.Sprintf("Import stopped after %d row(s): %v", count, err))
		} else {
			failImport("Import failed: " + err.Error())
		}
		return
	}
	http.Redirect(w, r, fmt.Sprintf("/browse/%s/%s?database=%s&imported=%d", schema, table, r.URL.Query().Get("database"), count), http.StatusFound)
}
