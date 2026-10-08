# QORVIX — Rules

## Use

- TypeScript strict mode (`strict`, `noUncheckedIndexedAccess`, no `any` without guard/narrowing).
- Reusable components: every UI piece in `src/components/ui` or `features/*/components`, props-typed, no copy-paste JSX across tabs.
- Responsive design tablet-first: base styles for 768–1024, then `sm:` mobile, then `lg:` desktop. Max-width shell 820px tablet / 480px mobile / 1024px desktop, centered.
- Proper validation on every write: required fields (examName, postName, node title, minutes>0), unique sibling titles (case-insensitive), valid URL if lecture/batch link present, fee>=0, priority 1–5, dates ISO, Subject link mandatory per stage, import reports added/skipped.
- Error handling: every IndexedDB/persist/write wrapped try/catch → toast + fallback UI + empty states (never blank screen). Push denied → in-app badges.
- Clean architecture: feature owns its store + domain logic; shared only via `src/lib`. No cross-feature deep imports. Domain math (heat, revision scores, planner, countdowns) lives in testable `logic.ts`/`engine.ts`/store helpers — never only inside JSX.
- Naming: PascalCase components/stores (`JobCard`, `useJobs`), camelCase functions/vars, `id`/`nodeId`/`jobId` consistently; file per concern (`store.ts`, `logic.ts`, `engine.ts`, `batches.ts`).
- No fake data in production: fresh installs start empty with guided empty states, never demo jobs/syllabus/analytics.
- Design tokens only: colors/spacing/radius via Tailwind config + CSS vars. Inter/Manrope only.
- PWA + a11y: visible `:focus-visible` rings, aria-labels on timer/nav/FAB/inputs, 44px touch targets for tablet, light + dark themes with proper contrast.

## Avoid

- Large unnecessary libraries: NO MUI, NO chart lib (use SVG sparkline/bars), NO date-fns/moment (use `lib/dates.ts`), NO lodash, NO form lib (hand-rolled + native inputs).
- Over-engineering: no abstractions before 2nd use, no generic framework, no premature backend. No giant components (split past ~300 lines), no giant stores (one slice per feature).
- Unused code, dead exports, commented blocks — delete, don't comment. Unused dependencies removed.
- Hardcoded values: no `#4F46E5` inline outside tokens, no magic minutes (use consts `SLOT_NEW=5–8` etc.), no magic strings for stage types (use `StageType` const).
- Duplicate logic: dates/heat/notify/weight calcs live once in `lib/`.
- Forbidden scope: social, chat, communities, AI features, gamification, useless analytics, extra pages/tabs. Violations rejected in review.
- Cheap UI: flashy animations, heavy glassmorphism, rainbow colors, large shadows, slow transitions. Keep 120–180ms ease-out, translateY 4px + fade max.

## Validation Checklist (per feature, enforce in PR)

- Syllabus: title required + unique sibling; URL valid if present; import JSON/CSV shape-checked with preview-then-confirm, skipped rows counted; delete cascades children; progress 0–100 with Not started/In progress/Completed labels + parent rollup; source mode individual/batch/both stored correctly; reusable batches link lectures to nodes by ID, never duplicated.
- Jobs: examName required; fee>=0; refundable→refundAmt/date/status, non-refundable→ignored; stage order user-defined incl. Written/Tier II (no forced chain); subject link mandatory per stage; stage status Scheduled/Postponed/Rescheduled + range end; admit 15d/10d + exam 7/3/1d reminders scheduled; Given/Missed/Overlap before result fields; Target→Active carries syllabus links; merge child keeps own app/admit/stages, renders nested under collapsible parent.
- Timetable: minutes≥10; generate uses active+targets+priority+dates+progress+mistakes+staleness; review (reorder/minutes/remove/remake/source) before save; Done completes linked syllabus node + stamps study date; actual minutes recorded; auto-shift today-only (future days untouched); revision only for studied nodes (chapters included); correct/incorrect both counted + heat updated; Tue/Thu/Sat mock + Mon/Wed/Fri analysis + Sunday caps + CA daily/Friday-weekly/month-end respected.
- Dashboard: timer single-running; sessions linked to tasks; hours aggregate 7d/30d/all + monthly drill-down; countdowns show next UNCLEARED stage only, fully-cleared exams hidden; pending revision = mistakes>corrects sorted by revision score.
