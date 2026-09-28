package api

import (
	"net/http"

	"github.com/bikky-kc013/TableForge/internal/auth"
	"github.com/bikky-kc013/TableForge/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

func (s *Server) mustPoolTyped(r *http.Request) (*pgxpool.Pool, *auth.Session, error) {
	sess, ok := getSession(r)
	if !ok || sess.ServerIdx == nil {
		return nil, nil, http.ErrNoCookie
	}
	pw, err := s.sessions.GetPassword(sess)
	if err != nil {
		return nil, nil, err
	}
	dbName := r.URL.Query().Get("database")
	if dbName == "" {
		dbName = sess.Database
	}
	if dbName == "" {
		dbName = s.cfg.Servers[*sess.ServerIdx].DefaultDB
	}
	conn, err := s.dbMgr.GetOrCreate(r.Context(), *sess.ServerIdx, dbName, sess.Username, pw)
	if err != nil {
		return nil, nil, err
	}
	return conn.Pool, sess, nil
}

func toPgxPool(v interface{}) *pgxpool.Pool {
	if p, ok := v.(*pgxpool.Pool); ok {
		return p
	}
	return nil
}

func deriveCap(versionNum int) db.Capability {
	return db.Derive(versionNum)
}
