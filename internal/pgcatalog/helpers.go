package pgcatalog

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
)

var identRe = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_$]*$`)

// validateIdentifier performs sanity checks on a caller-supplied object name.
//
// It deliberately does NOT require a plain [A-Za-z_][A-Za-z0-9_$]* shape: this
// project supports quoted PostgreSQL identifiers, so legitimate names may
// contain spaces, punctuation or non-ASCII characters. SQL-injection safety is
// provided by sanitizeIdent (pgx.Identifier.Sanitize quotes and escapes), not by
// this function — this only rejects names PostgreSQL could not represent.
func validateIdentifier(name string) error {
	if name == "" {
		return fmt.Errorf("empty identifier")
	}
	if strings.ContainsRune(name, 0) {
		return fmt.Errorf("invalid identifier: null byte")
	}
	// NAMEDATALEN - 1. PostgreSQL silently truncates longer names, which would
	// make the statement target a different object than the caller asked for.
	if len(name) > 63 {
		return fmt.Errorf("identifier too long (%d bytes, max 63): %q", len(name), name)
	}
	// Control characters cannot appear in a quoted identifier and usually mean
	// the value came from somewhere it should not have.
	for _, r := range name {
		if r < 0x20 || r == 0x7f {
			return fmt.Errorf("invalid identifier: control character U+%04X", r)
		}
	}
	return nil
}

func sanitizeIdent(name string) string {
	return pgx.Identifier{name}.Sanitize()
}

func pqQuote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}

func quoteLiteral(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}
