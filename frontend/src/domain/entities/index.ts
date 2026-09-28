export interface Database {
  name: string;
  owner: string;
  encoding: string;
  collation?: string;
  ctype?: string;
  tablespace?: string;
  comment?: string;
  size?: string;
  allowConn: boolean;
  isTemplate: boolean;
  connLimit: number;
}

export interface Schema {
  name: string;
  owner: string;
  comment?: string;
}

export interface Table {
  oid: number;
  name: string;
  schema: string;
  owner: string;
  comment?: string;
  rowEstimate: number;
  size?: string;
  hasOids: boolean;
  kind: string;
  tablespace?: string;
}

export interface Column {
  name: string;
  position: number;
  type: string;
  typeOid: number;
  length: number;
  notNull: boolean;
  default: string | null;
  comment?: string;
  isArray: boolean;
  dimensions: number;
}

export interface Index {
  name: string;
  schema: string;
  table: string;
  definition: string;
  isPrimary: boolean;
  isUnique: boolean;
  isValid: boolean;
  tablespace?: string;
}

export interface Constraint {
  name: string;
  type: string;
  definition: string;
  table: string;
  schema: string;
}

export interface ForeignKey {
  column: string;
  refSchema: string;
  refTable: string;
  refColumn: string;
}

export interface Sequence {
  name: string;
  schema: string;
  owner: string;
  type?: string;
  start: number;
  increment: number;
  minValue: number | null;
  maxValue: number | null;
  cache: number;
  cycled: boolean;
  comment?: string;
}

export interface View {
  name: string;
  schema: string;
  owner: string;
  definition: string;
  comment?: string;
  kind: string;
}

export interface DbFunction {
  oid: number;
  name: string;
  schema: string;
  owner: string;
  language: string;
  args: string;
  returns: string;
  definition: string;
  comment?: string;
}

export interface Trigger {
  name: string;
  table: string;
  schema: string;
  definition: string;
  enabled: string;
}

export interface Role {
  name: string;
  oid: number;
  superuser: boolean;
  inherit: boolean;
  createRole: boolean;
  createDb: boolean;
  canLogin: boolean;
  connLimit: number;
  validUntil: string | null;
  comment?: string;
  memberOf: string[];
}

export interface Tablespace {
  name: string;
  owner: string;
  location: string;
  comment?: string;
}

export interface BackendProcess {
  pid: number;
  usename: string;
  datname: string;
  clientAddr: string | null;
  state: string | null;
  query: string;
  queryStart: string | null;
  backendStart: string | null;
}

export interface DbVariable {
  name: string;
  setting: string;
  category?: string;
  comment?: string;
}

export interface BrowseResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  page: number;
  pageSize: number;
  maxPages: number;
  totalRows: number | null;
  pkCol: string | null;
}

export interface RowData {
  columns: string[];
  row: unknown[];
}

export interface SqlRunResult {
  result: BrowseResult | null;
  affected: number;
}

export interface ExplainResult {
  rows: string[];
}

export interface ServerInfo {
  desc: string;
  host: string;
  port: number;
}

export interface SessionInfo {
  username: string;
  database: string;
  csrfToken: string;
}
