// Browse interactions: FK affordance + Ctrl+Enter navigation, double-click
// inline edit commit.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { AppLayout } from '@/presentation/layouts/AppLayout.js';
import { BrowsePage } from '@/presentation/features/browse/pages/BrowsePage.js';
import { EditPage } from '@/presentation/features/edit/pages/EditPage.js';

let putBody: unknown = null;

const server = setupServer(
  http.get('/api/session', () =>
    HttpResponse.json({ username: 'postgres', database: 'postgres', csrf_token: 't' }),
  ),
  http.get('/api/databases', () => HttpResponse.json([])),
  http.get('/api/schemas', () => HttpResponse.json([{ name: 'public', owner: 'postgres' }])),
  http.get('/api/tables', () => HttpResponse.json([])),
  http.get('/api/columns', ({ request }) => {
    const table = new URL(request.url).searchParams.get('table');
    if (table === 'users') {
      return HttpResponse.json([
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
        {
          name: 'name',
          position: 2,
          type: 'text',
          type_oid: 25,
          length: -1,
          not_null: true,
          is_array: false,
          dimensions: 0,
        },
      ]);
    }
    return HttpResponse.json([
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
      {
        name: 'user_id',
        position: 2,
        type: 'integer',
        type_oid: 23,
        length: -1,
        not_null: true,
        is_array: false,
        dimensions: 0,
      },
      {
        name: 'note',
        position: 3,
        type: 'text',
        type_oid: 25,
        length: -1,
        not_null: false,
        is_array: false,
        dimensions: 0,
      },
    ]);
  }),
  http.get('/api/browse', () =>
    HttpResponse.json({
      columns: ['id', 'user_id', 'note'],
      rows: [[101, 7, 'hi']],
      row_count: 1,
      page: 1,
      page_size: 30,
      max_pages: 1,
      total_rows: 1,
      pkcol: "id",
    }),
  ),
  http.get('/api/foreign-keys', () =>
    HttpResponse.json([
      { column: 'user_id', ref_schema: 'public', ref_table: 'users', ref_column: 'id' },
    ]),
  ),
  http.get('/api/row', () => HttpResponse.json({ columns: ['id', 'name'], row: [7, 'bob'] })),
  http.put('/api/rows', ({ request }) =>
    request.json().then((body) => {
      putBody = body;
      return HttpResponse.json({ ok: true });
    }),
  ),
);

function renderAt(path: string): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [
          { path: '/browse', element: <BrowsePage /> },
          { path: '/edit', element: <EditPage /> },
        ],
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

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
  putBody = null;
});
afterAll(() => {
  server.close();
});

describe('browse interactions', () => {
  it('marks FK cells and follows them with Ctrl+Enter', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: ReactNode }): ReactElement => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const router = createMemoryRouter(
      [
        {
          element: <AppLayout />,
          children: [
            { path: '/browse', element: <BrowsePage /> },
            { path: '/edit', element: <EditPage /> },
          ],
        },
      ],
      { initialEntries: ['/browse?database=postgres&schema=public&table=orders'] },
    );
    const navSpy = vi.spyOn(router, 'navigate');
    render(
      <Wrapper>
        <RouterProvider router={router} />
      </Wrapper>,
    );
    await screen.findByText('hi');
    const fkCell = screen.getByTitle('Ctrl+Enter to open public.users (id)');
    expect(fkCell).toHaveTextContent('7');
    fireEvent.keyDown(fkCell, { key: 'Enter', ctrlKey: true });
    expect(navSpy).toHaveBeenCalledTimes(1);
    const firstArg = navSpy.mock.calls[0]?.[0];
    expect(firstArg).toBe('/edit?database=postgres&schema=public&table=users&pkcol=id&pkval=7');
    navSpy.mockRestore();
  });

  it('double-click edits a cell and Enter commits via PUT', async () => {
    const user = userEvent.setup();
    renderAt('/browse?database=postgres&schema=public&table=orders');
    await screen.findByText('hi');
    await user.dblClick(screen.getByText('hi'));
    const input = await screen.findByLabelText('Edit note');
    expect(input).toHaveValue('hi');
    await user.clear(input);
    await user.type(input, 'hello');
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => {
      expect(putBody).toMatchObject({
        schema: 'public',
        table: 'orders',
        pkcol: 'id',
        pkval: '101',
        values: { note: 'hello' },
      });
    });
    await waitFor(() => {
      expect(screen.queryByLabelText('Edit note')).not.toBeInTheDocument();
    });
  });

  it('Escape cancels inline editing without a PUT', async () => {
    const user = userEvent.setup();
    renderAt('/browse?database=postgres&schema=public&table=orders');
    await screen.findByText('hi');
    await user.dblClick(screen.getByText('hi'));
    const input = await screen.findByLabelText('Edit note');
    await user.type(input, 'changed');
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByLabelText('Edit note')).not.toBeInTheDocument();
    });
    expect(putBody).toBeNull();
  });

  it('uses the real PK (not first column) for identity and editing', async () => {
    // Regression: PK heuristic (first column) broke selection/updates and
    // disabled editing on the first column for tables like (note, user_id).
    server.use(
      http.get('/api/browse', () =>
        HttpResponse.json({
          columns: ['note', 'user_id'],
          rows: [['hi', 7]],
          row_count: 1,
          page: 1,
          page_size: 30,
          max_pages: 1,
          total_rows: 1,
          pkcol: 'user_id',
        }),
      ),
    );
    const user = userEvent.setup();
    renderAt('/browse?database=postgres&schema=public&table=orders');
    await screen.findByText('hi');
    // First column is editable now (it is not the PK)...
    await user.dblClick(screen.getByText('hi'));
    const input = await screen.findByLabelText('Edit note');
    await user.clear(input);
    await user.type(input, 'hello');
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => {
      expect(putBody).toMatchObject({
        pkcol: 'user_id',
        pkval: '7',
        values: { note: 'hello' },
      });
    });
    // ...and row identity comes from the real PK.
    expect(screen.getByRole('checkbox', { name: 'Select row 7' })).toBeInTheDocument();
  });
});
