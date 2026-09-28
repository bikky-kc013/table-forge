package pgcatalog

import (
	"context"
	"fmt"

	"github.com/bikky-kc013/TableForge/internal/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

func ListColumns(ctx context.Context, pool *pgxpool.Pool, schema, table string) ([]model.Column, error) {
	q := `
SELECT a.attname,
       a.attnum,
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS typname,
       a.atttypid,
       a.atttypmod,
       a.attnotnull,
       pg_catalog.pg_get_expr(ad.adbin, ad.adrelid) AS adsrc,
       pg_catalog.col_description(c.oid, a.attnum) AS comment,
       a.attndims,
       t.typcategory
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_catalog.pg_attrdef ad ON ad.adrelid=c.oid AND ad.adnum=a.attnum
JOIN pg_catalog.pg_type t ON t.oid=a.atttypid
WHERE n.nspname=$1 AND c.relname=$2 AND a.attnum>0 AND NOT a.attisdropped
ORDER BY a.attnum`
	rows, err := pool.Query(ctx, q, schema, table)
	if err != nil {
		return nil, fmt.Errorf("list columns: %w", err)
	}
	defer rows.Close()
	var out []model.Column
	for rows.Next() {
		var col model.Column
		var typname string
		var def *string
		var comment *string
		var typcat string
		var ndims int
		if err := rows.Scan(&col.Name, &col.Position, &typname, &col.TypeOID, &col.Length, &col.NotNull, &def, &comment, &ndims, &typcat); err != nil {
			return nil, err
		}
		col.Type = typname
		col.Default = def
		if comment != nil {
			col.Comment = *comment
		}
		col.Dimensions = ndims
		col.IsArray = typcat == "A" || ndims > 0 || isArrayType(typname)
		out = append(out, col)
	}
	return out, rows.Err()
}

func isArrayType(t string) bool {
	return len(t) > 2 && t[0:1] == "_" || (len(t) > 0 && t[len(t)-1] == ']')
}

func AddColumn(ctx context.Context, pool *pgxpool.Pool, schema, table string, col model.Column) error {
	if err := validateIdentifier(schema); err != nil {
		return err
	}
	if err := validateIdentifier(table); err != nil {
		return err
	}
	if err := validateIdentifier(col.Name); err != nil {
		return err
	}
	q := fmt.Sprintf("ALTER TABLE %s.%s ADD COLUMN %s %s", sanitizeIdent(schema), sanitizeIdent(table), sanitizeIdent(col.Name), col.Type)
	if col.NotNull {
		q += " NOT NULL"
	}
	if col.Default != nil {
		q += " DEFAULT " + *col.Default
	}
	_, err := pool.Exec(ctx, q)
	return err
}

func DropColumn(ctx context.Context, pool *pgxpool.Pool, schema, table, column string, cascade bool) error {
	if err := validateIdentifier(column); err != nil {
		return err
	}
	q := fmt.Sprintf("ALTER TABLE %s.%s DROP COLUMN %s", sanitizeIdent(schema), sanitizeIdent(table), sanitizeIdent(column))
	if cascade {
		q += " CASCADE"
	}
	_, err := pool.Exec(ctx, q)
	return err
}

func RenameColumn(ctx context.Context, pool *pgxpool.Pool, schema, table, oldName, newName string) error {
	if err := validateIdentifier(oldName); err != nil {
		return err
	}
	if err := validateIdentifier(newName); err != nil {
		return err
	}
	if err := validateIdentifier(schema); err != nil {
		return err
	}
	if err := validateIdentifier(table); err != nil {
		return err
	}
	q := fmt.Sprintf("ALTER TABLE %s.%s RENAME COLUMN %s TO %s", sanitizeIdent(schema), sanitizeIdent(table), sanitizeIdent(oldName), sanitizeIdent(newName))
	_, err := pool.Exec(ctx, q)
	return err
}

func AlterColumnType(ctx context.Context, pool *pgxpool.Pool, schema, table, column, newType string) error {
	if err := validateIdentifier(schema); err != nil {
		return err
	}
	if err := validateIdentifier(table); err != nil {
		return err
	}
	if err := validateIdentifier(column); err != nil {
		return err
	}
	q := fmt.Sprintf("ALTER TABLE %s.%s ALTER COLUMN %s TYPE %s", sanitizeIdent(schema), sanitizeIdent(table), sanitizeIdent(column), newType)
	_, err := pool.Exec(ctx, q)
	return err
}

func AlterColumnDefault(ctx context.Context, pool *pgxpool.Pool, schema, table, column, defaultExpr string) error {
	if err := validateIdentifier(schema); err != nil {
		return err
	}
	if err := validateIdentifier(table); err != nil {
		return err
	}
	if err := validateIdentifier(column); err != nil {
		return err
	}
	var q string
	if defaultExpr == "" || defaultExpr == "NONE" {
		q = fmt.Sprintf("ALTER TABLE %s.%s ALTER COLUMN %s DROP DEFAULT", sanitizeIdent(schema), sanitizeIdent(table), sanitizeIdent(column))
	} else {
		q = fmt.Sprintf("ALTER TABLE %s.%s ALTER COLUMN %s SET DEFAULT %s", sanitizeIdent(schema), sanitizeIdent(table), sanitizeIdent(column), defaultExpr)
	}
	_, err := pool.Exec(ctx, q)
	return err
}

func AlterColumnNotNull(ctx context.Context, pool *pgxpool.Pool, schema, table, column string, notNull bool) error {
	if err := validateIdentifier(schema); err != nil {
		return err
	}
	if err := validateIdentifier(table); err != nil {
		return err
	}
	if err := validateIdentifier(column); err != nil {
		return err
	}
	var q string
	if notNull {
		q = fmt.Sprintf("ALTER TABLE %s.%s ALTER COLUMN %s SET NOT NULL", sanitizeIdent(schema), sanitizeIdent(table), sanitizeIdent(column))
	} else {
		q = fmt.Sprintf("ALTER TABLE %s.%s ALTER COLUMN %s DROP NOT NULL", sanitizeIdent(schema), sanitizeIdent(table), sanitizeIdent(column))
	}
	_, err := pool.Exec(ctx, q)
	return err
}
