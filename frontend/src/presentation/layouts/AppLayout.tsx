import { useEffect, useState } from 'react';
import { Link, Outlet, useSearchParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cn } from '@/shared/utils/index.js';
import logoUrl from '@/assets/logo.png';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/presentation/components/ui/breadcrumb.js';
import { Button } from '@/presentation/components/ui/button.js';
import { Sheet, SheetBody, SheetContent, SheetHeader } from '@/presentation/components/ui/sheet.js';
import { RequireAuth } from '@/presentation/components/shared/RequireAuth.js';
import { ThemeToggle } from '@/presentation/components/shared/ThemeToggle.js';
import { ExplorerSidebar } from './components/ExplorerSidebar.js';

function Shell() {
  const [params] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tf-sidebar-collapsed') === '1';
    } catch {
      return false;
    }
  });

  const database = params.get('database') ?? '';
  const schema = params.get('schema') ?? '';
  const table = params.get('table') ?? '';

  useEffect(() => {
    const onScroll = (): void => {
      setStuck(window.scrollY > 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const toggleCollapsed = (): void => {
    setCollapsed((prev) => {
      try {
        localStorage.setItem('tf-sidebar-collapsed', prev ? '0' : '1');
      } catch {
        // ignore persistence failures
      }
      return !prev;
    });
  };

  useEffect(() => {
    setDrawerOpen(false);
  }, [database, schema, table]);

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sidebar border-border bg-background fixed inset-y-0 start-0 z-20 hidden shrink-0 flex-col items-stretch border-e transition-[width] duration-200 lg:flex',
          collapsed ? 'w-20' : 'w-(--sidebar-default-width)',
        )}
      >
        <div className="from-primary/80 via-primary to-primary/40 hidden h-0.75 w-full shrink-0 bg-linear-to-r lg:block" />
        <div className="min-h-0 flex-1">
          <ExplorerSidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="gap-0 p-0 lg:hidden" side="left" close={false}>
          <SheetHeader className="space-y-0 p-0" />
          <SheetBody className="overflow-y-auto p-0">
            <ExplorerSidebar
              onNavigate={() => {
                setDrawerOpen(false);
              }}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-200',
          collapsed ? 'lg:ps-20' : 'lg:ps-(--sidebar-default-width)',
        )}
      >
        {/* Topbar */}
        <header
          className={cn(
            'header bg-background sticky top-0 z-10 flex h-(--header-height) shrink-0 items-stretch border-b border-transparent',
            stuck && 'border-border',
          )}
        >
          <div className="mx-auto flex w-full max-w-none items-center justify-between gap-4 px-4 lg:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                mode="icon"
                onClick={() => {
                  setDrawerOpen(true);
                }}
                aria-label="Open explorer"
                className="[&_svg]:text-muted-foreground/70 lg:hidden"
              >
                <Menu />
              </Button>
              <Link to="/databases" className="shrink-0 lg:hidden" aria-label="TableForge home">
                <img src={logoUrl} alt="TableForge" className="size-7 rounded-md" />
              </Link>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to={database ? `/databases?database=${database}` : '/databases'}>
                        Databases
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {database ? (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                          <Link to={`/schemas?database=${database}`}>{database}</Link>
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                    </>
                  ) : null}
                  {schema ? (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                          <Link to={`/tables?database=${database}&schema=${schema}`}>{schema}</Link>
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                    </>
                  ) : null}
                  {table ? (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{table}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  ) : null}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="w-full min-w-0 flex-1 px-4 py-5 lg:px-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AppLayout() {
  return (
    <RequireAuth>
      <Shell />
    </RequireAuth>
  );
}

export function AuthLayout() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
      <Outlet />
    </div>
  );
}
