import { Search } from 'lucide-react';
import { formatCell } from '@/shared/utils/index.js';
import { Card, CardTable } from './card.js';
import { Input, InputWrapper } from './input.js';
import { Skeleton } from './skeleton.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table.js';

interface DataTableProps {
  columns: string[];
  rows: unknown[][];
  caption?: string;
  isLoading?: boolean;
  searchLabel?: string;
  onSearch?: (value: string) => void;
}

export function DataTable({
  columns,
  rows,
  caption,
  isLoading = false,
  searchLabel,
  onSearch,
}: DataTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardTable>
          <div className="flex flex-col gap-3 p-4" aria-label="Loading table">
            {Array.from({ length: 5 }).map((_, r) => (
              <div key={r} className="flex gap-3">
                {Array.from({ length: Math.max(columns.length, 3) }).map((_, c) => (
                  <Skeleton
                    key={c}
                    className="h-4"
                    style={{ width: `${55 + ((c * 37 + r * 13) % 35)}%` }}
                  />
                ))}
              </div>
            ))}
          </div>
        </CardTable>
      </Card>
    );
  }
  return (
    <Card>
      {caption || onSearch ? (
        <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-2.5">
          {caption ? (
            <p className="text-muted-foreground text-xs font-medium">{caption}</p>
          ) : (
            <span />
          )}
          {onSearch ? (
            <InputWrapper variant="sm" className="w-52">
              <Search className="text-muted-foreground ms-2 size-3.5" aria-hidden />
              <Input
                type="search"
                placeholder={searchLabel ?? 'Search…'}
                aria-label={searchLabel ?? 'Search'}
                onChange={(e) => {
                  onSearch(e.target.value);
                }}
              />
            </InputWrapper>
          ) : null}
        </div>
      ) : null}
      <CardTable>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col} className="whitespace-nowrap">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map((col, j) => (
                  <TableCell key={col} className="font-mono text-[13px] whitespace-nowrap">
                    {formatCell(row[j])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardTable>
    </Card>
  );
}
