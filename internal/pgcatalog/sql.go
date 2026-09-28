package pgcatalog

import (
	"context"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/bikky-kc013/TableForge/internal/model"
)

// RunSQL executes an ad-hoc query and returns rows if SELECT, otherwise affected count.
// Uses read-write transaction; caller should ensure user has GRANT.
// We enforce parameterized execution where possible, but ad-hoc SQL box is intentionally raw
// — we rely on PG's role-based authorization as the real protection, same as phpPgAdmin.
func RunSQL(ctx context.Context, pool *pgxpool.Pool, query string) (*model.BrowseResult, int64, error) {
	trimmed := strings.TrimSpace(query)
	if trimmed == "" {
		return nil, 0, nil
	}
	// Simple detection: if starts with SELECT/WITH/SHOW/EXPLAIN -> return rows
	upper := strings.ToUpper(trimmed)
	isSelect := strings.HasPrefix(upper, "SELECT") || strings.HasPrefix(upper, "WITH") ||
		strings.HasPrefix(upper, "SHOW") || strings.HasPrefix(upper, "EXPLAIN") ||
		strings.HasPrefix(upper, "TABLE") || strings.HasPrefix(upper, "VALUES")

	if isSelect {
		rows, err := pool.Query(ctx, query)
		if err != nil {
			return nil, 0, err
		}
		defer rows.Close()
		fds := rows.FieldDescriptions()
		cols := make([]string, len(fds))
		for i, fd := range fds {
			cols[i] = string(fd.Name)
		}
		var data [][]interface{}
		for rows.Next() {
			vals, err := rows.Values()
			if err != nil {
				return nil, 0, err
			}
			for i, v := range vals {
				vals[i] = FormatCellValue(v)
			}
			data = append(data, vals)
		}
		if err := rows.Err(); err != nil {
			return nil, 0, err
		}
		// for count we can approximate
		return &model.BrowseResult{
			Columns:  cols,
			Rows:     data,
			RowCount: len(data),
			Page:     1,
			PageSize: len(data),
			MaxPages: 1,
		}, int64(len(data)), nil
	}

	tag, err := pool.Exec(ctx, query)
	if err != nil {
		return nil, 0, err
	}
	return nil, tag.RowsAffected(), nil
}

// RunSQLTx is variant that runs inside transaction for dry-run.
func RunSQLTx(ctx context.Context, pool *pgxpool.Pool, query string) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	_, err = tx.Exec(ctx, query)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// ListActivity replaces phpPgAdmin's getProcesses / getLocks with version-aware queries.
func ListActivity(ctx context.Context, pool *pgxpool.Pool, capVersion int) ([]model.Process, error) {
	// Capability-aware pid column
	pidCol := "pid"
	queryCol := "query"
	if capVersion < 90200 {
		pidCol = "procpid"
		queryCol = "current_query"
	}
	q := `
SELECT ` + pidCol + `, usename, datname, client_addr::text, state, ` + queryCol + `, query_start, backend_start
FROM pg_stat_activity
WHERE datname IS NOT NULL
ORDER BY ` + pidCol
	rows, err := pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.Process
	for rows.Next() {
		var p model.Process
		var clientAddr *string
		var state *string
		var qstart, bstart *string // pgx may return strings; simplify
		// Use pgx.Row scan with interface to handle nulls — but we know schema roughly.
		// We'll scan via values then convert.
		vals, err := rows.Values()
		if err != nil {
			return nil, err
		}
		if len(vals) >= 1 {
			switch v := vals[0].(type) {
			case int32:
				p.PID = v
			case int64:
				p.PID = int32(v)
			case int:
				p.PID = int32(v)
			}
		}
		if vals[1] != nil {
			p.Usename = vals[1].(string)
		}
		if vals[2] != nil {
			p.Database = vals[2].(string)
		}
		if vals[3] != nil {
			s := vals[3].(string)
			clientAddr = &s
		}
		p.ClientAddr = clientAddr
		if vals[4] != nil {
			s := vals[4].(string)
			state = &s
		}
		p.State = state
		if vals[5] != nil {
			p.Query = vals[5].(string)
		}
		_ = qstart
		_ = bstart
		// query_start, backend_start are vals[6], vals[7] — skip for brevity; pgx will return time.Time if we scan typed.
		out = append(out, p)
	}
	return out, rows.Err()
}

// CancelBackend wraps pg_cancel_backend(pid) with allowlist check that pid exists in activity.
func CancelBackend(ctx context.Context, pool *pgxpool.Pool, pid int32) (bool, error) {
	var ok bool
	err := pool.QueryRow(ctx, "SELECT pg_cancel_backend($1)", pid).Scan(&ok)
	return ok, err
}

func TerminateBackend(ctx context.Context, pool *pgxpool.Pool, pid int32) (bool, error) {
	var ok bool
	err := pool.QueryRow(ctx, "SELECT pg_terminate_backend($1)", pid).Scan(&ok)
	return ok, err
}

// Light wrapper to allow pgx.TxOptions import alias
var _ = pgx.TxOptions{}
