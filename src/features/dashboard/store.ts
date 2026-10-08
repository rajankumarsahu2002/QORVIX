import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../../lib/idb';

interface DayHours { date: string; minutes: number }
export interface StudySession {
  id: string; date: string; minutes: number;
  nodeId?: string; title?: string; // linked study task/syllabus (§60)
}
interface Running { since: number; nodeId?: string; title?: string }
interface DashState {
  running: Running | null;
  hours: DayHours[];
  sessions: StudySession[];
  start: (title?: string, nodeId?: string) => void;
  stop: () => void;
  totalToday: () => number;
  sessionsToday: () => StudySession[];
}
function dayKey(): string { return new Date().toISOString().slice(0, 10); }
function uid(p: string): string { return `${p}_${Math.random().toString(36).slice(2, 9)}`; }

export const useDashboard = create<DashState>()(
  persist(
    (set, get) => ({
      running: null,
      hours: [],
      sessions: [],
      start: (title, nodeId) => {
        if (get().running) return;
        set({ running: { since: Date.now(), nodeId, title } });
      },
      stop: () => {
        const r = get().running;
        if (!r) return;
        const min = Math.max(1, Math.round((Date.now() - r.since) / 60000));
        const k = dayKey();
        const ex = get().hours.find((h) => h.date === k);
        const hours = ex
          ? get().hours.map((h) => (h.date === k ? { ...h, minutes: h.minutes + min } : h))
          : [...get().hours.slice(-89), { date: k, minutes: min }];
        const sessions: StudySession[] = [
          ...get().sessions.slice(-199),
          { id: uid('ss'), date: k, minutes: min, nodeId: r.nodeId, title: r.title },
        ];
        set({ running: null, hours, sessions });
      },
      totalToday: () => {
        const k = dayKey();
        const base = get().hours.find((h) => h.date === k)?.minutes ?? 0;
        const r = get().running;
        if (!r) return base;
        return base + Math.round((Date.now() - r.since) / 60000);
      },
      sessionsToday: () => {
        const k = dayKey();
        return get().sessions.filter((s) => s.date === k).reverse();
      },
    }),
    { name: 'qorvix-dashboard', storage: createJSONStorage(() => idbStorage) },
  ),
);
