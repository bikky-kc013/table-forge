package pgcatalog

import (
	"context"
	"fmt"

	"github.com/bikky-kc013/TableForge/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Vacuum(ctx context.Context, pool *pgxpool.Pool, schema, table string, full, freeze, analyze bool) error {
	var target string
	if schema != "" && table != "" {
		if err := validateIdentifier(schema); err != nil {
			return err
		}
		if err := validateIdentifier(table); err != nil {
			return err
		}
		target = fmt.Sprintf(" %s.%s", sanitizeIdent(schema), sanitizeIdent(table))
	}
	opts := ""
	if full {
		opts += " FULL"
	}
	if freeze {
		opts += " FREEZE"
	}
	if analyze {
		opts += " ANALYZE"
	}
	q := fmt.Sprintf("VACUUM%s%s", opts, target)
	_, err := pool.Exec(ctx, q)
	return err
}

func Analyze(ctx context.Context, pool *pgxpool.Pool, schema, table string) error {
	var target string
	if schema != "" && table != "" {
		target = fmt.Sprintf(" %s.%s", sanitizeIdent(schema), sanitizeIdent(table))
	}
	q := "ANALYZE" + target
	_, err := pool.Exec(ctx, q)
	return err
}

func Reindex(ctx context.Context, pool *pgxpool.Pool, cap db.Capability, schema, table, index string, force bool) error {
	var q string
	if index != "" {
		if err := validateIdentifier(index); err != nil {
			return err
		}
		if cap.Major >= 12 {
			q = fmt.Sprintf("REINDEX INDEX %s", sanitizeIdent(index))
			if schema != "" {
				q = fmt.Sprintf("REINDEX INDEX %s.%s", sanitizeIdent(schema), sanitizeIdent(index))
			}
		} else {
			q = fmt.Sprintf("REINDEX INDEX %s", sanitizeIdent(index))
		}
	} else if table != "" {
		q = fmt.Sprintf("REINDEX TABLE %s.%s", sanitizeIdent(schema), sanitizeIdent(table))
	} else if schema != "" {
		q = fmt.Sprintf("REINDEX SCHEMA %s", sanitizeIdent(schema))
	} else {
		_ = force
		q = "REINDEX DATABASE CURRENT"
	}
	_, err := pool.Exec(ctx, q)
	return err
}

func GetVariables(ctx context.Context, pool *pgxpool.Pool) ([]map[string]string, error) {
	q := `SELECT name, setting, category, short_desc FROM pg_settings ORDER BY category, name`
	rows, err := pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]string
	for rows.Next() {
		var name, setting, category, desc string
		if err := rows.Scan(&name, &setting, &category, &desc); err != nil {
			return nil, err
		}
		out = append(out, map[string]string{
			"name":     name,
			"setting":  setting,
			"category": category,
			"desc":     desc,
		})
	}
	return out, rows.Err()
}

func GetStatsDatabase(ctx context.Context, pool *pgxpool.Pool, database string) (map[string]interface{}, error) {
	q := `SELECT * FROM pg_stat_database WHERE datname=$1`
	rows, err := pool.Query(ctx, q, database)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return nil, fmt.Errorf("no stats for %q", database)
	}
	vals, err := rows.Values()
	if err != nil {
		return nil, err
	}
	fds := rows.FieldDescriptions()
	m := make(map[string]interface{}, len(vals))
	for i, fd := range fds {
		m[string(fd.Name)] = vals[i]
	}
	return m, nil
}
