import { useRoles } from '@/application/queries/index.js';
import { Badge } from '@/presentation/components/ui/badge.js';
import { Card, CardTable } from '@/presentation/components/ui/card.js';
import { EmptyState, ErrorState } from '@/presentation/components/ui/States.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/presentation/components/ui/table.js';
import { TableSkeleton } from '@/presentation/components/ui/TableSkeleton.js';
import { PageHeader } from '@/presentation/components/shared/PageHeader.js';
import { useDbContext } from '@/presentation/features/databases/hooks/useDbContext.js';

export function RolesPage() {
  const { database } = useDbContext();
  const { data, isLoading, error, refetch } = useRoles(database);

  if (!database) {
    return <EmptyState title="No database selected" hint="Log in and pick a database." />;
  }

  return (
    <section aria-label="Roles">
      <PageHeader title="Roles" description={`${data?.length ?? 0} role(s)`} />
      {isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : error ? (
        <ErrorState
          title="Failed to load roles"
          message={error.message}
          requestId={error.requestId}
          onRetry={() => void refetch()}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No roles found" />
      ) : (
        <Card>
          <CardTable>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Attributes</TableHead>
                  <TableHead className="text-right">Conn. limit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((role) => (
                  <TableRow key={role.oid}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1">
                        {role.superuser ? (
                          <Badge variant="destructive" appearance="light" size="sm">
                            superuser
                          </Badge>
                        ) : null}
                        {role.canLogin ? (
                          <Badge variant="success" appearance="light" size="sm">
                            login
                          </Badge>
                        ) : (
                          <Badge variant="secondary" appearance="light" size="sm">
                            nologin
                          </Badge>
                        )}
                        {role.createDb ? (
                          <Badge variant="secondary" appearance="light" size="sm">
                            createdb
                          </Badge>
                        ) : null}
                        {role.createRole ? (
                          <Badge variant="secondary" appearance="light" size="sm">
                            createrole
                          </Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-[13px]">
                      {role.connLimit}
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
