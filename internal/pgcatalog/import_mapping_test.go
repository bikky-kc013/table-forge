package pgcatalog

import (
	"context"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// resolveImportPairs exercises the validation half of ImportCSVMapped without a
// database: it must reject unknown CSV fields, unknown targets and empty maps
// *before* any row is written.
func TestImportCSVMappedRejectsBadMapping(t *testing.T) {
	csv := "id,email\n1,a@b.c\n"
	pool := (*pgxpool.Pool)(nil) // never reached: validation fails first

	cases := []struct {
		name    string
		mapping map[string]string
		skipped map[string]bool
		wantErr string
	}{
		{
			name:    "mapped csv field missing from header",
			mapping: map[string]string{"id": "nope"},
			wantErr: `not present in the header`,
		},
		{
			name:    "empty mapping imports nothing",
			mapping: map[string]string{"id": ""},
			wantErr: "no columns selected",
		},
		{
			name:    "all columns skipped",
			mapping: map[string]string{"id": "id"},
			skipped: map[string]bool{"id": true},
			wantErr: "no columns selected",
		},
		{
			name:    "target identifier too long",
			mapping: map[string]string{strings.Repeat("a", 64): "id"},
			wantErr: "identifier too long",
		},
		{
			name:    "target identifier with control character",
			mapping: map[string]string{"bad\ncol": "id"},
			wantErr: "control character",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := ImportCSVMapped(context.Background(), pool, "public", "users", strings.NewReader(csv), tc.mapping, tc.skipped)
			if err == nil {
				t.Fatal("expected an error")
			}
			if !strings.Contains(err.Error(), tc.wantErr) {
				t.Fatalf("error %q does not contain %q", err.Error(), tc.wantErr)
			}
		})
	}
}

// SQL metacharacters in a name are not rejected outright — they are neutralised
// by pgx.Identifier quoting in sanitizeIdent, which is the real security
// boundary. This pins that behaviour so a future "tighten validation" change
// cannot be mistaken for the thing providing injection safety.
func TestSanitizeIdentNeutralisesMetacharacters(t *testing.T) {
	// The name is wrapped in double quotes and the embedded quote is doubled, so
	// the statement separator can never terminate the identifier.
	const want = `"x""; DROP TABLE users; --"`
	if got := sanitizeIdent(`x"; DROP TABLE users; --`); got != want {
		t.Fatalf("sanitizeIdent = %s, want %s", got, want)
	}
}

func TestImportCSVMappedValidatesIdentifiers(t *testing.T) {
	pool := (*pgxpool.Pool)(nil)
	if _, err := ImportCSVMapped(context.Background(), pool, "pub lic", "users", strings.NewReader("id\n1\n"), nil, nil); err == nil {
		t.Error("expected schema identifier rejection")
	}
	if _, err := ImportCSVMapped(context.Background(), pool, "public", "us ers", strings.NewReader("id\n1\n"), nil, nil); err == nil {
		t.Error("expected table identifier rejection")
	}
}
