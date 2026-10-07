# QORVIX — PRD (Product Requirements Document)

**App Name:** QORVIX — Your Trajectory to Victory
**Type:** Competitive Exam Study Operating System (Tablet-first PWA, installable, native-feel)
**User:** Single aspirant (SSC, Bank, Railway, State, UGC NET, Odisha GS, others). 100% local, no login.

## 1. Product Vision
One clean, fast, study-only OS that connects Master Syllabus ↔ Job Recorder ↔ Timetable ↔ Dashboard. No social, no chat, no communities, no gamification, no useless AI, no extra pages. Strictly what is written here.

## 2. User Goals
- Maintain ONE master syllabus for all exams, reuse everywhere.
- Record every form fill-up + target exams + admit/result lifecycle without clutter.
- Get a nightly smart To-Do timetable (not a calendar), with revision + tests + weakness tracking.
- See only action-oriented dashboard: today, countdowns, revisions, timer.
- Install on tablet/mobile via Vercel PWA, offline, push reminders, eye-comfort daily use.

## 3. Navigation (Bottom Only, Floating Telegram Island)
1. Dashboard 2. Syllabus 3. Job Recorder 4. Timetable. Nothing else.

## 4. Features

### 4.1 Syllabus Module — Single Master Syllabus
Tree: Subject → Chapter → Topic → SubTopic.
- Final node (Topic if no SubTopic, else SubTopic) holds Learning Source.
- Hybrid Learning Source Model: `individual | batch | both`
  - Individual: lectureName, lectureUrl, notes
  - Batch: batchName, batchSubject, notes (e.g. SSC Batch, Banking Batch, Odisha State Batch)
  - Both: both sets stored. Timetable schedules "Study Topic", user picks source at study time.
- Manual add (Subject/Chapter/Topic/SubTopic) + Import Excel/JSON.
- No duplication. Store once, link everywhere with weightage.
- Example: Quantitative Aptitude → Ratio → Partnership → Compound Partnership → Video.

### 4.2 Job Recorder — Form + Target Manager
Sections: Jobs | Academics (UGC NET, B.Ed, entrance — single-exam flow).
- Basic: examName, conductingBodyWebsite, postName + notificationPdf, level (10th/+2/+3/PG), category (Central/State/District).
- Application: applicationDate (default today, editable), fee + refundable/non-refundable + refundAmount/refundDate, mode (Online/Challan/Postal Stamp/Other), optional applicationNo/registrationNo/rollNo (editable at admit time).
- Exam Workflow — fully flexible, user chooses stages in any order: Prelims, Mains, Skill Test, DV, Interview. Examples: Prelims→Interview, Single→DV, Single→Skill→DV, Prelims→Mains→DV, Prelims→Mains→Skill→DV.
- Per stage: approximate/range date (editable if postponed), syllabus linkage (Subject mandatory, Chapter/Topic/SubTopic optional + weightage marks), admit flow, result flow.
- Admit: remind 15d before. After Downloaded collect examDate, shift, gateClosing, center, documents.
- Result: notify 7–15d after Given about Answer Key/Result. Track cutoff, obtained marks, resultPdf. Mark Given/Missed/Overlap.
- Target Exams: examName + priority + syllabus only. No application details. Convert to active on form fill (adds Basic+Application).
- Merging: Parent (e.g. Odisha Forest Guard) + Children (Ganjam/Khordha/Cuttack) to avoid clutter. Children inherit parent syllabus but keep own application/admit.

### 4.3 Timetable — Smart Study To-Do List
- Night planning: generate next-day plan at night, user edits before saving.
- Inputs: active exams, priority exams, exam dates, syllabus progress, mistake areas.
- Schedules Topic, not video. User picks Individual/Batch/Both at study time. If only Subject known, schedule hours, allow micro-detail fill after study.
- Time guidance (editable): 5–8am new concepts, 10–12 problem solving, 4–6pm revision, 7–9pm practice/mock. Fill other hours accordingly. Math/GK/GS high time, Reasoning/English/Computer low time. Current Affairs daily/weekly/monthly built-in.
- Flexibility: if task overruns, auto-shift remaining today only. Never mutate future days. Next day resets to default.
- Daily routine: get-up to sleep, repeat daily/weekly/monthly/days, with push alerts.
- Revision mandatory: Daily (10–30min next-day of completed topic), Weekly, Monthly.
- Test: after topic → sectional test suggestion. Record correct/incorrect/notes. Tue/Thu/Sat full-length (per filled exam), Mon/Wed/Fri analysis. Sunday: morning 3h + afternoon 3–4h offline test+analysis+revision only (extra if free).
- Error tracking linked to Subject→Chapter→Topic→SubTopic (chapter-level ok if micro unknown). Only suggest revision for studied items.
- Weakness engine: more mistakes → more frequency. Color Green→Yellow→Orange→Red gradient, reverses with correctness.
- Priority exam: more study+revision+tests, auto-increase as exam nears + motivate ("Read extra 1–2 hr to clear").
- After completion ask short summary. Notifications for each block.

### 4.4 Dashboard — Action-Oriented Only
Show: Today's Tasks, Today's Study Plan, Active Exams (cleared stages hidden), Countdowns, Pending Revision, Today's Routine.
- Study Timer: Start/Stop, track daily/weekly/monthly/yearly, graphs/trends/total hours, detail on tap. For motivation only.

## 5. User Stories (abridged)
- As aspirant I create Subject>Chapter>Topic once and link it to SSC + State jobs with different weightage.
- As batch+individual learner I store both sources on Ratio and choose at study time without duplication.
- As applicant I convert Target → Active, merge district applications, track admit→result per stage flexibly.
- As planner I get tonight's tomorrow To-Do, edit times, auto-shift if overrun, revise mistakes more.
- As motivator I start timer and see hours trend and exam countdowns only for active items.

## 6. Requirements
- Functional: all workflows above must work offline, linked correctly. Validation + error handling everywhere.
- Non-functional: fast, clean, tablet-first (768–1024) then mobile then desktop, eye comfort, minimal taps, smooth 60fps, subtle fast animations, PWA installable fullscreen, push (local-scheduled) with in-app fallback.
- Constraints: TypeScript strict, Zustand, IndexedDB+LocalStorage, Tailwind+shadcn/ui, no large libs, no hardcoded values, no duplicate logic. Deploy GitHub+Vercel.
