package pgcatalog

import (
	"testing"
)

func TestSanitizeIdentifier(t *testing.T) {
	got := sanitizeIdent("my table")
	// pgx Identifier will quote
	if got != `"my table"` {
		t.Fatalf("sanitize got %q want %q", got, `"my table"`)
	}
	got2 := sanitizeIdent("simple")
	if got2 != `"simple"` {
		t.Fatalf("simple sanitize got %q", got2)
	}
}

func TestValidateIdentifier(t *testing.T) {
	if err := validateIdentifier(""); err == nil {
		t.Fatal("empty should fail")
	}
	if err := validateIdentifier("valid_name"); err != nil {
		t.Fatalf("valid should pass: %v", err)
	}
	if err := validateIdentifier("a\x00b"); err == nil {
		t.Fatal("null byte should fail")
	}
}

func TestPQQuote(t *testing.T) {
	if pqQuote("a'b") != "'a''b'" {
		t.Fatalf("quote failed: %q", pqQuote("a'b"))
	}
}
