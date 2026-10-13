const DAY_MS = 24 * 60 * 60 * 1000;
export function utcDate(date: Date) { return date.toISOString().slice(0, 10); }
export function analyticsRanges(now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return { now: new Date(now), rolling24h: new Date(now.getTime() - DAY_MS),
    days7: new Date(today - 6 * DAY_MS), days30: new Date(today - 29 * DAY_MS) };
}
export function utcDates(count: number, now: Date): string[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: count }, (_, index) => utcDate(new Date(today - (count - index - 1) * DAY_MS)));
}
export function fillDailySeries<T extends { date: string }>(rows: T[], dates: string[], empty: (date: string) => T): T[] {
  const byDate = new Map(rows.map(row => [row.date, row]));
  return dates.map(date => byDate.get(date) ?? empty(date));
}
