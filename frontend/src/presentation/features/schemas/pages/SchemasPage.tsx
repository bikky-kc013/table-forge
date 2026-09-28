import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useSchemas } from '@/application/queries/index.js';
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

export function SchemasPage() {
  const { database } = useDbContext();
  const [filter, setFilter] = useState('');
  const { data, isLoading, error, refetch } = useSchemas(database);

  if (!database) {
    return (
      <EmptyState
        title="No database selected"
        hint="Pick a database in the explorer to list its schemas."
      />
    );
  }

  const schemas = (data ?? []).filter((s) =>
    s.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  return (
    <section aria-label="Schemas">
      <PageHeader
        title="Schemas"
        description={`${data?.length ?? 0} schema(s) in ${database}`}
        actions={
          data && data.length > 0 ? (
            <SearchInput
              value={filter}
              onChange={setFilter}
              label="Filter schemas"
              placeholder="Filter schemas…"
            />
          ) : undefined
        }
      />
      {isLoading ? (
        <TableSkeleton rows={6} cols={3} />
      ) : error ? (
        <ErrorState
          title="Failed to load schemas"
          message={error.message}
          requestId={error.requestId}
          onRetry={() => void refetch()}
        />
      ) : schemas.length === 0 ? (
        <EmptyState
          title={data?.length ? 'No schemas match' : 'No schemas found'}
          hint={
            data?.length ? `Nothing matches "${filter}".` : 'Check your connection and permissions.'
          }
        />
      ) : (
        <Card>
          <CardTable>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="w-16 text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schemas.map((schema) => (
                  <TableRow key={schema.name}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/tables?database=${database}&schema=${schema.name}`}
                        className="text-primary font-medium hover:underline hover:underline-offset-4"
                      >
                        {schema.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" appearance="light" size="sm">
                        {schema.owner}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/tables?database=${database}&schema=${schema.name}`}
                        aria-label={`Open ${schema.name}`}
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
      )}
    </section>
  );
}
