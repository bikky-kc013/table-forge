import { z } from 'zod';

export const apiErrorSchema = z.object({
  code: z.number(),
  error: z.string(),
  message: z.string().optional(),
  details: z.string().optional(),
  request_id: z.string().optional(),
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: string;
  readonly requestId?: string;

  constructor(status: number, body: ApiErrorBody, fallbackMessage: string) {
    super(body.message ?? body.details ?? fallbackMessage);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.error;
    this.details = body.details;
    this.requestId = body.request_id;
  }

  isAuth(): boolean {
    return this.status === 401;
  }

  isForbidden(): boolean {
    return this.status === 403;
  }
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };
