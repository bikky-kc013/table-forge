import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout, AuthLayout } from '@/presentation/layouts/AppLayout.js';
import { RouteError } from '@/presentation/components/shared/RouteError.js';
import { AdminPage } from '@/presentation/features/admin/pages/AdminPage.js';
import { LoginPage } from '@/presentation/features/auth/pages/LoginPage.js';
import { DatabasesPage } from '@/presentation/features/databases/pages/DatabasesPage.js';
import { BrowsePage } from '@/presentation/features/browse/pages/BrowsePage.js';
import { EditPage } from '@/presentation/features/edit/pages/EditPage.js';
import { ExportPage } from '@/presentation/features/export/pages/ExportPage.js';
import { InsertPage } from '@/presentation/features/insert/pages/InsertPage.js';
import { RolesPage } from '@/presentation/features/roles/pages/RolesPage.js';
import { SchemasPage } from '@/presentation/features/schemas/pages/SchemasPage.js';
import { SearchPage } from '@/presentation/features/search/pages/SearchPage.js';
import { SqlPage } from '@/presentation/features/sql/pages/SqlPage.js';
import { StructurePage } from '@/presentation/features/structure/pages/StructurePage.js';
import { TablesPage } from '@/presentation/features/tables/pages/TablesPage.js';

const router = createBrowserRouter(
  [
    {
      element: <AuthLayout />,
      errorElement: <RouteError />,
      children: [{ path: '/login', element: <LoginPage /> }],
    },
    {
      element: <AppLayout />,
      errorElement: <RouteError />,
      children: [
        { path: '/', element: <Navigate to="/databases" replace /> },
        { path: '/databases', element: <DatabasesPage /> },
        { path: '/schemas', element: <SchemasPage /> },
        { path: '/tables', element: <TablesPage /> },
        { path: '/table', element: <StructurePage /> },
        { path: '/browse', element: <BrowsePage /> },
        { path: '/sql', element: <SqlPage /> },
        { path: '/search', element: <SearchPage /> },
        { path: '/insert', element: <InsertPage /> },
        { path: '/edit', element: <EditPage /> },
        { path: '/export', element: <ExportPage /> },
        { path: '/admin', element: <AdminPage /> },
        { path: '/roles', element: <RolesPage /> },
        { path: '*', element: <Navigate to="/databases" replace /> },
      ],
    },
  ],
  { basename: '/app' },
);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
