import { request, setCsrfToken } from '../client.js';
import { serverListSchema, sessionDtoSchema } from '../dto/index.js';
import type { ServerInfo, SessionInfo } from '@/domain/entities/index.js';

export const authApi = {
  async listServers(): Promise<ServerInfo[]> {
    return request('/api/servers', (p) => serverListSchema.parse(p));
  },

  async getSession(): Promise<SessionInfo> {
    const dto = await request('/api/session', (p) => sessionDtoSchema.parse(p));
    setCsrfToken(dto.csrf_token);
    return { username: dto.username, database: dto.database, csrfToken: dto.csrf_token };
  },

  async login(server: number, username: string, password: string): Promise<SessionInfo> {
    const dto = await request('/api/login', (p) => sessionDtoSchema.parse(p), {
      method: 'POST',
      json: { server, username, password },
      withCsrf: false,
    });
    setCsrfToken(dto.csrf_token);
    return { username: dto.username, database: dto.database, csrfToken: dto.csrf_token };
  },

  async logout(): Promise<void> {
    await request('/api/logout', () => undefined, { method: 'POST' });
    setCsrfToken(null);
  },

  /** Legacy form POST used until POST /api/login exists. Redirects on success. */
  async loginFormFallback(server: number, username: string, password: string): Promise<void> {
    const form = new URLSearchParams({ server: String(server), username, password });
    const res = await fetch('/login', {
      method: 'POST',
      body: form,
      credentials: 'include',
      redirect: 'manual',
    });
    if (res.status !== 302 && res.status !== 200 && res.status !== 0) {
      throw new Error(`Login failed (status ${String(res.status)})`);
    }
    await authApi.getSession().catch(() => undefined);
  },
};
