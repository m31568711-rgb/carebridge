import type { ReactNode } from 'react';

interface DataTableProps {
  caption: string;
  columns: string[];
  rows: ReactNode[][];
  emptyState?: ReactNode;
}

export function DataTable({ caption, columns, rows, emptyState }: DataTableProps) {
  if (rows.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-start text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>{columns.map((column) => <th className="px-5 py-4 text-start" key={column} scope="col">{column}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.map((row, rowIndex) => (
              <tr className="transition hover:bg-blue-50/30" key={rowIndex}>
                {row.map((cell, cellIndex) => <td className="px-5 py-4" key={cellIndex}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
