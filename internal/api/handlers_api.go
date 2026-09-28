package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/bikky-kc013/TableForge/internal/pgcatalog"
)

func (s *Server) apiListDatabases(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	dbs, err := pgcatalog.ListDatabases(r.Context(), pool)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to list databases.", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dbs)
}

func (s *Server) apiListSchemas(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	schemas, err := pgcatalog.ListSchemas(r.Context(), pool, true)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to list schemas.", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(schemas)
}

func (s *Server) apiListTables(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	schema := r.URL.Query().Get("schema")
	if schema == "" {
		schema = "public"
	}
	tables, err := pgcatalog.ListTables(r.Context(), pool, schema)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to list tables.", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tables)
}

func (s *Server) apiListColumns(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	schema := r.URL.Query().Get("schema")
	table := r.URL.Query().Get("table")
	cols, err := pgcatalog.ListColumns(r.Context(), pool, schema, table)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to list columns.", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cols)
}

func (s *Server) apiListViews(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	schema := r.URL.Query().Get("schema")
	if schema == "" {
		schema = "public"
	}
	views, err := pgcatalog.ListViews(r.Context(), pool, schema)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to list views.", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(views)
}

func (s *Server) apiListSequences(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	schema := r.URL.Query().Get("schema")
	if schema == "" {
		schema = "public"
	}
	seqs, err := pgcatalog.ListSequences(r.Context(), pool, schema)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to list sequences.", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(seqs)
}

func (s *Server) apiListFunctions(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	schema := r.URL.Query().Get("schema")
	if schema == "" {
		schema = "public"
	}
	funcs, err := pgcatalog.ListFunctions(r.Context(), pool, schema)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to list functions.", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(funcs)
}

func (s *Server) apiListIndexes(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	schema := r.URL.Query().Get("schema")
	table := r.URL.Query().Get("table")
	idxs, err := pgcatalog.ListIndexes(r.Context(), pool, schema, table)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to list indexes.", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(idxs)
}

func (s *Server) apiListConstraints(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	schema := r.URL.Query().Get("schema")
	table := r.URL.Query().Get("table")
	cons, err := pgcatalog.ListConstraints(r.Context(), pool, schema, table)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to list constraints.", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cons)
}

func (s *Server) apiListRoles(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	roles, err := pgcatalog.ListRoles(r.Context(), pool)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to list roles.", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(roles)
}

func (s *Server) apiBrowse(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	schema := r.URL.Query().Get("schema")
	table := r.URL.Query().Get("table")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize := s.cfg.MaxRows
	if ps := r.URL.Query().Get("pageSize"); ps != "" {
		if v, err := strconv.Atoi(ps); err == nil && v > 0 && v <= 1000 {
			pageSize = v
		}
	}
	sortCol := r.URL.Query().Get("sort")
	sortDir := r.URL.Query().Get("dir")
	res, err := pgcatalog.BrowsePage(r.Context(), pool, schema, table, page, pageSize, sortCol, sortDir, nil)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to browse table.", err)
		return
	}
	if pk, err := pgcatalog.GetPrimaryKeyColumn(r.Context(), pool, schema, table); err == nil && pk != "" {
		res.PKCol = pk
	} else if len(res.Columns) > 0 {
		res.PKCol = res.Columns[0]
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

func (s *Server) apiRunSQL(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	var body struct {
		Query string `json:"query"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		s.handleError(w, r, http.StatusBadRequest, "Invalid JSON payload.", nil)
		return
	}
	result, affected, err := pgcatalog.RunSQL(r.Context(), pool, body.Query)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to execute query.", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"result": result, "affected": affected})
}

func (s *Server) apiActivity(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	sess, _ := getSession(r)
	var versionNum int
	if sess != nil && sess.ServerIdx != nil {
		if pw, err2 := s.sessions.GetPassword(sess); err2 == nil {
			if c, err2 := s.dbMgr.GetOrCreate(r.Context(), *sess.ServerIdx, sess.Database, sess.Username, pw); err2 == nil {
				versionNum = c.Capability.VersionNum
			}
		}
	}
	act, err := pgcatalog.ListActivity(r.Context(), pool, versionNum)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to list activity.", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(act)
}

func (s *Server) apiCancelBackend(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	var body struct {
		PID int32 `json:"pid"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		s.handleError(w, r, http.StatusBadRequest, "Invalid JSON payload.", nil)
		return
	}
	ok, err := pgcatalog.CancelBackend(r.Context(), pool, body.PID)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to cancel backend.", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": ok})
}

func (s *Server) apiVariables(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.handleError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", err)
		return
	}
	vars, err := pgcatalog.GetVariables(r.Context(), pool)
	if err != nil {
		s.handleError(w, r, http.StatusInternalServerError, "Failed to fetch variables.", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vars)
}
