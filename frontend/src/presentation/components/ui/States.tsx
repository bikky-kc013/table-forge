import { AlertCircle, Inbox } from 'lucide-react';
import { Alert, AlertIcon, AlertTitle } from './alert.js';
import { Button } from './button.js';
import { Card, CardContent } from './card.js';

interface Props {
  title: string;
  message?: string;
  requestId?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, requestId, onRetry }: Props) {
  return (
    <Alert variant="destructive" appearance="light">
      <AlertIcon>
        <AlertCircle className="size-4" />
      </AlertIcon>
      <div className="grow">
        <AlertTitle>{title}</AlertTitle>
        {message ? <p className="mt-1 text-sm">{message}</p> : null}
        {requestId ? (
          <p className="mt-1 font-mono text-xs opacity-70">Request ID: {requestId}</p>
        ) : null}
        {onRetry ? (
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : null}
      </div>
    </Alert>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
        <span className="bg-muted flex size-11 items-center justify-center rounded-full">
          <Inbox className="text-muted-foreground size-5" aria-hidden />
        </span>
        <p className="text-foreground text-sm font-medium">{title}</p>
        {hint ? <p className="text-muted-foreground text-sm">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
