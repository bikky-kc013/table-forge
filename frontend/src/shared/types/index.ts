export type SortDir = 'ASC' | 'DESC';

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string; requestId?: string }
  | { status: 'empty' }
  | { status: 'success'; data: T };
