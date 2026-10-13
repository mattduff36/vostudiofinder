/** CSV intended for spreadsheet import. Formula-like user text receives a literal prefix. */
export function encodeCsvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  const literal = /^[\s\u0000-\u001f]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text) ? `'${text}` : text;
  return `"${literal.replace(/"/g, '""')}"`;
}

export function encodeCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map(row => row.map(encodeCsvCell).join(',')).join('\r\n');
}
