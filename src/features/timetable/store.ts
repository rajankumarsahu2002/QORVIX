import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid, todayIso } from '../../lib/dates';

export type PlanStatus = 'todo' | 'doing' | 'done' | 'skipped';
export interface PlanItem {
  id: string; nodeId: string; title: string;
  chosenSource: 'individual' | 'batch' | 'both';
  minutes: number; status: PlanStatus; summary?: string;
  correct?: number; incorrect?: number; mistakeNote?: string;
}
export interface Routine { id: string; title: string; time: string; repeat: 'daily' | 'weekly' | 'monthly'; }
export interface PlanDay { date: string; items: PlanItem[]; edited: boolean; }
interface TTState {
  days: PlanDay[]; routines: Routine[];
  ensureToday: (suggest: { nodeId: string; title: string }[]) => void;
  addItem: (date: string, item: Omit<PlanItem, 'id' | 'status'>) => void;
  updateItem: (date: string, id: string, patch: Partial<PlanItem>) => void;
  shiftRemaining: (date: string, fromId: string, extraMin: number) => void;
  addRoutine: (title: string, time: string) => void;
  todayItems: () => PlanItem[];
}

export const useTimetable = create<TTState>()(
  persist(
    (set, get) => ({
      days: [], routines: [],
      ensureToday: (suggest) => {
        const d = todayIso();
        if (get().days.some((x) => x.date === d)) return;
        const items: PlanItem[] = suggest.slice(0, 6).map((s, i) => ({
          id: uid('pi'), nodeId: s.nodeId, title: s.title,
          chosenSource: 'both', minutes: [60, 50, 45, 40, 30, 30][i] ?? 30, status: 'todo',
        }));
        if (items.length === 0) {
          items.push({ id: uid('pi'), nodeId: '', title: 'Current Affairs (Daily)', chosenSource: 'individual', minutes: 30, status: 'todo' });
          items.push({ id: uid('pi'), nodeId: '', title: 'Revision — yesterday topics', chosenSource: 'individual', minutes: 30, status: 'todo' });
        }
        set((s) => ({ days: [...s.days.slice(-29), { date: d, items, edited: false }] }));
      },
      addItem: (date, item) => set((s) => {
        const ex = s.days.find((x) => x.date === date);
        const full: PlanItem = { ...item, id: uid('pi'), status: 'todo' };
        if (!ex) return { days: [...s.days, { date, items: [full], edited: true }] };
        return { days: s.days.map((x) => (x.date === date ? { ...x, items: [...x.items, full], edited: true } : x)) };
      }),
      updateItem: (date, id, patch) => set((s) => ({
        days: s.days.map((x) => (x.date === date
          ? { ...x, items: x.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }
          : x)),
      })),
      shiftRemaining: (date, fromId, extraMin) => set((s) => ({
        days: s.days.map((x) => {
          if (x.date !== date) return x;
          const idx = x.items.findIndex((i) => i.id === fromId);
          if (idx < 0) return x;
          const items = x.items.map((it) => ({ ...it }));
          items[idx].minutes += extraMin;
          let carry = extraMin;
          for (let k = idx + 1; k < items.length && carry > 0; k++) {
            const take = Math.min(15, carry, Math.max(0, items[k].minutes - 15));
            items[k].minutes -= take;
            carry -= take;
          }
          return { ...x, items, edited: true };
        }),
      })),
      addRoutine: (title, time) => set((s) => ({ routines: [...s.routines, { id: uid('rt'), title, time, repeat: 'daily' }] })),
      todayItems: () => get().days.find((x) => x.date === todayIso())?.items ?? [],
    }),
    { name: 'qorvix-timetable' }
  )
);
