import type { SylNode } from './store';

// Reusable domain logic (§76). Components must call these — no inline scoring.

/** 0 when untouched, else mistakes share. */
export function mistakeRatio(n: SylNode): number {
  const total = n.mistakes + n.corrects;
  if (total === 0) return 0;
  return n.mistakes / total;
}

/** Weakness bucket 0 (green/strong) … 4 (red/weak), §56. */
export function heatLevel(n: SylNode): number {
  const r = mistakeRatio(n);
  if (r >= 0.7) return 4;
  if (r >= 0.5) return 3;
  if (r >= 0.3) return 2;
  if (r > 0) return 1;
  return 0;
}

/** Progress state label, §21. */
export function statusOf(progress: number): 'Not started' | 'In progress' | 'Completed' {
  if (progress >= 100) return 'Completed';
  if (progress > 0) return 'In progress';
  return 'Not started';
}

/** A node counts as studied once it has progress or any attempt (§55 guard). */
export function isStudied(n: SylNode): boolean {
  return n.progress > 0 || n.corrects > 0 || n.mistakes > 0;
}

function daysSince(iso?: string): number {
  if (!iso) return 30; // never studied → stale, but unstudied guard applies elsewhere
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 30;
  return Math.max(0, (Date.now() - t) / 86400000);
}

/**
 * Revision priority score (§57): mistakes dominate, then staleness,
 * then exam-urgency boost passed in by the timetable engine.
 */
export function revisionScore(n: SylNode, urgencyBoost = 0): number {
  const mistakes = Math.max(0, n.mistakes - n.corrects);
  return mistakes * 10 + Math.min(30, daysSince(n.lastStudiedAt)) + urgencyBoost;
}
