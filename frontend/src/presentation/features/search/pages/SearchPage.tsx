import { useState } from 'react';
import { useColumns, useSearch } from '@/application/queries/index.js';
import { DataTable } from '@/presentation/components/ui/DataTable.js';
import { Button } from '@/presentation/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card.js';
import { EmptyState } from '@/presentation/components/ui/States.js';
import { Input, InputWrapper } from '@/presentation/components/ui/input.js';
import { Label } from '@/presentation/components/ui/label.js';
import { TableSkeleton } from '@/presentation/components/ui/TableSkeleton.js';
import { PageHeader } from '@/presentation/components/shared/PageHeader.js';
import { TableTabs } from '@/presentation/components/shared/TableTabs.js';
import { useDbContext } from '@/presentation/features/databases/hooks/useDbContext.js';

export function SearchPage() {
  const { database, schema, table } = useDbContext();
  const [col, setCol] = useState('');
  const [val, setVal] = useState('');
  const [submitted, setSubmitted] = useState<{ col: string; val: string } | null>(null);

  const columnsQuery = useColumns(database, schema, table);
  const search = useSearch({
    database,
    schema,
    table,
    col: submitted?.col ?? '',
    val: submitted?.val ?? '',
    page: 1,
  });

  if (!database || !table) {
    return (
      <EmptyState
        title="Select a table first"
        hint="Pick database → schema → table in the explorer to search."
      />
    );
  }

  const columns = columnsQuery.data ?? [];

  return (
    <section aria-label="Search">
      <TableTabs active="search" />
      <PageHeader title={`Search · ${schema}.${table}`} />
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Find rows</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (col && val) setSubmitted({ col, val });
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="search-col">Column</Label>
                <select
                  id="search-col"
                  value={col}
                  onChange={(e) => {
                    setCol(e.target.value);
                  }}
                  className="border-input bg-background text-foreground focus-visible:ring-ring/30 h-8.5 rounded-md border px-3 text-[0.8125rem] focus-visible:ring-[3px] focus-visible:outline-none"
                >
                  <option value="">Select column…</option>
                  {columns.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="search-val">Contains</Label>
                <InputWrapper>
                  <Input
                    id="search-val"
                    value={val}
                    placeholder="Search value…"
                    onChange={(e) => {
                      setVal(e.target.value);
                    }}
                  />
                </InputWrapper>
              </div>
              <Button type="submit" disabled={!col || !val} loading={search.isFetching}>
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {search.isFetching && !search.data ? <TableSkeleton rows={5} cols={4} /> : null}
        {search.data ? (
          search.data.rows.length > 0 ? (
            <DataTable
              columns={search.data.columns}
              rows={search.data.rows}
              caption={`${search.data.rowCount} matching row(s)`}
            />
          ) : (
            <EmptyState title="No matches" hint={`Nothing in ${col} contains "${val}".`} />
          )
        ) : null}
      </div>
    </section>
  );
}
