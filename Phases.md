# QORVIX — Phases

> Breaks the large build into shippable phases. Update Memory.md after each phase. Current code already has Phase 1–5 core (basic) — remaining work is depth/polish per below.

## Phase 1: Core Foundation (done — verify)

- Vite + React + TS strict + Tailwind + shadcn-local + Zustand + idb + PWA + push plumbing.
- Floating island bottom nav (4 tabs), AppBar + pill search + FAB, QorvixLogo SVG + icons + manifest, dark/light theme, GitHub + `vercel.json` deploy-ready.
- Acceptance: `npm run build` passes, PWA installs on tablet, no lag, 4 tabs switch <180ms.

## Phase 2: Syllabus (core done — harden)

- Tree CRUD Subject→Chapter→Topic→SubTopic + cascade delete + unique-sibling validation.
- Hybrid Source individual/batch/both per Topic/SubTopic (name+url+notes / batchName+subject+notes).
- Manual add + JSON import (done) + Excel CSV→JSON via `lib/importExcel.ts` + skipped-row report.
- TODO: URL validation, rename inline, progress auto-rollup to parents, search filter, empty states.
- Acceptance: Ratio→Partnership→Compound example creatable, both-sources saved, import 100 rows without freeze.

## Phase 3: Job Recorder (core done — harden)

- Jobs | Academics | Targets chips with count badges, Target→Active convert, Merge parent/children (Odisha Forest Guard example).
- Flexible +Prelims/+Mains/+Skill/+DV/+Interview in any order, per-stage approxDate editable, syllabus links (Subject mandatory + weightage UI), admit (downloaded + examDate/shift/gateClosing/center/docs), result (Given/Missed/Overlap + answerKey/cutoff/marks/pdf + cleared→next).
- TODO: weightage number input per link, syllabus picker tree modal (currently text note), refundable refundAmt/refundDate fields UI, appNo/regNo/rollNo fields UI, level/category dropdowns UI, admit 15d + exam 7d escalating scheduler wiring, answer-key 7–15d scheduler.
- Acceptance: create Target with syllabus → convert → add Prelims+Mains+Skill flexibly → admit→Given→cleared flow works offline.

## Phase 4: Timetable (core done — deepen)

- Night generate tomorrow To-Do + edit-before-save, custom add, today-only auto-shift (+30m), routine daily/weekly/monthly/days + alerts, correct/incorrect + summary/mistake notes + heat.
- TODO: full engine — priority-exam weighting + exam-near boost + motivation line, 5–8/10–12/4–6/7–9 slot allocator + other-hours filler, CA daily/weekly/monthly auto-items, daily 10–30m revision/sectional logic, Tue/Thu/Sat full-length + Mon/Wed/Fri analysis templates, Sunday 3h+3–4h template, subject time bias (Math/GK high, Reasoning/English/Computer low), studied-only revision guard, analysis→syllabus link picker.
- Acceptance: generate respects priority + mistakes, overrun shifts today only, Sunday template correct.

## Phase 5: Dashboard (core done — polish)

- Today tasks/plan counts, active countdowns (hide cleared), pending revision heat dots, routine list, timer Start/Stop + today total + 7-day bars.
- TODO: weekly/monthly/yearly graphs (SVG, no lib), tap-for-detail breakdown, countdown urgency colors, routine checkboxes.
- Acceptance: timer aggregates correctly, only active exams shown, revision list matches heat.

## Phase 6: Testing & Optimization

- Tablet 768–1024 pass (primary), mobile 360–480 pass, desktop 1024+ centered pass.
- Offline/PWA audit (Lighthouse), push permission pass (granted + denied fallback), `npm run build` + Vercel preview + GitHub push.
- Perf: no lag, 60fps scroll, subtle animations only, no console errors.
- Acceptance: installable from Vercel on tablet, works airplane-mode, all workflows from PRD verified end-to-end.
