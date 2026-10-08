# QORVIX — Memory (update continuously — future tracking)

## Completed

- [2026-10-07] Docs v1 created: PRD, Architecture, Rules, Phases, Design, Memory. Decisions: local-only PWA, phased build, local-scheduled push + in-app fallback, Telegram-island nav + Instagram-style job cards (structure-only).
- [2026-10-07] Scaffold: Vite react-ts + Tailwind + Zustand + idb + vite-plugin-pwa + vercel.json in `D:/My Apps/QORVIX` (package `study-app`).
- [2026-10-07] Phase 1–5 core built + `npm run build` passed (PWA SW generated). Floating island nav, QorvixLogo SVG, Syllabus tree + hybrid individual/batch/both + JSON import, Jobs/Academics/Targets + convert + merge `parentId` + flexible Prelims/Mains/Skill/DV/Interview + admit/result fields, Timetable night-generate + auto-shift today-only + routine + correct/incorrect heat, Dashboard today + countdowns + timer + weekly bars, push plumbing.
- [2026-10-07] Full build complete: Phase 2 (CSV import, rename, rollup, search, URL validation, notes), Phase 3 (weightage links, refund/appNo/regNo/rollNo/level/category, skill free-text, admit/result schedulers, dedup queue, deletes), Phase 4 (`engine.ts` + motivation + node linker + routine repeats), Phase 5 (urgency colors, 7d/30d/all totals, monthly drill-down). `npm run build` green (29 modules, PWA SW).
- [2026-10-08] Full-spec round (ALL §1–§90): reusable BatchCourse store + batch picker + lecture→node classification; Written/Tier II stages; bodyName/refundStatus/stage status+range; targetLinks steering timetable + convert carry; collapsible merge groups; CA weekly/monthly; once-date routines + remove; routine/plan notifications; actualMinutes + Done→Completed + lastStudiedAt staleness; status labels; chapter-level analysis links; linked timer sessions; contextual FAB; plan review (minutes/reorder/remove/remake); import preview; seeds removed; IndexedDB persist backend + theme pref; real PNG icons via scripts/gen-icons.mjs; countdowns next-uncleared + fully-cleared hidden; tablet grid + focus rings. tsc + build + oxlint green (33 modules, 14 precache).

## Current Work

- Spec-complete implementation done 2026-10-08, all checks green. Next: device pass on tablet + Vercel/GitHub publish (needs fresh PAT).

## Pending

- Phase 6 remainder: tablet/mobile/desktop device pass, Lighthouse PWA audit, Vercel + GitHub publish, E2E workflow check on tablet (§84).

## Bugs

- None known. Fixed 2026-10-08 round: dashboard grid unclosed section tag; LinkPicker refactor dropped `nodes` selector; tsc strict null-index issues in moveItem/nextMilestone.

## Decisions

- No social/chat/AI/gamification/analytics. Strict 4-tab scope. Child-simple UX: plain words, steppers, collapsibles — logic never simplified away.
- Timetable schedules Topic, not video; source chosen at study time (individual/batch/both). Hours-only fallback if only Subject known; classify after study.
- Push = local-scheduled (Notification API + SW), no backend/FCM, Vercel HTTPS. Unsupported features degrade to in-app UI, never faked.
- Persistence = IndexedDB (`qorvix-db`) for all domain data; LocalStorage only for theme + notif queue; one-time promotion of pre-migration keys.
- Name locked: QORVIX — Your Trajectory to Victory. Logo: progress-circle + check + target-dot + timeline-tick on slate tile; PNGs via `scripts/gen-icons.mjs`.
- Excel import = CSV→JSON (no heavy xlsx lib) per Rules, with preview-then-confirm.
- Countdowns always use next UNCLEARED stage; fully-cleared exams hidden from Dashboard.
- GitHub account = rajankumarsahu2002 (NOT rajshripress). Remote origin = https://rajankumarsahu2002@github.com/rajankumarsahu2002/QORVIX.git (username-scoped so global rajshripress cred stays for other projects). Local git identity set 2026-10-07: rajankumarsahu2002 / rajankumarsahu2002@gmail.com (global rajshripress kept for other projects).
- Push pending: repo exists but empty; first token rejected with 403 — awaiting fresh PAT with `repo` scope.
