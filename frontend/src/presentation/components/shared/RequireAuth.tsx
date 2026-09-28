import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/application/queries/index.js';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const location = useLocation();

  if (session.isLoading) {
    return (
      <div
        className="bg-background flex min-h-screen items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="text-muted-foreground size-6 animate-spin" aria-hidden />
        <span className="sr-only">Checking session…</span>
      </div>
    );
  }

  if (session.isError) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}
