import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { uid, todayIso } from '../../lib/dates';
import { idbStorage } from '../../lib/idb';

export type PlanStatus = 'todo' | 'doing' | 'done' | 'skipped';
export interface PlanItem {
  id: string; nodeId: string; title: string;
  chosenSource: 'individual' | 'batch' | 'both';
  minutes: number; actualMinutes?: number; status: PlanStatus; summary?: string;
  correct?: number; incorrect?: number; mistakeNote?: string;
}
export interface SuggestInput { nodeId: string; title: string; minutes?: number; chosenSource?: PlanItem['chosenSource']; kind?: string }
export type Repeat = 'daily' | 'weekly' | 'monthly' | 'days' | 'once';
export interface Routine { id: string; title: string; time: string; repeat: Repeat; days?: string[]; date?: string }
export interface PlanDay { date: string; items: PlanItem[]; edited: boolean; }
interface TTState {
  days: PlanDay[]; routines: Routine[];
  ensureToday: (suggest: SuggestInput[]) => void;
  replaceToday: (suggest: SuggestInput[]) => void; // regenerate proposal (§78)
  addItem: (date: string, item: Omit<PlanItem, 'id' | 'status'>) => void;
  updateItem: (date: string, id: string, patch: Partial<PlanItem>) => void;
  removeItem: (date: string, id: string) => void;
  moveItem: (date: string, id: string, dir: -1 | 1) => void;
  shiftRemaining: (date: string, fromId: string, extraMin: number) => void;
  addRoutine: (title: string, time: string, repeat?: Repeat, days?: string[], date?: string) => void;
  removeRoutine: (id: string) => void;
  todayItems: () => PlanItem[];
}

function toItems(suggest: SuggestInput[]): PlanItem[] {
  return suggest.slice(0, 8).map((s) => ({
    id: uid('pi'), nodeId: s.nodeId, title: s.title,
    chosenSource: s.chosenSource ?? 'both', minutes: Math.max(10, s.minutes ?? 45), status: 'todo' as PlanStatus,
  }));
}

export const useTimetable = create<TTState>()(
  persist(
    (set, get) => ({
      days: [], routines: [],
      ensureToday: (suggest) => {
        const d = todayIso();
        if (get().days.some((x) => x.date === d)) return;
        const items = toItems(suggest);
        if (items.length === 0) {
          items.push({ id: uid('pi'), nodeId: '', title: 'Current Affairs (Daily)', chosenSource: 'individual', minutes: 30, status: 'todo' });
          items.push({ id: uid('pi'), nodeId: '', title: 'Revision — yesterday topics', chosenSource: 'individual', minutes: 30, status: 'todo' });
        }
        set((s) => ({ days: [...s.days.slice(-29), { date: d, items, edited: false }] }));
      },
      replaceToday: (suggest) => {
        const d = todayIso();
        const items = toItems(suggest);
        set((s) => {
          const rest = s.days.filter((x) => x.date !== d);
          return { days: [...rest.slice(-29), { date: d, items, edited: true }] };
        });
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
      removeItem: (date, id) => set((s) => ({
        days: s.days.map((x) => (x.date === date
          ? { ...x, items: x.items.filter((it) => it.id !== id), edited: true }
          : x)),
      })),
      moveItem: (date, id, dir) => set((s) => ({
        days: s.days.map((x) => {
          if (x.date !== date) return x;
          const items = [...x.items];
          const i = items.findIndex((it) => it.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= items.length) return x;
          const tmp = items[i] as PlanItem;
          items[i] = items[j] as PlanItem;
          items[j] = tmp;
          return { ...x, items, edited: true };
        }),
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
      addRoutine: (title, time, repeat = 'daily', days, date) => set((s) => ({ routines: [...s.routines, { id: uid('rt'), title, time, repeat, days, date }] })),
      removeRoutine: (id) => set((s) => ({ routines: s.routines.filter((r) => r.id !== id) })),
      todayItems: () => get().days.find((x) => x.date === todayIso())?.items ?? [],
    }),
    { name: 'qorvix-timetable', storage: createJSONStorage(() => idbStorage) }
  )
);
