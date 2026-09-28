package api

import (
	"fmt"
	"net/http"

	"github.com/bikky-kc013/TableForge/internal/pgcatalog"
	"github.com/jackc/pgx/v5"
)

func (s *Server) apiGetRow(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	schema := r.URL.Query().Get("schema")
	table := r.URL.Query().Get("table")
	pkcol := r.URL.Query().Get("pkcol")
	pkval := r.URL.Query().Get("pkval")
	if schema == "" || table == "" || pkcol == "" || pkval == "" {
		s.writeAPIError(w, r, http.StatusBadRequest, "Schema, table, pkcol and pkval are required.", "")
		return
	}
	q := fmt.Sprintf("SELECT * FROM %s WHERE %s = $1 LIMIT 1",
		pgx.Identifier{schema, table}.Sanitize(), pgx.Identifier{pkcol}.Sanitize())
	rows, err := pool.Query(r.Context(), q, pkval)
	if err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed to load row.", err.Error())
		return
	}
	defer rows.Close()
	if !rows.Next() {
		s.writeAPIError(w, r, http.StatusNotFound, "Row not found.", "")
		return
	}
	vals, err := rows.Values()
	if err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed to read row.", err.Error())
		return
	}

	for i, v := range vals {
		vals[i] = pgcatalog.FormatCellValue(v)
	}
	fds := rows.FieldDescriptions()
	cols := make([]string, len(fds))
	for i, fd := range fds {
		cols[i] = string(fd.Name)
	}
	writeJSON(w, map[string]interface{}{"columns": cols, "row": vals})
}

type ddlBody struct {
	Schema  string `json:"schema"`
	Table   string `json:"table"`
	Column  string `json:"column"`
	OldName string `json:"old_name"`
	NewName string `json:"new_name"`
	NewType string `json:"new_type"`
	Default string `json:"default"`
	NotNull *bool  `json:"not_null"`
	Index   string `json:"index_name"`
	Columns string `json:"columns"`
	Unique  bool   `json:"unique"`
	Restart bool   `json:"restart_identity"`
}

func (s *Server) ddlPool(w http.ResponseWriter, r *http.Request, body *ddlBody) bool {
	if !s.decodeJSON(w, r, body) || body.Schema == "" || body.Table == "" {
		s.writeAPIError(w, r, http.StatusBadRequest, "Schema and table are required.", "")
		return false
	}
	return true
}

func (s *Server) ddlOK(w http.ResponseWriter, r *http.Request, err error, what string) {
	if err != nil {
		s.writeAPIError(w, r, http.StatusInternalServerError, "Failed: "+what+".", err.Error())
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

func (s *Server) apiRenameColumn(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	var body ddlBody
	if !s.ddlPool(w, r, &body) {
		return
	}
	s.ddlOK(w, r, pgcatalog.RenameColumn(r.Context(), pool, body.Schema, body.Table, body.OldName, body.NewName), "rename column")
}

func (s *Server) apiAlterType(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	var body ddlBody
	if !s.ddlPool(w, r, &body) {
		return
	}
	s.ddlOK(w, r, pgcatalog.AlterColumnType(r.Context(), pool, body.Schema, body.Table, body.Column, body.NewType), "alter column type")
}

func (s *Server) apiAlterDefault(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	var body ddlBody
	if !s.ddlPool(w, r, &body) {
		return
	}
	s.ddlOK(w, r, pgcatalog.AlterColumnDefault(r.Context(), pool, body.Schema, body.Table, body.Column, body.Default), "alter column default")
}

func (s *Server) apiAlterNotNull(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	var body ddlBody
	if !s.ddlPool(w, r, &body) || body.NotNull == nil {
		s.writeAPIError(w, r, http.StatusBadRequest, "Schema, table, column and not_null are required.", "")
		return
	}
	s.ddlOK(w, r, pgcatalog.AlterColumnNotNull(r.Context(), pool, body.Schema, body.Table, body.Column, *body.NotNull), "alter NOT NULL")
}

func (s *Server) apiRenameTable(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	var body ddlBody
	if !s.ddlPool(w, r, &body) {
		return
	}
	s.ddlOK(w, r, pgcatalog.RenameTable(r.Context(), pool, body.Schema, body.Table, body.NewName), "rename table")
}

func (s *Server) apiTruncateTable(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	var body ddlBody
	if !s.ddlPool(w, r, &body) {
		return
	}
	s.ddlOK(w, r, pgcatalog.TruncateTable(r.Context(), pool, body.Schema, body.Table, body.Restart), "truncate table")
}

func (s *Server) apiCreateIndex(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	var body ddlBody
	if !s.ddlPool(w, r, &body) {
		return
	}
	s.ddlOK(w, r, pgcatalog.CreateIndex(r.Context(), pool, body.Schema, body.Table, body.Index, body.Columns, body.Unique), "create index")
}

func (s *Server) apiDropIndex(w http.ResponseWriter, r *http.Request) {
	pool, _, err := s.mustPoolTyped(r)
	if err != nil {
		s.writeAPIError(w, r, http.StatusUnauthorized, "Not connected — please log in again.", "")
		return
	}
	var body ddlBody
	if !s.ddlPool(w, r, &body) {
		return
	}
	s.ddlOK(w, r, pgcatalog.DropIndex(r.Context(), pool, body.Schema, body.Index), "drop index")
}
