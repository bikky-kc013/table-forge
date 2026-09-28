import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useDdl } from '@/application/mutations/index.js';
import {
  useColumns,
  useConstraints,
  useIndexes,
  useTriggers,
} from '@/application/queries/index.js';
import type { DdlAction } from '@/domain/repositories/index.js';
import { Alert, AlertIcon, AlertTitle } from '@/presentation/components/ui/alert.js';
import { Badge } from '@/presentation/components/ui/badge.js';
import { Button } from '@/presentation/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card.js';
import { CardTable } from '@/presentation/components/ui/card.js';
import { Checkbox } from '@/presentation/components/ui/checkbox.js';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/ui/dialog.js';
import { EmptyState } from '@/presentation/components/ui/States.js';
import { Input, InputWrapper } from '@/presentation/components/ui/input.js';
import { Label } from '@/presentation/components/ui/label.js';
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
import { formatCell } from '@/shared/utils/index.js';
import { useDbContext } from '@/presentation/features/databases/hooks/useDbContext.js';

type ModalState =
  | { kind: 'rename-col'; column: string }
  | { kind: 'alter-type'; column: string }
  | { kind: 'alter-default'; column: string; current: string }
  | { kind: 'create-index' }
  | { kind: 'rename-table' }
  | {
      kind: 'confirm';
      title: string;
      description: string;
      action: DdlAction;
      body: Record<string, unknown>;
      after?: () => void;
    }
  | null;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function StructurePage() {
  const { database, schema, table } = useDbContext();
  const navigate = useNavigate();
  const [modal, setModal] = useState<ModalState>(null);
  const [field, setField] = useState('');
  const [field2, setField2] = useState('');
  const [unique, setUnique] = useState(false);
  const [restartIdentity, setRestartIdentity] = useState(true);

  const ddl = useDdl(database);
  const columnsQuery = useColumns(database, schema, table);
  const indexesQuery = useIndexes(database, schema, table);
  const constraintsQuery = useConstraints(database, schema, table);
  const triggersQuery = useTriggers(database, schema, table);

  if (!database || !table) {
    return (
      <EmptyState
        title="Select a table first"
        hint="Pick database → schema → table in the explorer."
      />
    );
  }

  const close = (): void => {
    setModal(null);
    setField('');
    setField2('');
    ddl.reset();
  };

  const run = (action: DdlAction, body: Record<string, unknown>, after?: () => void): void => {
    ddl.mutate(
      { schema, table, action, body },
      {
        onSuccess: () => {
          close();
          after?.();
        },
      },
    );
  };

  const loading = columnsQuery.isLoading;

  return (
    <section aria-label="Table structure">
      <TableTabs active="table" />
      <PageHeader title={`Structure · ${schema}.${table}`} />

      {ddl.isError ? (
        <div className="mb-4">
          <Alert variant="destructive" appearance="light">
            <AlertIcon />
            <AlertTitle>{ddl.error.message}</AlertTitle>
          </Alert>
        </div>
      ) : null}

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Columns</CardTitle>
          </CardHeader>
          <CardTable>
            {loading ? (
              <div className="p-4">
                <TableSkeleton rows={5} cols={5} />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Null</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(columnsQuery.data ?? []).map((col) => (
                    <TableRow key={col.name}>
                      <TableCell className="font-mono text-[13px] font-medium">
                        {col.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-[13px]">
                        {col.type}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          title="Toggle NOT NULL"
                          onClick={() => {
                            run('alter-not-null', { column: col.name, not_null: !col.notNull });
                          }}
                          className="cursor-pointer"
                        >
                          <Badge
                            variant={col.notNull ? 'destructive' : 'secondary'}
                            appearance="light"
                            size="sm"
                          >
                            {col.notNull ? 'NOT NULL' : 'NULL'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell
                        className="text-muted-foreground max-w-56 truncate font-mono text-xs"
                        title={col.default ?? ''}
                      >
                        {formatCell(col.default)}
                      </TableCell>
                      <TableCell>
                        <span className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Rename ${col.name}`}
                            title={`Rename ${col.name}`}
                            onClick={() => {
                              setModal({ kind: 'rename-col', column: col.name });
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Alter type of ${col.name}`}
                            title="Alter type / default"
                            onClick={() => {
                              setModal({ kind: 'alter-type', column: col.name });
                            }}
                          >
                            <span className="font-mono text-xs font-bold">T</span>
                          </Button>
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardTable>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Indexes</CardTitle>
          </CardHeader>
          <CardTable>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Definition</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(indexesQuery.data ?? []).map((idx) => (
                  <TableRow key={idx.name}>
                    <TableCell className="font-mono text-[13px] font-medium">
                      {idx.name}
                      <span className="ml-2">
                        {idx.isPrimary ? (
                          <Badge variant="primary" appearance="light" size="sm">
                            PK
                          </Badge>
                        ) : null}
                        {idx.isUnique && !idx.isPrimary ? (
                          <Badge variant="secondary" appearance="light" size="sm">
                            unique
                          </Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-muted-foreground max-w-xl truncate font-mono text-xs"
                      title={idx.definition}
                    >
                      {idx.definition}
                    </TableCell>
                    <TableCell className="text-right">
                      {!idx.isPrimary ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Drop ${idx.name}`}
                          title={`Drop ${idx.name}`}
                          onClick={() => {
                            setModal({
                              kind: 'confirm',
                              title: `Drop index ${idx.name}?`,
                              description: 'This cannot be undone.',
                              action: 'drop-index',
                              body: { index_name: idx.name },
                            });
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardTable>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setModal({ kind: 'create-index' });
              }}
            >
              <Plus className="size-3.5" /> Create index
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Constraints</CardTitle>
            </CardHeader>
            <CardContent>
              {(constraintsQuery.data ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">No constraints.</p>
              ) : (
                <ul className="space-y-2">
                  {(constraintsQuery.data ?? []).map((c) => (
                    <li key={c.name} className="text-sm">
                      <span className="font-mono text-[13px] font-medium">{c.name}</span>{' '}
                      <Badge variant="secondary" appearance="light" size="sm">
                        {c.type}
                      </Badge>
                      <p
                        className="text-muted-foreground mt-0.5 truncate font-mono text-xs"
                        title={c.definition}
                      >
                        {c.definition}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Triggers</CardTitle>
            </CardHeader>
            <CardContent>
              {(triggersQuery.data ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">No triggers.</p>
              ) : (
                <ul className="space-y-2">
                  {(triggersQuery.data ?? []).map((t) => (
                    <li key={t.name} className="text-sm">
                      <span className="font-mono text-[13px] font-medium">{t.name}</span>{' '}
                      <Badge variant="secondary" appearance="light" size="sm">
                        {t.enabled}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setModal({ kind: 'rename-table' });
              }}
            >
              Rename table
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setModal({
                  kind: 'confirm',
                  title: `Truncate ${schema}.${table}?`,
                  description: 'All rows will be deleted. This cannot be undone.',
                  action: 'truncate-table',
                  body: { restart_identity: restartIdentity },
                });
              }}
            >
              Truncate table
            </Button>
            <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={restartIdentity}
                onCheckedChange={(v) => {
                  setRestartIdentity(v === true);
                }}
              />
              Restart identity
            </label>
          </CardContent>
        </Card>
      </div>

      {/* Rename column */}
      <Dialog
        open={modal?.kind === 'rename-col'}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {modal?.kind === 'rename-col' ? modal.column : ''}</DialogTitle>
            <DialogDescription>Enter the new column name.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="New name">
              <InputWrapper>
                <Input
                  value={field}
                  placeholder="new_column_name"
                  onChange={(e) => {
                    setField(e.target.value);
                  }}
                />
              </InputWrapper>
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              loading={ddl.isPending}
              disabled={!field.trim()}
              onClick={() => {
                if (modal?.kind === 'rename-col') {
                  run('rename-column', { old_name: modal.column, new_name: field.trim() });
                }
              }}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alter type */}
      <Dialog
        open={modal?.kind === 'alter-type'}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alter type {modal?.kind === 'alter-type' ? modal.column : ''}</DialogTitle>
            <DialogDescription>
              PostgreSQL will attempt to coerce existing values.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <Field label="New type">
              <InputWrapper>
                <Input
                  value={field}
                  placeholder="text, integer, timestamptz…"
                  onChange={(e) => {
                    setField(e.target.value);
                  }}
                />
              </InputWrapper>
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              loading={ddl.isPending}
              disabled={!field.trim()}
              onClick={() => {
                if (modal?.kind === 'alter-type') {
                  run('alter-type', { column: modal.column, new_type: field.trim() });
                }
              }}
            >
              Alter type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create index */}
      <Dialog
        open={modal?.kind === 'create-index'}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create index</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <Field label="Index name">
              <InputWrapper>
                <Input
                  value={field}
                  placeholder={`${table}_col_idx`}
                  onChange={(e) => {
                    setField(e.target.value);
                  }}
                />
              </InputWrapper>
            </Field>
            <Field label="Columns (comma-separated)">
              <InputWrapper>
                <Input
                  value={field2}
                  placeholder="col_a, col_b"
                  onChange={(e) => {
                    setField2(e.target.value);
                  }}
                />
              </InputWrapper>
            </Field>
            <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={unique}
                onCheckedChange={(v) => {
                  setUnique(v === true);
                }}
              />
              Unique
            </label>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              loading={ddl.isPending}
              disabled={!field.trim() || !field2.trim()}
              onClick={() => {
                run('create-index', { index_name: field.trim(), columns: field2.trim(), unique });
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename table */}
      <Dialog
        open={modal?.kind === 'rename-table'}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename table</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Field label="New table name">
              <InputWrapper>
                <Input
                  value={field}
                  placeholder="new_table_name"
                  onChange={(e) => {
                    setField(e.target.value);
                  }}
                />
              </InputWrapper>
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              loading={ddl.isPending}
              disabled={!field.trim()}
              onClick={() => {
                const next = field.trim();
                run('rename-table', { new_name: next }, () => {
                  navigate(`/table?database=${database}&schema=${schema}&table=${next}`);
                });
              }}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm */}
      <Dialog
        open={modal?.kind === 'confirm'}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modal?.kind === 'confirm' ? modal.title : ''}</DialogTitle>
            <DialogDescription>
              {modal?.kind === 'confirm' ? modal.description : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={ddl.isPending}
              onClick={() => {
                if (modal?.kind === 'confirm') {
                  if (modal.action === 'truncate-table') {
                    run('truncate-table', { restart_identity: restartIdentity }, modal.after);
                  } else {
                    run(modal.action, modal.body, modal.after);
                  }
                }
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
