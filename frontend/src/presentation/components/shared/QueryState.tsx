import type { ReactNode } from 'react';
import { Spinner } from '@/presentation/components/ui/Spinner.js';
import { EmptyState, ErrorState } from '@/presentation/components/ui/States.js';
import { ApiError } from '@/domain/entities/error.js';

export function QueryState<T>({
  isLoading,
  error,
  data,
  emptyTitle,
  emptyHint,
  children,
  onRetry,
}: {
  isLoading: boolean;
  error: ApiError | Error | null;
  data: T | undefined;
  emptyTitle: string;
  emptyHint?: string;
  children: (data: T) => ReactNode;
  onRetry?: () => void;
}) {
  if (isLoading) return <Spinner />;
  if (error) {
    const requestId = error instanceof ApiError ? error.requestId : undefined;
    return (
      <ErrorState
        title="Something went wrong"
        message={error.message}
        requestId={requestId}
        onRetry={onRetry}
      />
    );
  }
  if (data === undefined || (Array.isArray(data) && data.length === 0)) {
    return <EmptyState title={emptyTitle} hint={emptyHint} />;
  }
  return <>{children(data)}</>;
}
