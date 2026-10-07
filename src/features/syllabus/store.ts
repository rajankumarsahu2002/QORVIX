import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '../../lib/dates';

export type NodeKind = 'subject' | 'chapter' | 'topic' | 'subtopic';
export type SourceMode = 'individual' | 'batch' | 'both';
export interface LearningSource {
  mode: SourceMode;
  indName?: string; indUrl?: string; indNotes?: string;
  batchName?: string; batchSubject?: string; batchNotes?: string;
}
export interface SylNode {
  id: string; kind: NodeKind; title: string; parentId?: string;
  source?: LearningSource; progress: number; mistakes: number; corrects: number;
}
interface SylState {
  nodes: SylNode[];
  addNode: (kind: NodeKind, title: string, parentId?: string) => void;
  renameNode: (id: string, title: string) => void;
  removeNode: (id: string) => void;
  setSource: (id: string, source: LearningSource) => void;
  setProgress: (id: string, progress: number) => void;
  logResult: (id: string, correct: boolean) => void;
  importJson: (text: string) => { added: number; skipped: number };
  seedIfEmpty: () => void;
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
      renameNode: (id, title) => set((s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, title } : n)) })),
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
      logResult: (id, correct) => set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, mistakes: n.mistakes + (correct ? 0 : 1), corrects: n.corrects + (correct ? 1 : 0) } : n)),
      })),
      importJson: (text) => {
        let added = 0; let skipped = 0;
        try {
          const data = JSON.parse(text) as { subjects?: { title: string; chapters?: { title: string; topics?: { title: string; subtopics?: string[] }[] }[] }[] };
          const cur = get().nodes;
          const has = (kind: NodeKind, parentId: string | undefined, title: string) =>
            cur.some((n) => n.kind === kind && n.parentId === parentId && n.title.toLowerCase() === title.toLowerCase());
          const pending: SylNode[] = [];
          const ensure = (kind: NodeKind, title: string, parentId?: string): string => {
            const ex = [...cur, ...pending].find((n) => n.kind === kind && n.parentId === parentId && n.title.toLowerCase() === title.toLowerCase());
            if (ex) { skipped += 1; return ex.id; }
            const id = uid(kind);
            pending.push({ id, kind, title, parentId, progress: 0, mistakes: 0, corrects: 0 });
            added += 1;
            return id;
          };
          for (const s of data.subjects ?? []) {
            if (!s.title || has('subject', undefined, s.title)) { skipped += 1; continue; }
            const sid = ensure('subject', s.title);
            for (const c of s.chapters ?? []) {
              const cid = ensure('chapter', c.title, sid);
              for (const t of c.topics ?? []) {
                const tid = ensure('topic', t.title, cid);
                for (const st of t.subtopics ?? []) ensure('subtopic', st, tid);
              }
            }
          }
          if (pending.length) set((st) => ({ nodes: [...st.nodes, ...pending] }));
        } catch { skipped += 1; }
        return { added, skipped };
      },
      seedIfEmpty: () => {
        if (get().nodes.length > 0) return;
        const qa: SylNode = { id: uid('subject'), kind: 'subject', title: 'Quantitative Aptitude', progress: 0, mistakes: 0, corrects: 0 };
        const re: SylNode = { id: uid('subject'), kind: 'subject', title: 'Reasoning', progress: 0, mistakes: 0, corrects: 0 };
        const gk: SylNode = { id: uid('subject'), kind: 'subject', title: 'General Knowledge', progress: 0, mistakes: 0, corrects: 0 };
        const ca: SylNode = { id: uid('subject'), kind: 'subject', title: 'Current Affairs', progress: 0, mistakes: 0, corrects: 0 };
        const ratio: SylNode = { id: uid('chapter'), kind: 'chapter', title: 'Ratio', parentId: qa.id, progress: 0, mistakes: 0, corrects: 0 };
        const part: SylNode = { id: uid('topic'), kind: 'topic', title: 'Partnership', parentId: ratio.id, progress: 0, mistakes: 0, corrects: 0, source: { mode: 'both', indName: 'Ratio Lecture', batchName: 'SSC Batch' } };
        set({ nodes: [qa, re, gk, ca, ratio, part] });
      },
    }),
    { name: 'qorvix-syllabus' }
  )
);
