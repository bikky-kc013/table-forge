package pgcatalog

import (
	"context"
	"fmt"

	"github.com/bikky-kc013/TableForge/internal/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ListForeignKeys returns one row per constrained column, pairing local and
// referenced columns by ordinal position so composite keys stay correct.
func ListForeignKeys(ctx context.Context, pool *pgxpool.Pool, schema, table string) ([]model.ForeignKey, error) {
	if err := validateIdentifier(schema); err != nil {
		return nil, err
	}
	if err := validateIdentifier(table); err != nil {
		return nil, err
	}
	q := `
SELECT a.attname, rn.nspname, rc.relname, ra.attname
FROM pg_catalog.pg_constraint c
JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
JOIN pg_catalog.pg_namespace tn ON tn.oid = t.relnamespace
JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
JOIN LATERAL unnest(c.confkey) WITH ORDINALITY AS rk(attnum, ord) ON rk.ord = k.ord
JOIN pg_catalog.pg_class rc ON rc.oid = c.confrelid
JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
JOIN pg_catalog.pg_attribute ra ON ra.attrelid = rc.oid AND ra.attnum = rk.attnum
WHERE c.contype = 'f' AND tn.nspname = $1 AND t.relname = $2
ORDER BY c.conname, k.ord`
	rows, err := pool.Query(ctx, q, schema, table)
	if err != nil {
		return nil, fmt.Errorf("list foreign keys: %w", err)
	}
	defer rows.Close()
	var out []model.ForeignKey
	for rows.Next() {
		var fk model.ForeignKey
		if err := rows.Scan(&fk.Column, &fk.RefSchema, &fk.RefTable, &fk.RefColumn); err != nil {
			return nil, err
		}
		out = append(out, fk)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}
