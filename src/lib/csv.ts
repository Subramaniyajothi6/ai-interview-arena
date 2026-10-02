// One CSV cell. Values starting with = + - @ are treated as formulas by
// spreadsheet apps, so they are prefixed with ' to keep exports safe.
export function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
