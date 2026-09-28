import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Upload } from 'lucide-react';
import { useColumns } from '@/application/queries/index.js';
import { getCsrfToken } from '@/infrastructure/api/client.js';
import { cn } from '@/shared/utils/index.js';
import { Alert, AlertIcon, AlertTitle } from '@/presentation/components/ui/alert.js';
import { Button, buttonVariants } from '@/presentation/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card.js';
import { Checkbox } from '@/presentation/components/ui/checkbox.js';
import { EmptyState } from '@/presentation/components/ui/States.js';
import { Input } from '@/presentation/components/ui/input.js';
import { Label } from '@/presentation/components/ui/label.js';
import { PageHeader } from '@/presentation/components/shared/PageHeader.js';
import { TableTabs } from '@/presentation/components/shared/TableTabs.js';
import { useDbContext } from '@/presentation/features/databases/hooks/useDbContext.js';

function ExportSection({
  database,
  schema,
  table,
}: {
  database: string;
  schema: string;
  table: string;
}) {
  const [format, setFormat] = useState('plain');
  const csvHref = `/export/csv?database=${database}&schema=${schema}&table=${table}`;
  const sqlHref = `/export/sql?database=${database}&schema=${schema}&table=${table}&format=${format}`;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Export {table ? `${schema}.${table}` : schema || database}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <a
            href={csvHref}
            className="text-primary inline-flex items-center gap-2 text-sm font-medium hover:underline hover:underline-offset-4"
          >
            <Download className="size-4" /> Download CSV
          </a>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="dump-format">SQL dump format</Label>
            <select
              id="dump-format"
              value={format}
              onChange={(e) => {
                setFormat(e.target.value);
              }}
              className="border-input bg-background text-foreground focus-visible:ring-ring/30 h-8.5 rounded-md border px-3 text-[0.8125rem] focus-visible:ring-[3px] focus-visible:outline-none"
            >
              <option value="plain">Plain SQL</option>
              <option value="custom">Custom (pg_dump -Fc)</option>
              <option value="tar">Tar</option>
            </select>
          </div>
          <a href={sqlHref} className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}>
            <Download className="size-4" /> Download SQL
          </a>
        </div>
        <p className="text-muted-foreground text-xs">
          Exports stream directly from the Go backend — no JSON involved.
        </p>
      </CardContent>
    </Card>
  );
}

function ImportSection({
  database,
  schema,
  table,
}: {
  database: string;
  schema: string;
  table: string;
}) {
  const columnsQuery = useColumns(database, schema, table);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const columns = columnsQuery.data ?? [];

  useEffect(() => {
    if (!file) {
      setHeaders([]);
      return;
    }
    const reader = new FileReader();
    reader.onload = (): void => {
      const loaded = reader.result;
      const text = typeof loaded === 'string' ? loaded : '';
      const firstLine = text.split(/\r?\n/)[0] ?? '';
      const parts = firstLine
        .split(',')
        .map((h) => h.trim().replace(/^"|"$/g, ''))
        .filter((h) => h !== '');
      setHeaders(parts);
      // Auto-map columns whose names match a CSV header exactly.
      setMapping((prev) => {
        const next = { ...prev };
        for (const col of columns) {
          if (!next[col.name] && parts.includes(col.name)) next[col.name] = col.name;
        }
        return next;
      });
    };
    reader.readAsText(file.slice(0, 8192));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const submit = async (): Promise<void> => {
    if (!file || !table) return;
    setBusy(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.set('schema', schema);
      form.set('table', table);
      for (const col of columns) {
        if (skipped[col.name]) {
          form.set(`skip_${col.name}`, 'on');
        } else if (mapping[col.name]) {
          form.set(`map_${col.name}`, mapping[col.name] as string);
        }
      }
      form.set('file', file);
      const csrf = getCsrfToken();
      const res = await fetch(`/import/csv?database=${database}`, {
        method: 'POST',
        body: form,
        credentials: 'include',
        headers: csrf ? { 'X-CSRF-Token': csrf } : {},
      });
      // Go redirects to /browse/…?imported=N on success.
      const url = new URL(res.url, window.location.origin);
      const imported = url.searchParams.get('imported');
      if (imported !== null) {
        setStatus({ ok: true, message: `Imported ${imported} row(s) into ${schema}.${table}.` });
      } else {
        setStatus({
          ok: false,
          message: `Import failed (HTTP ${res.status}). Check the server logs.`,
        });
      }
    } catch (err) {
      setStatus({ ok: false, message: err instanceof Error ? err.message : 'Import failed.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Import CSV into {schema}.{table}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="import-file">CSV file</Label>
          <Input
            id="import-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
            }}
          />
        </div>
        {columns.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Column mapping</p>
            {columns.map((col) => (
              <div key={col.name} className="flex flex-wrap items-center gap-2">
                <code className="w-40 truncate font-mono text-xs">{col.name}</code>
                <select
                  value={mapping[col.name] ?? ''}
                  disabled={skipped[col.name] === true}
                  onChange={(e) => {
                    setMapping((m) => ({ ...m, [col.name]: e.target.value }));
                  }}
                  aria-label={`CSV header for ${col.name}`}
                  className="border-input bg-background text-foreground focus-visible:ring-ring/30 h-8.5 rounded-md border px-2 text-xs focus-visible:ring-[3px] focus-visible:outline-none"
                >
                  <option value="">— unmapped —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <label className="text-muted-foreground flex cursor-pointer items-center gap-1.5 text-xs">
                  <Checkbox
                    size="sm"
                    checked={skipped[col.name] === true}
                    onCheckedChange={(v) => {
                      setSkipped((s) => ({ ...s, [col.name]: v === true }));
                    }}
                  />
                  Skip
                </label>
                {col.notNull ? <span className="text-destructive text-xs">NOT NULL</span> : null}
              </div>
            ))}
          </div>
        ) : null}
        {status ? (
          <Alert variant={status.ok ? 'success' : 'destructive'} appearance="light">
            <AlertIcon />
            <AlertTitle>{status.message}</AlertTitle>
          </Alert>
        ) : null}
        <Button
          onClick={() => {
            void submit();
          }}
          loading={busy}
          disabled={!file || !table}
        >
          <Upload className="size-4" /> Import CSV
        </Button>
      </CardContent>
    </Card>
  );
}

export function ExportPage() {
  const { database, schema, table } = useDbContext();
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'import' ? 'import' : 'export';

  if (!database) {
    return <EmptyState title="No database selected" hint="Pick a database in the explorer." />;
  }

  return (
    <section aria-label="Export and import">
      <TableTabs active={mode === 'import' ? 'import' : 'export'} />
      <PageHeader
        title={mode === 'import' ? 'Import' : 'Export'}
        description={`${database}${schema ? ` · ${schema}` : ''}${table ? ` · ${table}` : ''}`}
      />
      <div className="max-w-3xl space-y-4">
        {mode === 'import' ? (
          table ? (
            <ImportSection database={database} schema={schema} table={table} />
          ) : (
            <EmptyState
              title="Select a table first"
              hint="Imports target a specific table — pick one in the explorer."
            />
          )
        ) : (
          <ExportSection database={database} schema={schema} table={table} />
        )}
      </div>
    </section>
  );
}
