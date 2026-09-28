package db

import "testing"

func TestDerive(t *testing.T) {
	c := Derive(140005)
	if c.Major != 14 {
		t.Fatalf("major 14, got %d", c.Major)
	}
	if !c.SupportsGeneratedColumns() {
		t.Fatal("14 should support generated cols (12+)")
	}
	if !c.SupportsNativePartitioning() {
		t.Fatal("14 should support partitioning (10+)")
	}
	if !c.SupportsJSONB() {
		t.Fatal("14 should support JSONB")
	}
}

func TestLegacyVersion(t *testing.T) {
	c := Derive(90400) // 9.4.0
	if c.SupportsGeneratedColumns() {
		t.Fatal("9.4 should not support generated cols")
	}
	if !c.SupportsJSONB() {
		t.Fatal("9.4 should support JSONB")
	}
	if c.SupportsNativePartitioning() {
		t.Fatal("9.4 should not support partitioning")
	}
}

func TestActivityColumns(t *testing.T) {
	c92 := Derive(90200)
	if c92.ActivityPIDColumn() != "pid" {
		t.Fatalf("9.2 pid column should be pid")
	}
	if c92.ActivityQueryColumn() != "query" {
		t.Fatalf("9.2 query col should be query")
	}
	c91 := Derive(90100)
	if c91.ActivityPIDColumn() != "procpid" {
		t.Fatalf("9.1 pid col should be procpid")
	}
}

func TestCapabilityBooleans(t *testing.T) {
	c := Derive(120000)
	if !c.HasTablespaces() {
		t.Fatal("12 should have tablespaces")
	}
	if c.HasServerOids() {
		t.Fatal("12 should not have server OIDs (removed 12+)")
	}
	c11 := Derive(110000)
	if !c11.HasServerOids() {
		t.Fatal("11 should have server OIDs")
	}
}
