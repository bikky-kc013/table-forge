import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/domain/entities/error.js';
import type { BrowseResult, ServerInfo, SessionInfo } from '@/domain/entities/index.js';
import { authApi } from '@/infrastructure/api/endpoints/auth.js';
import { catalogRepository, dataRepository } from '@/infrastructure/repositories/index.js';
import { queryKeys } from '../query-keys.js';
import { STALE_TIMES } from '@/shared/constants/index.js';

export interface CatalogQueryOpts {
  enabled?: boolean;
  refetchInterval?: number | false;
}

function useCatalogQuery<T>(
  key: readonly unknown[],
  fn: () => Promise<T>,
  staleTime: number,
  opts?: CatalogQueryOpts,
) {
  return useQuery<T, ApiError>({
    queryKey: key,
    queryFn: fn,
    staleTime,
    enabled: opts?.enabled ?? true,
    ...(opts?.refetchInterval !== undefined ? { refetchInterval: opts.refetchInterval } : {}),
  });
}

export function useDatabases(database: string, opts?: CatalogQueryOpts) {
  return useCatalogQuery(
    queryKeys.catalog.databases(database),
    () => catalogRepository.listDatabases(database),
    STALE_TIMES.static,
    { enabled: true, ...opts },
  );
}

export function useSchemas(database: string, opts?: CatalogQueryOpts) {
  return useCatalogQuery(
    queryKeys.catalog.schemas(database),
    () => catalogRepository.listSchemas(database),
    STALE_TIMES.static,
    { enabled: database !== '', ...opts },
  );
}

export function useTables(database: string, schema: string, opts?: CatalogQueryOpts) {
  return useCatalogQuery(
    queryKeys.catalog.tables(database, schema),
    () => catalogRepository.listTables(database, schema),
    STALE_TIMES.structural,
    { enabled: database !== '' && schema !== '', ...opts },
  );
}

export function useColumns(
  database: string,
  schema: string,
  table: string,
  opts?: CatalogQueryOpts,
) {
  return useCatalogQuery(
    queryKeys.catalog.columns(database, schema, table),
    () => catalogRepository.listColumns(database, schema, table),
    STALE_TIMES.structural,
    { enabled: database !== '' && schema !== '' && table !== '', ...opts },
  );
}

export function useViews(database: string, schema: string) {
  return useCatalogQuery(
    queryKeys.catalog.views(database, schema),
    () => catalogRepository.listViews(database, schema),
    STALE_TIMES.structural,
    { enabled: database !== '' && schema !== '' },
  );
}

export function useRoles(database: string) {
  return useCatalogQuery(
    queryKeys.catalog.roles(database),
    () => catalogRepository.listRoles(database),
    STALE_TIMES.static,
  );
}

export function useVariables(database: string) {
  return useCatalogQuery(
    queryKeys.catalog.variables(database),
    () => catalogRepository.getVariables(database),
    STALE_TIMES.static,
  );
}

export function useActivity(database: string, refetchInterval = STALE_TIMES.realtime) {
  return useCatalogQuery(
    queryKeys.catalog.activity(database),
    () => catalogRepository.listActivity(database),
    STALE_TIMES.dynamic,
    { refetchInterval, enabled: database !== '' },
  );
}

export interface BrowseQueryInput {
  database: string;
  schema: string;
  table: string;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: 'ASC' | 'DESC';
  filters?: Record<string, string>;
}

export function useBrowse(input: BrowseQueryInput) {
  const { database, schema, table, ...rest } = input;
  return useQuery<BrowseResult, ApiError>({
    queryKey: queryKeys.data.browse(database, schema, table, rest),
    queryFn: () => dataRepository.browse({ database, schema, table, ...rest }),
    staleTime: STALE_TIMES.dynamic,
    enabled: database !== '' && schema !== '' && table !== '',
    placeholderData: keepPreviousData,
  });
}

export function useSession() {
  return useQuery<SessionInfo, ApiError>({
    queryKey: queryKeys.session.info,
    queryFn: () => authApi.getSession(),
    staleTime: STALE_TIMES.static,
    retry: false,
  });
}

export function useServers() {
  return useQuery<ServerInfo[], ApiError>({
    queryKey: queryKeys.session.servers,
    queryFn: () => authApi.listServers(),
    staleTime: STALE_TIMES.static,
    retry: false,
  });
}

export function useIndexes(database: string, schema: string, table: string) {
  return useCatalogQuery(
    queryKeys.catalog.indexes(database, schema, table),
    () => catalogRepository.listIndexes(database, schema, table),
    STALE_TIMES.structural,
    { enabled: database !== '' && schema !== '' && table !== '' },
  );
}

export function useConstraints(database: string, schema: string, table: string) {
  return useCatalogQuery(
    queryKeys.catalog.constraints(database, schema, table),
    () => catalogRepository.listConstraints(database, schema, table),
    STALE_TIMES.structural,
    { enabled: database !== '' && schema !== '' && table !== '' },
  );
}

export function useForeignKeys(database: string, schema: string, table: string) {
  return useCatalogQuery(
    queryKeys.catalog.foreignKeys(database, schema, table),
    () => catalogRepository.listForeignKeys(database, schema, table),
    STALE_TIMES.structural,
    { enabled: database !== '' && schema !== '' && table !== '' },
  );
}

export function useTriggers(database: string, schema: string, table: string) {
  return useCatalogQuery(
    queryKeys.catalog.triggers(database, schema, table),
    () => catalogRepository.listTriggers(database, schema, table),
    STALE_TIMES.structural,
    { enabled: database !== '' && schema !== '' && table !== '' },
  );
}

export function useTablespaces(database: string) {
  return useCatalogQuery(
    queryKeys.catalog.tablespaces(database),
    () => catalogRepository.listTablespaces(database),
    STALE_TIMES.static,
    { enabled: database !== '' },
  );
}

export interface SearchInput {
  database: string;
  schema: string;
  table: string;
  col: string;
  val: string;
  page: number;
}

export function useSearch(input: SearchInput) {
  const { database, schema, table, col, val, page } = input;
  return useQuery<BrowseResult, ApiError>({
    queryKey: queryKeys.data.search(database, schema, table, col, val, page),
    queryFn: () => dataRepository.search(database, schema, table, col, val, page),
    staleTime: STALE_TIMES.dynamic,
    enabled: database !== '' && table !== '' && col !== '' && val !== '',
    placeholderData: keepPreviousData,
  });
}

export interface RowInput {
  database: string;
  schema: string;
  table: string;
  pkCol: string;
  pkVal: string;
}

export function useRow(input: RowInput) {
  const { database, schema, table, pkCol, pkVal } = input;
  return useQuery({
    queryKey: queryKeys.data.row(database, schema, table, pkCol, pkVal),
    queryFn: () => dataRepository.getRow(database, schema, table, pkCol, pkVal),
    staleTime: STALE_TIMES.dynamic,
    enabled: database !== '' && schema !== '' && table !== '' && pkCol !== '' && pkVal !== '',
  });
}
