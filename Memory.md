# QORVIX — Memory (update continuously)

## Completed
- [2026-10-07] Docs created: PRD, Architecture, Rules, Phases, Design, Memory. Decisions: PWA installable native-feel, local-only, phased build, local-scheduled push + in-app fallback.
- [2026-10-07] Scaffold: Vite react-ts in `D:/My Apps/Study App`.
- [2026-10-07] Phase 1-5 core built + `npm run build` passed (PWA SW generated). Features: floating island nav, QorvixLogo SVG, Syllabus tree + hybrid individual/batch/both + JSON import, Jobs/Academics/Targets + convert + merge + flexible Prelims/Mains/Skill/DV/Interview + admit/result, Timetable night-generate + auto-shift today-only + routine + correct/incorrect heat, Dashboard today + countdowns + timer + weekly graph, push plumbing + vercel.json.

## Current Work
- Phase 1 Core Foundation: Tailwind+shadcn-local+Zustand+idb+PWA+push, floating nav, 4 tabs, logo, theme.

## Pending
- Phase 2 Syllabus (tree + hybrid source + import)
- Phase 3 Job Recorder (target/merge/flexible stages/admit/result)
- Phase 4 Timetable (night plan/auto-shift/revision/test/weakness/priority)
- Phase 5 Dashboard (today/countdowns/timer graphs)
- Phase 6 Testing + Vercel/GitHub publish

## Bugs
- None yet.

## Decisions
- No social/chat/AI/gamification. Strict scope per PRD.
- Timetable schedules Topic, not video; source chosen at study time (individual/batch/both).
- Push = local-scheduled (Notification API + SW), no backend, Vercel HTTPS.
