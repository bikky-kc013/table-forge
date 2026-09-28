import { request } from '../client.js';
import {
  browseResultDtoSchema,
  columnListSchema,
  constraintListSchema,
  databaseListSchema,
  explainDtoSchema,
  foreignKeyListSchema,
  functionListSchema,
  indexListSchema,
  okDtoSchema,
  processListSchema,
  roleListSchema,
  rowDtoSchema,
  schemaListSchema,
  sequenceListSchema,
  sqlRunDtoSchema,
  tableListSchema,
  tablespaceListSchema,
  toBrowseResult,
  toColumn,
  toConstraint,
  toDatabase,
  toExplain,
  toForeignKey,
  toFunction,
  toIndex,
  toOk,
  toProcess,
  toRole,
  toRow,
  toSchema,
  toSequence,
  toSqlRun,
  toTable,
  toTablespace,
  toTrigger,
  toVariables,
  triggerListSchema,
  variableListSchema,
  viewListSchema,
  toView,
} from '../dto/index.js';
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
} from '@/domain/entities/index.js';

function withDatabase(database: string): Record<string, string> {
  return database ? { database } : {};
}

export const catalogApi = {
  async listDatabases(database: string): Promise<Database[]> {
    const dtos = await request('/api/databases', (p) => databaseListSchema.parse(p), {
      query: withDatabase(database),
    });
    return dtos.map(toDatabase);
  },

  async listSchemas(database: string): Promise<Schema[]> {
    const dtos = await request('/api/schemas', (p) => schemaListSchema.parse(p), {
      query: withDatabase(database),
    });
    return dtos.map(toSchema);
  },

  async listTables(database: string, schema: string): Promise<Table[]> {
    const dtos = await request('/api/tables', (p) => tableListSchema.parse(p), {
      query: { ...withDatabase(database), schema },
    });
    return dtos.map(toTable);
  },

  async listColumns(database: string, schema: string, table: string): Promise<Column[]> {
    const dtos = await request('/api/columns', (p) => columnListSchema.parse(p), {
      query: { ...withDatabase(database), schema, table },
    });
    return dtos.map(toColumn);
  },

  async listViews(database: string, schema: string): Promise<View[]> {
    const dtos = await request('/api/views', (p) => viewListSchema.parse(p), {
      query: { ...withDatabase(database), schema },
    });
    return dtos.map(toView);
  },

  async listSequences(database: string, schema: string): Promise<Sequence[]> {
    const dtos = await request('/api/sequences', (p) => sequenceListSchema.parse(p), {
      query: { ...withDatabase(database), schema },
    });
    return dtos.map(toSequence);
  },

  async listFunctions(database: string, schema: string): Promise<DbFunction[]> {
    const dtos = await request('/api/functions', (p) => functionListSchema.parse(p), {
      query: { ...withDatabase(database), schema },
    });
    return dtos.map(toFunction);
  },

  async listIndexes(database: string, schema: string, table: string): Promise<Index[]> {
    const dtos = await request('/api/indexes', (p) => indexListSchema.parse(p), {
      query: { ...withDatabase(database), schema, table },
    });
    return dtos.map(toIndex);
  },

  async listConstraints(database: string, schema: string, table: string): Promise<Constraint[]> {
    const dtos = await request('/api/constraints', (p) => constraintListSchema.parse(p), {
      query: { ...withDatabase(database), schema, table },
    });
    return dtos.map(toConstraint);
  },

  async listForeignKeys(database: string, schema: string, table: string): Promise<ForeignKey[]> {
    const dtos = await request('/api/foreign-keys', (p) => foreignKeyListSchema.parse(p), {
      query: { ...withDatabase(database), schema, table },
    });
    return dtos.map(toForeignKey);
  },

  async listRoles(database: string): Promise<Role[]> {
    const dtos = await request('/api/roles', (p) => roleListSchema.parse(p), {
      query: withDatabase(database),
    });
    return dtos.map(toRole);
  },

  async listTablespaces(database: string): Promise<Tablespace[]> {
    const dtos = await request('/api/tablespaces', (p) => tablespaceListSchema.parse(p), {
      query: withDatabase(database),
    });
    return dtos.map(toTablespace);
  },

  async listTriggers(database: string, schema: string, table: string): Promise<Trigger[]> {
    const dtos = await request('/api/triggers', (p) => triggerListSchema.parse(p), {
      query: { ...withDatabase(database), schema, table },
    });
    return dtos.map(toTrigger);
  },

  async getVariables(database: string): Promise<DbVariable[]> {
    const rows = await request('/api/variables', (p) => variableListSchema.parse(p), {
      query: withDatabase(database),
    });
    return toVariables(rows);
  },

  async listActivity(database: string): Promise<BackendProcess[]> {
    const dtos = await request('/api/activity', (p) => processListSchema.parse(p), {
      query: withDatabase(database),
    });
    return dtos.map(toProcess);
  },
};

export interface BrowseParams {
  database: string;
  schema: string;
  table: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  dir?: 'ASC' | 'DESC';
  filters?: Record<string, string>;
}

export const dataApi = {
  async browse(params: BrowseParams): Promise<BrowseResult> {
    const dto = await request('/api/browse', (p) => browseResultDtoSchema.parse(p), {
      query: {
        database: params.database,
        schema: params.schema,
        table: params.table,
        page: params.page,
        pageSize: params.pageSize,
        sort: params.sort,
        dir: params.dir,
        ...params.filters,
      },
    });
    return toBrowseResult(dto);
  },

  async runSql(database: string, query: string): Promise<SqlRunResult> {
    const dto = await request('/api/sql', (p) => sqlRunDtoSchema.parse(p), {
      method: 'POST',
      query: withDatabase(database),
      json: { query },
    });
    return toSqlRun(dto);
  },

  async explain(database: string, query: string, analyze: boolean): Promise<ExplainResult> {
    const dto = await request('/api/sql/explain', (p) => explainDtoSchema.parse(p), {
      method: 'POST',
      query: withDatabase(database),
      json: { query, analyze },
    });
    return toExplain(dto);
  },

  async cancelBackend(database: string, pid: number): Promise<boolean> {
    return request('/api/activity/cancel', (p) => (p as { ok: boolean }).ok, {
      method: 'POST',
      query: withDatabase(database),
      json: { pid },
    });
  },

  async search(
    database: string,
    schema: string,
    table: string,
    col: string,
    val: string,
    page: number,
  ): Promise<BrowseResult> {
    const dto = await request('/api/search', (p) => browseResultDtoSchema.parse(p), {
      query: { ...withDatabase(database), schema, table, col, val, page },
    });
    return toBrowseResult(dto);
  },

  async getRow(
    database: string,
    schema: string,
    table: string,
    pkcol: string,
    pkval: string,
  ): Promise<RowData> {
    const dto = await request('/api/row', (p) => rowDtoSchema.parse(p), {
      query: { ...withDatabase(database), schema, table, pkcol, pkval },
    });
    return toRow(dto);
  },

  async insertRow(
    database: string,
    schema: string,
    table: string,
    values: Record<string, unknown>,
  ): Promise<void> {
    const dto = await request('/api/rows', (p) => okDtoSchema.parse(p), {
      method: 'POST',
      query: withDatabase(database),
      json: { schema, table, values },
    });
    toOk(dto);
  },

  async updateRow(
    database: string,
    schema: string,
    table: string,
    pkcol: string,
    pkval: string,
    values: Record<string, unknown>,
  ): Promise<void> {
    const dto = await request('/api/rows', (p) => okDtoSchema.parse(p), {
      method: 'PUT',
      query: withDatabase(database),
      json: { schema, table, pkcol, pkval, values },
    });
    toOk(dto);
  },

  async deleteRow(
    database: string,
    schema: string,
    table: string,
    pkcol: string,
    pkval: string,
  ): Promise<void> {
    const dto = await request('/api/rows', (p) => okDtoSchema.parse(p), {
      method: 'DELETE',
      query: withDatabase(database),
      json: { schema, table, pkcol, pkval },
    });
    toOk(dto);
  },

  async bulkDelete(
    database: string,
    schema: string,
    table: string,
    pkcol: string,
    pkvals: string[],
  ): Promise<void> {
    const dto = await request('/api/rows/bulk-delete', (p) => okDtoSchema.parse(p), {
      method: 'POST',
      query: withDatabase(database),
      json: { schema, table, pkcol, pkvals },
    });
    toOk(dto);
  },
};

export const opsApi = {
  async vacuum(database: string, schema: string, table: string, full: boolean): Promise<void> {
    const dto = await request('/api/admin/vacuum', (p) => okDtoSchema.parse(p), {
      method: 'POST',
      query: withDatabase(database),
      json: { schema, table, full },
    });
    toOk(dto);
  },

  async reindex(database: string, schema: string, table: string): Promise<void> {
    const dto = await request('/api/admin/reindex', (p) => okDtoSchema.parse(p), {
      method: 'POST',
      query: withDatabase(database),
      json: { schema, table },
    });
    toOk(dto);
  },
};

export const ddlApi = {
  async run(
    database: string,
    schema: string,
    table: string,
    action: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    const dto = await request(`/api/ddl/${action}`, (p) => okDtoSchema.parse(p), {
      method: 'POST',
      query: withDatabase(database),
      json: { schema, table, ...body },
    });
    toOk(dto);
  },
};
