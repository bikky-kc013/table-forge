import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useDatabases } from '@/application/queries/index.js';
import { Badge } from '@/presentation/components/ui/badge.js';
import { Card, CardTable } from '@/presentation/components/ui/card.js';
import { EmptyState, ErrorState } from '@/presentation/components/ui/States.js';
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
import type { Database } from '@/domain/entities/index.js';

export function DatabaseTable({ databases, context }: { databases: Database[]; context: string }) {
  return (
    <Card>
      <CardTable>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Encoding</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="w-16 text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {databases.map((db) => (
              <TableRow key={db.name} data-state={db.name === context ? 'selected' : undefined}>
                <TableCell className="font-medium">
                  <Link
                    to={`/schemas?database=${db.name}`}
                    className="text-primary font-medium hover:underline hover:underline-offset-4"
                  >
                    {db.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" appearance="light" size="sm">
                    {db.owner}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-[13px]">{db.encoding}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-[13px]">
                  {db.size ?? '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    to={`/schemas?database=${db.name}`}
                    aria-label={`Open ${db.name}`}
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
  );
}

export function DatabasesPage() {
  const params = new URLSearchParams(window.location.search);
  const database = params.get('database') ?? 'postgres';

  const { data, isLoading, error, refetch } = useDatabases(database);

  return (
    <section aria-label="Databases">
      <PageHeader
        title="Databases"
        description={`${data?.length ?? 0} database(s) on this server`}
      />
      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : error ? (
        <ErrorState
          title="Failed to load databases"
          message={error.message}
          requestId={error.requestId}
          onRetry={() => void refetch()}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No databases found" hint="Check your connection and permissions." />
      ) : (
        <DatabaseTable databases={data} context={database} />
      )}
    </section>
  );
}
