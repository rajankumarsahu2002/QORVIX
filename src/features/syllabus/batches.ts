import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { uid } from '../../lib/dates';
import { idbStorage } from '../../lib/idb';

// Reusable Batch/Course model (§17). Lectures link to syllabus nodes by ID —
// no duplication: many lectures can point at the same Ratio topic.
export interface BatchLecture {
  id: string;
  name: string;
  no?: string; // lecture number/order
  url?: string;
  notes?: string;
  nodeId?: string; // classified micro-syllabus mapping (set after study, §17/§82)
}
export interface BatchCourse {
  id: string;
  name: string;
  description?: string;
  subjectId?: string; // may be the ONLY mapping known at first (§17)
  lectures: BatchLecture[];
}
interface BatchState {
  batches: BatchCourse[];
  addBatch: (name: string) => string;
  updateBatch: (id: string, patch: Partial<Omit<BatchCourse, 'id' | 'lectures'>>) => void;
  removeBatch: (id: string) => void;
  addLecture: (batchId: string, name: string) => void;
  updateLecture: (batchId: string, lectureId: string, patch: Partial<Omit<BatchLecture, 'id'>>) => void;
  removeLecture: (batchId: string, lectureId: string) => void;
}

export const useBatches = create<BatchState>()(
  persist(
    (set) => ({
      batches: [],
      addBatch: (name) => {
        const t = name.trim();
        const id = uid('batch');
        if (!t) return id;
        set((s) => ({ batches: [...s.batches, { id, name: t, lectures: [] }] }));
        return id;
      },
      updateBatch: (id, patch) => set((s) => ({
        batches: s.batches.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      })),
      removeBatch: (id) => set((s) => ({ batches: s.batches.filter((b) => b.id !== id) })),
      addLecture: (batchId, name) => {
        const t = name.trim();
        if (!t) return;
        set((s) => ({
          batches: s.batches.map((b) => (b.id === batchId
            ? { ...b, lectures: [...b.lectures, { id: uid('lec'), name: t }] }
            : b)),
        }));
      },
      updateLecture: (batchId, lectureId, patch) => set((s) => ({
        batches: s.batches.map((b) => (b.id === batchId
          ? { ...b, lectures: b.lectures.map((l) => (l.id === lectureId ? { ...l, ...patch } : l)) }
          : b)),
      })),
      removeLecture: (batchId, lectureId) => set((s) => ({
        batches: s.batches.map((b) => (b.id === batchId
          ? { ...b, lectures: b.lectures.filter((l) => l.id !== lectureId) }
          : b)),
      })),
    }),
    { name: 'qorvix-batches', storage: createJSONStorage(() => idbStorage) },
  ),
);
