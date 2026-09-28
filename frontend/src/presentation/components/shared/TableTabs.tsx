import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '@/shared/utils/index.js';

const tabs = [
  { key: 'browse', label: 'Browse', to: (q: string) => `/browse?${q}` },
  { key: 'table', label: 'Structure', to: (q: string) => `/table?${q}` },
  { key: 'sql', label: 'SQL', to: (q: string) => `/sql?${q}` },
  { key: 'search', label: 'Search', to: (q: string) => `/search?${q}` },
  { key: 'insert', label: 'Insert', to: (q: string) => `/insert?${q}` },
  { key: 'export', label: 'Export', to: (q: string) => `/export?${q}` },
  { key: 'import', label: 'Import', to: (q: string) => `/export?${q}&mode=import` },
  { key: 'admin', label: 'Operations', to: (q: string) => `/admin?${q}` },
] as const;

export function TableTabs({ active }: { active: (typeof tabs)[number]['key'] }) {
  const [params] = useSearchParams();
  const q = new URLSearchParams();
  const database = params.get('database');
  const schema = params.get('schema');
  const table = params.get('table');
  if (database) q.set('database', database);
  if (schema) q.set('schema', schema);
  if (table) q.set('table', table);
  const qs = q.toString();

  return (
    <nav aria-label="Table" className="border-border mb-4 flex flex-wrap gap-1 border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          to={tab.to(qs)}
          aria-current={tab.key === active ? 'page' : undefined}
          className={cn(
            '-mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors',
            tab.key === active
              ? 'border-primary text-primary'
              : 'text-muted-foreground hover:border-border hover:text-foreground border-transparent',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
