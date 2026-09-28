import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Ban } from 'lucide-react';
import { useCancelBackend, useReindex, useVacuum } from '@/application/mutations/index.js';
import { useActivity, useTablespaces, useVariables } from '@/application/queries/index.js';
import { Alert, AlertIcon, AlertTitle } from '@/presentation/components/ui/alert.js';
import { Badge } from '@/presentation/components/ui/badge.js';
import { Button } from '@/presentation/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card.js';
import { CardTable } from '@/presentation/components/ui/card.js';
import { Checkbox } from '@/presentation/components/ui/checkbox.js';
import { DataTable } from '@/presentation/components/ui/DataTable.js';
import { EmptyState } from '@/presentation/components/ui/States.js';
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
import { TableTabs } from '@/presentation/components/shared/TableTabs.js';
import { useDbContext } from '@/presentation/features/databases/hooks/useDbContext.js';

function Maintenance({
  database,
  schema,
  table,
}: {
  database: string;
  schema: string;
  table: string;
}) {
  const [full, setFull] = useState(false);
  const vacuum = useVacuum(database);
  const reindex = useReindex(database);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance {table ? `· ${schema}.${table}` : null}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          loading={vacuum.isPending}
          disabled={!table}
          onClick={() => {
            vacuum.mutate({ schema, table, full });
          }}
        >
          Vacuum{table && full ? ' FULL' : ''}
        </Button>
        <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={full}
            onCheckedChange={(v) => {
              setFull(v === true);
            }}
          />
          Full
        </label>
        <Button
          variant="outline"
          loading={reindex.isPending}
          disabled={!table}
          onClick={() => {
            reindex.mutate({ schema, table });
          }}
        >
          Reindex
        </Button>
        {vacuum.isSuccess ? (
          <Badge variant="success" appearance="light" size="sm">
            Vacuum done
          </Badge>
        ) : null}
        {reindex.isSuccess ? (
          <Badge variant="success" appearance="light" size="sm">
            Reindex done
          </Badge>
        ) : null}
        {vacuum.isError ? (
          <span className="text-destructive text-xs">{vacuum.error.message}</span>
        ) : null}
        {reindex.isError ? (
          <span className="text-destructive text-xs">{reindex.error.message}</span>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdminPage() {
  const { database, schema, table } = useDbContext();
  const varsQuery = useVariables(database);
  const activityQuery = useActivity(database);
  const tablespacesQuery = useTablespaces(database);
  const cancel = useCancelBackend(database);

  if (!database) {
    return <EmptyState title="No database selected" hint="Log in and pick a database." />;
  }

  return (
    <section aria-label="Operations">
      <TableTabs active="admin" />
      <PageHeader
        title="Operations"
        description={`Server activity and maintenance on ${database}`}
      />

      {cancel.isError ? (
        <div className="mb-4">
          <Alert variant="destructive" appearance="light">
            <AlertIcon />
            <AlertTitle>{cancel.error.message}</AlertTitle>
          </Alert>
        </div>
      ) : null}

      <div className="space-y-4">
        <Maintenance database={database} schema={schema} table={table} />

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardTable>
            {activityQuery.isLoading ? (
              <div className="p-4">
                <TableSkeleton rows={4} cols={4} />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>PID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Database</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Query</TableHead>
                    <TableHead className="w-16 text-right">Kill</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(activityQuery.data ?? []).map((proc) => (
                    <TableRow key={proc.pid}>
                      <TableCell className="font-mono text-[13px]">{proc.pid}</TableCell>
                      <TableCell>{proc.usename}</TableCell>
                      <TableCell className="text-muted-foreground">{proc.datname}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" appearance="light" size="sm">
                          {proc.state ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate font-mono text-xs" title={proc.query}>
                        {proc.query}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Cancel backend ${proc.pid}`}
                          title={`Cancel backend ${proc.pid}`}
                          loading={cancel.isPending}
                          onClick={() => {
                            cancel.mutate(proc.pid);
                          }}
                        >
                          <Ban className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardTable>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tablespaces</CardTitle>
            </CardHeader>
            <CardContent>
              {tablespacesQuery.isLoading ? (
                <TableSkeleton rows={3} cols={2} />
              ) : (
                <DataTable
                  columns={['name', 'owner']}
                  rows={(tablespacesQuery.data ?? []).map((t) => [t.name, t.owner])}
                />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              {varsQuery.isLoading ? (
                <TableSkeleton rows={5} cols={2} />
              ) : (
                <DataTable
                  columns={['name', 'setting']}
                  rows={(varsQuery.data ?? []).slice(0, 25).map((v) => [v.name, v.setting])}
                  caption={`Showing 25 of ${varsQuery.data?.length ?? 0} variables`}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Link
          to={`/roles?database=${database}`}
          className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline hover:underline-offset-4"
        >
          Manage roles <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
