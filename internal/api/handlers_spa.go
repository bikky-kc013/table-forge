package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/bikky-kc013/TableForge/internal/auth"
	"github.com/bikky-kc013/TableForge/internal/model"
	"github.com/bikky-kc013/TableForge/internal/pgcatalog"
	"github.com/jackc/pgx/v5"
)

func (s *Server) decodeJSON(w http.ResponseWriter, r *http.Request, dst interface{}) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		s.writeAPIError(w, r, http.StatusBadRequest, "Invalid JSON payload.", "")
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func (s *Server) apiServers(w http.ResponseWriter, r *http.Request) {
	type serverInfo struct {
		Desc string `json:"desc"`
		Host string `json:"host"`
		Port int    `json:"port"`
	}
	out := make([]serverInfo, 0, len(s.cfg.Servers))
	for _, srv := range s.cfg.Servers {
		out = append(out, serverInfo{Desc: srv.Desc, Host: srv.Host, Port: srv.Port})
	}
	writeJSON(w, out)
}

func (s *Server) apiSession(w http.ResponseWriter, r *http.Request) {
	sess, ok := getSession(r)
	if !ok {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not authenticated.", "")
		return
	}
	dbName := r.URL.Query().Get("database")
	if dbName == "" {
		dbName = sess.Database
	}
	writeJSON(w, map[string]string{
		"username":   sess.Username,
		"database":   dbName,
		"csrf_token": sess.CSRFToken,
	})
}

func (s *Server) apiLoginJSON(w http.ResponseWriter, r *http.Request) {
	if !rateLimitCheck(r) {
		s.writeAPIError(w, r, http.StatusTooManyRequests, "Too many login attempts.", "")
		return
	}
	var body struct {
		Server   int    `json:"server"`
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if !s.decodeJSON(w, r, &body) {
		return
	}
	if body.Server < 0 || body.Server >= len(s.cfg.Servers) || body.Username == "" {
		rateLimitInc(r)
		s.writeAPIError(w, r, http.StatusBadRequest, "Server and username are required.", "")
		return
	}
	if s.cfg.ExtraLoginSecurity && body.Password == "" {
		rateLimitInc(r)
		s.writeAPIError(w, r, http.StatusBadRequest, "Password is required.", "")
		return
	}
	srv := s.cfg.Servers[body.Server]
	database := srv.DefaultDB
	if database == "" {
		database = "postgres"
	}
	conn, err := s.dbMgr.GetOrCreate(r.Context(), body.Server, database, body.Username, body.Password)
	if err != nil {
		rateLimitInc(r)
		s.writeAPIError(w, r, http.StatusUnauthorized, "Login failed — please check server, username and password.", "")
		return
	}
	_ = conn
	sess, err := s.sessions.NewSession()
	if err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed to create session.", "")
		return
	}
	if err := s.sessions.SetPassword(sess, body.Password); err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed to secure session.", "")
		return
	}
	s.sessions.SetServerInfo(sess, body.Server, body.Username, database)
	secure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
	auth.SetCookie(w, sess.ID, secure)
	rateLimitReset(r)
	writeJSON(w, map[string]string{
		"username":   sess.Username,
		"database":   database,
		"csrf_token": sess.CSRFToken,
	})
}

func (s *Server) apiLogoutJSON(w http.ResponseWriter, r *http.Request) {
	if cookieID, ok := auth.GetCookie(r); ok {
		s.sessions.Delete(cookieID)
	}
	auth.ClearCookie(w)
	writeJSON(w, map[string]bool{"ok": true})
}

func (s *Server) apiExplain(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	var body struct {
		Query   string `json:"query"`
		Analyze bool   `json:"analyze"`
	}
	if !s.decodeJSON(w, r, &body) || body.Query == "" {
		s.writeAPIError(w, r, http.StatusBadRequest, "Query is required.", "")
		return
	}
	res, err := pgcatalog.Explain(r.Context(), pool, body.Query, body.Analyze)
	if err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed to explain query.", err.Error())
		return
	}
	writeJSON(w, res)
}

func (s *Server) apiSearch(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	schema := r.URL.Query().Get("schema")
	table := r.URL.Query().Get("table")
	col := r.URL.Query().Get("col")
	val := r.URL.Query().Get("val")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	if schema == "" {
		schema = "public"
	}
	filters := map[string]string{}
	if col != "" && val != "" {
		filters[col] = val
	}
	res, err := pgcatalog.BrowsePage(r.Context(), pool, schema, table, page, s.cfg.MaxRows, "", "ASC", filters)
	if err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Search failed.", err.Error())
		return
	}
	writeJSON(w, res)
}

func (s *Server) apiListForeignKeys(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	schema := r.URL.Query().Get("schema")
	if schema == "" {
		schema = "public"
	}
	fks, err := pgcatalog.ListForeignKeys(r.Context(), pool, schema, r.URL.Query().Get("table"))
	if err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed to list foreign keys.", err.Error())
		return
	}
	if fks == nil {
		fks = []model.ForeignKey{}
	}
	writeJSON(w, fks)
}

func (s *Server) apiListTablespaces(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	tss, err := pgcatalog.ListTablespaces(r.Context(), pool)
	if err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed to list tablespaces.", err.Error())
		return
	}
	writeJSON(w, tss)
}

func (s *Server) apiListTriggers(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	schema := r.URL.Query().Get("schema")
	if schema == "" {
		schema = "public"
	}
	trigs, err := pgcatalog.ListTriggers(r.Context(), pool, schema, r.URL.Query().Get("table"))
	if err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed to list triggers.", err.Error())
		return
	}
	writeJSON(w, trigs)
}

type rowRef struct {
	Schema string `json:"schema"`
	Table  string `json:"table"`
	PKCol  string `json:"pkcol"`
	PKVal  string `json:"pkval"`
}

func (ref rowRef) valid() bool {
	return ref.Schema != "" && ref.Table != "" && ref.PKCol != "" && ref.PKVal != ""
}

func (s *Server) apiInsertRow(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	var body struct {
		Schema string                 `json:"schema"`
		Table  string                 `json:"table"`
		Values map[string]interface{} `json:"values"`
	}
	if !s.decodeJSON(w, r, &body) || body.Schema == "" || body.Table == "" {
		s.writeAPIError(w, r, http.StatusBadRequest, "Schema, table and values are required.", "")
		return
	}
	cols, err := pgcatalog.ListColumns(r.Context(), pool, body.Schema, body.Table)
	if err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed to load table columns.", err.Error())
		return
	}
	vals := map[string]interface{}{}
	for _, col := range cols {
		v, present := body.Values[col.Name]
		if col.Name == "id" && (!present || v == "" || v == nil) {
			continue
		}
		if !present {
			continue
		}
		if str, ok := v.(string); ok && str == "" && !col.NotNull {
			vals[col.Name] = nil
			continue
		}
		vals[col.Name] = v
	}
	if len(vals) == 0 {
		s.writeAPIError(w, r, http.StatusBadRequest, "No values to insert.", "")
		return
	}
	if err := pgcatalog.InsertRow(r.Context(), pool, body.Schema, body.Table, vals); err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed to insert row.", err.Error())
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, map[string]bool{"ok": true})
}

func (s *Server) apiUpdateRow(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	var body struct {
		rowRef
		Values map[string]interface{} `json:"values"`
	}
	var raw struct {
		Schema string                 `json:"schema"`
		Table  string                 `json:"table"`
		PKCol  string                 `json:"pkcol"`
		PKVal  string                 `json:"pkval"`
		Values map[string]interface{} `json:"values"`
	}
	if !s.decodeJSON(w, r, &raw) {
		return
	}
	body.Schema, body.Table, body.PKCol, body.PKVal, body.Values =
		raw.Schema, raw.Table, raw.PKCol, raw.PKVal, raw.Values
	if body.Schema == "" || body.Table == "" || body.PKCol == "" || body.PKVal == "" {
		s.writeAPIError(w, r, http.StatusBadRequest, "Schema, table, pkcol and pkval are required.", "")
		return
	}
	cols, err := pgcatalog.ListColumns(r.Context(), pool, body.Schema, body.Table)
	if err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed to load table columns.", err.Error())
		return
	}
	sets := []string{}
	args := []interface{}{}
	idx := 1
	for _, col := range cols {
		if col.Name == body.PKCol {
			continue
		}
		v, present := body.Values[col.Name]
		if !present {
			continue
		}
		if str, ok := v.(string); ok && str == "" && !col.NotNull {
			v = nil
		}
		sets = append(sets, pgx.Identifier{col.Name}.Sanitize()+" = $"+strconv.Itoa(idx))
		args = append(args, v)
		idx++
	}
	if len(sets) == 0 {
		s.writeAPIError(w, r, http.StatusBadRequest, "No fields to update.", "")
		return
	}
	args = append(args, body.PKVal)
	q := "UPDATE " + pgx.Identifier{body.Schema, body.Table}.Sanitize() +
		" SET " + strings.Join(sets, ", ") +
		" WHERE " + pgx.Identifier{body.PKCol}.Sanitize() + " = $" + strconv.Itoa(idx)
	tag, err := pool.Exec(r.Context(), q, args...)
	if err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed to update row.", err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		s.writeAPIError(w, r, http.StatusNotFound, "Row not found.", "")
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

func (s *Server) apiDeleteRow(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	var raw struct {
		Schema string `json:"schema"`
		Table  string `json:"table"`
		PKCol  string `json:"pkcol"`
		PKVal  string `json:"pkval"`
	}
	if !s.decodeJSON(w, r, &raw) {
		return
	}
	ref := rowRef{Schema: raw.Schema, Table: raw.Table, PKCol: raw.PKCol, PKVal: raw.PKVal}
	if !ref.valid() {
		s.writeAPIError(w, r, http.StatusBadRequest, "Schema, table, pkcol and pkval are required.", "")
		return
	}
	q := "DELETE FROM " + pgx.Identifier{ref.Schema, ref.Table}.Sanitize() +
		" WHERE " + pgx.Identifier{ref.PKCol}.Sanitize() + " = $1"
	tag, err := pool.Exec(r.Context(), q, ref.PKVal)
	if err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed to delete row.", err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		s.writeAPIError(w, r, http.StatusNotFound, "No rows were deleted.", "")
		return
	}
	writeJSON(w, map[string]interface{}{"ok": true, "deleted": tag.RowsAffected()})
}

func (s *Server) apiBulkDelete(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	var raw struct {
		Schema string   `json:"schema"`
		Table  string   `json:"table"`
		PKCol  string   `json:"pkcol"`
		PKVals []string `json:"pkvals"`
	}
	if !s.decodeJSON(w, r, &raw) || raw.Schema == "" || raw.Table == "" || raw.PKCol == "" || len(raw.PKVals) == 0 {
		s.writeAPIError(w, r, http.StatusBadRequest, "Schema, table, pkcol and pkvals are required.", "")
		return
	}
	vals := make([]interface{}, len(raw.PKVals))
	for i, v := range raw.PKVals {
		vals[i] = v
	}
	deleted, err := pgcatalog.DeleteRows(r.Context(), pool, raw.Schema, raw.Table, raw.PKCol, vals)
	if err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed to delete rows.", err.Error())
		return
	}
	writeJSON(w, map[string]interface{}{"ok": true, "deleted": deleted})
}

func (s *Server) apiVacuum(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	var body struct {
		Schema string `json:"schema"`
		Table  string `json:"table"`
		Full   bool   `json:"full"`
	}
	if !s.decodeJSON(w, r, &body) {
		return
	}
	if err := pgcatalog.Vacuum(r.Context(), pool, body.Schema, body.Table, body.Full, false, false); err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed to vacuum.", err.Error())
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

func (s *Server) apiReindex(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	var body struct {
		Schema string `json:"schema"`
		Table  string `json:"table"`
	}
	if !s.decodeJSON(w, r, &body) {
		return
	}
	sess, _ := getSession(r)
	versionNum := 0
	if sess != nil && sess.ServerIdx != nil {
		if pw, err2 := s.sessions.GetPassword(sess); err2 == nil {
			if c, err2 := s.dbMgr.GetOrCreate(r.Context(), *sess.ServerIdx, sess.Database, sess.Username, pw); err2 == nil {
				versionNum = c.Capability.VersionNum
			}
		}
	}
	if err := pgcatalog.Reindex(r.Context(), pool, deriveCap(versionNum), body.Schema, body.Table, "", false); err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed to reindex.", err.Error())
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}
