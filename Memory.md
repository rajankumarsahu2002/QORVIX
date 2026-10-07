# QORVIX — Memory (update continuously — future tracking)

## Completed

- [2026-10-07] Docs v1 created: PRD, Architecture, Rules, Phases, Design, Memory. Decisions: local-only PWA, phased build, local-scheduled push + in-app fallback, Telegram-island nav + Instagram-style job cards (structure-only).
- [2026-10-07] Scaffold: Vite react-ts + Tailwind + Zustand + idb + vite-plugin-pwa + vercel.json in `D:/My Apps/QORVIX` (package `study-app`).
- [2026-10-07] Phase 1–5 core built + `npm run build` passed (PWA SW generated). Floating island nav, QorvixLogo SVG, Syllabus tree + hybrid individual/batch/both + JSON import, Jobs/Academics/Targets + convert + merge `parentId` + flexible Prelims/Mains/Skill/DV/Interview + admit/result fields, Timetable night-generate + auto-shift today-only + routine + correct/incorrect heat, Dashboard today + countdowns + timer + weekly bars, push plumbing.
- [2026-10-07] Docs v2 full rewrite (this update): captured ALL user requirements with nothing missed — master syllabus examples, video-lecture fields, Hybrid Learning Source Model (Ratio/Banking/Profit examples, schedule-Topic-not-video, hours-only fallback), full Job fields (level/category, fee refundable logic, pay modes, optional numbers), per-stage syllabus-weightage + admit 15d/7d-escalating + Given/Missed/Overlap + answer-key 7–15d + Skill-after-Prelims/Mains + flexible flows, Target convert, Forest-Guard merge, Timetable slots 5–8/10–12/4–6/7–9 + CA daily + Math-high/Reasoning-low + daily 10–30m + Tue/Thu/Sat mocks + Mon/Wed/Fri analysis + Sunday 3h+3–4h + studied-only revision + Green→Red heat + priority boost + motivation line, Dashboard active-only + timer graphs, tablet>mobile>desktop, Gemini-prompt verification mapping.

## Current Work

- Docs v2 complete. Next: harden Phase 2–5 TODOs per Phases.md (weightage UI, syllabus picker modal, refund/roll fields UI, level/category dropdowns, scheduler wiring, full timetable engine slots, SVG graphs).

## Pending

- Phase 2 harden: URL validation, rename, progress rollup, Excel CSV import, search.
- Phase 3 harden: weightage input, tree picker modal, refund/appNo/regNo/rollNo/level/category UI, admit/result scheduler wiring.
- Phase 4 deepen: slot allocator, CA auto-items, revision/test cadence templates, priority boost, studied-only guard, analysis→syllabus picker.
- Phase 5 polish: month/year graphs, detail drill-down, urgency colors.
- Phase 6: tablet/mobile/desktop pass, Lighthouse PWA, Vercel + GitHub publish, E2E workflow check.

## Bugs

- None known. Watch: persist key `study-app` vs `qorvix-*` slices; icon PNGs (192/512) still need export from SVG before Vercel install prompt is perfect; `scheduleInDays(...,0,...)` placeholder in Jobs needs real date-diff logic.

## Decisions

- No social/chat/AI/gamification/analytics. Strict 4-tab scope.
- Timetable schedules Topic, not video; source chosen at study time (individual/batch/both). Hours-only fallback if only Subject known.
- Push = local-scheduled (Notification API + SW), no backend/FCM, Vercel HTTPS.
- Name locked: QORVIX — Your Trajectory to Victory. Logo: progress-circle + check + target-dot + timeline-tick on slate tile.
- Excel import = CSV→JSON (no heavy xlsx lib) per Rules.
- GitHub account = rajankumarsahu2002 (NOT rajshripress). Remote origin = https://github.com/rajankumarsahu2002/QORVIX.git. Local git identity set 2026-10-07: rajankumarsahu2002 / rajankumarsahu2002@gmail.com (global rajshripress kept for other projects).
