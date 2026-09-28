import { useState } from 'react';
import { useExplain, useRunSql } from '@/application/mutations/index.js';
import { Alert, AlertIcon, AlertTitle } from '@/presentation/components/ui/alert.js';
import { Button } from '@/presentation/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card.js';
import { Checkbox } from '@/presentation/components/ui/checkbox.js';
import { DataTable } from '@/presentation/components/ui/DataTable.js';
import { EmptyState } from '@/presentation/components/ui/States.js';
import { TableSkeleton } from '@/presentation/components/ui/TableSkeleton.js';
import { Textarea } from '@/presentation/components/ui/textarea.js';
import { PageHeader } from '@/presentation/components/shared/PageHeader.js';
import { TableTabs } from '@/presentation/components/shared/TableTabs.js';
import { useDbContext } from '@/presentation/features/databases/hooks/useDbContext.js';

export function SqlPage() {
  const { database, schema, table } = useDbContext();
  const [query, setQuery] = useState(table ? `SELECT * FROM ${schema}.${table} LIMIT 100;` : '');
  const [analyze, setAnalyze] = useState(false);

  const run = useRunSql(database);
  const explain = useExplain(database);

  if (!database) {
    return (
      <EmptyState title="No database selected" hint="Log in and pick a database to run SQL." />
    );
  }

  const result = run.data?.result ?? null;

  return (
    <section aria-label="SQL Runner">
      <TableTabs active="sql" />
      <PageHeader title="SQL Runner" description={`Running on ${database}`} />
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Query</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              placeholder="SELECT * FROM public.mytable LIMIT 100;"
              rows={6}
              className="font-mono"
              aria-label="SQL query"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => {
                  explain.reset();
                  run.mutate(query);
                }}
                loading={run.isPending}
                disabled={!query.trim()}
              >
                Run query
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  run.reset();
                  explain.mutate({ query, analyze });
                }}
                loading={explain.isPending}
                disabled={!query.trim()}
              >
                Explain{analyze ? ' Analyze' : ''}
              </Button>
              <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={analyze}
                  onCheckedChange={(v) => {
                    setAnalyze(v === true);
                  }}
                />
                Analyze
              </label>
            </div>
          </CardContent>
        </Card>

        {run.isError ? (
          <Alert variant="destructive" appearance="light">
            <AlertIcon />
            <AlertTitle>{run.error.message}</AlertTitle>
          </Alert>
        ) : null}
        {explain.isError ? (
          <Alert variant="destructive" appearance="light">
            <AlertIcon />
            <AlertTitle>{explain.error.message}</AlertTitle>
          </Alert>
        ) : null}

        {run.isPending ? <TableSkeleton rows={5} cols={4} /> : null}
        {result && result.rows.length > 0 ? (
          <DataTable
            columns={result.columns}
            rows={result.rows}
            caption={`${result.rowCount} row(s)${run.data ? ` · ${run.data.affected} affected` : ''}`}
          />
        ) : null}
        {run.data && !result ? (
          <EmptyState
            title="Query ran successfully"
            hint={`${run.data.affected} row(s) affected.`}
          />
        ) : null}
        {explain.data ? (
          <Card>
            <CardHeader>
              <CardTitle>Execution plan</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted text-foreground overflow-x-auto rounded-md p-3 font-mono text-xs">
                {explain.data.rows.join('\n')}
              </pre>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
