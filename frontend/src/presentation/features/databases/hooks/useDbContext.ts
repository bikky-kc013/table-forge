import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface DbContext {
  database: string;
  schema: string;
  table: string;
}

export function useDbContext(): DbContext {
  const [params] = useSearchParams();
  return useMemo(
    () => ({
      database: params.get('database') ?? '',
      schema: params.get('schema') ?? 'public',
      table: params.get('table') ?? '',
    }),
    [params],
  );
}
