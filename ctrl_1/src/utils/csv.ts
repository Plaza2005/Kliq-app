/**
 * Client-side CSV export.
 * Builds a CSV from the given columns/rows and triggers a browser download.
 */

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

function escapeCell(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // Quote if the cell contains a comma, quote, or newline
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportToCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]): void {
  const header = columns.map(c => escapeCell(c.header)).join(",");
  const lines = rows.map(row => columns.map(c => escapeCell(c.value(row))).join(","));
  const csv = [header, ...lines].join("\r\n");

  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
