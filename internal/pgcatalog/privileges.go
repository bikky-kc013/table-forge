package pgcatalog

import (
	"context"
	"fmt"

	"github.com/bikky-kc013/TableForge/internal/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

func ListPrivileges(ctx context.Context, pool *pgxpool.Pool, schema, table string) ([]model.Privilege, error) {
	q := `
SELECT grantor, grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema=$1 AND table_name=$2
ORDER BY grantee, privilege_type`
	rows, err := pool.Query(ctx, q, schema, table)
	if err != nil {
		return nil, fmt.Errorf("list privileges: %w", err)
	}
	defer rows.Close()
	var out []model.Privilege
	for rows.Next() {
		var p model.Privilege
		var grantable string
		if err := rows.Scan(&p.Grantor, &p.Grantee, &p.Privilege, &grantable); err != nil {
			return nil, err
		}
		p.Grantable = grantable == "YES"
		p.ObjectType = "table"
		p.ObjectName = schema + "." + table
		out = append(out, p)
	}
	return out, rows.Err()
}

// GrantPrivilege builds parameterized GRANT (identifier sanitized via pg_catalog allowlist).
func GrantPrivilege(ctx context.Context, pool *pgxpool.Pool, schema, table, grantee, privilege string, grantOption bool) error {
	if err := validateIdentifier(schema); err != nil {
		return err
	}
	if err := validateIdentifier(table); err != nil {
		return err
	}
	if err := validateIdentifier(grantee); err != nil {
		return err
	}
	// privilege is allowlisted
	allowed := map[string]bool{
		"SELECT": true, "INSERT": true, "UPDATE": true, "DELETE": true,
		"TRUNCATE": true, "REFERENCES": true, "TRIGGER": true, "ALL": true, "ALL PRIVILEGES": true,
	}
	if !allowed[privilege] {
		return fmt.Errorf("invalid privilege %q", privilege)
	}
	q := fmt.Sprintf("GRANT %s ON TABLE %s.%s TO %s", privilege, sanitizeIdent(schema), sanitizeIdent(table), sanitizeIdent(grantee))
	if grantOption {
		q += " WITH GRANT OPTION"
	}
	_, err := pool.Exec(ctx, q)
	return err
}

func RevokePrivilege(ctx context.Context, pool *pgxpool.Pool, schema, table, grantee, privilege string) error {
	if err := validateIdentifier(schema); err != nil {
		return err
	}
	if err := validateIdentifier(table); err != nil {
		return err
	}
	if err := validateIdentifier(grantee); err != nil {
		return err
	}
	q := fmt.Sprintf("REVOKE %s ON TABLE %s.%s FROM %s", privilege, sanitizeIdent(schema), sanitizeIdent(table), sanitizeIdent(grantee))
	_, err := pool.Exec(ctx, q)
	return err
}
