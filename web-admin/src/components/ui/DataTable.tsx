// src/components/ui/DataTable.tsx
'use client';

import { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key:       string;
  header:    string;
  render:    (row: T) => ReactNode;
  className?: string;
}

interface Meta {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}

interface Props<T> {
  columns:     Column<T>[];
  data:        T[];
  meta?:       Meta;
  onPageChange?: (page: number) => void;
  loading?:    boolean;
  onRowClick?: (row: T) => void;
  emptyText?:  string;
}

export function DataTable<T>({
  columns, data, meta, onPageChange, loading, onRowClick, emptyText = 'No data found',
}: Props<T>) {
  return (
    <div className="flex flex-col gap-0">
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface-overlay">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider border-b border-surface-border ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading && (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-surface-border/50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="skeleton h-4 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            )}

            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-ink-muted text-sm">
                  {emptyText}
                </td>
              </tr>
            )}

            {!loading && data.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-surface-border/50 transition-colors duration-150 ${onRowClick ? 'hover:bg-surface-overlay cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-ink ${col.className ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-1 mt-4">
          <p className="text-xs text-ink-muted">
            Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(meta.page - 1)}
              disabled={meta.page <= 1}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-overlay disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange?.(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    p === meta.page
                      ? 'bg-brand text-white'
                      : 'text-ink-muted hover:text-ink hover:bg-surface-overlay'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange?.(meta.page + 1)}
              disabled={meta.page >= meta.totalPages}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-overlay disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}