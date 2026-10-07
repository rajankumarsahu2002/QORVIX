# QORVIX — Rules

## Use
- TypeScript strict (`noUncheckedIndexedAccess`, no `any` without guard), reusable components, responsive tablet-first.
- Zustand slices with persist + IndexedDB; validation via `zod`-lite hand-rolled (no heavy lib) or built-in checks.
- Error handling: every DB/write wrapped, toast + fallback UI, empty states.
- Clean architecture: feature owns types/store/db/components; shared only via `src/lib` + `src/components/ui`.
- Semantic tokens, no hardcoded colors/spacing; Inter/Manrope only.

## Avoid
- Large unnecessary libraries (no MUI, no chart lib — use SVG sparkline; no date-fns — use `lib/dates.ts`; no lodash).
- Over-engineering, unused code, duplicate logic, hardcoded values, magic strings (use consts).
- Social/chat/community/AI/gamification/analytics bloat. No extra pages beyond 4 tabs.
- Flashy animations, heavy blur, colorful-for-sake. Keep subtle 120–180ms ease.
- Direct localStorage for large data (use IndexedDB); no backend secrets in client.

## Validation Checklist (per feature)
- Syllabus: title required, unique sibling, URL must be valid if present, import must report skipped rows.
- Jobs: examName+postName required, fee>=0, dates editable, stage order user-defined, subject link mandatory.
- Timetable: minutes>0, auto-shift today-only, revision only for studied nodes.
- Dashboard: timer single-running, hours aggregated correctly, countdowns hide cleared.
