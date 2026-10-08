# QORVIX — PRD (Product Requirements Document)

**App Name:** QORVIX — Your Trajectory to Victory
**Type:** Competitive Exam Study Operating System (Tablet-first PWA, installable, native-feel)
**User:** Single aspirant (SSC, Bank, Railway, State Exams, UGC NET, Odisha GS, others). 100% local, no login, no server.
**Platform priority:** 1. Tablet (768–1024) → 2. Mobile → 3. Desktop. Publish via GitHub + Vercel.

> Strict scope: Build ONLY what is written here. No social, no chat, no communities, no gamification, no useless AI, no useless analytics, no extra pages. This is NOT a productivity app, NOT a social app. This is a Competitive Exam Study Operating System. Must remain fast, clean, professional, mobile-first/tablet-first, study-focused.

## 1. Product Vision

One master syllabus stored once and reused everywhere, linked to every job application and target exam, driving a nightly smart study To-Do timetable with revision + tests + weakness tracking, surfaced as an action-oriented dashboard. Four bottom tabs only: Dashboard, Syllabus, Job Recorder, Timetable.

Workflow linkage (heart of app, must connect correctly):
`Syllabus ↔ Job Recorder ↔ Timetable ↔ Dashboard`

## 2. User Goals
- Maintain ONE master syllabus for all exams (SSC: arithmetic/reasoning/English/GK; Railway: arithmetic/reasoning/GK; Banking: arithmetic/DI/reasoning/English; State: arithmetic/DI/reasoning/English/Odia/Computer; Current Affairs mandatory for all) and reuse everywhere without duplication.
- Record every form fill-up + target exams + admit/result lifecycle without clutter, including district-merge cases.
- Solve batch + individual video problem with a single clean model (see §4.1 Hybrid Model).
- Get nightly tomorrow To-Do (editable), with auto-shift-today-only flexibility, routine, notifications.
- Revise daily/weekly/monthly, test after topics, track mistakes linked to syllabus with Green→Red heat, prioritize exams.
- See only action-oriented dashboard with timer + countdowns for active items only.

## 2B. Problem Statement

The aspirant prepares for many overlapping competitive exams from two kinds of material at once (individual video lectures + full batch courses), fills many forms across districts, and must convert all of that into one daily study list with revision and tests — without maintaining three separate systems. Spreadsheets and notes lose the links: syllabus learned twice, admit dates missed, weak topics never revised. QORVIX keeps ONE master syllabus, links it to every exam, and turns those links into tonight's plan and today's actions automatically.

## 3. Navigation (Bottom Only, Floating Telegram Island)

1. Dashboard 2. Syllabus 3. Job Recorder 4. Timetable. Nothing else. Floating dock, translucent blur, rounded, active pill highlight. FAB `+` docked above nav bottom-right.

## 4. Features

### 4.1 Syllabus Module — Single Master Syllabus (Step 1)

Tree: `Subject → Chapter → Topic → Sub Topic`.
- Subject examples: Quantitative Aptitude (= Math = Mathematics = Arithmetic), Reasoning, English, Computer, General Knowledge (Polity, Economics, Geography, History…), Static GK, Odisha GS, General Science (Biology, Chemistry, Physics), Odia, Current Affairs, etc.
- Inside Subject → Chapter (e.g. Ratio, Fundamental Rights). Inside Chapter → Topics, if needed → Sub Topics.
- End-of-tree rule: if tree ends at Topic, Topic holds Video Lecture; if ends at Sub Topic, Sub Topic holds Video Lecture. Example: Quantitative Aptitude → Ratio → Partnership → Compound Partnership → Video Lecture.
- Video Lecture fields: Lecture Name, Lecture URL, Notes.
- Manual add: Subject / Chapter / Topic / Sub Topic (unique sibling titles, validated).
- Import: Excel (via CSV→JSON, no heavy lib) + JSON with review-before-import preview (counts + sample, nothing written until Confirm). Must report added/skipped rows, never silently duplicate or corrupt.
- Master philosophy: store once, reuse everywhere via links + weightage. No duplication.
- Progress states: Not started (0) / In progress (1–99) / Completed (100); parents roll up the child average. Marking a timetable task Done auto-completes its syllabus node (§79).

#### Hybrid Learning Source Model (solution for Batch + Individual doubt)

Problem: user has (1) individual subject video lectures categorized into micro topics AND (2) institution batch subscription teaching full subjects (e.g. SSC, Banking, Odisha/State jobs). Same subject appears in both; some batch subjects have no individual videos.

Solution (middle-ground, simultaneous, no duplication):
- Each syllabus node (Topic / Sub Topic) supports `LearningSource mode: individual | batch | both`.
  - `individual`: lectureName + lectureUrl + notes.
  - `batch`: batchName (e.g. SSC Batch / Banking Batch / Odisha State Batch) + batchSubject + notes.
  - `both`: stores both sets. Example: Ratio = Individual Lecture ✓ + SSC Batch ✓; Percentages = Banking Batch Only; Profit & Loss = Individual Only.
- Timetable NEVER schedules videos. It schedules "Study Topic" (e.g. Ratio). At study time user chooses Individual / Batch / Both; the task card lists the batch's lectures for that node.
- Reusable Batch entities (`BatchCourse`: name + description + subject + lectures; each `BatchLecture`: name + number + URL + notes + optional syllabus link). A batch lecture may start linked only to a Subject; after studying, the user classifies what it actually covered (Subject→Chapter→Topic→SubTopic), updating the Master Syllabus. No batch lecture is ever duplicated per exam.
- If only Subject is known (no micro detail yet), timetable schedules hours only (e.g. "Polity 1h"). After study, user fills micro detail (chapter/topic) via tree — progressive refinement.
- This keeps syllabus clean, avoids duplicate Ratio entries, lets user work both sources simultaneously.

### 4.2 Job Recorder (Step 2) — Form + Target Manager

Two sections: **1. Jobs** (all jobs discussed) **2. Academics** (UGC NET, B.Ed, entrance — single-exam + joining flow).

#### A. Basic Exam Details
- Exam Name (required), Conducting Body Name + Website, Post Name (+ Notification PDF Link), Level dropdown (10th / +2 / +3 / PG), Category dropdown (Central / State / District).

#### B. Application Details
- Application Date (default today, editable), Application Fee + Refundable / Non-refundable (if Refundable → Refund Amount + Refund Date + Refund Status Expected/Received; if Non-refundable → nothing), Mode of Payment (Online / Challan / Postal Stamp / Other), Application No. (optional), Registration No. (optional), Roll No. (optional — entry at form time or admit-card time).

#### C. Exam Workflow — fully flexible, never force fixed sequence
Stage types: Prelims, Mains, Tier II, Written, Skill Test, DV, Interview. Canonical chain Prelims → Mains → Skill Test → DV → Interview, BUT user picks any subset/order:
Prelims→Interview, Prelims→DV, Single Exam→DV, Single→Skill→DV, Prelims→Mains→DV, Prelims→Mains→Skill→DV, Prelims→Skill→DV, etc. UI: `+` buttons per job, in user order; each stage is a 3-step stepper (Date+Study → Admit → Result) with ✓ dots.

Per-stage logic (repeats for Prelims, then Mains/Interview/Tier-II redo same):
1. Approximate date + optional range end, editable; status Scheduled / Postponed / Rescheduled. Changing a date re-arms countdowns and reminders.
2. Syllabus linkage window: show Master Syllabus Subject→Chapter picker. Subject selection MANDATORY, Chapter/Topic/SubTopic optional. Plus weightage (approx marks from total). Timetable reads this.
3. Admit-card: remind 15 days before (10–15d window for Prelims). After `Admit Downloaded` click, collect: Date of Examination (proper), Shift, Gate Closing Time, Center, Documents/Things Required. Then notify from 7 days before, more repeatedly as nearer.
4. On/After exam: mark Given / Missed / Overlap date.
5. If Given → notify after 7–15 days about Answer Key / Result. Track: Answer Key, Cutoff, Obtained Marks (user-typed), Result PDF link. If Cleared → prompt next stage date + syllabus + weightage (same flow again).
6. Skill Test variant: same procedure but syllabus entry is free-text/user-updated (not only from syllabus tree) + same admit/result if applicable.

#### D. Target Exams
- Fields only: Exam Name + Priority + Syllabus links (no dates, no application numbers).
- Targets steer timetable generation (priority subjects + study candidates) before any form is filled.
- On form fill: open target → Convert to Active → syllabus links carried into the first stage, priority preserved, then add Basic + Application details. Never duplicated.

#### E. Job Merging (required)
Same recruitment, multiple district applications → merge into one parent to avoid clutter. Example Parent: Odisha Forest Guard; Children: Ganjam, Khordha, Cuttack. Children keep their own application/admit/result/stages (nothing destroyed). UI: parent card shows grouped count with Show/Hide collapse; children render nested below with a "grouped under X" stripe.

### 4.3 Timetable (Step 3) — Smart Study To-Do List (NOT a calendar)

- Night planning: every night generate next day's plan; user reviews/edits before saving — reorder (↑↓), change minutes, remove tasks, add tasks, change source, or ↻ Remake the whole proposal.
- Inputs: Active Exams + Target Exams + Priority + Dates + Syllabus Progress + Mistake Areas + staleness (days since studied).
- Flexible study flow: if task exceeds time, auto-shift remaining tasks of TODAY only (take from later blocks, min 15m preserved). Never mutate future schedules. Next day resets to default.
- Time guidance (editable default, fill other hours accordingly):
  - 5–8am new concepts (fresh brain), 10am–12pm problem solving (peak focus), 4–6pm revision, 7–9pm practice/mock. Leftover hours filled smartly, user-editable previous night.
  - Weightage: Current Affairs daily + Mathematics/GK/GS high time; Reasoning/English/Computer low time.
- Daily routine: wake-up to sleep entries with repeat daily/weekly/monthly/days/once(date) + push alerts (next occurrence scheduled on boot + 9pm plan nudge).
- Notifications for admit/exam/answer-key/routine/plan (local-scheduled + in-app fallback).
- After completing topic: Done auto-marks syllabus Completed + stamps study date; record actual minutes taken + short summary ("inside xyz is…").
- Revision MANDATORY: Daily + Weekly + Monthly.
  - Daily: next day first 10–30 min revision OR sectional mock of completed topic/subtopic → record correct/incorrect/mistake notes.
  - Weekly: if full chapter done → chapter-wise weekly revision + weekly test; else random studied topics suggestion + correct/incorrect + notes.
  - Monthly: same at month scale. Current Affairs daily + Friday weekly revision + month-end monthly revision built-in.
- Test cadence: Tue/Thu/Sat auto full-length test suggested per filled exam; Mon/Wed/Fri its analysis in timetable. Sunday: morning 3h + after 2pm 3–4h offline test + analysis + revision only (extra if free). App suggests Sunday plan previous night, user adjusts.
- Retain most subjects in rotation: Quantitative Aptitude, Reasoning, English, GK, GS, Static GK, Computer, Odia, Odisha GS, Current Affairs (daily/weekly/monthly).
- Error tracking: link mistakes to Subject→Chapter→Topic→SubTopic (chapter-level OK if micro unidentifiable — analysis linker offers chapters too). Only suggest revision for STUDIED items (unstudied incorrect is expected, don't prioritize).
- Weakness engine: more mistakes → more revision frequency, older study → higher staleness score. Color gradient Green → Yellow → Orange → Red; reverses toward Green with correctness. Visual heat dot per node + pending-revision list.
- Priority exam system: priority exam gets more study + revision + tests; auto-increase focus as exam nears + motivate in tiers — ≤30d "Consider adding 30 minutes…", ≤7d "extra 1–2 hr". Priority revision stays priority-only.
- Analysis linkage: after full-length test analysis, picker Subject→Chapter→Topic→SubTopic for each correct/incorrect item.

### 4.4 Dashboard (Action-Oriented, Not Info-Heavy)

Show ONLY: Today's Tasks, Today's Study Plan, Active Exams (fully-cleared hidden; countdown always shows the next UNCLEARED stage — cleared Prelims never lingers, Mains takes over), Exam Countdowns with urgency colors + Postponed flag, Pending Revision (mistake-first), Today's Routine.
- Study Timer: Start/Stop, optionally linked to a study task (▶ on the task). Every stop stores a StudySession (task + minutes). Track daily/weekly/monthly/yearly/all-time. Graphs/trends + tap-month day drill-down for motivation.

## 5. User Stories

- As aspirant I create Subject>Chapter>Topic once and link to SSC + State jobs with different weightage.
- As batch+individual learner I store both sources on Ratio and choose at study time; batch-only Percentages still schedulable.
- As applicant I convert Target→Active, merge Ganjam/Khordha/Cuttack under Forest Guard, track admit→Given→cutoff per flexible stage.
- As planner I get tonight's tomorrow To-Do with 5–8/10–12/4–6/7–9 defaults, edit times, auto-shift if overrun, revise mistakes first.
- As test-taker I get Tue/Thu/Sat mocks + Mon/Wed/Fri analysis linked to syllabus, Sunday offline block.
- As motivator I start timer, see hours trend + active countdowns only.

## 6. Requirements

- Functional: all workflows above work offline; validation + error handling everywhere; empty states; import reports skipped rows; dates editable on postponement; timer single-running.
- Non-functional: fast (60fps, no lag), clean, tablet-first 768–1024 then mobile then desktop, eye comfort, minimal taps (≤2 to study topic), subtle 120–180ms animations, PWA installable standalone fullscreen, offline cache, push via local-scheduled Notification API + SW (HTTPS via Vercel) with in-app badge fallback.
- Constraints: TypeScript strict, Zustand slices persisted to IndexedDB (`qorvix-db`, one-time LocalStorage promotion) + LocalStorage for theme only, Tailwind + shadcn-style local UI, Inter/Manrope, no large libs, no hardcoded tokens, no duplicate logic, no backend.
- Deployment: GitHub + Vercel, PWA required (192/512 + maskable icons, offline shell, auto-update SW).

## 7. Acceptance Criteria

- Syllabus: Subject→Chapter→Topic→SubTopic CRUD, hybrid sources incl. reusable batches, JSON + CSV import with preview and added/skipped report, no duplicates, progress rollup, empty start (no demo data).
- Jobs: Target with syllabus → Convert carries syllabus; flexible Written/Prelims/Mains/Tier II/Skill/DV/Interview order; admit 10–15d → downloaded details → 7d escalating → Given/Missed/Overlap → 7–15d answer-key/result → cleared advances; date/status edits move countdowns; district children grouped under parent, each intact.
- Timetable: nightly proposal from active+target exams; review (reorder/minutes/remove/remake/source); Done completes syllabus; studied-only mistake-first revision incl. CA daily/weekly/monthly; Tue/Thu/Sat mocks, Mon/Wed/Fri analysis, Sunday caps; overrun shifts today only.
- Dashboard: today list + routine + next-uncleared countdowns + pending revision + linked timer sessions; fully-cleared exams hidden; stats aggregate correctly.
- Platform: `tsc` + build + lint green; installs on tablet from Vercel; works offline (airplane mode); data survives reload via IndexedDB.
