export function daysUntil(dateIso: string): number {
  const t = new Date(dateIso).getTime();
  if (Number.isNaN(t)) return 9999;
  return Math.ceil((t - Date.now()) / 86400000);
}
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
export function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
