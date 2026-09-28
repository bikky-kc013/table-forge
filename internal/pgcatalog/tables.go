package pgcatalog

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/bikky-kc013/TableForge/internal/model"
)

// ListTables — canonical pg_catalog query; relkind 'r' regular, 'p' partitioned (PG10+), 'f' foreign, 'm' matview.
func ListTables(ctx context.Context, pool *pgxpool.Pool, schema string) ([]model.Table, error) {
	q := `
SELECT c.oid,
       c.relname,
       n.nspname,
       pg_get_userbyid(c.relowner) AS owner,
       pg_catalog.obj_description(c.oid, 'pg_class') AS comment,
       c.relkind,
       COALESCE(c.reltuples, 0),
       pg_catalog.pg_get_userbyid(c.relowner),
       COALESCE(ts.spcname,'')
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_catalog.pg_tablespace ts ON ts.oid = c.reltablespace
WHERE n.nspname = $1
  AND c.relkind IN ('r','p')
ORDER BY c.relname`
	rows, err := pool.Query(ctx, q, schema)
	if err != nil {
		return nil, fmt.Errorf("list tables: %w", err)
	}
	defer rows.Close()
	var out []model.Table
	for rows.Next() {
		var t model.Table
		var comment *string
		var ownerDup, tablespace string
		var kind string
		if err := rows.Scan(&t.OID, &t.Name, &t.Schema, &t.Owner, &comment, &kind, &t.RowEstimate, &ownerDup, &tablespace); err != nil {
			return nil, err
		}
		t.Kind = kind
		t.Tablespace = tablespace
		if comment != nil {
			t.Comment = *comment
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func GetTable(ctx context.Context, pool *pgxpool.Pool, schema, table string) (*model.Table, error) {
	q := `
SELECT c.oid, c.relname, n.nspname, pg_get_userbyid(c.relowner), obj_description(c.oid), c.relkind, c.reltuples, COALESCE(ts.spcname,'')
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_catalog.pg_tablespace ts ON ts.oid=c.reltablespace
WHERE n.nspname=$1 AND c.relname=$2`
	var t model.Table
	var comment *string
	var kind string
	err := pool.QueryRow(ctx, q, schema, table).Scan(&t.OID, &t.Name, &t.Schema, &t.Owner, &comment, &kind, &t.RowEstimate, &t.Tablespace)
	if err != nil {
		return nil, err
	}
	t.Kind = kind
	if comment != nil {
		t.Comment = *comment
	}
	return &t, nil
}

func CreateTable(ctx context.Context, pool *pgxpool.Pool, schema, name string, columns []model.Column) error {
	if err := validateIdentifier(name); err != nil {
		return err
	}
	if err := validateIdentifier(schema); err != nil {
		return err
	}
	// Build column definitions with proper sanitization; types are allowlisted via pg_type check elsewhere.
	defs := ""
	for i, col := range columns {
		if err := validateIdentifier(col.Name); err != nil {
			return err
		}
		if i > 0 {
			defs += ", "
		}
		typ := col.Type
		if typ == "" {
			typ = "TEXT"
		}
		defs += fmt.Sprintf("%s %s", sanitizeIdent(col.Name), typ)
		if col.NotNull {
			defs += " NOT NULL"
		}
		if col.Default != nil {
			defs += " DEFAULT " + *col.Default
		}
	}
	q := fmt.Sprintf("CREATE TABLE %s.%s (%s)", sanitizeIdent(schema), sanitizeIdent(name), defs)
	_, err := pool.Exec(ctx, q)
	return err
}

func DropTable(ctx context.Context, pool *pgxpool.Pool, schema, table string, cascade bool) error {
	if err := validateIdentifier(schema); err != nil {
		return err
	}
	if err := validateIdentifier(table); err != nil {
		return err
	}
	q := fmt.Sprintf("DROP TABLE %s.%s", sanitizeIdent(schema), sanitizeIdent(table))
	if cascade {
		q += " CASCADE"
	}
	_, err := pool.Exec(ctx, q)
	return err
}

func GetPrimaryKeyColumn(ctx context.Context, pool *pgxpool.Pool, schema, table string) (string, error) {
	q := `
SELECT a.attname
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
WHERE i.indrelid = ($1 || '.' || $2)::regclass
  AND i.indisprimary
LIMIT 1`
	var col string
	err := pool.QueryRow(ctx, q, schema, table).Scan(&col)
	if err != nil {
		// fallback to first column if no PK
		var fallback string
		err2 := pool.QueryRow(ctx, `SELECT attname FROM pg_attribute WHERE attrelid = ($1 || '.' || $2)::regclass AND attnum > 0 AND NOT attisdropped ORDER BY attnum LIMIT 1`, schema, table).Scan(&fallback)
		if err2 == nil {
			return fallback, nil
		}
		return "", err
	}
	return col, nil
}

func ListTableChildren(ctx context.Context, pool *pgxpool.Pool, schema, table string) ([]model.Table, error) {
	q := `
SELECT c.oid, c.relname, n.nspname, pg_get_userbyid(c.relowner), obj_description(c.oid), c.relkind, c.reltuples, ''
FROM pg_catalog.pg_inherits i
JOIN pg_catalog.pg_class c ON c.oid=i.inhrelid
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
JOIN pg_catalog.pg_class p ON p.oid=i.inhparent
JOIN pg_catalog.pg_namespace pn ON pn.oid=p.relnamespace
WHERE pn.nspname=$1 AND p.relname=$2`
	rows, err := pool.Query(ctx, q, schema, table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.Table
	for rows.Next() {
		var t model.Table
		var comment *string
		var kind string
		if err := rows.Scan(&t.OID, &t.Name, &t.Schema, &t.Owner, &comment, &kind, &t.RowEstimate, &t.Tablespace); err != nil {
			return nil, err
		}
		t.Kind = kind
		if comment != nil {
			t.Comment = *comment
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func TruncateTable(ctx context.Context, pool *pgxpool.Pool, schema, table string, restartIdentity bool) error {
	if err := validateIdentifier(schema); err != nil {
		return err
	}
	if err := validateIdentifier(table); err != nil {
		return err
	}
	q := fmt.Sprintf("TRUNCATE TABLE %s.%s", sanitizeIdent(schema), sanitizeIdent(table))
	if restartIdentity {
		q += " RESTART IDENTITY"
	}
	_, err := pool.Exec(ctx, q)
	return err
}

func RenameTable(ctx context.Context, pool *pgxpool.Pool, schema, table, newName string) error {
	if err := validateIdentifier(schema); err != nil {
		return err
	}
	if err := validateIdentifier(table); err != nil {
		return err
	}
	if err := validateIdentifier(newName); err != nil {
		return err
	}
	q := fmt.Sprintf("ALTER TABLE %s.%s RENAME TO %s", sanitizeIdent(schema), sanitizeIdent(table), sanitizeIdent(newName))
	_, err := pool.Exec(ctx, q)
	return err
}
