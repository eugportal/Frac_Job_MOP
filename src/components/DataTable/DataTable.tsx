// Generic data table for repeating records with search, sort, and responsive card layout on mobile.

import { useMemo, useState, type ReactNode } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => string | number | null;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchKeys?: (keyof T)[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  emptyMessage?: string;
  searchPlaceholder?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  searchKeys,
  onEdit,
  onDelete,
  emptyMessage = 'No records yet.',
  searchPlaceholder = 'Search…',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    let rows = [...data];
    if (search && searchKeys) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)),
      );
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col) {
        rows.sort((a, b) => {
          const av = col.accessor(a);
          const bv = col.accessor(b);
          if (av === null) return 1;
          if (bv === null) return -1;
          if (typeof av === 'number' && typeof bv === 'number') {
            return sortDir === 'asc' ? av - bv : bv - av;
          }
          return sortDir === 'asc'
            ? String(av).localeCompare(String(bv))
            : String(bv).localeCompare(String(av));
        });
      }
    }
    return rows;
  }, [data, search, searchKeys, sortKey, sortDir, columns]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {searchKeys && (
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="field-input pl-9"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ink-300 bg-ink-50 py-10 text-center">
          <Inbox size={28} className="text-ink-300" />
          <p className="text-sm text-ink-500">{emptyMessage}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border border-ink-200 md:block">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className={`px-4 py-3 font-semibold ${col.className ?? ''}`}>
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className="flex items-center gap-1 hover:text-ink-700"
                        >
                          {col.header}
                          {sortKey === col.key ? (
                            sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                          ) : (
                            <ArrowUpDown size={12} className="text-ink-300" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  ))}
                  {(onEdit || onDelete) && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {filtered.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-ink-50">
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 text-ink-700 ${col.className ?? ''}`}>
                        {col.render ? col.render(row) : (col.accessor(row) ?? '—')}
                      </td>
                    ))}
                    {(onEdit || onDelete) && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(row)}
                              className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50"
                            >
                              Edit
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(row)}
                              className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((row) => (
              <div key={row.id} className="rounded-lg border border-ink-200 bg-white p-4 shadow-card">
                <dl className="space-y-1.5">
                  {columns.map((col) => (
                    <div key={col.key} className="flex justify-between gap-3 text-sm">
                      <dt className="font-medium text-ink-500">{col.header}</dt>
                      <dd className="text-right text-ink-800">
                        {col.render ? col.render(row) : (col.accessor(row) ?? '—')}
                      </dd>
                    </div>
                  ))}
                </dl>
                {(onEdit || onDelete) && (
                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-ink-100 pt-3">
                    {onEdit && (
                      <button type="button" onClick={() => onEdit(row)} className="btn-secondary py-1.5 text-xs">
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button type="button" onClick={() => onDelete(row)} className="btn-danger py-1.5 text-xs">
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
