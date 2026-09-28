package model

import "time"

type Database struct {
	Name       string `json:"name"`
	Owner      string `json:"owner"`
	Encoding   string `json:"encoding"`
	Collation  string `json:"collation,omitempty"`
	CType      string `json:"ctype,omitempty"`
	Tablespace string `json:"tablespace,omitempty"`
	Comment    string `json:"comment,omitempty"`
	Size       string `json:"size,omitempty"`
	AllowConn  bool   `json:"allow_conn"`
	IsTemplate bool   `json:"is_template"`
	ConnLimit  int32  `json:"conn_limit"`
}

type Schema struct {
	Name    string `json:"name"`
	Owner   string `json:"owner"`
	Comment string `json:"comment,omitempty"`
}

type Table struct {
	OID         uint32  `json:"oid"`
	Name        string  `json:"name"`
	Schema      string  `json:"schema"`
	Owner       string  `json:"owner"`
	Comment     string  `json:"comment,omitempty"`
	RowEstimate float64 `json:"row_estimate"`
	Size        string  `json:"size,omitempty"`
	HasOIDs     bool    `json:"has_oids"`
	Kind        string  `json:"kind"`
	Tablespace  string  `json:"tablespace,omitempty"`
}

type Column struct {
	Name       string  `json:"name"`
	Position   int     `json:"position"`
	Type       string  `json:"type"`
	TypeOID    uint32  `json:"type_oid"`
	Length     int32   `json:"length"`
	NotNull    bool    `json:"not_null"`
	Default    *string `json:"default,omitempty"`
	Comment    string  `json:"comment,omitempty"`
	IsArray    bool    `json:"is_array"`
	Dimensions int     `json:"dimensions"`
}

type Index struct {
	Name       string `json:"name"`
	Schema     string `json:"schema"`
	Table      string `json:"table"`
	Definition string `json:"definition"`
	IsPrimary  bool   `json:"is_primary"`
	IsUnique   bool   `json:"is_unique"`
	IsValid    bool   `json:"is_valid"`
	Tablespace string `json:"tablespace,omitempty"`
}

type Constraint struct {
	Name       string `json:"name"`
	Type       string `json:"type"`
	Definition string `json:"definition"`
	Table      string `json:"table"`
	Schema     string `json:"schema"`
}

// ForeignKey is one leg of a foreign-key constraint: local Column references
// RefSchema.RefTable(RefColumn). Composite keys yield one row per column pair.
type ForeignKey struct {
	Column    string `json:"column"`
	RefSchema string `json:"ref_schema"`
	RefTable  string `json:"ref_table"`
	RefColumn string `json:"ref_column"`
}

type Sequence struct {
	Name      string `json:"name"`
	Schema    string `json:"schema"`
	Owner     string `json:"owner"`
	Type      string `json:"type,omitempty"`
	Start     int64  `json:"start"`
	Increment int64  `json:"increment"`
	MinValue  *int64 `json:"min_value,omitempty"`
	MaxValue  *int64 `json:"max_value,omitempty"`
	Cache     int64  `json:"cache"`
	Cycled    bool   `json:"cycled"`
	Comment   string `json:"comment,omitempty"`
}

type View struct {
	Name       string `json:"name"`
	Schema     string `json:"schema"`
	Owner      string `json:"owner"`
	Definition string `json:"definition"`
	Comment    string `json:"comment,omitempty"`
	Kind       string `json:"kind"` // v, m
}

type Function struct {
	OID        uint32 `json:"oid"`
	Name       string `json:"name"`
	Schema     string `json:"schema"`
	Owner      string `json:"owner"`
	Language   string `json:"language"`
	Arguments  string `json:"arguments"`
	Returns    string `json:"returns"`
	Definition string `json:"definition"`
	Comment    string `json:"comment,omitempty"`
}

type Trigger struct {
	Name       string `json:"name"`
	Table      string `json:"table"`
	Schema     string `json:"schema"`
	Definition string `json:"definition"`
	Enabled    string `json:"enabled"`
}

type Role struct {
	Name       string     `json:"name"`
	OID        uint32     `json:"oid"`
	Superuser  bool       `json:"superuser"`
	Inherit    bool       `json:"inherit"`
	CreateRole bool       `json:"create_role"`
	CreateDB   bool       `json:"create_db"`
	CanLogin   bool       `json:"can_login"`
	ConnLimit  int32      `json:"conn_limit"`
	ValidUntil *time.Time `json:"valid_until,omitempty"`
	Comment    string     `json:"comment,omitempty"`
	MemberOf   []string   `json:"member_of,omitempty"`
}

type Tablespace struct {
	Name     string `json:"name"`
	Owner    string `json:"owner"`
	Location string `json:"location"`
	Comment  string `json:"comment,omitempty"`
}

type Type struct {
	Name     string `json:"name"`
	Schema   string `json:"schema"`
	Owner    string `json:"owner"`
	Category string `json:"category"`
	Comment  string `json:"comment,omitempty"`
}

type Domain struct {
	Name     string  `json:"name"`
	Schema   string  `json:"schema"`
	BaseType string  `json:"base_type"`
	NotNull  bool    `json:"not_null"`
	Default  *string `json:"default,omitempty"`
	Comment  string  `json:"comment,omitempty"`
}

type Process struct {
	PID          int32      `json:"pid"`
	Usename      string     `json:"usename"`
	Database     string     `json:"datname"`
	ClientAddr   *string    `json:"client_addr,omitempty"`
	State        *string    `json:"state,omitempty"`
	Query        string     `json:"query"`
	QueryStart   *time.Time `json:"query_start,omitempty"`
	BackendStart *time.Time `json:"backend_start,omitempty"`
	Waiting      *bool      `json:"waiting,omitempty"` // pre-9.6
}

type Lock struct {
	Database string  `json:"database"`
	Relation *string `json:"relation,omitempty"`
	PID      int32   `json:"pid"`
	Mode     string  `json:"mode"`
	Granted  bool    `json:"granted"`
}

type Variable struct {
	Name     string `json:"name"`
	Setting  string `json:"setting"`
	Category string `json:"category,omitempty"`
	Comment  string `json:"comment,omitempty"`
}

type StatsTable struct {
	Schema         string     `json:"schema"`
	Name           string     `json:"name"`
	SeqScan        int64      `json:"seq_scan"`
	SeqTupRead     int64      `json:"seq_tup_read"`
	IdxScan        *int64     `json:"idx_scan,omitempty"`
	NTupIns        int64      `json:"n_tup_ins"`
	NTupUpd        int64      `json:"n_tup_upd"`
	NTupDel        int64      `json:"n_tup_del"`
	NTupHotUpd     int64      `json:"n_tup_hot_upd"`
	NLiveTup       int64      `json:"n_live_tup"`
	NDeadTup       int64      `json:"n_dead_tup"`
	LastVacuum     *time.Time `json:"last_vacuum,omitempty"`
	LastAutovacuum *time.Time `json:"last_autovacuum,omitempty"`
}

type Privilege struct {
	Grantor    string `json:"grantor"`
	Grantee    string `json:"grantee"`
	ObjectType string `json:"object_type"`
	ObjectName string `json:"object_name"`
	Privilege  string `json:"privilege"`
	Grantable  bool   `json:"grantable"`
}

// BrowseResult holds paginated data browsing.
// PKCol is the primary-key column when the table has one (empty otherwise).
type BrowseResult struct {
	Columns   []string        `json:"columns"`
	Rows      [][]interface{} `json:"rows"`
	RowCount  int             `json:"row_count"`
	Page      int             `json:"page"`
	PageSize  int             `json:"page_size"`
	MaxPages  int             `json:"max_pages"`
	TotalRows *int64          `json:"total_rows,omitempty"`
	PKCol     string          `json:"pkcol,omitempty"`
}

type ExplainResult struct {
	Rows []string `json:"rows"`
}

type QueryHistory struct {
	ID        int64     `json:"id"`
	Database  string    `json:"database"`
	Query     string    `json:"query"`
	Timestamp time.Time `json:"timestamp"`
}
