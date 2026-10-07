# QORVIX — Memory (update continuously — future tracking)

## Completed

- [2026-10-07] Docs v1 created: PRD, Architecture, Rules, Phases, Design, Memory. Decisions: local-only PWA, phased build, local-scheduled push + in-app fallback, Telegram-island nav + Instagram-style job cards (structure-only).
- [2026-10-07] Scaffold: Vite react-ts + Tailwind + Zustand + idb + vite-plugin-pwa + vercel.json in `D:/My Apps/QORVIX` (package `study-app`).
- [2026-10-07] Phase 1–5 core built + `npm run build` passed (PWA SW generated). Floating island nav, QorvixLogo SVG, Syllabus tree + hybrid individual/batch/both + JSON import, Jobs/Academics/Targets + convert + merge `parentId` + flexible Prelims/Mains/Skill/DV/Interview + admit/result fields, Timetable night-generate + auto-shift today-only + routine + correct/incorrect heat, Dashboard today + countdowns + timer + weekly bars, push plumbing.
- [2026-10-07] Full build complete: Phase 2 (CSV import, rename, rollup, search, URL validation, notes), Phase 3 (weightage links, refund/appNo/regNo/rollNo/level/category, skill free-text, admit/result schedulers, dedup queue, deletes), Phase 4 (`engine.ts` + motivation + node linker + routine repeats), Phase 5 (urgency colors, 7d/30d/all totals, monthly drill-down). `npm run build` green (29 modules, PWA SW).

## Current Work

- Full app complete 2026-10-07, build green. Next: device pass on tablet + Vercel/GitHub publish (needs fresh PAT) + icon PNG export (192/512).

## Pending

- Phase 6 remainder: tablet/mobile/desktop device pass, Lighthouse PWA audit, Vercel + GitHub publish, E2E workflow check on tablet.
- Icon PNGs (192/512) export from SVG for perfect install prompt.

## Bugs

- None known. Fixed this round: heatClass edit collision, jobs updateStage collision, PowerShell quoting for credential pipe.

## Decisions

- No social/chat/AI/gamification/analytics. Strict 4-tab scope.
- Timetable schedules Topic, not video; source chosen at study time (individual/batch/both). Hours-only fallback if only Subject known.
- Push = local-scheduled (Notification API + SW), no backend/FCM, Vercel HTTPS.
- Name locked: QORVIX — Your Trajectory to Victory. Logo: progress-circle + check + target-dot + timeline-tick on slate tile.
- Excel import = CSV→JSON (no heavy xlsx lib) per Rules.
- GitHub account = rajankumarsahu2002 (NOT rajshripress). Remote origin = https://rajankumarsahu2002@github.com/rajankumarsahu2002/QORVIX.git (username-scoped so global rajshripress cred stays for other projects). Local git identity set 2026-10-07: rajankumarsahu2002 / rajankumarsahu2002@gmail.com (global rajshripress kept for other projects).
- Push pending: repo exists but empty; first token rejected with 403 — awaiting fresh PAT with `repo` scope.
