import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUpdateRow } from '@/application/mutations/index.js';
import { useColumns, useRow } from '@/application/queries/index.js';
import { Alert, AlertIcon, AlertTitle } from '@/presentation/components/ui/alert.js';
import { Button } from '@/presentation/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card.js';
import { EmptyState } from '@/presentation/components/ui/States.js';
import { Input, InputWrapper } from '@/presentation/components/ui/input.js';
import { Label } from '@/presentation/components/ui/label.js';
import { TableSkeleton } from '@/presentation/components/ui/TableSkeleton.js';
import { PageHeader } from '@/presentation/components/shared/PageHeader.js';
import { TableTabs } from '@/presentation/components/shared/TableTabs.js';
import { formatCell } from '@/shared/utils/index.js';
import { useDbContext } from '@/presentation/features/databases/hooks/useDbContext.js';

interface EditForm {
  values: Record<string, string>;
}

export function EditPage() {
  const { database, schema, table } = useDbContext();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const pkcol = params.get('pkcol') ?? '';
  const pkval = params.get('pkval') ?? '';

  const rowQuery = useRow({ database, schema, table, pkCol: pkcol, pkVal: pkval });
  const columnsQuery = useColumns(database, schema, table);
  const update = useUpdateRow(database);
  const { register, handleSubmit } = useForm<EditForm>({ defaultValues: { values: {} } });

  if (!database || !table || !pkcol || !pkval) {
    return <EmptyState title="No row selected" hint="Open a row from Browse to edit it." />;
  }

  const onSubmit = (form: EditForm): void => {
    update.mutate(
      { schema, table, pkCol: pkcol, pkVal: pkval, values: form.values },
      {
        onSuccess: () => {
          navigate(`/browse?database=${database}&schema=${schema}&table=${table}`);
        },
      },
    );
  };

  const loading = rowQuery.isLoading || columnsQuery.isLoading;
  const error = rowQuery.error ?? columnsQuery.error;

  return (
    <section aria-label="Edit row">
      <TableTabs active="browse" />
      <PageHeader title={`Edit · ${schema}.${table}`} description={`${pkcol} = ${pkval}`} />
      {loading ? (
        <TableSkeleton rows={6} cols={2} />
      ) : error ? (
        <Alert variant="destructive" appearance="light">
          <AlertIcon />
          <AlertTitle>{error.message}</AlertTitle>
        </Alert>
      ) : !rowQuery.data ? (
        <EmptyState title="Row not found" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Row values</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="grid max-w-2xl gap-4">
              {rowQuery.data.columns.map((name, i) => {
                const col = columnsQuery.data?.find((c) => c.name === name);
                const current = formatCell(rowQuery.data.row[i]);
                if (name === pkcol) {
                  return (
                    <div key={name} className="space-y-1.5">
                      <Label>{name} (primary key, read-only)</Label>
                      <Input value={current} readOnly disabled />
                    </div>
                  );
                }
                return (
                  <div key={name} className="space-y-1.5">
                    <Label htmlFor={`col-${name}`}>
                      {name}
                      {col ? (
                        <span className="text-muted-foreground ml-1 font-mono text-[11px] font-normal">
                          {col.type}
                        </span>
                      ) : null}
                    </Label>
                    <InputWrapper>
                      <Input
                        id={`col-${name}`}
                        defaultValue={current === 'NULL' ? '' : current}
                        {...register(`values.${name}`)}
                      />
                    </InputWrapper>
                  </div>
                );
              })}
              {update.isError ? (
                <Alert variant="destructive" appearance="light">
                  <AlertIcon />
                  <AlertTitle>{update.error.message}</AlertTitle>
                </Alert>
              ) : null}
              <div className="flex gap-2">
                <Button type="submit" loading={update.isPending}>
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigate(`/browse?database=${database}&schema=${schema}&table=${table}`);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
