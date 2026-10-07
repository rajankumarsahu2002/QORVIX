import { daysUntil } from '../../lib/dates';
import type { SylNode } from '../syllabus/store';
import type { Job } from '../jobs/store';

export type SuggestKind = 'study' | 'revision' | 'mock' | 'analysis' | 'ca';
export interface Suggestion {
  nodeId: string;
  title: string;
  minutes: number;
  kind: SuggestKind;
  chosenSource: 'individual' | 'batch' | 'both';
}
export interface PlanResult {
  items: Suggestion[];
  motivation?: string;
}

const HIGH_RE = /quant|math|arith|general knowledge|\bgk\b|general science|physics|chemistry|biology|current affairs/i;
const LOW_RE = /reason|english|computer|odia/i;

function subjectTitle(nodes: SylNode[], id: string): string {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let cur = byId.get(id);
  while (cur?.parentId) {
    const p = byId.get(cur.parentId);
    if (!p) break;
    if (p.kind === 'subject') return p.title;
    cur = p;
  }
  return cur?.title ?? '';
}

function baseMinutes(subj: string): number {
  if (HIGH_RE.test(subj)) return 60;
  if (LOW_RE.test(subj)) return 30;
  return 45;
}

/** Night-planning engine: active + priority + dates + progress + mistakes → tomorrow To-Do. */
export function buildPlan(nodes: SylNode[], jobs: Job[], date: Date): PlanResult {
  const active = jobs.filter((j) => !j.isTarget);
  const prioritySubs = new Set<string>();
  let nearestName = '';
  let nearestDays = 9999;
  for (const j of active) {
    for (const st of j.stages) {
      for (const l of st.links) {
        if (j.priority >= 4) prioritySubs.add(l.subjectId);
        if (st.approxDate) {
          const d = daysUntil(st.approxDate);
          if (d >= 0 && d < nearestDays) {
            nearestDays = d;
            nearestName = j.examName;
          }
        }
      }
    }
  }
  const nearBoost = nearestDays <= 30 ? 15 : 0;

  const items: Suggestion[] = [];
  const push = (s: Suggestion): void => {
    if (items.length < 7) items.push(s);
  };

  // 1. Current Affairs daily (uses real CA node when present, else generic).
  const caNode = nodes.find(
    (n) => (n.kind === 'topic' || n.kind === 'subtopic') && /current affairs/i.test(`${subjectTitle(nodes, n.id)} ${n.title}`) && n.progress < 100,
  );
  push({
    nodeId: caNode?.id ?? '',
    title: caNode ? `Current Affairs — ${caNode.title}` : 'Current Affairs (Daily)',
    minutes: 30,
    kind: 'ca',
    chosenSource: 'individual',
  });

  // 2. Revision due — studied-only guard (progress>0 or attempted), mistake-first.
  const revision = nodes
    .filter((n) => (n.kind === 'topic' || n.kind === 'subtopic') && (n.progress > 0 || n.corrects > 0) && n.mistakes > n.corrects)
    .sort((a, b) => b.mistakes - b.corrects - (a.mistakes - a.corrects))
    .slice(0, 2);
  for (const r of revision) {
    push({ nodeId: r.id, title: `Revision — ${r.title} (10–30m)`, minutes: 25, kind: 'revision', chosenSource: 'both' });
  }

  // 3. Weekday test cadence.
  const dow = date.getDay(); // 0 Sun … 6 Sat
  const topExam = active.slice().sort((a, b) => b.priority - a.priority)[0]?.examName ?? 'your exam';
  if (dow === 0) {
    push({ nodeId: '', title: `Sunday offline test — ${topExam} (morning 3h)`, minutes: 180, kind: 'mock', chosenSource: 'individual' });
    push({ nodeId: '', title: 'Sunday analysis + chapter revision (post-2pm)', minutes: 210, kind: 'analysis', chosenSource: 'individual' });
  } else if (dow === 2 || dow === 4 || dow === 6) {
    push({ nodeId: '', title: `Full-length mock — ${topExam}`, minutes: 120, kind: 'mock', chosenSource: 'individual' });
  } else if (dow === 1 || dow === 3 || dow === 5) {
    push({ nodeId: '', title: 'Mock analysis → link mistakes to syllabus', minutes: 60, kind: 'analysis', chosenSource: 'individual' });
  }

  // 4. Study topics: uncompleted, priority-first, mistake-first, subject time bias.
  const cands = nodes
    .filter((n) => (n.kind === 'topic' || n.kind === 'subtopic') && n.progress < 100)
    .sort((a, b) => {
      const pa = prioritySubs.has(a.id) || prioritySubs.has(subjectIdOf(nodes, a.id)) ? 0 : 1;
      const pb = prioritySubs.has(b.id) || prioritySubs.has(subjectIdOf(nodes, b.id)) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      const ma = b.mistakes - b.corrects - (a.mistakes - a.corrects);
      if (ma !== 0) return ma;
      return a.progress - b.progress;
    });
  for (const n of cands) {
    if (items.length >= 7) break;
    if (items.some((i) => i.nodeId === n.id)) continue;
    const subj = subjectTitle(nodes, n.id);
    const prio = prioritySubs.has(n.id) || prioritySubs.has(subjectIdOf(nodes, n.id));
    const minutes = Math.min(90, baseMinutes(subj) + (prio ? 15 : 0) + nearBoost);
    push({ nodeId: n.id, title: n.title, minutes, kind: 'study', chosenSource: n.source?.mode ?? 'both' });
  }

  // 5. Motivation when a priority exam nears.
  let motivation: string | undefined;
  if (nearestDays <= 30 && nearestName) {
    motivation = `🔥 ${nearestName} in ${nearestDays}d — read extra 1–2 hr daily to clear it. Priority revision first.`;
  }

  return { items, motivation };
}

function subjectIdOf(nodes: SylNode[], id: string): string {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let cur = byId.get(id);
  while (cur?.parentId) {
    const p = byId.get(cur.parentId);
    if (!p) break;
    if (p.kind === 'subject') return p.id;
    cur = p;
  }
  return '';
}
