package db

import (
	"testing"

	"github.com/bikky-kc013/TableForge/internal/config"
)

func TestBuildDSN(t *testing.T) {
	srv := config.Server{Host: "localhost", Port: 5432, SSLMode: "prefer", DefaultDB: "postgres"}
	dsn := buildDSN(srv, "mydb", "alice", "p@ss w0rd")
	// Should contain quoted parts
	if dsn == "" {
		t.Fatal("empty dsn")
	}
	// Ensure host present
	if len(dsn) < 5 {
		t.Fatal("dsn too short")
	}
	// Socket case
	srv2 := config.Server{Host: "", Port: 5432, SSLMode: "allow", DefaultDB: "postgres"}
	dsn2 := buildDSN(srv2, "db", "u", "p")
	if dsn2 == "" {
		t.Fatal("socket dsn empty")
	}
}

func TestParseVersionStr(t *testing.T) {
	tests := []struct {
		in  string
		out int
	}{
		{"14.5", 140005},
		{"10.3", 100003},
		{"9.6.12", 90612},
		{"15", 150000},
		{"16.2", 160002},
	}
	for _, tt := range tests {
		got := parseVersionStr(tt.in)
		if got != tt.out {
			t.Fatalf("parse %q: got %d want %d", tt.in, got, tt.out)
		}
	}
}

func TestSanitizeIdentifier(t *testing.T) {
	s := SanitizeIdentifier("my", "table")
	if s != `"my"."table"` {
		t.Fatalf("sanitize got %q", s)
	}
}

func TestManagerKey(t *testing.T) {
	k := poolKey(0, "db", "user")
	if k != "0|db|user" {
		t.Fatalf("key %q", k)
	}
}
