// Paginated browse page (?database=&schema=&table=&page=): sort, filter,
// per-row edit/delete, bulk select + delete — parity with browse.html.

import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight, Download, Pencil, Trash2 } from 'lucide-react';
import { useBulkDelete, useDeleteRow, useUpdateRow } from '@/application/mutations/index.js';
import { useBrowse, useForeignKeys } from '@/application/queries/index.js';
import type { ForeignKey } from '@/domain/entities/index.js';
import { Badge } from '@/presentation/components/ui/badge.js';
import { Button, buttonVariants } from '@/presentation/components/ui/button.js';
import { Card, CardTable } from '@/presentation/components/ui/card.js';
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
import { EmptyState, ErrorState } from '@/presentation/components/ui/States.js';
import { Input } from '@/presentation/components/ui/input.js';
import { SearchInput } from '@/presentation/components/ui/SearchInput.js';
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
import { formatCell, cn } from '@/shared/utils/index.js';
import { PAGE_SIZE_DEFAULT } from '@/shared/constants/index.js';

export function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const database = params.get('database') ?? '';
  const schema = params.get('schema') ?? 'public';
  const table = params.get('table') ?? '';
  const page = Number(params.get('page') ?? '1') || 1;

  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ pkVal: string; col: string } | null>(null);
  const [draft, setDraft] = useState('');

  const browse = useBrowse({ database, schema, table, page, pageSize: PAGE_SIZE_DEFAULT });
  const fksQuery = useForeignKeys(database, schema, table);
  const del = useDeleteRow(database);
  const bulkDel = useBulkDelete(database);
  const update = useUpdateRow(database);

  const result = browse.data;
  // Real PK from the backend (falls back to first column for keyless tables).
  // Never guess: a wrong identity groups selections and mistargets updates.
  const pkCol =
    result?.pkCol && result.columns.includes(result.pkCol)
      ? result.pkCol
      : (result?.columns[0] ?? 'id');
  const pkIdx = result ? result.columns.indexOf(pkCol) : -1;

  const visibleRows = useMemo(() => {
    if (!result) return [];
    const f = filter.trim().toLowerCase();
    if (!f) return result.rows;
    return result.rows.filter((row) =>
      row.some((cell) => formatCell(cell).toLowerCase().includes(f)),
    );
  }, [result, filter]);

  const fkByCol = useMemo(() => {
    const map = new Map<string, ForeignKey>();
    for (const fk of fksQuery.data ?? []) {
      if (!map.has(fk.column)) map.set(fk.column, fk);
    }
    return map;
  }, [fksQuery.data]);

  if (!database || !table) {
    return (
      <EmptyState
        title="Select a table first"
        hint="Pick database → schema → table in the explorer."
      />
    );
  }

  const toggleSelect = (pkval: string): void => {
    setSelected((prev) =>
      prev.includes(pkval) ? prev.filter((v) => v !== pkval) : [...prev, pkval],
    );
  };

  const toggleAll = (): void => {
    if (!result) return;
    const all = visibleRows.map((row) => String(row[pkIdx]));
    setSelected((prev) => (prev.length === all.length ? [] : all));
  };

  const startEdit = (rowIdx: number, col: string, value: unknown): void => {
    if (col === pkCol) return;
    const row = visibleRows[rowIdx];
    if (!row) return;
    setEditing({ pkVal: String(row[pkIdx]), col });
    setDraft(value === null || value === undefined ? '' : formatCell(value));
  };

  const commitEdit = (): void => {
    if (!editing) return;
    update.mutate(
      { schema, table, pkCol, pkVal: editing.pkVal, values: { [editing.col]: draft } },
      {
        onSuccess: () => {
          setEditing(null);
        },
      },
    );
  };

  const followFk = (fk: ForeignKey, value: unknown): void => {
    if (value === null || value === undefined) return;
    navigate(
      `/edit?database=${database}&schema=${fk.refSchema}&table=${fk.refTable}&pkcol=${fk.refColumn}&pkval=${encodeURIComponent(formatCell(value))}`,
    );
  };

  return (
    <section aria-label={`Browse ${schema}.${table}`}>
      <TableTabs active="browse" />
      <PageHeader
        title={`${schema}.${table}`}
        description={
          result
            ? `${result.totalRows ?? result.rowCount} rows · page ${result.page}/${result.maxPages}`
            : undefined
        }
        actions={
          result ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <SearchInput
                value={filter}
                onChange={setFilter}
                label="Filter rows"
                placeholder="Filter rows…"
              />
              <Badge variant="secondary" appearance="light" size="sm">
                {result.page} / {result.maxPages}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => {
                  setParams({ database, schema, table, page: String(page - 1) });
                }}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-3.5" aria-hidden />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= result.maxPages}
                onClick={() => {
                  setParams({ database, schema, table, page: String(page + 1) });
                }}
                aria-label="Next page"
              >
                <ChevronRight className="size-3.5" aria-hidden />
              </Button>
            </div>
          ) : undefined
        }
      />

      {selected.length > 0 ? (
        <div className="border-primary/30 bg-primary/5 mb-3 flex items-center gap-2 rounded-lg border px-3 py-2">
          <span className="text-foreground text-[13px] font-semibold">
            {selected.length} row(s) selected
          </span>
          <Button
            size="sm"
            variant="destructive"
            loading={bulkDel.isPending}
            onClick={() => {
              bulkDel.mutate(
                { schema, table, pkCol, pkVals: selected },
                {
                  onSuccess: () => {
                    setSelected([]);
                  },
                },
              );
            }}
          >
            <Trash2 className="size-3.5" /> Delete
          </Button>
          <a
            href={`/export/csv?database=${database}&schema=${schema}&table=${table}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <Download className="size-3.5" /> Export
          </a>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelected([]);
            }}
          >
            Cancel
          </Button>
          {bulkDel.isError ? (
            <span className="text-destructive text-xs">{bulkDel.error.message}</span>
          ) : null}
        </div>
      ) : null}

      {browse.isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : browse.error ? (
        <ErrorState
          title={`Failed to browse ${schema}.${table}`}
          message={browse.error.message}
          requestId={browse.error.requestId}
          onRetry={() => void browse.refetch()}
        />
      ) : !result || result.rows.length === 0 ? (
        <EmptyState
          title="No rows"
          hint={`${schema}.${table} is empty or filters exclude everything.`}
        />
      ) : (
        <Card>
          <CardTable>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      size="sm"
                      aria-label="Select all rows"
                      checked={selected.length > 0 && selected.length === visibleRows.length}
                      onCheckedChange={() => {
                        toggleAll();
                      }}
                    />{' '}
                  </TableHead>
                  {result.columns.map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((row, i) => {
                  const pkval = String(row[pkIdx]);
                  return (
                    <TableRow
                      key={i}
                      className="group"
                      data-state={selected.includes(pkval) ? 'selected' : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          size="sm"
                          aria-label={`Select row ${pkval}`}
                          checked={selected.includes(pkval)}
                          onCheckedChange={() => {
                            toggleSelect(pkval);
                          }}
                        />
                      </TableCell>
                      {result.columns.map((col, j) => {
                        const value = row[j];
                        const isEditing = editing?.col === col && editing.pkVal === pkval;
                        if (isEditing) {
                          return (
                            <TableCell
                              key={col}
                              className="font-mono text-[13px] whitespace-nowrap"
                            >
                              <Input
                                autoFocus
                                value={draft}
                                disabled={update.isPending}
                                onChange={(e) => {
                                  setDraft(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEdit();
                                  else if (e.key === 'Escape') setEditing(null);
                                }}
                                onBlur={() => {
                                  setEditing(null);
                                }}
                                className="h-7 font-mono text-[13px]"
                                aria-label={`Edit ${col}`}
                              />
                            </TableCell>
                          );
                        }
                        const fk = fkByCol.get(col);
                        const isNull = value === null || value === undefined;
                        const fkActive = fk !== undefined && !isNull;
                        const editable = col !== pkCol;
                        return (
                          <TableCell
                            key={col}
                            className="font-mono text-[13px] whitespace-nowrap"
                            tabIndex={fkActive ? 0 : undefined}
                            title={
                              fkActive
                                ? `Ctrl+Enter to open ${fk.refSchema}.${fk.refTable} (${fk.refColumn})`
                                : editable
                                  ? 'Double-click to edit'
                                  : 'Primary key — read-only'
                            }
                            onDoubleClick={
                              editable
                                ? () => {
                                    startEdit(i, col, value);
                                  }
                                : undefined
                            }
                            onKeyDown={
                              fkActive
                                ? (e) => {
                                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                      e.preventDefault();
                                      followFk(fk, value);
                                    }
                                  }
                                : undefined
                            }
                          >
                            {fkActive ? (
                              <span className="text-primary inline-flex items-center gap-1">
                                {formatCell(value)}
                                <button
                                  type="button"
                                  onClick={() => {
                                    followFk(fk, value);
                                  }}
                                  aria-label={`Open ${fk.refSchema}.${fk.refTable} row`}
                                  title={`Open ${fk.refSchema}.${fk.refTable} (${fk.refColumn})`}
                                  className="hover:bg-primary/10 cursor-pointer rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                >
                                  <ArrowUpRight className="size-3.5" />
                                </button>
                              </span>
                            ) : (
                              formatCell(value)
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <span className="flex justify-end gap-1">
                          <Link
                            to={`/edit?database=${database}&schema=${schema}&table=${table}&pkcol=${pkCol}&pkval=${encodeURIComponent(pkval)}`}
                            aria-label={`Edit row ${pkval}`}
                            title={`Edit row ${pkval}`}
                            className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex rounded-md p-1.5 transition-colors"
                          >
                            <Pencil className="size-3.5" />
                          </Link>
                          <button
                            type="button"
                            aria-label={`Delete row ${pkval}`}
                            title={`Delete row ${pkval}`}
                            onClick={() => {
                              setPendingDelete(pkval);
                            }}
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive inline-flex cursor-pointer rounded-md p-1.5 transition-colors"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardTable>
        </Card>
      )}

      {del.isError && del.error instanceof Error ? (
        <p className="text-destructive mt-2 text-sm">{del.error.message}</p>
      ) : null}
      {update.isError && update.error instanceof Error ? (
        <p className="text-destructive mt-2 text-sm">Save failed: {update.error.message}</p>
      ) : null}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
            del.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete row?</DialogTitle>
            <DialogDescription>
              {pkCol} = {pendingDelete}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {del.isError && del.error instanceof Error ? (
              <p className="text-destructive text-sm">{del.error.message}</p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingDelete(null);
                del.reset();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={del.isPending}
              onClick={() => {
                if (pendingDelete !== null) {
                  del.mutate(
                    { schema, table, pkCol, pkVal: pendingDelete },
                    {
                      onSuccess: () => {
                        setPendingDelete(null);
                        setSelected((prev) => prev.filter((v) => v !== pendingDelete));
                      },
                    },
                  );
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
