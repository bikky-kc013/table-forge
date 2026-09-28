package pgcatalog

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/bikky-kc013/TableForge/internal/model"
)

func ListRoles(ctx context.Context, pool *pgxpool.Pool) ([]model.Role, error) {
	q := `
SELECT rolname, oid, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolconnlimit, rolvaliduntil,
       pg_catalog.shobj_description(oid, 'pg_authid') AS comment
FROM pg_catalog.pg_roles
ORDER BY rolname`
	rows, err := pool.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("list roles: %w", err)
	}
	defer rows.Close()
	var out []model.Role
	for rows.Next() {
		var r model.Role
		var validUntil *time.Time
		var comment *string
		if err := rows.Scan(&r.Name, &r.OID, &r.Superuser, &r.Inherit, &r.CreateRole, &r.CreateDB, &r.CanLogin, &r.ConnLimit, &validUntil, &comment); err != nil {
			return nil, err
		}
		r.ValidUntil = validUntil
		if comment != nil {
			r.Comment = *comment
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func ListTablespaces(ctx context.Context, pool *pgxpool.Pool) ([]model.Tablespace, error) {
	q := `
SELECT spcname, pg_get_userbyid(spcowner), pg_tablespace_location(oid), pg_catalog.shobj_description(oid, 'pg_tablespace')
FROM pg_catalog.pg_tablespace
ORDER BY spcname`
	rows, err := pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.Tablespace
	for rows.Next() {
		var ts model.Tablespace
		var comment *string
		var loc *string
		if err := rows.Scan(&ts.Name, &ts.Owner, &loc, &comment); err != nil {
			return nil, err
		}
		if loc != nil {
			ts.Location = *loc
		}
		if comment != nil {
			ts.Comment = *comment
		}
		out = append(out, ts)
	}
	return out, rows.Err()
}

func ListTypes(ctx context.Context, pool *pgxpool.Pool, schema string) ([]model.Type, error) {
	q := `
SELECT t.typname, n.nspname, pg_get_userbyid(t.typowner), t.typcategory, obj_description(t.oid)
FROM pg_catalog.pg_type t
JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
WHERE n.nspname=$1 AND t.typtype IN ('b','e','c','d','r','m')
ORDER BY t.typname`
	rows, err := pool.Query(ctx, q, schema)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.Type
	for rows.Next() {
		var tp model.Type
		var comment *string
		if err := rows.Scan(&tp.Name, &tp.Schema, &tp.Owner, &tp.Category, &comment); err != nil {
			return nil, err
		}
		if comment != nil {
			tp.Comment = *comment
		}
		out = append(out, tp)
	}
	return out, rows.Err()
}
