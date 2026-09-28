package pgcatalog

import (
	"context"
	"fmt"

	"github.com/bikky-kc013/TableForge/internal/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

func ListDatabases(ctx context.Context, pool *pgxpool.Pool) ([]model.Database, error) {
	q := `
SELECT d.datname,
       pg_get_userbyid(d.datdba) AS owner,
       pg_encoding_to_char(d.encoding) AS encoding,
       d.datcollate,
       d.datctype,
       COALESCE(pg_get_userbyid(d.datdba),'') AS owner2,
       ts.spcname AS tablespace,
       pg_catalog.obj_description(d.oid, 'pg_database') AS comment,
       pg_database_size(d.datname) AS size,
       d.datallowconn,
       d.datistemplate,
       d.datconnlimit
FROM pg_catalog.pg_database d
LEFT JOIN pg_catalog.pg_tablespace ts ON ts.oid = d.dattablespace
ORDER BY d.datname`
	rows, err := pool.Query(ctx, q)
	if err != nil {
		q2 := `
SELECT d.datname,
       pg_get_userbyid(d.datdba) AS owner,
       pg_encoding_to_char(d.encoding) AS encoding,
       d.datcollate,
       d.datctype,
       COALESCE(pg_get_userbyid(d.datdba),'') AS owner2,
       ts.spcname AS tablespace,
       pg_catalog.obj_description(d.oid, 'pg_database') AS comment,
       0::bigint AS size,
       d.datallowconn,
       d.datistemplate,
       d.datconnlimit
FROM pg_catalog.pg_database d
LEFT JOIN pg_catalog.pg_tablespace ts ON ts.oid = d.dattablespace
ORDER BY d.datname`
		rows, err = pool.Query(ctx, q2)
		if err != nil {
			return nil, fmt.Errorf("list databases: %w", err)
		}
	}
	defer rows.Close()

	var out []model.Database
	for rows.Next() {
		var d model.Database
		var size int64
		var collate, ctype, tablespace, comment *string
		var owner2 string
		if err := rows.Scan(&d.Name, &d.Owner, &d.Encoding, &collate, &ctype, &owner2, &tablespace, &comment, &size, &d.AllowConn, &d.IsTemplate, &d.ConnLimit); err != nil {
			return nil, err
		}
		if collate != nil {
			d.Collation = *collate
		}
		if ctype != nil {
			d.CType = *ctype
		}
		if tablespace != nil {
			d.Tablespace = *tablespace
		}
		if comment != nil {
			d.Comment = *comment
		}
		if size != 0 {
			d.Size = fmt.Sprintf("%d", size)
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func GetDatabase(ctx context.Context, pool *pgxpool.Pool, name string) (*model.Database, error) {
	q := `
SELECT d.datname,
       pg_get_userbyid(d.datdba) AS owner,
       pg_encoding_to_char(d.encoding) AS encoding,
       d.datcollate,
       d.datctype,
       ts.spcname AS tablespace,
       pg_catalog.obj_description(d.oid, 'pg_database') AS comment,
       d.datallowconn,
       d.datistemplate,
       d.datconnlimit
FROM pg_catalog.pg_database d
LEFT JOIN pg_catalog.pg_tablespace ts ON ts.oid = d.dattablespace
WHERE d.datname = $1`
	var d model.Database
	var collate, ctype, tablespace, comment *string
	err := pool.QueryRow(ctx, q, name).Scan(&d.Name, &d.Owner, &d.Encoding, &collate, &ctype, &tablespace, &comment, &d.AllowConn, &d.IsTemplate, &d.ConnLimit)
	if err != nil {
		return nil, fmt.Errorf("get database %q: %w", name, err)
	}
	if collate != nil {
		d.Collation = *collate
	}
	if ctype != nil {
		d.CType = *ctype
	}
	if tablespace != nil {
		d.Tablespace = *tablespace
	}
	if comment != nil {
		d.Comment = *comment
	}
	return &d, nil
}

func CreateDatabase(ctx context.Context, pool *pgxpool.Pool, name, encoding, tablespace, comment, template string) error {
	if template == "" {
		template = "template1"
	}
	if err := validateIdentifier(name); err != nil {
		return err
	}
	q := fmt.Sprintf("CREATE DATABASE %s", sanitizeIdent(name))
	if encoding != "" {
		q += fmt.Sprintf(" ENCODING %s", pqQuote(encoding))
	}
	if tablespace != "" {
		if err := validateIdentifier(tablespace); err != nil {
			return err
		}
		q += fmt.Sprintf(" TABLESPACE %s", sanitizeIdent(tablespace))
	}
	if template != "" {
		if err := validateIdentifier(template); err != nil {
			return err
		}
		q += fmt.Sprintf(" TEMPLATE %s", sanitizeIdent(template))
	}
	if _, err := pool.Exec(ctx, q); err != nil {
		return fmt.Errorf("create database: %w", err)
	}
	if comment != "" {
		_, err := pool.Exec(ctx, fmt.Sprintf("COMMENT ON DATABASE %s IS $1", sanitizeIdent(name)), comment)
		if err != nil {
			return err
		}
	}
	return nil
}

func DropDatabase(ctx context.Context, pool *pgxpool.Pool, name string) error {
	if err := validateIdentifier(name); err != nil {
		return err
	}
	q := fmt.Sprintf("DROP DATABASE %s", sanitizeIdent(name))
	_, err := pool.Exec(ctx, q)
	return err
}

func RenameDatabase(ctx context.Context, pool *pgxpool.Pool, oldName, newName string) error {
	if err := validateIdentifier(oldName); err != nil {
		return err
	}
	if err := validateIdentifier(newName); err != nil {
		return err
	}
	q := fmt.Sprintf("ALTER DATABASE %s RENAME TO %s", sanitizeIdent(oldName), sanitizeIdent(newName))
	_, err := pool.Exec(ctx, q)
	return err
}
