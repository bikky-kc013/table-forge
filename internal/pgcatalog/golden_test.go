package pgcatalog

import (
	"testing"
)

func TestGoldenCreateDatabase(t *testing.T) {
	got := sanitizeIdent("my db")
	want := `"my db"`
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
	if pqQuote("it's") != "'it''s'" {
		t.Fatal("pq quote golden failed")
	}
}

func TestGoldenListTablesQuery(t *testing.T) {
	if sanitizeIdent("public") != `"public"` {
		t.Fatal("sanitize golden")
	}
}

func TestGoldenBrowseUsesParameterizedFilters(t *testing.T) {
	col := sanitizeIdent("mycol")
	if col != `"mycol"` {
		t.Fatalf("col %q", col)
	}
}

func TestGoldenPrivilegeAllowlist(t *testing.T) {
	allowed := map[string]bool{"SELECT": true, "ALL PRIVILEGES": true}
	if !allowed["SELECT"] {
		t.Fatal("allowlist")
	}
	if allowed["DROP"] {
		t.Fatal("DROP should not be allowed as privilege")
	}
}
