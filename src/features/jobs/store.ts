import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid, todayIso } from '../../lib/dates';

export type Level = '10th' | '+2' | '+3' | 'PG';
export type Category = 'Central' | 'State' | 'District';
export type PayMode = 'Online' | 'Challan' | 'Postal Stamp' | 'Other';
export type StageType = 'Prelims' | 'Mains' | 'Skill' | 'DV' | 'Interview';

export interface SyllabusLink { subjectId: string; chapterIds: string[]; weightage?: number }
export interface Admit { downloaded: boolean; examDate?: string; shift?: string; gateClosing?: string; center?: string; docs?: string }
export interface Result { status?: 'Given' | 'Missed' | 'Overlap'; answerKey?: string; cutoff?: string; marks?: string; pdf?: string; cleared?: boolean }
export interface Stage {
  id: string; type: StageType; approxDate?: string;
  links: SyllabusLink[]; admit: Admit; result: Result;
  customSyllabus?: string; // Skill Test free-text syllabus (not only tree links)
}
export interface Job {
  id: string; kind: 'job' | 'academic'; isTarget: boolean; parentId?: string;
  examName: string; bodyWebsite: string; postName: string; notifPdf: string;
  level: Level; category: Category; priority: number;
  appDate: string; fee: number; refundable: boolean; refundAmt?: number; refundDate?: string;
  payMode: PayMode; appNo?: string; regNo?: string; rollNo?: string;
  stages: Stage[];
}
interface JobState {
  jobs: Job[];
  addJob: (j: Partial<Job>) => string;
  updateJob: (id: string, patch: Partial<Job>) => void;
  removeJob: (id: string) => void;
  convertTarget: (id: string) => void;
  addStage: (jobId: string, type: StageType) => void;
  removeStage: (jobId: string, stageId: string) => void;
  updateStage: (jobId: string, stageId: string, patch: Partial<Stage>) => void;
  seedIfEmpty: () => void;
}

export const useJobs = create<JobState>()(
  persist(
    (set, get) => ({
      jobs: [],
      addJob: (j) => {
        const id = uid('job');
        const job: Job = {
          id, kind: j.kind ?? 'job', isTarget: j.isTarget ?? false,
          parentId: j.parentId, examName: j.examName?.trim() || 'New Exam',
          bodyWebsite: j.bodyWebsite ?? '', postName: j.postName ?? '', notifPdf: j.notifPdf ?? '',
          level: j.level ?? '+3', category: j.category ?? 'State', priority: j.priority ?? 3,
          appDate: j.appDate ?? todayIso(), fee: j.fee ?? 0, refundable: j.refundable ?? false,
          refundAmt: j.refundAmt, refundDate: j.refundDate, payMode: j.payMode ?? 'Online',
          appNo: j.appNo, regNo: j.regNo, rollNo: j.rollNo, stages: j.stages ?? [],
        };
        set((s) => ({ jobs: [...s.jobs, job] }));
        return id;
      },
      updateJob: (id, patch) => set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),
      removeJob: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id && j.parentId !== id) })),
      convertTarget: (id) => set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, isTarget: false, appDate: j.appDate || todayIso() } : j)) })),
      addStage: (jobId, type) => set((s) => ({
        jobs: s.jobs.map((j) => (j.id === jobId
          ? { ...j, stages: [...j.stages, { id: uid('st'), type, links: [], admit: { downloaded: false }, result: {} }] }
          : j)),
      })),
      removeStage: (jobId, stageId) => set((s) => ({
        jobs: s.jobs.map((j) => (j.id === jobId
          ? { ...j, stages: j.stages.filter((st) => st.id !== stageId) }
          : j)),
      })),
      updateStage: (jobId, stageId, patch) => set((s) => ({
        jobs: s.jobs.map((j) => (j.id === jobId
          ? { ...j, stages: j.stages.map((st) => (st.id === stageId ? { ...st, ...patch } : st)) }
          : j)),
      })),
      seedIfEmpty: () => {
        if (get().jobs.length > 0) return;
        const id = uid('job');
        set({
          jobs: [{
            id, kind: 'job', isTarget: true, examName: 'Odisha Forest Guard', bodyWebsite: '', postName: 'Forest Guard',
            notifPdf: '', level: '+2', category: 'State', priority: 5, appDate: todayIso(), fee: 0,
            refundable: false, payMode: 'Online', stages: [],
          }],
        });
      },
    }),
    { name: 'qorvix-jobs' }
  )
);
