import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/domain/entities/error.js';
import type { BrowseResult } from '@/domain/entities/index.js';
import type { DdlAction } from '@/domain/repositories/index.js';
import {
  adminRepository,
  dataRepository,
  ddlRepository,
} from '@/infrastructure/repositories/index.js';
import { queryKeys } from '../query-keys.js';

export function useRunSql(database: string) {
  return useMutation<Awaited<ReturnType<typeof dataRepository.runSql>>, ApiError, string>({
    mutationFn: (query: string) => dataRepository.runSql(database, query),
  });
}

export function useExplain(database: string) {
  return useMutation<
    Awaited<ReturnType<typeof dataRepository.explain>>,
    ApiError,
    { query: string; analyze: boolean }
  >({
    mutationFn: (input) => dataRepository.explain(database, input.query, input.analyze),
  });
}

export function useCancelBackend(database: string) {
  const qc = useQueryClient();
  return useMutation<boolean, ApiError, number>({
    mutationFn: (pid: number) => adminRepository.cancelBackend(database, pid),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.activity(database) });
    },
  });
}

export interface DeleteRowInput {
  schema: string;
  table: string;
  pkCol: string;
  pkVal: string;
}

/** Optimistic single-row delete across all cached browse pages of the table. */
export function useDeleteRow(database: string) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, DeleteRowInput>({
    mutationFn: (input) =>
      dataRepository.deleteRow(database, input.schema, input.table, input.pkCol, input.pkVal),
    onMutate: async (input) => {
      const scope = queryKeys.data.tableScope(database, input.schema, input.table);
      await qc.cancelQueries({ queryKey: scope });
      const previous = qc.getQueriesData<BrowseResult>({ queryKey: scope });
      qc.setQueriesData<BrowseResult>({ queryKey: scope }, (old) => {
        if (!old) return old;
        const pkIdx = old.columns.indexOf(input.pkCol);
        if (pkIdx === -1) return old;
        return {
          ...old,
          rows: old.rows.filter((row) => String(row[pkIdx]) !== input.pkVal),
          rowCount: Math.max(0, old.rowCount - 1),
        };
      });
      return { previous };
    },
    onError: (_err, _input, context) => {
      const ctx = context as { previous?: Array<[unknown, unknown]> } | undefined;
      ctx?.previous?.forEach(([key, data]) => {
        qc.setQueryData(key as string[], data);
      });
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.data.tableScope(database, input.schema, input.table),
      });
    },
  });
}

export interface BulkDeleteInput extends Omit<DeleteRowInput, 'pkVal'> {
  pkVals: string[];
}

export function useBulkDelete(database: string) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, BulkDeleteInput>({
    mutationFn: (input) =>
      dataRepository.bulkDelete(database, input.schema, input.table, input.pkCol, input.pkVals),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.data.tableScope(database, input.schema, input.table),
      });
    },
  });
}

export function useVacuum(database: string) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, { schema: string; table: string; full: boolean }>({
    mutationFn: (input) => adminRepository.vacuum(database, input.schema, input.table, input.full),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.all });
    },
  });
}

export function useReindex(database: string) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, { schema: string; table: string }>({
    mutationFn: (input) => adminRepository.reindex(database, input.schema, input.table),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.all });
    },
  });
}

export interface InsertRowInput {
  schema: string;
  table: string;
  values: Record<string, unknown>;
}

export function useInsertRow(database: string) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, InsertRowInput>({
    mutationFn: (input) =>
      dataRepository.insertRow(database, input.schema, input.table, input.values),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.data.tableScope(database, input.schema, input.table),
      });
    },
  });
}

export interface UpdateRowInput {
  schema: string;
  table: string;
  pkCol: string;
  pkVal: string;
  values: Record<string, unknown>;
}

export function useUpdateRow(database: string) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, UpdateRowInput>({
    mutationFn: (input) =>
      dataRepository.updateRow(
        database,
        input.schema,
        input.table,
        input.pkCol,
        input.pkVal,
        input.values,
      ),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.data.tableScope(database, input.schema, input.table),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.data.row(database, input.schema, input.table, input.pkCol, input.pkVal),
      });
    },
  });
}

export interface DdlInput {
  schema: string;
  table: string;
  action: DdlAction;
  body: Record<string, unknown>;
}

export function useDdl(database: string) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, DdlInput>({
    mutationFn: (input) =>
      ddlRepository.run(database, input.schema, input.table, input.action, input.body),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.all });
      void qc.invalidateQueries({
        queryKey: queryKeys.data.tableScope(database, input.schema, input.table),
      });
    },
  });
}
