# QORVIX — Architecture

## Tech Stack

Frontend:
- React 19 + TypeScript strict + Vite 6

UI:
- TailwindCSS 3 + shadcn/ui (lightweight LOCAL components under `src/components/ui` — button/card/input/chip/badge/dialog/sheet, no heavy lib)
- Fonts: Inter (primary) + Manrope (alt) via Google Fonts cached by PWA

State:
- Zustand 5 (persisted slices per feature: `qorvix-syllabus`, `qorvix-jobs`, `qorvix-timetable`, `qorvix-dashboard`)

Database:
- IndexedDB via `idb` wrapper (`qorvix-db`) for all domain data (nodes, jobs, plans, mistakes)
- LocalStorage ONLY for: theme, timer prefs, notification prefs, zustand persist fallback

Deployment:
- GitHub + Vercel (`vercel.json` rewrites for SPA + SW headers). HTTPS required for push.

PWA Support (Required):
- `vite-plugin-pwa` autoUpdate, app-shell + fonts runtime cache, offline-first
- `manifest.webmanifest`: name `QORVIX — Your Trajectory to Victory`, short `QORVIX`, standalone, portrait, 192/512 maskable icons derived from `QorvixLogo` SVG
- Push: local-scheduled via Notification API + SW (`src/lib/notify.ts`: `requestPermission`, `scheduleLocal`, `fireDue` polled 60s + on boot). Rules: admit 15d, exam 7d escalating, answer-key 7–15d after Given, revision-due, routine-due. In-app badges/countdowns fallback if denied.

## Folder Structure (feature-based, scalable, no messy code)

```
src/
  app/            # providers, root layout, bottom nav host, theme + push bootstrap (currently in App.tsx)
  features/
    syllabus/     # components/Tree,Editor,Import + store.ts + db.ts + types.ts + utils.ts
    jobs/         # components/JobCard,StageFlow,Merge,TargetConvert + store.ts + db.ts + types.ts
    timetable/    # components/Planner,Routine,Revision,TestLog + engine.ts + store.ts + db.ts
    dashboard/    # components/Today,Countdown,Timer + store.ts
  components/
    ui/           # button,card,input,chip,badge,dialog,sheet (shadcn-style minimal)
    layout/       # AppBar, BottomNav (floating island), FAB, SearchPill
    logo/         # QorvixLogo.tsx (SVG: progress circle + check + target dot + timeline tick)
  lib/            # idb.ts, notify.ts, dates.ts, importExcel.ts (CSV→JSON), weight.ts
  styles/         # globals.css (design tokens: dark slate / soft white, heat scale)
  main.tsx  App.tsx
public/  manifest.webmanifest  qorvix-icon.svg  qorvix-192.png  qorvix-512.png  sw extensions
PRD.md Architecture.md Rules.md Phases.md Design.md Memory.md
vercel.json vite.config.ts tailwind.config.js
```

Rules: feature owns its types/store/db/components. Cross-feature reads ONLY via `lib/` + exported types. No `features/jobs` importing `features/syllabus` internals. No backend calls.

## Data Models

```ts
SyllabusNode { id, kind:'subject'|'chapter'|'topic'|'subtopic', title, parentId?, source?: LearningSource, progress:0-100, mistakes:number, corrects:number }
LearningSource { mode:'individual'|'batch'|'both',
  indName?, indUrl?, indNotes?,
  batchName?, batchSubject?, batchNotes? }

Job { id, kind:'job'|'academic', isTarget:boolean, parentId?, // merge
  examName, bodyWebsite, postName, notifPdf, level:'10th'|'+2'|'+3'|PG, category:'Central'|'State'|'District',
  priority:1-5,
  appDate, fee, refundable:boolean, refundAmt?, refundDate?, payMode:'Online'|'Challan'|'Postal Stamp'|'Other',
  appNo?, regNo?, rollNo?,
  stages: Stage[] }

Stage { id, type:'Prelims'|'Mains'|'Skill'|'DV'|'Interview', approxDate?, // editable if postponed
  links:{ subjectId, chapterIds?:string[], topicIds?:string[], subTopicIds?:string[], weightage?:number }[],
  admit:{ downloaded:boolean, examDate?, shift?, gateClosing?, center?, docs? },
  result:{ status?:'Given'|'Missed'|'Overlap', answerKey?, cutoff?, marks?, pdf?, cleared?:boolean } }

PlanDay { date:YYYY-MM-DD, items:PlanItem[], edited:boolean }
PlanItem { id, nodeId, title, chosenSource:'individual'|'batch'|'both', minutes, status:'todo'|'doing'|'done'|'skipped', summary?, correct?, incorrect?, mistakeNote? }
Routine { id, title, time:HH:MM, repeat:'daily'|'weekly'|'monthly'|'days', days?:string[] }
Mistake { nodeId, correct, incorrect, date } // aggregated into node.mistakes/corrects + heat
DayHours { date, minutes } // timer
```

## App Flow

1. Syllabus (master, once, hybrid source) →
2. Job Recorder links syllabus+weightage per stage (Subject mandatory) + Target→Active + Merge →
3. Timetable engine reads active/priority/dates/progress/mistakes → night-generate tomorrow To-Do (5–8/10–12/4–6/7–9 defaults, CA daily, Math/GK high) → user edits → today auto-shift-only → revision/test/error/heat/priority applied →
4. Dashboard shows today items + routine + active countdowns + pending revision + timer trend.
Timer writes DayHours → motivation only (no analytics bloat).

Verified AI-Studio prompt mapping (structure-only, adopted): AppBar (title left, menu right) + pill search + horizontal chip tabs with count badges → used for Jobs/Academics/Targets filter. Status-timeline cards (left vertical pill, middle title/subtitle/banner, right ✓/✗/○ badges) → used for Job cards. FAB above bottom nav, Telegram floating-island bottom nav with active pill, dark slate theme → used app-wide. Omitted: avatar nav item (single-user, no social).

## PWA + Push Detail

- `vite-plugin-pwa` workbox: precache shell + `globPatterns **/*.{js,css,html,svg,woff2}`, runtime CacheFirst fonts.
- `lib/notify.ts` schedules local notifications by date-diff on boot + interval; escalating exam reminders (7d→daily→twice-daily nearer). No FCM/backend.
- Icons: export `QorvixLogo` SVG → 192/512 PNG + maskable + favicon.
