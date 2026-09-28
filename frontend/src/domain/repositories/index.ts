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
  RowData,
  Schema,
  Sequence,
  SqlRunResult,
  Table,
  Tablespace,
  Trigger,
  View,
} from '../entities/index.js';

export interface BrowseQuery {
  database: string;
  schema: string;
  table: string;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: 'ASC' | 'DESC';
  filters?: Record<string, string>;
}

export interface CatalogRepository {
  listDatabases(database: string): Promise<Database[]>;
  listSchemas(database: string): Promise<Schema[]>;
  listTables(database: string, schema: string): Promise<Table[]>;
  listColumns(database: string, schema: string, table: string): Promise<Column[]>;
  listViews(database: string, schema: string): Promise<View[]>;
  listSequences(database: string, schema: string): Promise<Sequence[]>;
  listFunctions(database: string, schema: string): Promise<DbFunction[]>;
  listIndexes(database: string, schema: string, table: string): Promise<Index[]>;
  listConstraints(database: string, schema: string, table: string): Promise<Constraint[]>;
  listForeignKeys(database: string, schema: string, table: string): Promise<ForeignKey[]>;
  listRoles(database: string): Promise<Role[]>;
  listTablespaces(database: string): Promise<Tablespace[]>;
  listTriggers(database: string, schema: string, table: string): Promise<Trigger[]>;
  getVariables(database: string): Promise<DbVariable[]>;
  listActivity(database: string): Promise<BackendProcess[]>;
}

export interface DataRepository {
  browse(query: BrowseQuery): Promise<BrowseResult>;
  search(
    database: string,
    schema: string,
    table: string,
    col: string,
    val: string,
    page: number,
  ): Promise<BrowseResult>;
  getRow(
    database: string,
    schema: string,
    table: string,
    pkCol: string,
    pkVal: string,
  ): Promise<RowData>;
  runSql(database: string, query: string): Promise<SqlRunResult>;
  explain(database: string, query: string, analyze: boolean): Promise<ExplainResult>;
  insertRow(
    database: string,
    schema: string,
    table: string,
    values: Record<string, unknown>,
  ): Promise<void>;
  updateRow(
    database: string,
    schema: string,
    table: string,
    pkCol: string,
    pkVal: string,
    values: Record<string, unknown>,
  ): Promise<void>;
  deleteRow(
    database: string,
    schema: string,
    table: string,
    pkCol: string,
    pkVal: string,
  ): Promise<void>;
  bulkDelete(
    database: string,
    schema: string,
    table: string,
    pkCol: string,
    pkVals: string[],
  ): Promise<void>;
}

export interface AdminRepository {
  vacuum(database: string, schema: string, table: string, full: boolean): Promise<void>;
  reindex(database: string, schema: string, table: string): Promise<void>;
  cancelBackend(database: string, pid: number): Promise<boolean>;
}

export type DdlAction =
  | 'rename-column'
  | 'alter-type'
  | 'alter-default'
  | 'alter-not-null'
  | 'rename-table'
  | 'truncate-table'
  | 'create-index'
  | 'drop-index';

export interface DdlRepository {
  run(
    database: string,
    schema: string,
    table: string,
    action: DdlAction,
    body: Record<string, unknown>,
  ): Promise<void>;
}
