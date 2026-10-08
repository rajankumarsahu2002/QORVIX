import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { uid, todayIso } from '../../lib/dates';
import { idbStorage } from '../../lib/idb';

export type Level = '10th' | '+2' | '+3' | 'PG';
export type Category = 'Central' | 'State' | 'District';
export type PayMode = 'Online' | 'Challan' | 'Postal Stamp' | 'Other';
export type StageType = 'Prelims' | 'Mains' | 'Tier II' | 'Written' | 'Skill' | 'DV' | 'Interview';
export type StageStatus = 'Scheduled' | 'Postponed' | 'Rescheduled';

export interface SyllabusLink { subjectId: string; chapterIds: string[]; weightage?: number }
export interface Admit { downloaded: boolean; examDate?: string; shift?: string; gateClosing?: string; center?: string; docs?: string }
export interface Result { status?: 'Given' | 'Missed' | 'Overlap'; answerKey?: string; cutoff?: string; marks?: string; pdf?: string; cleared?: boolean }
export interface Stage {
  id: string; type: StageType; approxDate?: string; dateEnd?: string; status?: StageStatus;
  links: SyllabusLink[]; admit: Admit; result: Result;
  customSyllabus?: string; // Skill Test free-text syllabus (not only tree links)
}
export interface Job {
  id: string; kind: 'job' | 'academic'; isTarget: boolean; parentId?: string;
  examName: string; bodyName: string; bodyWebsite: string; postName: string; notifPdf: string;
  level: Level; category: Category; priority: number;
  appDate: string; fee: number; refundable: boolean; refundAmt?: number; refundDate?: string; refundStatus?: 'Expected' | 'Received';
  payMode: PayMode; appNo?: string; regNo?: string; rollNo?: string;
  targetLinks: SyllabusLink[]; // required syllabus while still a Target (§26)
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
}

export const useJobs = create<JobState>()(
  persist(
    (set) => ({
      jobs: [],
      addJob: (j) => {
        const id = uid('job');
        const job: Job = {
          id, kind: j.kind ?? 'job', isTarget: j.isTarget ?? false,
          parentId: j.parentId, examName: j.examName?.trim() || 'New Exam',
          bodyName: j.bodyName ?? '', bodyWebsite: j.bodyWebsite ?? '', postName: j.postName ?? '', notifPdf: j.notifPdf ?? '',
          level: j.level ?? '+3', category: j.category ?? 'State', priority: j.priority ?? 3,
          appDate: j.appDate ?? todayIso(), fee: j.fee ?? 0, refundable: j.refundable ?? false,
          refundAmt: j.refundAmt, refundDate: j.refundDate, refundStatus: j.refundStatus, payMode: j.payMode ?? 'Online',
          appNo: j.appNo, regNo: j.regNo, rollNo: j.rollNo, targetLinks: j.targetLinks ?? [], stages: j.stages ?? [],
        };
        set((s) => ({ jobs: [...s.jobs, job] }));
        return id;
      },
      updateJob: (id, patch) => set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),
      removeJob: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id && j.parentId !== id) })),
      convertTarget: (id) => set((s) => ({
        jobs: s.jobs.map((j) => {
          if (j.id !== id) return j;
          // Preserve priority + linked syllabus + progress: carry targetLinks into a first stage (§26)
          const stages = j.stages.length > 0 || j.targetLinks.length === 0
            ? j.stages
            : [{ id: uid('st'), type: 'Prelims' as StageType, links: [...j.targetLinks], admit: { downloaded: false }, result: {} }];
          return { ...j, isTarget: false, appDate: j.appDate || todayIso(), stages };
        }),
      })),
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
    }),
    { name: 'qorvix-jobs', storage: createJSONStorage(() => idbStorage) }
  )
);

// Domain helpers (§76): dashboard + countdowns read these, not inline logic.
export function isFullyCleared(job: Job): boolean {
  return job.stages.length > 0 && job.stages.every((s) => s.result.cleared);
}

/** Next relevant milestone: earliest uncleared stage date (cleared Prelims never shows, §33/§59). */
export function nextMilestone(job: Job): { label: string; date: string; postponed: boolean } | undefined {
  const open = job.stages.filter((s) => !s.result.cleared);
  if (open.length === 0) return undefined;
  const dated = open
    .map((s) => ({ s, date: s.admit.examDate || s.approxDate || '' }))
    .filter((x) => x.date)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const first = dated[0];
  if (!first) {
    const t = open[0] as Stage;
    return { label: `${t.type} — date awaited`, date: '', postponed: t.status === 'Postponed' };
  }
  return { label: first.s.type, date: first.date, postponed: first.s.status === 'Postponed' };
}
