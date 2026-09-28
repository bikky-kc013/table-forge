package pgcatalog

import (
	"context"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/bikky-kc013/TableForge/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

func BrowsePage(ctx context.Context, pool *pgxpool.Pool, schema, table string, page, pageSize int, sortCol, sortDir string, filters map[string]string) (*model.BrowseResult, error) {
	if err := validateIdentifier(schema); err != nil {
		return nil, err
	}
	if err := validateIdentifier(table); err != nil {
		return nil, err
	}
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 30
	}
	if pageSize > 1000 {
		pageSize = 1000
	}

	if sortCol != "" {
		cols, err := ListColumns(ctx, pool, schema, table)
		if err != nil {
			return nil, err
		}
		found := false
		for _, c := range cols {
			if c.Name == sortCol {
				found = true
				break
			}
		}
		if !found {
			return nil, fmt.Errorf("invalid sort column %q", sortCol)
		}
		if sortDir != "ASC" && sortDir != "DESC" {
			sortDir = "ASC"
		}
	}

	ident := pgx.Identifier{schema, table}.Sanitize()
	baseQuery := fmt.Sprintf("SELECT * FROM %s", ident)
	countQuery := fmt.Sprintf("SELECT count(*) FROM %s", ident)

	whereClause := ""
	args := []interface{}{}
	argPos := 1
	if len(filters) > 0 {
		clauses := []string{}
		for col, val := range filters {
			if err := validateIdentifier(col); err != nil {
				continue
			}
			clauses = append(clauses, fmt.Sprintf("%s::text ILIKE $%d", pgx.Identifier{col}.Sanitize(), argPos))
			args = append(args, "%"+val+"%")
			argPos++
		}
		if len(clauses) > 0 {
			whereClause = " WHERE " + strings.Join(clauses, " AND ")
		}
	}

	var total int64
	if err := pool.QueryRow(ctx, countQuery+whereClause, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count: %w", err)
	}
	maxPages := int((total + int64(pageSize) - 1) / int64(pageSize))
	if maxPages == 0 {
		maxPages = 1
	}
	if page > maxPages {
		page = maxPages
	}
	offset := (page - 1) * pageSize

	query := baseQuery + whereClause
	if sortCol != "" {
		query += fmt.Sprintf(" ORDER BY %s %s", pgx.Identifier{sortCol}.Sanitize(), sortDir)
	}
	query += fmt.Sprintf(" LIMIT %d OFFSET %d", pageSize, offset)

	rows, err := pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("browse: %w", err)
	}
	defer rows.Close()

	fieldDescs := rows.FieldDescriptions()
	cols := make([]string, len(fieldDescs))
	for i, fd := range fieldDescs {
		cols[i] = string(fd.Name)
	}

	var data [][]interface{}
	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			return nil, err
		}
		for i, v := range vals {
			vals[i] = FormatCellValue(v)
		}
		data = append(data, vals)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &model.BrowseResult{
		Columns:   cols,
		Rows:      data,
		RowCount:  len(data),
		Page:      page,
		PageSize:  pageSize,
		MaxPages:  maxPages,
		TotalRows: &total,
	}, nil
}

func InsertRow(ctx context.Context, pool *pgxpool.Pool, schema, table string, values map[string]interface{}) error {
	if err := validateIdentifier(schema); err != nil {
		return err
	}
	if err := validateIdentifier(table); err != nil {
		return err
	}
	cols := []string{}
	placeholders := []string{}
	args := []interface{}{}
	i := 1
	for col, val := range values {
		if err := validateIdentifier(col); err != nil {
			return err
		}
		cols = append(cols, pgx.Identifier{col}.Sanitize())
		placeholders = append(placeholders, "$"+strconv.Itoa(i))
		args = append(args, val)
		i++
	}
	if len(cols) == 0 {
		return fmt.Errorf("no values")
	}
	q := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
		pgx.Identifier{schema, table}.Sanitize(),
		strings.Join(cols, ", "),
		strings.Join(placeholders, ", "))
	_, err := pool.Exec(ctx, q, args...)
	return err
}

func DeleteRows(ctx context.Context, pool *pgxpool.Pool, schema, table string, pkCol string, pkValues []interface{}) (int64, error) {
	if err := validateIdentifier(pkCol); err != nil {
		return 0, err
	}
	if len(pkValues) == 0 {
		return 0, nil
	}
	q := fmt.Sprintf("DELETE FROM %s WHERE %s = ANY($1)", pgx.Identifier{schema, table}.Sanitize(), pgx.Identifier{pkCol}.Sanitize())
	tag, err := pool.Exec(ctx, q, pkValues)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

func FormatCellValue(v interface{}) interface{} {
	if v == nil {
		return nil
	}
	switch val := v.(type) {
	case string:
		return val
	case []byte:
		if len(val) == 16 {
			if !utf8.Valid(val) || isMostlyBinary(val) {
				return formatUUIDBytes(val)
			}
		}
		if utf8.Valid(val) {
			return string(val)
		}
		return hex.EncodeToString(val)
	case [16]byte:
		b := val[:]
		return formatUUIDBytes(b)
	case pgtype.UUID:
		if !val.Valid {
			return nil
		}
		return formatUUIDBytes(val.Bytes[:])
	case pgtype.Numeric:
		if !val.Valid {
			return nil
		}
		s, _ := val.Value()
		if s != nil {
			return fmt.Sprint(s)
		}
		return nil
	case pgtype.Text:
		if !val.Valid {
			return nil
		}
		return val.String
	case pgtype.Int2, pgtype.Int4, pgtype.Int8, pgtype.Float4, pgtype.Float8:
		return fmt.Sprint(val)
	case time.Time:
		return val.Format("2006-01-02 15:04:05")
	case *time.Time:
		if val == nil {
			return nil
		}
		return val.Format("2006-01-02 15:04:05")
	default:
		if s, ok := v.(fmt.Stringer); ok {
			return s.String()
		}
		return v
	}
}

func isMostlyBinary(b []byte) bool {
	for _, c := range b {
		if c < 32 && c != 9 && c != 10 && c != 13 {
			return true
		}
		if c > 126 {
			return true
		}
	}
	return false
}

func formatUUIDBytes(b []byte) string {
	if len(b) != 16 {
		return hex.EncodeToString(b)
	}
	return fmt.Sprintf("%s-%s-%s-%s-%s",
		hex.EncodeToString(b[0:4]),
		hex.EncodeToString(b[4:6]),
		hex.EncodeToString(b[6:8]),
		hex.EncodeToString(b[8:10]),
		hex.EncodeToString(b[10:16]),
	)
}

func Explain(ctx context.Context, pool *pgxpool.Pool, query string, analyze bool) (*model.ExplainResult, error) {
	if strings.TrimSpace(query) == "" {
		return nil, fmt.Errorf("empty query")
	}
	prefix := "EXPLAIN"
	if analyze {
		prefix = "EXPLAIN ANALYZE"
	}
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{AccessMode: pgx.ReadOnly})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	_, _ = tx.Exec(ctx, "SET LOCAL statement_timeout = '30s'")

	full := prefix + " " + query
	rows, err := tx.Query(ctx, full)
	if err != nil {
		return nil, fmt.Errorf("explain: %w", err)
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var line string
		if err := rows.Scan(&line); err != nil {
			return nil, err
		}
		out = append(out, line)
	}
	return &model.ExplainResult{Rows: out}, rows.Err()
}
