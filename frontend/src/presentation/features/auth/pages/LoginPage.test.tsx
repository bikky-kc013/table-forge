// Regression test for: "typed username/password, submit still says required".
// Cause was the RHF register() ref being dropped by the plain function Input
// on React 18, so validation always saw empty fields.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { LoginPage } from './LoginPage.js';

let loginHits = 0;

const server = setupServer(
  http.get('/api/servers', () =>
    HttpResponse.json([{ desc: 'Local', host: '127.0.0.1', port: 5432 }]),
  ),
  http.post('/api/login', () => {
    loginHits += 1;
    return HttpResponse.json({ username: 'postgres', database: 'postgres', csrf_token: 't' });
  }),
);

function renderLogin(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <MemoryRouter initialEntries={['/login']}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
  render(<LoginPage />, { wrapper: Wrapper });
}

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
  loginHits = 0;
});
afterAll(() => {
  server.close();
});

describe('LoginPage', () => {
  it('submits typed credentials instead of reporting required', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Username'), 'postgres');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(loginHits).toBe(1);
    });
    expect(screen.queryByText('Username is required')).not.toBeInTheDocument();
    expect(screen.queryByText('Password is required')).not.toBeInTheDocument();
  });

  it('still reports required for empty fields', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Username is required')).toBeInTheDocument();
    expect(await screen.findByText('Password is required')).toBeInTheDocument();
    expect(loginHits).toBe(0);
  });

  it('shows server error from the API', async () => {
    server.use(
      http.post('/api/login', () =>
        HttpResponse.json(
          { code: 401, error: 'Unauthorized', message: 'Login failed' },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Username'), 'postgres');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Login failed');
  });
});
