import type { BrowseQuery, CatalogRepository, DataRepository } from '../repositories/index.js';

export function defaultSchema(schema: string | null | undefined): string {
  const s = (schema ?? '').trim();
  return s === '' ? 'public' : s;
}

export function clampPage(page: number): number {
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function clampPageSize(pageSize: number, maxRows: number): number {
  if (!Number.isInteger(pageSize) || pageSize < 1) return 30;
  return Math.min(pageSize, maxRows > 0 ? maxRows : 1000);
}

export function buildBrowseQuery(
  input: Omit<BrowseQuery, 'schema' | 'page' | 'pageSize'> & {
    schema?: string | null;
    page?: number;
    pageSize?: number;
  },
  maxRows: number,
): BrowseQuery {
  return {
    database: input.database,
    schema: defaultSchema(input.schema),
    table: input.table,
    page: clampPage(input.page ?? 1),
    pageSize: clampPageSize(input.pageSize ?? 30, maxRows),
    sort: input.sort,
    dir: input.dir,
    filters: input.filters,
  };
}

export async function listTablesForSchema(
  repo: CatalogRepository,
  database: string,
  schema: string | null | undefined,
): Promise<Awaited<ReturnType<CatalogRepository['listTables']>>> {
  return repo.listTables(database, defaultSchema(schema));
}

export async function browseTable(
  repo: DataRepository,
  input: Parameters<typeof buildBrowseQuery>[0],
  maxRows: number,
): Promise<Awaited<ReturnType<DataRepository['browse']>>> {
  return repo.browse(buildBrowseQuery(input, maxRows));
}
