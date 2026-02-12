export function formatIsoDateToDateInputValue(isoDate: string | null | undefined): string {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  // Use UTC to avoid timezone-induced day shifts.
  return date.toISOString().slice(0, 10);
}

export function parseDateInputValueToIsoUtc(dateInputValue: string): string | null {
  const trimmed = dateInputValue.trim();
  if (!trimmed) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;

  // Reject impossible dates like 2026-02-31 (Date() will overflow them).
  if (date.getUTCFullYear() !== year) return null;
  if (date.getUTCMonth() !== month - 1) return null;
  if (date.getUTCDate() !== day) return null;

  return date.toISOString();
}

