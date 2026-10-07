# QORVIX — Phases

> All phases built 2026-10-07 — full app complete, `npm run build` green. Push to GitHub pending fresh PAT (see Memory.md).

## Phase 1: Core Foundation (done — verify)

- Vite + React + TS strict + Tailwind + shadcn-local + Zustand + idb + PWA + push plumbing.
- Floating island bottom nav (4 tabs), AppBar + pill search + FAB, QorvixLogo SVG + icons + manifest, dark/light theme, GitHub + `vercel.json` deploy-ready.
- Acceptance: `npm run build` passes, PWA installs on tablet, no lag, 4 tabs switch <180ms.

## Phase 2: Syllabus (done 2026-10-07)

- Tree CRUD Subject→Chapter→Topic→SubTopic + cascade delete + unique-sibling validation.
- Hybrid Source individual/batch/both per Topic/SubTopic (name+url+notes / batchName+subject+notes).
- Manual add + JSON import + Excel CSV→JSON (`lib/validate.ts` parser) + skipped-row report.
- Done: URL validation, inline rename, progress auto-rollup to parents, full-tree search, empty states.

## Phase 3: Job Recorder (done 2026-10-07)

- Jobs | Academics | Targets chips with count badges, Target→Active convert, Merge parent/children (Odisha Forest Guard example), job/stage delete.
- Flexible +Prelims/+Mains/+Skill/+DV/+Interview in any order, per-stage approxDate editable, syllabus links (Subject mandatory + chapter + weightage UI), Skill free-text syllabus, admit (downloaded + examDate/shift/gateClosing/center/docs) + result (Given/Missed/Overlap + answerKey/cutoff/marks/pdf + cleared→next).
- Done: weightage input, tree link picker, refundable refundAmt/refundDate, appNo/regNo/rollNo, level/category dropdowns, admit 15d/10d + exam 7/3/1d escalating + answer-key 10d scheduler wiring (deduped queue).

## Phase 4: Timetable (done 2026-10-07)

- Night generate tomorrow To-Do + edit-before-save, custom add, today-only auto-shift (+30m), routine daily/weekly/monthly/days + alerts, correct/incorrect + summary/mistake notes + heat.
- Done: full `engine.ts` — priority-exam weighting + exam-near boost + motivation line, subject time bias (Math/GK high, Reasoning/English/Computer low), CA daily auto-item, studied-only revision guard, Tue/Thu/Sat full-length + Mon/Wed/Fri analysis + Sunday 3h+3.5h templates, syllabus node linker for hours-only items.

## Phase 5: Dashboard (done 2026-10-07)

- Today tasks/plan counts, active countdowns with urgency colors (green>30d, amber 7–30d, red<7d), pending revision heat dots, routine list, timer Start/Stop + today total + 7-day bars.
- Done: 7d/30d/all-time totals, 6-month SVG bars, tap-month day drill-down, cleared exams hidden.

## Phase 6: Testing & Optimization (build green 2026-10-07, device pass pending)

- `npm run build` green (tsc + vite, PWA SW generated). Remaining: tablet 768–1024 device pass, mobile pass, offline/PWA audit, Vercel + GitHub publish (needs fresh PAT), E2E workflow check on tablet.
