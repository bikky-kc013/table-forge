package pgcatalog

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

func ExportCSV(ctx context.Context, pool *pgxpool.Pool, schema, table string, w io.Writer) error {
	if err := validateIdentifier(schema); err != nil {
		return err
	}
	if err := validateIdentifier(table); err != nil {
		return err
	}
	var exists bool
	err := pool.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2)", schema, table).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("table %s.%s not found", schema, table)
	}
	ident := sanitizeIdent(schema) + "." + sanitizeIdent(table)
	rows, err := pool.Query(ctx, fmt.Sprintf("SELECT * FROM %s", ident))
	if err != nil {
		return err
	}
	defer rows.Close()
	cw := csv.NewWriter(w)
	defer cw.Flush()
	fds := rows.FieldDescriptions()
	header := make([]string, len(fds))
	for i, fd := range fds {
		header[i] = string(fd.Name)
	}
	if err := cw.Write(header); err != nil {
		return err
	}
	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			return err
		}
		record := make([]string, len(vals))
		for i, v := range vals {
			if v == nil {
				record[i] = ""
			} else {
				record[i] = fmt.Sprint(v)
			}
		}
		if err := cw.Write(record); err != nil {
			return err
		}
	}
	return rows.Err()
}

// ImportCSV inserts rows using the CSV header names as column names directly.
// It is the unmapped fast path; prefer ImportCSVMapped when the user picks a
// mapping.
func ImportCSV(ctx context.Context, pool *pgxpool.Pool, schema, table string, r io.Reader) (int64, error) {
	return ImportCSVMapped(ctx, pool, schema, table, r, nil, nil)
}

// ImportCSVMapped imports CSV rows into schema.table using an explicit column
// mapping.
//
// mapping maps a target column name to the CSV header it should be filled from.
// An entry whose value is empty, or a target column present in skipped, is left
// out of the INSERT so the column default (or NULL) applies instead.
//
// Every name in mapping must exist in the CSV header, otherwise the import is
// rejected before any row is written — a partially applied import is worse than
// a clear failure.
func ImportCSVMapped(ctx context.Context, pool *pgxpool.Pool, schema, table string, r io.Reader, mapping map[string]string, skipped map[string]bool) (int64, error) {
	if err := validateIdentifier(schema); err != nil {
		return 0, err
	}
	if err := validateIdentifier(table); err != nil {
		return 0, err
	}
	cr := csv.NewReader(r)
	header, err := cr.Read()
	if err != nil {
		return 0, fmt.Errorf("csv header: %w", err)
	}
	for _, col := range header {
		if err := validateIdentifier(col); err != nil {
			return 0, fmt.Errorf("invalid column %q: %w", col, err)
		}
	}

	// Resolve header name -> column index once.
	idx := make(map[string]int, len(header))
	for i, h := range header {
		if _, dup := idx[h]; !dup {
			idx[h] = i
		}
	}

	// Build the ordered list of (target column, csv index) pairs to insert.
	type pair struct {
		col string
		at  int
	}
	pairs := make([]pair, 0, len(header))
	seen := make(map[string]bool, len(mapping))
	for col, src := range mapping {
		if skipped[col] {
			continue
		}
		src = strings.TrimSpace(src)
		if src == "" {
			continue
		}
		if err := validateIdentifier(col); err != nil {
			return 0, fmt.Errorf("invalid target column %q: %w", col, err)
		}
		at, ok := idx[src]
		if !ok {
			return 0, fmt.Errorf("mapped column %q expects CSV field %q which is not present in the header (available: %s)",
				col, src, strings.Join(header, ", "))
		}
		if seen[col] {
			return 0, fmt.Errorf("column %q is mapped more than once", col)
		}
		seen[col] = true
		pairs = append(pairs, pair{col: col, at: at})
	}
	if len(pairs) == 0 {
		return 0, fmt.Errorf("no columns selected for import: map at least one table column to a CSV field")
	}
	// Deterministic column order keeps errors reproducible.
	sort.Slice(pairs, func(i, j int) bool { return pairs[i].col < pairs[j].col })

	var count int64
	for {
		record, err := cr.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return count, err
		}
		if len(record) != len(header) {
			return count, fmt.Errorf("column count mismatch: expected %d fields, got %d", len(header), len(record))
		}
		vals := make(map[string]interface{}, len(pairs))
		for _, p := range pairs {
			vals[p.col] = record[p.at]
		}
		if err := InsertRow(ctx, pool, schema, table, vals); err != nil {
			return count, err
		}
		count++
	}
	return count, nil
}
