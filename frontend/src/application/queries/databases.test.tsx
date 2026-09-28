// Integration test for the TanStack Query layer with MSW mocking the Go API,
// plus a smoke test for the DatabasesPage.
// Run: npm test
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useDatabases } from '@/application/queries/index.js';
import { DatabasesPage } from '@/presentation/features/databases/components/DatabaseTable.js';

const mockDatabases = [
  {
    name: 'mydb',
    owner: 'postgres',
    encoding: 'UTF8',
    allow_conn: true,
    is_template: false,
    conn_limit: -1,
  },
  {
    name: 'postgres',
    owner: 'postgres',
    encoding: 'UTF8',
    allow_conn: true,
    is_template: false,
    conn_limit: -1,
  },
];

const server = setupServer(http.get('/api/databases', () => HttpResponse.json(mockDatabases)));

function createTestClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

function wrapper(client: QueryClient): ({ children }: { children: ReactNode }) => ReactElement {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </MemoryRouter>
    );
  };
}

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

describe('useDatabases (MSW integration)', () => {
  it('fetches and maps databases through DTO validation', async () => {
    const { result } = renderHook(() => useDatabases('mydb'), {
      wrapper: wrapper(createTestClient()),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.map((d) => d.name)).toEqual(['mydb', 'postgres']);
    // snake_case → camelCase mapper check
    expect(result.current.data?.[0]).toMatchObject({ allowConn: true, isTemplate: false });
  });

  it('surfaces the typed ApiError on backend failure', async () => {
    server.use(
      http.get('/api/databases', () =>
        HttpResponse.json(
          { code: 500, error: 'Internal Server Error', message: 'boom', request_id: 'r1' },
          { status: 500 },
        ),
      ),
    );
    const { result } = renderHook(() => useDatabases('mydb'), {
      wrapper: wrapper(createTestClient()),
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.error?.requestId).toBe('r1');
  });
});

describe('DatabasesPage (smoke)', () => {
  it('renders the database grid', async () => {
    window.history.replaceState({}, '', '/?database=mydb');
    render(<DatabasesPage />, { wrapper: wrapper(createTestClient()) });
    expect(await screen.findByRole('heading', { name: 'Databases' })).toBeInTheDocument();
    expect(await screen.findByText('mydb')).toBeInTheDocument();
  });
});
