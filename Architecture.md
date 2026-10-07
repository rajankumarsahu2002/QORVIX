# QORVIX — Architecture

## Tech Stack
- Frontend: React 19 + TypeScript strict + Vite 6
- UI: TailwindCSS 3 + shadcn/ui (lightweight local components) + Inter/Manrope
- State: Zustand (persisted slices per feature)
- DB: IndexedDB (`idb` wrapper, store `qorvix-db`) + LocalStorage (theme, timer prefs, notification prefs)
- PWA: `vite-plugin-pwa`, manifest, service-worker, offline cache, installable standalone, push via Notification API + SW scheduler (local-scheduled, no backend)
- Deploy: GitHub + Vercel (HTTPS required for push)

## Folder Structure (feature-based)
```
src/
  app/            # providers, root layout, bottom nav, theme, push bootstrap
  features/
    syllabus/     # components/Tree,Editor,Import + store.ts + db.ts + types.ts + utils.ts
    jobs/         # components/JobCard,StageFlow,Merge,TargetConvert + store.ts + db.ts + types.ts
    timetable/    # components/Planner,Routine,Revision,TestLog + engine.ts + store.ts + db.ts
    dashboard/    # components/Today,Countdown,Timer + store.ts
  components/
    ui/           # button,card,input,chip,badge,dialog,sheet (shadcn-style, minimal)
    layout/      # AppBar, BottomNav (floating island), FAB, SearchPill
    logo/        # QorvixLogo.tsx (SVG)
  lib/            # idb.ts, notify.ts (push scheduler), weight.ts, dates.ts, importExcel.ts
  styles/         # globals.css (tokens, dark slate / soft white)
  main.tsx App.tsx
public/ manifest.webmanifest icons/ sw extensions
```

## Data Models
```ts
SyllabusNode { id, kind:'subject'|'chapter'|'topic'|'subtopic', title, parentId?, source?: LearningSource, progress:0-100, mistakeScore:0-100 }
LearningSource { mode:'individual'|'batch'|'both', individual?:{name,url,notes}, batch?:{batchName,subject,notes} }
Job { id, kind:'job'|'academic', isTarget:boolean, parentId?, basic:{examName,bodyWebsite,postName,notifPdf,level,category}, app:{date,fee,refundable,refundAmt,refundDate,mode,appNo,regNo,rollNo}, priority:1-5, stages: Stage[] }
Stage { id, type:'Prelims'|'Mains'|'Skill'|'DV'|'Interview', approxDate?, exactDate?, syllabusLinks:{subjectId,chapterIds?,topicIds?,weightage?}[], admit?:{downloaded,examDate,shift,gateClosing,center,docs}, result?:{status:'Given'|'Missed'|'Overlap',answerKey,cutoff,marks,pdf,cleared} }
PlanDay { date, items: PlanItem[], routineIds[], generatedAt, edited:boolean }
PlanItem { id, syllabusNodeId, chosenSource:'individual'|'batch'|'both', minutes, status, summary?, test?:{correct,incorrect,notes} }
Routine { id, title, time, repeat:'daily'|'weekly'|'monthly'|'days', days? }
Mistake { nodeId, correct, incorrect, date }
```

## App Flow
Syllabus (master, once) → Job links syllabus+weightage per stage → Timetable engine reads active/priority/dates/progress/mistakes → generates night plan → Dashboard shows today + countdowns + timer. Timer writes hours → motivates, no analytics bloat.

## PWA + Push
- `vite-plugin-pwa` autoUpdate, runtime cache app shell + fonts.
- `lib/notify.ts`: requestPermission(), scheduleLocal(date, title, body), checks on boot + daily: admit 15d, exam 7d escalating, revision due, routine due. Fallback in-app badges if denied.
- Icons: 192/512 maskable from QorvixLogo SVG.

## Rules
No backend calls. All stores persist to IndexedDB. No cross-feature imports except via `lib/` + types. No social/chat/AI code.
