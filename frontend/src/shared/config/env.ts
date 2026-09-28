import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().optional().default(''),
  VITE_APP_NAME: z.string().optional().default('TableForge'),
  VITE_APP_VERSION: z.string().optional().default('1.0.0'),
});

export type AppEnv = z.infer<typeof envSchema>;

function loadEnv(): AppEnv {
  const raw: Record<string, unknown> = {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL as unknown,
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME as unknown,
    VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION as unknown,
  };
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid frontend env: ${parsed.error.message}`);
  }
  return parsed.data;
}

export const env = loadEnv();
