import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { uid } from '../../lib/dates';
import { idbStorage } from '../../lib/idb';
import { parseCsv } from '../../lib/validate';

export type NodeKind = 'subject' | 'chapter' | 'topic' | 'subtopic';
export type SourceMode = 'individual' | 'batch' | 'both';
export interface LearningSource {
  mode: SourceMode;
  indName?: string; indUrl?: string; indNotes?: string;
  batchName?: string; batchSubject?: string; batchNotes?: string;
  batchId?: string; lectureId?: string; // link into reusable BatchCourse (§17)
}
export interface SylNode {
  id: string; kind: NodeKind; title: string; parentId?: string;
  source?: LearningSource; progress: number; mistakes: number; corrects: number;
  lastStudiedAt?: string; // YYYY-MM-DD, for staleness-aware revision (§57)
}
interface SylState {
  nodes: SylNode[];
  addNode: (kind: NodeKind, title: string, parentId?: string) => void;
  renameNode: (id: string, title: string) => void;
  removeNode: (id: string) => void;
  setSource: (id: string, source: LearningSource) => void;
  setProgress: (id: string, progress: number) => void;
  touchStudied: (id: string) => void;
  completeNode: (id: string) => void; // Done in timetable → Completed (§79)
  logResult: (id: string, correct: boolean) => void;
  importJson: (text: string) => { added: number; skipped: number };
  importCsv: (text: string) => { added: number; skipped: number };
}

/** Rolled-up progress: leaf returns own progress, parent returns avg of children. */
export function rollupProgress(nodes: SylNode[], id: string): number {
  const kids = nodes.filter((n) => n.parentId === id);
  if (kids.length === 0) return nodes.find((n) => n.id === id)?.progress ?? 0;
  const sum = kids.reduce((a, k) => a + rollupProgress(nodes, k.id), 0);
  return Math.round(sum / kids.length);
}

/** Shared importer: creates missing chain nodes, counts added/skipped. */
function ensureInto(
  cur: SylNode[],
  pending: SylNode[],
  counters: { added: number; skipped: number },
  kind: NodeKind,
  title: string,
  parentId?: string,
): string {
  const t = title.trim();
  const ex = [...cur, ...pending].find(
    (n) => n.kind === kind && n.parentId === parentId && n.title.toLowerCase() === t.toLowerCase(),
  );
  if (ex) {
    counters.skipped += 1;
    return ex.id;
  }
  const id = uid(kind);
  pending.push({ id, kind, title: t, parentId, progress: 0, mistakes: 0, corrects: 0 });
  counters.added += 1;
  return id;
}
export function heatClass(node: SylNode): string {
  const total = node.mistakes + node.corrects;
  if (total === 0) return 'heat-0';
  const r = node.mistakes / total;
  if (r >= 0.7) return 'heat-4';
  if (r >= 0.5) return 'heat-3';
  if (r >= 0.3) return 'heat-2';
  if (r > 0) return 'heat-1';
  return 'heat-0';
}

export const useSyllabus = create<SylState>()(
  persist(
    (set, get) => ({
      nodes: [],
      addNode: (kind, title, parentId) => {
        const t = title.trim();
        if (!t) return;
        const dup = get().nodes.some((n) => n.kind === kind && n.parentId === parentId && n.title.toLowerCase() === t.toLowerCase());
        if (dup) return;
        set((s) => ({ nodes: [...s.nodes, { id: uid(kind), kind, title: t, parentId, progress: 0, mistakes: 0, corrects: 0 }] }));
      },
      renameNode: (id, title) => set((s) => {
        const t = title.trim();
        if (!t) return s;
        const self = s.nodes.find((n) => n.id === id);
        if (!self) return s;
        const dup = s.nodes.some(
          (n) => n.id !== id && n.kind === self.kind && n.parentId === self.parentId && n.title.toLowerCase() === t.toLowerCase(),
        );
        if (dup) return s;
        return { nodes: s.nodes.map((n) => (n.id === id ? { ...n, title: t } : n)) };
      }),
      removeNode: (id) => set((s) => {
        const kill = new Set<string>([id]);
        let grew = true;
        while (grew) {
          grew = false;
          for (const n of s.nodes) {
            if (n.parentId && kill.has(n.parentId) && !kill.has(n.id)) { kill.add(n.id); grew = true; }
          }
        }
        return { nodes: s.nodes.filter((n) => !kill.has(n.id)) };
      }),
      setSource: (id, source) => set((s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, source } : n)) })),
      setProgress: (id, progress) => set((s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, progress: Math.max(0, Math.min(100, progress)) } : n)) })),
      touchStudied: (id) => {
        const d = new Date().toISOString().slice(0, 10);
        set((s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, lastStudiedAt: d } : n)) }));
      },
      completeNode: (id) => {
        const d = new Date().toISOString().slice(0, 10);
        set((s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, progress: 100, lastStudiedAt: d } : n)) }));
      },
      logResult: (id, correct) => set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, mistakes: n.mistakes + (correct ? 0 : 1), corrects: n.corrects + (correct ? 1 : 0) } : n)),
      })),
      importJson: (text) => {
        const counters = { added: 0, skipped: 0 };
        try {
          const data = JSON.parse(text) as { subjects?: { title: string; chapters?: { title: string; topics?: { title: string; subtopics?: string[] }[] }[] }[] };
          const cur = get().nodes;
          const pending: SylNode[] = [];
          for (const s of data.subjects ?? []) {
            if (!s.title?.trim()) { counters.skipped += 1; continue; }
            const sid = ensureInto(cur, pending, counters, 'subject', s.title);
            for (const c of s.chapters ?? []) {
              if (!c.title?.trim()) { counters.skipped += 1; continue; }
              const cid = ensureInto(cur, pending, counters, 'chapter', c.title, sid);
              for (const t of c.topics ?? []) {
                if (!t.title?.trim()) { counters.skipped += 1; continue; }
                const tid = ensureInto(cur, pending, counters, 'topic', t.title, cid);
                for (const st of t.subtopics ?? []) {
                  if (typeof st !== 'string' || !st.trim()) { counters.skipped += 1; continue; }
                  ensureInto(cur, pending, counters, 'subtopic', st, tid);
                }
              }
            }
          }
          if (pending.length) set((st) => ({ nodes: [...st.nodes, ...pending] }));
        } catch { counters.skipped += 1; }
        return counters;
      },
      importCsv: (text) => {
        const counters = { added: 0, skipped: 0 };
        try {
          const rows = parseCsv(text);
          if (rows.length === 0) return counters;
          const head = (rows[0] ?? []).map((c) => c.trim().toLowerCase());
          const hasHead = head.includes('subject') || head.includes('chapter') || head.includes('topic');
          const idx = (name: string, fallback: number): number => {
            const i = head.indexOf(name);
            return hasHead ? i : fallback;
          };
          const si = idx('subject', 0); const ci = idx('chapter', 1);
          const ti = idx('topic', 2); const sti = idx('subtopic', 3);
          const cur = get().nodes;
          const pending: SylNode[] = [];
          const dataRows = hasHead ? rows.slice(1) : rows;
          const cell = (r: string[], i: number): string => (i >= 0 ? (r[i] ?? '').trim() : '');
          for (const r of dataRows) {
            const sv = cell(r, si);
            if (!sv) { counters.skipped += 1; continue; }
            const sid = ensureInto(cur, pending, counters, 'subject', sv);
            const cv = cell(r, ci);
            if (!cv) continue;
            const cid = ensureInto(cur, pending, counters, 'chapter', cv, sid);
            const tv = cell(r, ti);
            if (!tv) continue;
            const tid = ensureInto(cur, pending, counters, 'topic', tv, cid);
            const stv = cell(r, sti);
            if (stv) ensureInto(cur, pending, counters, 'subtopic', stv, tid);
          }
          if (pending.length) set((st) => ({ nodes: [...st.nodes, ...pending] }));
        } catch { counters.skipped += 1; }
        return counters;
      },
    }),
    { name: 'qorvix-syllabus', storage: createJSONStorage(() => idbStorage) }
  )
);
