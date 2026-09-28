// Shell tests: full app renders without crashing (Slot regression), the
// sidebar tree works, and sidebar nav actually navigates (preventDefault fix).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { AppLayout } from '@/presentation/layouts/AppLayout.js';
import { BrowsePage } from '@/presentation/features/browse/pages/BrowsePage.js';
import { DatabasesPage } from '@/presentation/features/databases/pages/DatabasesPage.js';
import { ExportPage } from '@/presentation/features/export/pages/ExportPage.js';
import { SqlPage } from '@/presentation/features/sql/pages/SqlPage.js';

const server = setupServer(
  http.get('/api/session', () =>
    HttpResponse.json({ username: 'postgres', database: 'postgres', csrf_token: 't' }),
  ),
  http.get('/api/databases', () =>
    HttpResponse.json([
      {
        name: 'postgres',
        owner: 'postgres',
        encoding: 'UTF8',
        allow_conn: true,
        is_template: false,
        conn_limit: -1,
      },
    ]),
  ),
  http.get('/api/schemas', () => HttpResponse.json([{ name: 'public', owner: 'postgres' }])),
  http.get('/api/tables', () =>
    HttpResponse.json([
      {
        oid: 1,
        name: 'users',
        schema: 'public',
        owner: 'postgres',
        row_estimate: 2,
        has_oids: false,
        kind: 'r',
      },
    ]),
  ),
  http.get('/api/columns', () =>
    HttpResponse.json([
      {
        name: 'id',
        position: 1,
        type: 'integer',
        type_oid: 23,
        length: -1,
        not_null: true,
        is_array: false,
        dimensions: 0,
      },
    ]),
  ),
  http.get('/api/browse', () =>
    HttpResponse.json({
      columns: ['id', 'name'],
      rows: [[1, 'alice']],
      row_count: 1,
      page: 1,
      page_size: 30,
      max_pages: 1,
      total_rows: 1,
      pkcol: "id",
    }),
  ),
);

function renderAt(path: string, pages: Record<string, ReactElement>): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: Object.entries(pages).map(([p, el]) => ({ path: p, element: el })),
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <Wrapper>
      <RouterProvider router={router} />
    </Wrapper>,
  );
}

const allPages = {
  '/databases': <DatabasesPage />,
  '/browse': <BrowsePage />,
  '/export': <ExportPage />,
  '/sql': <SqlPage />,
};

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

describe('app shell', () => {
  it('renders the explorer tree in the sidebar', async () => {
    renderAt('/browse?database=postgres&schema=public&table=users', allPages);
    const sidebar = await screen.findByRole('complementary', {}, { timeout: 8000 });
    expect(await within(sidebar).findByText('users', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(within(sidebar).getByText('public')).toBeInTheDocument();
  });

  it('sidebar nav navigates between pages', async () => {
    // NOTE: MemoryRouter (not the data router) — data-router navigate() hangs
    // in this jsdom setup for reasons unrelated to app code.
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/databases?database=postgres']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/databases" element={<DatabasesPage />} />
              <Route path="/sql" element={<SqlPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('main')).toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Databases' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /sql runner/i }));
    expect(await within(main).findByRole('heading', { name: 'SQL Runner' })).toBeInTheDocument();
  });

  it('renders the export page without Slot crashes', async () => {
    renderAt('/export?database=postgres&schema=public&table=users', allPages);
    expect(await screen.findByRole('heading', { name: 'Export' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /download csv/i })).toBeInTheDocument();
  });

  it('renders browse bulk actions without Slot crashes', async () => {
    const user = userEvent.setup();
    renderAt('/browse?database=postgres&schema=public&table=users', allPages);
    await screen.findByText('alice');
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
    await waitFor(() => {
      const link = document.querySelector('a[href^="/export/csv"]');
      expect(link).not.toBeNull();
      expect(link).toHaveTextContent('Export');
    });
  });

  it('expands another schema and shows its tables', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/schemas', () =>
        HttpResponse.json([
          { name: 'public', owner: 'postgres' },
          { name: 'analytics', owner: 'postgres' },
        ]),
      ),
      http.get('/api/tables', ({ request }) => {
        const schema = new URL(request.url).searchParams.get('schema');
        if (schema === 'analytics') {
          return HttpResponse.json([
            {
              oid: 2,
              name: 'events',
              schema: 'analytics',
              owner: 'postgres',
              row_estimate: 5,
              has_oids: false,
              kind: 'r',
            },
          ]);
        }
        return HttpResponse.json([
          {
            oid: 1,
            name: 'users',
            schema: 'public',
            owner: 'postgres',
            row_estimate: 2,
            has_oids: false,
            kind: 'r',
          },
        ]);
      }),
    );
    renderAt('/browse?database=postgres&schema=public&table=users', allPages);
    const sidebar = await screen.findByRole('complementary', {}, { timeout: 8000 });
    await within(sidebar).findByText('public', {}, { timeout: 8000 });
    expect(within(sidebar).queryByText('events')).not.toBeInTheDocument();
    await user.click(within(sidebar).getByRole('button', { name: 'analytics' }));
    expect(await within(sidebar).findByText('events', {}, { timeout: 8000 })).toBeInTheDocument();
  });
});
