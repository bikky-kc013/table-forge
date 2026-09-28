import { z } from 'zod';
import type {
  BackendProcess,
  BrowseResult,
  Column,
  Constraint,
  Database,
  DbFunction,
  DbVariable,
  ExplainResult,
  ForeignKey,
  Index,
  Role,
  Schema,
  Sequence,
  SqlRunResult,
  Table,
  Tablespace,
  Trigger,
  View,
} from '@/domain/entities/index.js';

const optionalString = z.string().optional();
const nullableString = z.string().nullable();

function asArray<S extends z.ZodTypeAny>(schema: S): z.ZodEffects<S, z.output<S>, z.input<S>> {
  return z.preprocess((v) => (v === null || v === undefined ? [] : v), schema);
}

export const databaseDtoSchema = z.object({
  name: z.string(),
  owner: z.string(),
  encoding: z.string(),
  collation: optionalString,
  ctype: optionalString,
  tablespace: optionalString,
  comment: optionalString,
  size: optionalString,
  allow_conn: z.boolean(),
  is_template: z.boolean(),
  conn_limit: z.number(),
});
export const databaseListSchema = asArray(z.array(databaseDtoSchema));
export type DatabaseDto = z.infer<typeof databaseDtoSchema>;

export function toDatabase(dto: DatabaseDto): Database {
  return {
    name: dto.name,
    owner: dto.owner,
    encoding: dto.encoding,
    collation: dto.collation,
    ctype: dto.ctype,
    tablespace: dto.tablespace,
    comment: dto.comment,
    size: dto.size,
    allowConn: dto.allow_conn,
    isTemplate: dto.is_template,
    connLimit: dto.conn_limit,
  };
}

export const schemaDtoSchema = z.object({
  name: z.string(),
  owner: z.string(),
  comment: optionalString,
});
export const schemaListSchema = asArray(z.array(schemaDtoSchema));
export type SchemaDto = z.infer<typeof schemaDtoSchema>;

export function toSchema(dto: SchemaDto): Schema {
  return { name: dto.name, owner: dto.owner, comment: dto.comment };
}

export const tableDtoSchema = z.object({
  oid: z.number(),
  name: z.string(),
  schema: z.string(),
  owner: z.string(),
  comment: optionalString,
  row_estimate: z.number(),
  size: optionalString,
  has_oids: z.boolean(),
  kind: z.string(),
  tablespace: optionalString,
});
export const tableListSchema = asArray(z.array(tableDtoSchema));
export type TableDto = z.infer<typeof tableDtoSchema>;

export function toTable(dto: TableDto): Table {
  return {
    oid: dto.oid,
    name: dto.name,
    schema: dto.schema,
    owner: dto.owner,
    comment: dto.comment,
    rowEstimate: dto.row_estimate,
    size: dto.size,
    hasOids: dto.has_oids,
    kind: dto.kind,
    tablespace: dto.tablespace,
  };
}

export const columnDtoSchema = z.object({
  name: z.string(),
  position: z.number(),
  type: z.string(),
  type_oid: z.number(),
  length: z.number(),
  not_null: z.boolean(),
  default: nullableString.optional(),
  comment: optionalString,
  is_array: z.boolean(),
  dimensions: z.number(),
});
export const columnListSchema = asArray(z.array(columnDtoSchema));
export type ColumnDto = z.infer<typeof columnDtoSchema>;

export function toColumn(dto: ColumnDto): Column {
  return {
    name: dto.name,
    position: dto.position,
    type: dto.type,
    typeOid: dto.type_oid,
    length: dto.length,
    notNull: dto.not_null,
    default: dto.default ?? null,
    comment: dto.comment,
    isArray: dto.is_array,
    dimensions: dto.dimensions,
  };
}

export const indexDtoSchema = z.object({
  name: z.string(),
  schema: z.string(),
  table: z.string(),
  definition: z.string(),
  is_primary: z.boolean(),
  is_unique: z.boolean(),
  is_valid: z.boolean(),
  tablespace: optionalString,
});
export const indexListSchema = asArray(z.array(indexDtoSchema));
export type IndexDto = z.infer<typeof indexDtoSchema>;

export function toIndex(dto: IndexDto): Index {
  return {
    name: dto.name,
    schema: dto.schema,
    table: dto.table,
    definition: dto.definition,
    isPrimary: dto.is_primary,
    isUnique: dto.is_unique,
    isValid: dto.is_valid,
    tablespace: dto.tablespace,
  };
}

export const constraintDtoSchema = z.object({
  name: z.string(),
  type: z.string(),
  definition: z.string(),
  table: z.string(),
  schema: z.string(),
});
export const constraintListSchema = asArray(z.array(constraintDtoSchema));
export type ConstraintDto = z.infer<typeof constraintDtoSchema>;

export function toConstraint(dto: ConstraintDto): Constraint {
  return { ...dto };
}

export const viewDtoSchema = z.object({
  name: z.string(),
  schema: z.string(),
  owner: z.string(),
  definition: z.string(),
  comment: optionalString,
  kind: z.string(),
});
export const viewListSchema = asArray(z.array(viewDtoSchema));
export type ViewDto = z.infer<typeof viewDtoSchema>;
export function toView(dto: ViewDto): View {
  return { ...dto };
}

export const sequenceDtoSchema = z.object({
  name: z.string(),
  schema: z.string(),
  owner: z.string(),
  type: optionalString,
  start: z.number(),
  increment: z.number(),
  min_value: nullableString
    .or(z.number().nullable())
    .optional()
    .transform((v) => (typeof v === 'string' ? Number(v) : v) as number | null)
    .nullable(),
  max_value: z.number().nullable().optional(),
  cache: z.number(),
  cycled: z.boolean(),
  comment: optionalString,
});
export const sequenceListSchema = asArray(z.array(sequenceDtoSchema));
export type SequenceDto = z.infer<typeof sequenceDtoSchema>;
export function toSequence(dto: SequenceDto): Sequence {
  return {
    name: dto.name,
    schema: dto.schema,
    owner: dto.owner,
    type: dto.type,
    start: dto.start,
    increment: dto.increment,
    minValue: dto.min_value ?? null,
    maxValue: dto.max_value ?? null,
    cache: dto.cache,
    cycled: dto.cycled,
    comment: dto.comment,
  };
}

export const functionDtoSchema = z.object({
  oid: z.number(),
  name: z.string(),
  schema: z.string(),
  owner: z.string(),
  language: z.string(),
  arguments: z.string(),
  returns: z.string(),
  definition: z.string(),
  comment: optionalString,
});
export const functionListSchema = asArray(z.array(functionDtoSchema));
export type FunctionDto = z.infer<typeof functionDtoSchema>;
export function toFunction(dto: FunctionDto): DbFunction {
  return {
    oid: dto.oid,
    name: dto.name,
    schema: dto.schema,
    owner: dto.owner,
    language: dto.language,
    args: dto.arguments,
    returns: dto.returns,
    definition: dto.definition,
    comment: dto.comment,
  };
}

export const roleDtoSchema = z.object({
  name: z.string(),
  oid: z.number(),
  superuser: z.boolean(),
  inherit: z.boolean(),
  create_role: z.boolean(),
  create_db: z.boolean(),
  can_login: z.boolean(),
  conn_limit: z.number(),
  valid_until: nullableString.optional(),
  comment: optionalString,
  member_of: z.array(z.string()).optional(),
});
export const roleListSchema = asArray(z.array(roleDtoSchema));
export type RoleDto = z.infer<typeof roleDtoSchema>;
export function toRole(dto: RoleDto): Role {
  return {
    name: dto.name,
    oid: dto.oid,
    superuser: dto.superuser,
    inherit: dto.inherit,
    createRole: dto.create_role,
    createDb: dto.create_db,
    canLogin: dto.can_login,
    connLimit: dto.conn_limit,
    validUntil: dto.valid_until ?? null,
    comment: dto.comment,
    memberOf: dto.member_of ?? [],
  };
}

export const tablespaceDtoSchema = z.object({
  name: z.string(),
  owner: z.string(),
  location: z.string(),
  comment: optionalString,
});
export const tablespaceListSchema = asArray(z.array(tablespaceDtoSchema));
export type TablespaceDto = z.infer<typeof tablespaceDtoSchema>;
export function toTablespace(dto: TablespaceDto): Tablespace {
  return { ...dto };
}

export const browseResultDtoSchema = z.object({
  columns: z.array(z.string()),
  rows: asArray(z.array(z.array(z.unknown()))),
  row_count: z.number(),
  page: z.number(),
  page_size: z.number(),
  max_pages: z.number(),
  total_rows: z.number().nullable().optional(),
  pkcol: z.string().optional(),
});
export type BrowseResultDto = z.infer<typeof browseResultDtoSchema>;

export function toBrowseResult(dto: BrowseResultDto): BrowseResult {
  return {
    columns: dto.columns,
    rows: dto.rows,
    rowCount: dto.row_count,
    page: dto.page,
    pageSize: dto.page_size,
    maxPages: dto.max_pages,
    totalRows: dto.total_rows ?? null,
    pkCol: dto.pkcol ?? null,
  };
}

export const sqlRunDtoSchema = z.object({
  result: browseResultDtoSchema.nullable(),
  affected: z.number(),
});
export type SqlRunDto = z.infer<typeof sqlRunDtoSchema>;
export function toSqlRun(dto: SqlRunDto): SqlRunResult {
  return { result: dto.result ? toBrowseResult(dto.result) : null, affected: dto.affected };
}

export const explainDtoSchema = z.object({ rows: z.array(z.string()) });
export type ExplainDto = z.infer<typeof explainDtoSchema>;
export function toExplain(dto: ExplainDto): ExplainResult {
  return { rows: dto.rows };
}

export const processDtoSchema = z.object({
  pid: z.number(),
  usename: z.string(),
  datname: z.string(),
  client_addr: nullableString.optional(),
  state: nullableString.optional(),
  query: z.string(),
  query_start: nullableString.optional(),
  backend_start: nullableString.optional(),
});
export const processListSchema = asArray(z.array(processDtoSchema));
export type ProcessDto = z.infer<typeof processDtoSchema>;
export function toProcess(dto: ProcessDto): BackendProcess {
  return {
    pid: dto.pid,
    usename: dto.usename,
    datname: dto.datname,
    clientAddr: dto.client_addr ?? null,
    state: dto.state ?? null,
    query: dto.query,
    queryStart: dto.query_start ?? null,
    backendStart: dto.backend_start ?? null,
  };
}

export const variableListSchema = asArray(z.array(z.record(z.string())));
export function toVariables(rows: Array<Record<string, string>>): DbVariable[] {
  return rows.map((r) => ({
    name: r['name'] ?? '',
    setting: r['setting'] ?? '',
    category: r['category'],
    comment: r['comment'],
  }));
}

export const rowDtoSchema = z.object({
  columns: z.array(z.string()),
  row: z.array(z.unknown()),
});
export type RowDto = z.infer<typeof rowDtoSchema>;
export interface RowData {
  columns: string[];
  row: unknown[];
}
export function toRow(dto: RowDto): RowData {
  return { columns: dto.columns, row: dto.row };
}

export const triggerDtoSchema = z.object({
  name: z.string(),
  table: z.string(),
  schema: z.string(),
  definition: z.string(),
  enabled: z.string(),
});
export const triggerListSchema = asArray(z.array(triggerDtoSchema));
export type TriggerDto = z.infer<typeof triggerDtoSchema>;
export function toTrigger(dto: TriggerDto): Trigger {
  return { ...dto };
}

export const okDtoSchema = z.object({ ok: z.boolean() });
export function toOk(dto: { ok: boolean }): void {
  if (!dto.ok) throw new Error('Operation failed');
}

export const foreignKeyDtoSchema = z.object({
  column: z.string(),
  ref_schema: z.string(),
  ref_table: z.string(),
  ref_column: z.string(),
});
export const foreignKeyListSchema = asArray(z.array(foreignKeyDtoSchema));
export type ForeignKeyDto = z.infer<typeof foreignKeyDtoSchema>;
export function toForeignKey(dto: ForeignKeyDto): ForeignKey {
  return {
    column: dto.column,
    refSchema: dto.ref_schema,
    refTable: dto.ref_table,
    refColumn: dto.ref_column,
  };
}

export const sessionDtoSchema = z.object({
  username: z.string(),
  database: z.string(),
  csrf_token: z.string(),
});
export type SessionDto = z.infer<typeof sessionDtoSchema>;

export const serverInfoSchema = z.object({
  desc: z.string(),
  host: z.string(),
  port: z.number(),
});
export const serverListSchema = z.array(serverInfoSchema);
