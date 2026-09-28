package pgcatalog

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/bikky-kc013/TableForge/internal/model"
)

func ListSchemas(ctx context.Context, pool *pgxpool.Pool, showSystem bool) ([]model.Schema, error) {
	q := `
SELECT n.nspname,
       pg_get_userbyid(n.nspowner) AS owner,
       pg_catalog.obj_description(n.oid, 'pg_namespace') AS comment
FROM pg_catalog.pg_namespace n
WHERE 1=1`
	args := []interface{}{}
	if !showSystem {
		q += ` AND n.nspname NOT LIKE 'pg\_%' AND n.nspname != 'information_schema'`
	}
	q += ` ORDER BY n.nspname`
	rows, err := pool.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("list schemas: %w", err)
	}
	defer rows.Close()
	var out []model.Schema
	for rows.Next() {
		var s model.Schema
		var comment *string
		if err := rows.Scan(&s.Name, &s.Owner, &comment); err != nil {
			return nil, err
		}
		if comment != nil {
			s.Comment = *comment
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func GetSchema(ctx context.Context, pool *pgxpool.Pool, name string) (*model.Schema, error) {
	q := `SELECT n.nspname, pg_get_userbyid(n.nspowner), pg_catalog.obj_description(n.oid, 'pg_namespace')
	      FROM pg_catalog.pg_namespace n WHERE n.nspname=$1`
	var s model.Schema
	var comment *string
	err := pool.QueryRow(ctx, q, name).Scan(&s.Name, &s.Owner, &comment)
	if err != nil {
		return nil, err
	}
	if comment != nil {
		s.Comment = *comment
	}
	return &s, nil
}

func CreateSchema(ctx context.Context, pool *pgxpool.Pool, name, authorization, comment string) error {
	if err := validateIdentifier(name); err != nil {
		return err
	}
	var q string
	if authorization != "" {
		if err := validateIdentifier(authorization); err != nil {
			return err
		}
		q = fmt.Sprintf("CREATE SCHEMA %s AUTHORIZATION %s", sanitizeIdent(name), sanitizeIdent(authorization))
	} else {
		q = fmt.Sprintf("CREATE SCHEMA %s", sanitizeIdent(name))
	}
	if _, err := pool.Exec(ctx, q); err != nil {
		return err
	}
	if comment != "" {
		_, err := pool.Exec(ctx, fmt.Sprintf("COMMENT ON SCHEMA %s IS $1", sanitizeIdent(name)), comment)
		return err
	}
	return nil
}

func DropSchema(ctx context.Context, pool *pgxpool.Pool, name string, cascade bool) error {
	if err := validateIdentifier(name); err != nil {
		return err
	}
	q := fmt.Sprintf("DROP SCHEMA %s", sanitizeIdent(name))
	if cascade {
		q += " CASCADE"
	}
	_, err := pool.Exec(ctx, q)
	return err
}
