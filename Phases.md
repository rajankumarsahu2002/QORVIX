# QORVIX — Phases

> All phases implemented per the full specification (2026-10-08) — `tsc` + build + lint green. Remaining: tablet device pass + Vercel/GitHub publish (needs fresh PAT, see Memory.md).

## Phase 1 — Core Foundation (done)

- Vite + React + TS strict + Tailwind + Zustand (IndexedDB persist) + PWA + local-scheduled push.
- Floating island bottom nav (4 tabs, no avatar), AppBar + pill search + contextual FAB, QorvixLogo SVG + generated PNG icons + manifest, dark/light theme (persisted), GitHub + `vercel.json` SPA fallback.
- Acceptance: `npm run build` passes, PWA installs on tablet, no lag.

## Phase 2 — Syllabus (done)

- Tree CRUD Subject→Chapter→Topic→SubTopic + cascade delete + unique-sibling validation + inline rename + full-tree search + contextual + buttons + progress rollup with Not started/In progress/Completed labels.
- Hybrid Source individual/batch/both per final node + reusable `BatchCourse` entities (lectures link to nodes by ID; subject-only start, classify-after-study).
- Manual add + JSON + Excel-CSV import with preview-then-confirm + added/skipped report, never silent duplicates.
- Starts empty with 3-step guided empty state (no demo data).

## Phase 3 — Job Recorder (done)

- Jobs | Academics | Targets chips with counters; Target carries syllabus links and convert preserves them into the first stage; Merge with collapsible nested children, each intact; job/stage delete.
- Flexible Written/Prelims/Mains/Tier II/Skill/DV/Interview in any order; 1-2-3 stepper per stage; approxDate + range end + Scheduled/Postponed/Rescheduled; syllabus links (Subject mandatory + chapter + marks); Skill free-text syllabus; admit (downloaded + examDate/shift/gateClosing/center/docs/rollNo) + result (Given/Missed/Overlap + answerKey/cutoff/marks/pdf + cleared→next).
- Body name + website; refundable → amount/date/status; appNo/regNo/rollNo optional.
- Schedulers: admit 15d/10d, exam 7/3/1d escalating, answer-key ~10d after Given, deduped queue + in-app fallback.

## Phase 4 — Timetable (done)

- Night proposal from active + target exams (priority, proximity, progress, mistakes, staleness) via deterministic `engine.ts`; full review (reorder/minutes/remove/remake/source) before save.
- Done completes the syllabus node + stamps study date; actual minutes + summary recorded; subject-only/batch tasks classified later via node linker (chapters allowed).
- Today-only auto-shift; routine daily/weekly/monthly/days/once + next-occurrence alerts + 9pm plan nudge.
- Studied-only mistake-first revision (chapters included) + CA daily/Friday-weekly/month-end; Tue/Thu/Sat mocks, Mon/Wed/Fri analysis, Sunday caps; motivation tiers (30min ≤30d, 1–2hr ≤7d).

## Phase 5 — Dashboard (done)

- Today list + routine, next-uncleared countdowns (Postponed flagged, fully-cleared hidden) with urgency colors, pending revision, linked timer (▶ from tasks) with per-session list, 7d/30d/all totals + monthly drill-down. Tablet 2-column top grid.

## Phase 6 — Testing & Optimization (build green; device pass pending)

- `tsc -b` + `vite build` + `oxlint` green; PWA precache 14 entries incl. icons.
- Remaining on real hardware: tablet portrait/landscape + mobile + desktop review, offline/airplane test, install-prompt test, Vercel + GitHub publish, E2E workflow run (§84 checklist).
