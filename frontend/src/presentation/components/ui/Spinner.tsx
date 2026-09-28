import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/utils/index.js';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('text-muted-foreground flex items-center gap-2 py-8')}
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}
