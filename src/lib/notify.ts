// Local-scheduled push (no backend). Falls back to in-app badges if denied.
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
