import { Link, useRouteError } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertIcon, AlertTitle } from '@/presentation/components/ui/alert.js';
import { Button, buttonVariants } from '@/presentation/components/ui/button.js';
import { Card, CardContent } from '@/presentation/components/ui/card.js';
import { cn } from '@/shared/utils/index.js';

export function RouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6 text-center">
          <span className="bg-destructive/10 mx-auto flex size-11 items-center justify-center rounded-full">
            <AlertTriangle className="text-destructive size-5" aria-hidden />
          </span>
          <Alert variant="destructive" appearance="light">
            <AlertIcon />
            <AlertTitle>{message}</AlertTitle>
          </Alert>
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload
            </Button>
            <Link to="/databases" className={cn(buttonVariants({ variant: 'ghost' }))}>
              Go home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
