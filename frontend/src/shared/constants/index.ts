export const PAGE_SIZE_DEFAULT = 30;
export const PAGE_SIZE_MAX = 1000;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export const STALE_TIMES = {
  static: 10 * 60 * 1000,
  structural: 60 * 1000,
  dynamic: 15 * 1000,
  realtime: 5 * 1000,
} as const;

export const CSRF_HEADER = 'X-CSRF-Token';
export const CSRF_STORAGE_KEY = 'tf_csrf_token';
