package db

type Capability struct {
	VersionNum int
	Major      int
}

func Derive(versionNum int) Capability {
	return Capability{
		VersionNum: versionNum,
		Major:      versionNum / 10000,
	}
}

func (c Capability) HasRoles() bool                { return c.Major >= 8 }
func (c Capability) HasTablespaces() bool          { return c.Major >= 8 }
func (c Capability) HasAutovacuum() bool           { return c.Major >= 8 }
func (c Capability) HasPreparedXacts() bool        { return c.Major >= 8 }
func (c Capability) HasServerAdminFuncs() bool     { return c.Major >= 8 }
func (c Capability) HasAlterDatabaseOwner() bool   { return c.Major >= 8 }
func (c Capability) HasCreateTableLike() bool      { return c.Major >= 8 }
func (c Capability) HasRecluster() bool            { return c.Major >= 8 }
func (c Capability) HasConcurrentIndexBuild() bool { return c.Major >= 8 }
func (c Capability) HasFTS() bool                  { return c.Major >= 8 }
func (c Capability) HasEnumTypes() bool            { return c.Major >= 8 }
func (c Capability) HasVirtualTransactionId() bool { return c.Major >= 8 }
func (c Capability) HasAlterSequenceStart() bool   { return c.Major >= 8 }
func (c Capability) HasDomainConstraints() bool    { return c.Major >= 9 }
func (c Capability) HasAlterDomains() bool         { return c.Major >= 9 }
func (c Capability) HasFunctionAlterOwner() bool   { return c.Major >= 9 }
func (c Capability) HasFunctionAlterSchema() bool  { return c.Major >= 9 }
func (c Capability) HasGrantOption() bool          { return c.Major >= 9 }
func (c Capability) HasQueryCancel() bool          { return c.Major >= 9 }
func (c Capability) HasQueryKill() bool            { return c.Major >= 9 }
func (c Capability) HasServerOids() bool           { return c.Major <= 11 }
func (c Capability) HasByteaHexDefault() bool      { return c.Major >= 9 }
func (c Capability) HasForceReindex() bool         { return false }
func (c Capability) HasDatabaseCollation() bool    { return c.Major >= 9 }
func (c Capability) HasMagicTypes() bool           { return true }
func (c Capability) HasDisableTriggers() bool      { return true }

func (c Capability) SupportsJSONB() bool                   { return c.Major >= 9 && c.VersionNum >= 90400 }
func (c Capability) SupportsJSON() bool                    { return c.Major >= 9 && c.VersionNum >= 90200 }
func (c Capability) SupportsNativePartitioning() bool      { return c.Major >= 10 }
func (c Capability) SupportsGeneratedColumns() bool        { return c.Major >= 12 }
func (c Capability) SupportsProcedures() bool              { return c.Major >= 11 }
func (c Capability) SupportsPublicationSubscription() bool { return c.Major >= 10 }
func (c Capability) SupportsIdentityColumns() bool         { return c.Major >= 10 }

func (c Capability) HasAlterTableSchema() bool    { return true }
func (c Capability) HasAlterSchema() bool         { return true }
func (c Capability) HasAlterSchemaOwner() bool    { return true }
func (c Capability) HasAlterSequenceSchema() bool { return true }
func (c Capability) HasAlterColumnType() bool     { return true }
func (c Capability) HasAlterAggregate() bool      { return true }

func (c Capability) ActivityPIDColumn() string {
	if c.VersionNum >= 90200 {
		return "pid"
	}
	return "procpid"
}

func (c Capability) ActivityQueryColumn() string {
	if c.VersionNum >= 90200 {
		return "query"
	}
	return "current_query"
}

func (c Capability) HelpVersion() string {
	return string(rune('0' + c.Major))
}
