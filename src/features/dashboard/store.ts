import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DayHours { date: string; minutes: number }
interface DashState {
  runningSince: number | null;
  hours: DayHours[];
  start: () => void;
  stop: () => void;
  totalToday: () => number;
}
function dayKey(): string { return new Date().toISOString().slice(0, 10); }

export const useDashboard = create<DashState>()(
  persist(
    (set, get) => ({
      runningSince: null,
      hours: [],
      start: () => set({ runningSince: Date.now() }),
      stop: () => {
        const s = get().runningSince;
        if (!s) return;
        const min = Math.max(1, Math.round((Date.now() - s) / 60000));
        const k = dayKey();
        const ex = get().hours.find((h) => h.date === k);
        const hours = ex
          ? get().hours.map((h) => (h.date === k ? { ...h, minutes: h.minutes + min } : h))
          : [...get().hours.slice(-89), { date: k, minutes: min }];
        set({ runningSince: null, hours });
      },
      totalToday: () => {
        const k = dayKey();
        const base = get().hours.find((h) => h.date === k)?.minutes ?? 0;
        const s = get().runningSince;
        if (!s) return base;
        return base + Math.round((Date.now() - s) / 60000);
      },
    }),
    { name: 'qorvix-dashboard' }
  )
);
