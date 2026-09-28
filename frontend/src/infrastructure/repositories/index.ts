import type {
  AdminRepository,
  BrowseQuery,
  CatalogRepository,
  DataRepository,
  DdlAction,
  DdlRepository,
} from '@/domain/repositories/index.js';
import { catalogApi, dataApi, ddlApi, opsApi } from '../api/endpoints/catalog.js';

export class HttpCatalogRepository implements CatalogRepository {
  listDatabases(database: string) {
    return catalogApi.listDatabases(database);
  }
  listSchemas(database: string) {
    return catalogApi.listSchemas(database);
  }
  listTables(database: string, schema: string) {
    return catalogApi.listTables(database, schema);
  }
  listColumns(database: string, schema: string, table: string) {
    return catalogApi.listColumns(database, schema, table);
  }
  listViews(database: string, schema: string) {
    return catalogApi.listViews(database, schema);
  }
  listSequences(database: string, schema: string) {
    return catalogApi.listSequences(database, schema);
  }
  listFunctions(database: string, schema: string) {
    return catalogApi.listFunctions(database, schema);
  }
  listIndexes(database: string, schema: string, table: string) {
    return catalogApi.listIndexes(database, schema, table);
  }
  listConstraints(database: string, schema: string, table: string) {
    return catalogApi.listConstraints(database, schema, table);
  }
  listForeignKeys(database: string, schema: string, table: string) {
    return catalogApi.listForeignKeys(database, schema, table);
  }
  listRoles(database: string) {
    return catalogApi.listRoles(database);
  }
  listTablespaces(database: string) {
    return catalogApi.listTablespaces(database);
  }
  listTriggers(database: string, schema: string, table: string) {
    return catalogApi.listTriggers(database, schema, table);
  }
  getVariables(database: string) {
    return catalogApi.getVariables(database);
  }
  listActivity(database: string) {
    return catalogApi.listActivity(database);
  }
}

export class HttpDataRepository implements DataRepository {
  browse(query: BrowseQuery) {
    return dataApi.browse(query);
  }
  search(database: string, schema: string, table: string, col: string, val: string, page: number) {
    return dataApi.search(database, schema, table, col, val, page);
  }
  getRow(database: string, schema: string, table: string, pkCol: string, pkVal: string) {
    return dataApi.getRow(database, schema, table, pkCol, pkVal);
  }
  runSql(database: string, query: string) {
    return dataApi.runSql(database, query);
  }
  explain(database: string, query: string, analyze: boolean) {
    return dataApi.explain(database, query, analyze);
  }
  insertRow(database: string, schema: string, table: string, values: Record<string, unknown>) {
    return dataApi.insertRow(database, schema, table, values);
  }
  updateRow(
    database: string,
    schema: string,
    table: string,
    pkCol: string,
    pkVal: string,
    values: Record<string, unknown>,
  ) {
    return dataApi.updateRow(database, schema, table, pkCol, pkVal, values);
  }
  deleteRow(database: string, schema: string, table: string, pkCol: string, pkVal: string) {
    return dataApi.deleteRow(database, schema, table, pkCol, pkVal);
  }
  bulkDelete(database: string, schema: string, table: string, pkCol: string, pkVals: string[]) {
    return dataApi.bulkDelete(database, schema, table, pkCol, pkVals);
  }
}

export class HttpAdminRepository implements AdminRepository {
  vacuum(database: string, schema: string, table: string, full: boolean) {
    return opsApi.vacuum(database, schema, table, full);
  }
  reindex(database: string, schema: string, table: string) {
    return opsApi.reindex(database, schema, table);
  }
  cancelBackend(database: string, pid: number) {
    return dataApi.cancelBackend(database, pid);
  }
}

export class HttpDdlRepository implements DdlRepository {
  run(
    database: string,
    schema: string,
    table: string,
    action: DdlAction,
    body: Record<string, unknown>,
  ) {
    return ddlApi.run(database, schema, table, action, body);
  }
}

// Default singletons wired into application hooks. Tests can substitute fakes
// implementing the same domain interfaces.
export const catalogRepository: CatalogRepository = new HttpCatalogRepository();
export const dataRepository: DataRepository = new HttpDataRepository();
export const adminRepository: AdminRepository = new HttpAdminRepository();
export const ddlRepository: DdlRepository = new HttpDdlRepository();
