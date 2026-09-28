import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useInsertRow } from '@/application/mutations/index.js';
import { useColumns } from '@/application/queries/index.js';
import { Alert, AlertIcon, AlertTitle } from '@/presentation/components/ui/alert.js';
import { Button } from '@/presentation/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card.js';
import { EmptyState } from '@/presentation/components/ui/States.js';
import { Input, InputWrapper } from '@/presentation/components/ui/input.js';
import { Label } from '@/presentation/components/ui/label.js';
import { TableSkeleton } from '@/presentation/components/ui/TableSkeleton.js';
import { PageHeader } from '@/presentation/components/shared/PageHeader.js';
import { TableTabs } from '@/presentation/components/shared/TableTabs.js';
import { useDbContext } from '@/presentation/features/databases/hooks/useDbContext.js';

interface InsertForm {
  values: Record<string, string>;
}

export function InsertPage() {
  const { database, schema, table } = useDbContext();
  const navigate = useNavigate();
  const columnsQuery = useColumns(database, schema, table);
  const insert = useInsertRow(database);
  const { register, handleSubmit } = useForm<InsertForm>({ defaultValues: { values: {} } });

  if (!database || !table) {
    return (
      <EmptyState
        title="Select a table first"
        hint="Pick database → schema → table in the explorer to insert."
      />
    );
  }

  const columns = (columnsQuery.data ?? []).filter((c) => c.name !== 'id');

  const onSubmit = (form: InsertForm): void => {
    insert.mutate(
      { schema, table, values: form.values },
      {
        onSuccess: () => {
          navigate(`/browse?database=${database}&schema=${schema}&table=${table}`);
        },
      },
    );
  };

  return (
    <section aria-label="Insert row">
      <TableTabs active="insert" />
      <PageHeader title={`Insert · ${schema}.${table}`} description="NOT NULL columns are marked" />
      {columnsQuery.isLoading ? (
        <TableSkeleton rows={6} cols={2} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>New row</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="grid max-w-2xl gap-4">
              {columns.map((col) => (
                <div key={col.name} className="space-y-1.5">
                  <Label htmlFor={`col-${col.name}`}>
                    {col.name}
                    <span className="text-muted-foreground ml-1 font-mono text-[11px] font-normal">
                      {col.type}
                    </span>
                    {col.notNull ? <span className="text-destructive ml-1 text-xs">*</span> : null}
                  </Label>
                  <InputWrapper>
                    <Input
                      id={`col-${col.name}`}
                      placeholder={col.default ?? (col.notNull ? 'required' : 'NULL')}
                      {...register(`values.${col.name}`)}
                    />
                  </InputWrapper>
                </div>
              ))}
              {insert.isError ? (
                <Alert variant="destructive" appearance="light">
                  <AlertIcon />
                  <AlertTitle>{insert.error.message}</AlertTitle>
                </Alert>
              ) : null}
              <div>
                <Button type="submit" loading={insert.isPending}>
                  Insert row
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
