import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Boxes,
  ChevronFirst,
  Database,
  FileCode2,
  LayoutGrid,
  Loader2,
  LogOut,
  Search,
  Settings2,
  Table2,
} from 'lucide-react';
import { useDatabases, useSchemas, useSession, useTables } from '@/application/queries/index.js';
import { authApi } from '@/infrastructure/api/endpoints/auth.js';
import {
  AccordionMenu,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuLabel,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
  type AccordionMenuClassNames,
} from '@/presentation/components/ui/accordion-menu.js';
import { Input, InputWrapper } from '@/presentation/components/ui/input.js';
import { cn } from '@/shared/utils/index.js';
import logoUrl from '@/assets/logo.png';

export function ExplorerSidebar({
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}) {
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const database = params.get('database') ?? '';
  const activeSchema = params.get('schema') ?? 'public';
  const activeTable = params.get('table') ?? '';

  const [expandedSchema, setExpandedSchema] = useState<string>(activeSchema);
  const [filter, setFilter] = useState('');
  const [openValues, setOpenValues] = useState<string[]>([`s:${activeSchema}`]);
  useEffect(() => {
    setExpandedSchema(activeSchema);
    setOpenValues((prev) =>
      prev.includes(`s:${activeSchema}`) ? prev : [...prev, `s:${activeSchema}`],
    );
  }, [activeSchema, database]);

  const session = useSession();
  const dbsQuery = useDatabases(database || 'postgres');
  const schemasQuery = useSchemas(database);
  const tablesQuery = useTables(database, expandedSchema || activeSchema);

  const matchPath = (path: string): boolean =>
    path === pathname || (path.length > 1 && pathname.startsWith(path));

  const go = (path: string, next: Record<string, string>): void => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (v) q.set(k, v);
    }
    navigate(`${path}?${q.toString()}`);
    onNavigate?.();
  };

  const goBrowse = (schema: string, table: string): void => {
    const q = new URLSearchParams(params);
    q.set('schema', schema);
    q.set('table', table);
    q.delete('page');
    navigate(`/browse?${q.toString()}`);
    onNavigate?.();
  };

  const logout = (): void => {
    void authApi.logout().finally(() => {
      window.location.href = '/app/login';
    });
  };

  const classNames: AccordionMenuClassNames = {
    root: 'lg:ps-1 space-y-0.5',
    group: 'gap-px',
    label:
      'uppercase text-[10px] tracking-widest font-semibold text-muted-foreground/50 pt-4 pb-1 px-3',
    separator: 'my-2 bg-border/60',
    item: [
      'h-9 rounded-lg px-3',
      'text-[13px] font-medium',
      'text-muted-foreground',
      'hover:bg-accent/60 hover:text-foreground',
      'data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary data-[selected=true]:font-semibold',
      'transition-all duration-150',
      '[&_[data-slot=accordion-menu-icon]]:text-muted-foreground/60',
      'hover:[&_[data-slot=accordion-menu-icon]]:text-foreground/70',
      'data-[selected=true]:[&_[data-slot=accordion-menu-icon]]:text-primary',
    ].join(' '),
    sub: '',
    subTrigger: [
      'h-9 rounded-lg px-3',
      'text-[13px] font-medium',
      'text-muted-foreground',
      'hover:bg-accent/60 hover:text-foreground',
      'data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary data-[selected=true]:font-semibold',
      'transition-all duration-150',
      '[&_[data-slot=accordion-menu-icon]]:text-muted-foreground/60',
      'hover:[&_[data-slot=accordion-menu-icon]]:text-foreground/70',
      'data-[selected=true]:[&_[data-slot=accordion-menu-icon]]:text-primary',
    ].join(' '),
    subContent: 'py-0',
    indicator: '',
  };

  const goPage = (path: string): void => {
    go(path, { database });
  };

  const tables = (tablesQuery.data ?? []).filter((t) =>
    t.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="sidebar-header border-border/60 flex shrink-0 items-center gap-2 border-b px-4">
        <button
          type="button"
          onClick={() => {
            goPage('/databases');
          }}
          aria-label="TableForge home"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md py-1 text-left"
        >
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
            <img src={logoUrl} alt="TableForge" className="size-8" />
          </span>
          {collapsed ? null : (
            <span className="min-w-0">
              <span className="text-foreground block truncate text-sm font-bold tracking-tight">
                TableForge
              </span>
              <span className="text-muted-foreground block truncate text-[11px]">
                {database || 'not connected'}
              </span>
            </span>
          )}
        </button>
        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary -me-6 hidden cursor-pointer rounded-full border p-1 shadow-sm transition-all duration-200 lg:block"
          >
            <ChevronFirst className={cn('size-3.5', collapsed && 'rotate-180')} />
          </button>
        ) : null}
      </div>

      {/* Scrollable menu */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="flex w-full flex-col px-2">
          <AccordionMenu
            type="multiple"
            value={openValues}
            onValueChange={(v: string | string[]) => {
              const arr = Array.isArray(v) ? v : [v];
              setOpenValues(arr);
              // SubTrigger doesn't forward onClick, so derive the expanded
              // schema from the accordion state itself (single source of truth).
              const last = [...arr].reverse().find((x) => x.startsWith('s:'));
              if (last) setExpandedSchema(last.slice(2));
            }}
            matchPath={matchPath}
            selectedValue={activeTable ? `t:${activeSchema}/${activeTable}` : undefined}
            classNames={{
              ...classNames,
              root: collapsed ? 'space-y-1' : classNames.root,
            }}
          >
            <AccordionMenuGroup>
              {collapsed ? null : <AccordionMenuLabel>Pages</AccordionMenuLabel>}
              <AccordionMenuItem
                value="/databases"
                title="Databases"
                className={
                  collapsed
                    ? 'flex grow items-center justify-center gap-2 px-0'
                    : 'flex grow items-center gap-2'
                }
                onClick={() => {
                  goPage('/databases');
                }}
              >
                <span className="sidebar-icon-box bg-muted/80 flex size-5 shrink-0 items-center justify-center rounded-md transition-colors">
                  <LayoutGrid data-slot="accordion-menu-icon" className="size-3.5!" />
                </span>
                {collapsed ? null : (
                  <span data-slot="accordion-menu-title" className="flex-1 truncate">
                    Databases
                  </span>
                )}
              </AccordionMenuItem>
              <AccordionMenuItem
                value="/schemas"
                title="Schemas"
                className={
                  collapsed
                    ? 'flex grow items-center justify-center gap-2 px-0'
                    : 'flex grow items-center gap-2'
                }
                onClick={() => {
                  goPage('/schemas');
                }}
              >
                <span className="sidebar-icon-box bg-muted/80 flex size-5 shrink-0 items-center justify-center rounded-md transition-colors">
                  <Boxes data-slot="accordion-menu-icon" className="size-3.5!" />
                </span>
                {collapsed ? null : (
                  <span data-slot="accordion-menu-title" className="flex-1 truncate">
                    Schemas
                  </span>
                )}
              </AccordionMenuItem>
              <AccordionMenuItem
                value="/sql"
                title="SQL Runner"
                className={
                  collapsed
                    ? 'flex grow items-center justify-center gap-2 px-0'
                    : 'flex grow items-center gap-2'
                }
                onClick={() => {
                  goPage('/sql');
                }}
              >
                <span className="sidebar-icon-box bg-muted/80 flex size-5 shrink-0 items-center justify-center rounded-md transition-colors">
                  <FileCode2 data-slot="accordion-menu-icon" className="size-3.5!" />
                </span>
                {collapsed ? null : (
                  <span data-slot="accordion-menu-title" className="flex-1 truncate">
                    SQL Runner
                  </span>
                )}
              </AccordionMenuItem>
              <AccordionMenuItem
                value="/admin"
                title="Operations"
                className={
                  collapsed
                    ? 'flex grow items-center justify-center gap-2 px-0'
                    : 'flex grow items-center gap-2'
                }
                onClick={() => {
                  goPage('/admin');
                }}
              >
                <span className="sidebar-icon-box bg-muted/80 flex size-5 shrink-0 items-center justify-center rounded-md transition-colors">
                  <Settings2 data-slot="accordion-menu-icon" className="size-3.5!" />
                </span>
                {collapsed ? null : (
                  <span data-slot="accordion-menu-title" className="flex-1 truncate">
                    Operations
                  </span>
                )}
              </AccordionMenuItem>

              {database && !collapsed ? (
                <>
                  <AccordionMenuLabel>Explorer</AccordionMenuLabel>
                  <div className="px-3 pb-1">
                    <InputWrapper variant="sm">
                      <Search className="text-muted-foreground ms-2 size-3.5" aria-hidden />
                      <Input
                        type="search"
                        value={filter}
                        placeholder="Filter tables…"
                        aria-label="Filter tables"
                        onChange={(e) => {
                          setFilter(e.target.value);
                        }}
                      />
                    </InputWrapper>
                  </div>
                  {schemasQuery.isLoading ? (
                    <p className="text-muted-foreground flex items-center gap-2 px-5 py-2 text-xs">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden /> Loading schemas…
                    </p>
                  ) : (
                    (schemasQuery.data ?? []).map((schema) => (
                      <AccordionMenuSub key={schema.name} value={`s:${schema.name}`}>
                        <AccordionMenuSubTrigger>
                          <span className="sidebar-icon-box bg-muted/80 flex size-5 shrink-0 items-center justify-center rounded-md transition-colors">
                            <Boxes data-slot="accordion-menu-icon" className="size-3.5!" />
                          </span>
                          <span data-slot="accordion-menu-title" className="truncate">
                            {schema.name}
                          </span>
                        </AccordionMenuSubTrigger>
                        <AccordionMenuSubContent
                          type="single"
                          collapsible
                          parentValue={`s:${schema.name}`}
                          className="border-border/50 ms-4.5 border-l ps-5"
                        >
                          <AccordionMenuGroup>
                            {expandedSchema === schema.name && tablesQuery.isLoading ? (
                              <p className="text-muted-foreground flex items-center gap-2 px-3 py-1.5 text-xs">
                                <Loader2 className="size-3.5 animate-spin" aria-hidden /> Loading…
                              </p>
                            ) : expandedSchema === schema.name && tables.length === 0 ? (
                              <p className="text-muted-foreground px-3 py-1.5 text-xs">
                                No tables{filter ? ' match filter' : ''}
                              </p>
                            ) : expandedSchema === schema.name ? (
                              tables.map((table) => (
                                <AccordionMenuItem
                                  key={table.oid}
                                  value={`t:${schema.name}/${table.name}`}
                                  className="flex grow items-center gap-2"
                                  onClick={() => {
                                    setExpandedSchema(schema.name);
                                    goBrowse(schema.name, table.name);
                                  }}
                                >
                                  <Table2 data-slot="accordion-menu-icon" className="size-3.5!" />
                                  <span
                                    data-slot="accordion-menu-title"
                                    className="flex-1 truncate text-xs"
                                  >
                                    {table.name}
                                  </span>
                                  {table.rowEstimate > 0 ? (
                                    <span className="bg-muted text-muted-foreground ml-auto shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]">
                                      {table.rowEstimate >= 1000
                                        ? `${(table.rowEstimate / 1000).toFixed(1)}k`
                                        : table.rowEstimate}
                                    </span>
                                  ) : null}
                                </AccordionMenuItem>
                              ))
                            ) : null}
                          </AccordionMenuGroup>
                        </AccordionMenuSubContent>
                      </AccordionMenuSub>
                    ))
                  )}

                  {dbsQuery.data && dbsQuery.data.length > 1 ? (
                    <>
                      <AccordionMenuLabel>Databases</AccordionMenuLabel>
                      {dbsQuery.data.map((db) => (
                        <AccordionMenuItem
                          key={db.name}
                          value={`db:${db.name}`}
                          className="flex grow items-center gap-2"
                          onClick={() => {
                            navigate(`/databases?database=${db.name}`);
                            onNavigate?.();
                          }}
                        >
                          <Database
                            data-slot="accordion-menu-icon"
                            className={cn(
                              'size-3.5!',
                              db.name === database ? 'text-primary' : undefined,
                            )}
                          />
                          <span
                            data-slot="accordion-menu-title"
                            className="flex-1 truncate text-xs"
                          >
                            {db.name}
                          </span>
                        </AccordionMenuItem>
                      ))}
                    </>
                  ) : null}
                </>
              ) : null}
            </AccordionMenuGroup>
          </AccordionMenu>
        </div>
      </div>

      {/* Session footer */}
      <div
        className={
          collapsed
            ? 'border-border/60 flex shrink-0 flex-col items-center gap-1.5 border-t px-2 py-2.5'
            : 'border-border/60 flex shrink-0 items-center gap-2.5 border-t px-4 py-2.5'
        }
      >
        {' '}
        <span
          className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          aria-hidden
        >
          {(session.data?.username ?? '?').slice(0, 1).toUpperCase()}
        </span>
        {collapsed ? null : (
          <span className="min-w-0 flex-1">
            <span className="text-foreground block truncate text-[13px] font-medium">
              {session.data?.username ?? '…'}
            </span>
            <span className="text-muted-foreground block truncate text-[11px]">
              {session.data?.database ?? ''}
            </span>
          </span>
        )}
        <button
          type="button"
          onClick={logout}
          aria-label="Log out"
          title="Log out"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer rounded-md p-2 transition-colors"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}
