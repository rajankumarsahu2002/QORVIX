# QORVIX — Rules

## Use

- TypeScript strict mode (`strict`, `noUncheckedIndexedAccess`, no `any` without guard/narrowing).
- Reusable components: every UI piece in `src/components/ui` or `features/*/components`, props-typed, no copy-paste JSX across tabs.
- Responsive design tablet-first: base styles for 768–1024, then `sm:` mobile, then `lg:` desktop. Max-width shell 820px tablet / 480px mobile / 1024px desktop, centered.
- Proper validation on every write: required fields (examName, postName, node title, minutes>0), unique sibling titles (case-insensitive), valid URL if lecture/batch link present, fee>=0, priority 1–5, dates ISO, Subject link mandatory per stage, import reports added/skipped.
- Error handling: every IndexedDB/persist/write wrapped try/catch → toast + fallback UI + empty states (never blank screen). Push denied → in-app badges.
- Clean architecture: feature owns `types.ts/store.ts/db.ts/components`; shared only via `src/lib` + `src/components/ui`. No cross-feature deep imports.
- Design tokens only: colors/spacing/radius via Tailwind config + CSS vars. Inter/Manrope only.
- PWA + a11y: focus states, aria-labels on timer/nav/FAB, 44px touch targets for tablet.

## Avoid

- Large unnecessary libraries: NO MUI, NO chart lib (use SVG sparkline/bars), NO date-fns/moment (use `lib/dates.ts`), NO lodash, NO form lib (hand-rolled + native inputs).
- Over-engineering: no abstractions before 2nd use, no generic framework, no premature backend.
- Unused code, dead exports, commented blocks — delete, don't comment.
- Hardcoded values: no `#4F46E5` inline outside tokens, no magic minutes (use consts `SLOT_NEW=5–8` etc.), no magic strings for stage types (use `StageType` const).
- Duplicate logic: dates/heat/notify/weight calcs live once in `lib/`.
- Forbidden scope: social, chat, communities, AI features, gamification, useless analytics, extra pages/tabs. Violations rejected in review.
- Cheap UI: flashy animations, heavy glassmorphism, rainbow colors, large shadows, slow transitions. Keep 120–180ms ease-out, translateY 4px + fade max.

## Validation Checklist (per feature, enforce in PR)

- Syllabus: title required + unique sibling; URL valid if present; import JSON shape-checked, skipped rows counted; delete cascades children; progress 0–100; source mode individual/batch/both stored correctly.
- Jobs: examName+postName required; fee>=0; refundable→refundAmt/date allowed, non-refundable→ignored; stage order user-defined (no forced chain); subject link mandatory per stage; admit 15d + exam 7d reminders scheduled; Given/Missed/Overlap required before result fields; Target→Active preserves syllabus; merge child keeps own app/admit, inherits parent syllabus view.
- Timetable: minutes>0; generate uses active+priority+dates+progress+mistakes; edit-before-save; auto-shift today-only (future days untouched); revision only for studied nodes (progress>0 or done); correct/incorrect both counted + heat updated; Tue/Thu/Sat mock + Mon/Wed/Fri analysis + Sunday 3h+3–4h respected.
- Dashboard: timer single-running (Start disabled while running); hours aggregate day/week/month/year correctly; countdowns hide cleared/inactive; pending revision = mistakes>corrects sorted by heat.
