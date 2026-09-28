import { ApiError, apiErrorSchema } from '@/domain/entities/error.js';
import { CSRF_HEADER, CSRF_STORAGE_KEY } from '@/shared/constants/index.js';
import { env } from '@/shared/config/env.js';

let csrfToken: string | null = sessionStorage.getItem(CSRF_STORAGE_KEY);

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
  if (token === null) {
    sessionStorage.removeItem(CSRF_STORAGE_KEY);
  } else {
    sessionStorage.setItem(CSRF_STORAGE_KEY, token);
  }
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  query?: Record<string, string | number | boolean | undefined | null>;
  json?: unknown;
  form?: FormData | URLSearchParams;
  body?: BodyInit;
  headers?: HeadersInit;
  withCsrf?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = env.VITE_API_BASE_URL.replace(/\/$/, '');
  const url = new URL(`${base}${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

function isSafeMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

export async function request<T>(
  path: string,
  parse: (payload: unknown) => T,
  options: RequestOptions = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  let body: BodyInit | undefined;

  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.json);
  } else if (options.form !== undefined) {
    body = options.form;
  } else if (options.body !== undefined) {
    body = options.body;
  }

  const withCsrf = options.withCsrf ?? !isSafeMethod(method);
  if (withCsrf && csrfToken) {
    headers.set(CSRF_HEADER, csrfToken);
  }

  const res = await fetch(buildUrl(path, options.query), {
    ...options,
    method,
    headers,
    body,
    credentials: 'include',
  });

  if (res.status === 204) {
    return parse(null);
  }

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  let payload: unknown = null;
  if (isJson) {
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
  } else if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(
      res.status,
      { code: res.status, error: res.statusText || 'Error', message: text },
      `Request failed: ${method} ${path}`,
    );
  }

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(payload);
    if (parsed.success) {
      throw new ApiError(res.status, parsed.data, `Request failed: ${method} ${path}`);
    }
    throw new ApiError(
      res.status,
      { code: res.status, error: res.statusText || 'Error' },
      `Request failed: ${method} ${path}`,
    );
  }

  return parse(payload);
}
