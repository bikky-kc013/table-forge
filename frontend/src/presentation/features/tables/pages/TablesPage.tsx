import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTables, useViews } from '@/application/queries/index.js';
import { Badge } from '@/presentation/components/ui/badge.js';
import { Card, CardTable } from '@/presentation/components/ui/card.js';
import { EmptyState, ErrorState } from '@/presentation/components/ui/States.js';
import { SearchInput } from '@/presentation/components/ui/SearchInput.js';
import { TableSkeleton } from '@/presentation/components/ui/TableSkeleton.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/presentation/components/ui/table.js';
import { PageHeader } from '@/presentation/components/shared/PageHeader.js';
import { useDbContext } from '@/presentation/features/databases/hooks/useDbContext.js';

function formatEstimate(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

export function TablesPage() {
  const { database, schema } = useDbContext();
  const [filter, setFilter] = useState('');
  const tablesQuery = useTables(database, schema);
  const viewsQuery = useViews(database, schema);

  if (!database) {
    return (
      <EmptyState
        title="No database selected"
        hint="Pick a database in the explorer to list its tables."
      />
    );
  }

  const f = filter.trim().toLowerCase();
  const tables = (tablesQuery.data ?? []).filter((t) => t.name.toLowerCase().includes(f));
  const views = (viewsQuery.data ?? []).filter((v) => v.name.toLowerCase().includes(f));
  const isLoading = tablesQuery.isLoading;
  const error = tablesQuery.error;

  return (
    <section aria-label="Tables">
      <PageHeader
        title={`Tables · ${schema}`}
        description={`${tablesQuery.data?.length ?? 0} table(s), ${views.length} view(s) in ${database}.${schema}`}
        actions={
          tablesQuery.data && tablesQuery.data.length > 0 ? (
            <SearchInput
              value={filter}
              onChange={setFilter}
              label="Filter tables"
              placeholder="Filter tables…"
            />
          ) : undefined
        }
      />
      {isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : error ? (
        <ErrorState
          title="Failed to load tables"
          message={error.message}
          requestId={error.requestId}
          onRetry={() => void tablesQuery.refetch()}
        />
      ) : tables.length === 0 && views.length === 0 ? (
        <EmptyState
          title={tablesQuery.data?.length ? 'Nothing matches' : 'No tables found'}
          hint={tablesQuery.data?.length ? `No match for "${filter}".` : `${schema} has no tables.`}
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardTable>
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Est. rows</TableHead>
                    <TableHead className="w-16 text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.map((table) => (
                    <TableRow key={table.oid}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/browse?database=${database}&schema=${schema}&table=${table.name}`}
                          className="text-primary font-medium hover:underline hover:underline-offset-4"
                        >
                          {table.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" appearance="light" size="sm">
                          {table.kind || 'table'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{table.owner}</TableCell>
                      <TableCell className="text-right font-mono text-[13px]">
                        {formatEstimate(table.rowEstimate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to={`/browse?database=${database}&schema=${schema}&table=${table.name}`}
                          aria-label={`Browse ${table.name}`}
                          className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex rounded-md p-1.5 transition-colors"
                        >
                          <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardTable>
          </Card>

          {views.length > 0 ? (
            <Card>
              <CardTable>
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Views</TableHead>
                      <TableHead>Owner</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {views.map((view) => (
                      <TableRow key={`${view.schema}.${view.name}`}>
                        <TableCell className="font-medium">{view.name}</TableCell>
                        <TableCell className="text-muted-foreground">{view.owner}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardTable>
            </Card>
          ) : null}
        </div>
      )}
    </section>
  );
}
