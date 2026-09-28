package pgcatalog

import (
	"context"
	"fmt"

	"github.com/bikky-kc013/TableForge/internal/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

func ListViews(ctx context.Context, pool *pgxpool.Pool, schema string) ([]model.View, error) {
	q := `
SELECT c.relname, n.nspname, pg_get_userbyid(c.relowner),
       pg_get_viewdef(c.oid, true) AS definition,
       obj_description(c.oid) AS comment,
       c.relkind
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname=$1 AND c.relkind IN ('v','m')
ORDER BY c.relname`
	rows, err := pool.Query(ctx, q, schema)
	if err != nil {
		return nil, fmt.Errorf("list views: %w", err)
	}
	defer rows.Close()
	var out []model.View
	for rows.Next() {
		var v model.View
		var comment *string
		if err := rows.Scan(&v.Name, &v.Schema, &v.Owner, &v.Definition, &comment, &v.Kind); err != nil {
			return nil, err
		}
		if comment != nil {
			v.Comment = *comment
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func ListSequences(ctx context.Context, pool *pgxpool.Pool, schema string) ([]model.Sequence, error) {
	q := `
SELECT c.relname, n.nspname, pg_get_userbyid(c.relowner),
       obj_description(c.oid),
       s.seqstart, s.seqincrement, s.seqmin, s.seqmax, s.seqcache, s.seqcycle
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
JOIN pg_catalog.pg_sequence s ON s.seqrelid=c.oid
WHERE n.nspname=$1
ORDER BY c.relname`
	// fallback for PG <10 where pg_sequence is different: use information_schema.sequences?
	rows, err := pool.Query(ctx, q, schema)
	if err != nil {
		// fallback using information_schema
		q2 := `SELECT sequence_name, sequence_schema, NULL, NULL, start_value::bigint, increment::bigint, minimum_value::bigint, maximum_value::bigint, 1::bigint, cycle_option='YES' FROM information_schema.sequences WHERE sequence_schema=$1 ORDER BY sequence_name`
		rows, err = pool.Query(ctx, q2, schema)
		if err != nil {
			return nil, err
		}
	}
	defer rows.Close()
	var out []model.Sequence
	for rows.Next() {
		var s model.Sequence
		var comment *string
		var cycle bool
		if err := rows.Scan(&s.Name, &s.Schema, &s.Owner, &comment, &s.Start, &s.Increment, &s.MinValue, &s.MaxValue, &s.Cache, &cycle); err != nil {
			return nil, err
		}
		s.Cycled = cycle
		if comment != nil {
			s.Comment = *comment
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func ListFunctions(ctx context.Context, pool *pgxpool.Pool, schema string) ([]model.Function, error) {
	q := `
SELECT p.oid, p.proname, n.nspname, pg_get_userbyid(p.proowner),
       l.lanname,
       pg_catalog.pg_get_function_arguments(p.oid) AS args,
       pg_catalog.pg_get_function_result(p.oid) AS result,
       pg_catalog.pg_get_functiondef(p.oid) AS def,
       obj_description(p.oid)
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
JOIN pg_catalog.pg_language l ON l.oid=p.prolang
WHERE n.nspname=$1
ORDER BY p.proname`
	rows, err := pool.Query(ctx, q, schema)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.Function
	for rows.Next() {
		var f model.Function
		var comment *string
		if err := rows.Scan(&f.OID, &f.Name, &f.Schema, &f.Owner, &f.Language, &f.Arguments, &f.Returns, &f.Definition, &comment); err != nil {
			return nil, err
		}
		if comment != nil {
			f.Comment = *comment
		}
		out = append(out, f)
	}
	return out, rows.Err()
}
