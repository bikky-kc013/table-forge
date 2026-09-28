import { Skeleton } from './skeleton.js';

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div
      className="border-border bg-card overflow-hidden rounded-xl border"
      aria-label="Loading table"
    >
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-3">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className="h-4"
                style={{ width: `${55 + ((c * 37 + r * 13) % 35)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
