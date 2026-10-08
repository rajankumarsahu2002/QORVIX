// Local-scheduled push (no backend). Falls back to in-app badges if denied.
import type { Routine } from '../features/timetable/store';

export type NotifyItem = { id: string; at: number; title: string; body: string };

const KEY = 'qorvix-notif-queue';

export async function ensurePushPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function queueLocal(item: NotifyItem): void {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as NotifyItem[]) : [];
    const deduped = arr.filter((n) => n.id !== item.id);
    deduped.push(item);
    localStorage.setItem(KEY, JSON.stringify(deduped.slice(-60)));
  } catch {
    /* ignore */
  }
}

/** Queue only if the target date is in the future; offsetDays counts back from an ISO date. */
export function scheduleBefore(dateIso: string | undefined, offsetDays: number, id: string, title: string, body: string): void {
  if (!dateIso) return;
  const t = new Date(dateIso).getTime();
  if (Number.isNaN(t)) return;
  const delayDays = (t - Date.now()) / 86400000 - offsetDays;
  if (delayDays < -1) return; // already passed
  queueLocal({ id, at: Date.now() + Math.max(0, delayDays) * 86400000, title, body });
}

const DAY_MS = 86400000;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Next-occurrence routine reminders + nightly plan nudge (§46). Idempotent by id. */
export function scheduleRoutines(routines: Routine[]): void {
  const now = new Date();
  const nowMs = now.getTime();
  for (const r of routines) {
    const parts = r.time.split(':');
    const hh = Number(parts[0] ?? '');
    const mm = Number(parts[1] ?? '');
    if (Number.isNaN(hh) || Number.isNaN(mm)) continue;
    const at = (d: Date): number => {
      const x = new Date(d);
      x.setHours(hh, mm, 0, 0);
      return x.getTime();
    };
    let fire = -1;
    if (r.repeat === 'once') {
      if (!r.date) continue;
      const t = at(new Date(r.date));
      if (Number.isNaN(t) || t <= nowMs) continue;
      fire = t;
    } else if (r.repeat === 'daily') {
      fire = at(now);
      if (fire <= nowMs) fire += DAY_MS;
    } else if (r.repeat === 'weekly') {
      fire = at(now) + 7 * DAY_MS;
    } else if (r.repeat === 'monthly') {
      const x = new Date(now);
      x.setMonth(x.getMonth() + 1);
      fire = at(x);
    } else if (r.repeat === 'days' && r.days && r.days.length > 0) {
      for (let k = 0; k < 8; k++) {
        const d = new Date(nowMs + k * DAY_MS);
        const wd = WD[d.getDay() % 7] as string;
        if (r.days.includes(wd) && at(d) > nowMs) { fire = at(d); break; }
      }
      if (fire < 0) continue;
    } else {
      continue;
    }
    queueLocal({ id: `rt-${r.id}`, at: fire, title: r.title, body: `Routine: ${r.title} at ${r.time}` });
  }
  const nudge = new Date(now);
  nudge.setHours(21, 0, 0, 0);
  queueLocal({
    id: 'plan-nudge',
    at: nudge.getTime() <= nowMs ? nudge.getTime() + DAY_MS : nudge.getTime(),
    title: 'Make tomorrow’s plan 🌙',
    body: 'Open the Plan tab and tap “Make my plan”.',
  });
}

export function dueNotifications(): NotifyItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as NotifyItem[];
    const now = Date.now();
    const due = arr.filter((n) => n.at <= now);
    const rest = arr.filter((n) => n.at > now);
    localStorage.setItem(KEY, JSON.stringify(rest));
    return due;
  } catch {
    return [];
  }
}

export async function fireDue(): Promise<number> {
  const due = dueNotifications();
  if (!('Notification' in window) || Notification.permission !== 'granted') return due.length;
  for (const n of due) {
    try {
      const reg = await navigator.serviceWorker?.ready;
      if (reg) await reg.showNotification(n.title, { body: n.body });
      else new Notification(n.title, { body: n.body });
    } catch {
      /* ignore */
    }
  }
  return due.length;
}

export function scheduleInDays(id: string, days: number, title: string, body: string): void {
  queueLocal({ id, at: Date.now() + days * 86400000, title, body });
}
