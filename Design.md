# QORVIX — Design (very very important — user sees it every day)

Goal: Telegram quality, WhatsApp smoothness, TickTick simplicity, Notion cleanliness. Premium minimalism. Never cheap or colorful-for-sake. Eye comfort + fast navigation + minimal taps + clear hierarchy. Tablet-first, smooth like WhatsApp, simple like a study To-Do app, no lagging.

## Design Language

Style: modern, soft, rounded, clean.
- Cards 12–20px radius, pills/chips/FAB/nav 999px, crisp 1px borders (`border-slate-200 / dark:border-white/10`), subtle shadow only.
- Glassmorphism ONLY lightly on floating nav (translucent blur), nowhere else heavy.
- Layout shells: tablet max 820px centered, mobile 480px, desktop 1024px. Generous padding, 2-tap to any study topic.

Animations: very subtle, smooth, fast.
- 120–180ms ease-out, translateY 4px + fade max. No flashy effects, no bounce, no large blur transitions. 60fps scroll, sticky nav.

## Typography

Font: Inter (primary). Alternative: Manrope.
- App title 17–19px/800, page titles 22–28px/700, section 15–17px/600, body 14px/400 lh 1.5, caption 11–12px muted.
- Excellent readability, tracking-tight wordmark, tabular numbers for timer/countdowns.

## Colors

Primary: Indigo/Blue `#4F46E5` (active chip, FAB, nav pill, links).
Success: Green `#16A34A` / `#22C55E` (✓ badges, heat-0, done).
Warning: Amber `#F59E0B` (○ pending, TARGET pill, heat-2/3).
Danger: Red `#DC2626` (✗, heat-4, priority).

Background:
- Premium dark slate (default on tablet): bg `#0F172A`, card `#1E293B`, text `#E2E8F0`.
- Light theme: soft white bg `#F8FAFC`, card `#FFFFFF`, text `#0F172A`.

Weakness heat (mistake gradient Green→Red): heat-0 green → heat-1 yellow-green → heat-2 yellow → heat-3 orange → heat-4 red. Dots + left pills use this.

## Components (verified AI-Studio structure, adapted to QORVIX — no copy-paste, styled to app)

1. Top App Bar: title (`QorvixLogo` left) + overflow/theme/push actions right.
2. Pill Search: inset rounded-full input + leading 🔍, filters current tab (subjects/exams/topics).
3. Horizontal chip tabs: scrollable pills; active = solid indigo + white text; inactive = subtle/translucent + muted; numeric count badge pill inside each chip (Jobs/Academics/Targets counts).
4. Status-timeline Job cards: vertical scroll list; left vertical color pill (Central indigo / State green / District amber, priority red edge); middle bold title + subtitle (post · level · category · priority) + TARGET banner / final-milestone banner; right stage icons row: ✓ green-passed / ✗ red-failed / ○ amber-pending. Rounded, crisp border, subtle elevation.
5. FAB: circular indigo `+`, bottom-right docked above nav; contextual per tab (Syllabus→add box, Jobs→new exam, Plan→custom topic); hidden on Dashboard where it adds nothing.
6. Bottom nav (Telegram floating island): floating dock 16px above edge, rounded 24px, frosted blur, 4 items (Dashboard/Syllabus/Jobs/Plan) icon+label; active = smooth pill highlight behind icon. No avatar item.
7. Timetable rows: title + minutes + one big Done button + linked-timer ▶ + "Change" details (time/actual/order/remove/source/mistakes) + one-line learning summary.
8. Dashboard: today card with done-count chip, timer card with big tabular hours + Start/Stop + running-task line + today's sessions + 7-bar trend + 7d/30d/all chips + monthly drill-down, countdown rows with urgency color, revision heat-dot chips.
9. Stage stepper: ① Date+Study → ② Admit → ③ Result with ✓ dots; auto-opens the first unfinished step; plain words throughout ("Exam around", "I gave it ✓", "What happened?").
10. Status pills: Not started / In progress / Completed next to rollup %; parent group stripe (amber) + Show/Hide for merged applications.

Theme & visuals: dark slate/navy bg, vibrant indigo accent, clean type. Modular code with placeholders — real data from stores, no mocks in prod.

## Logo — QORVIX (best, professional, short, memorable)

Name: QORVIX — Your Trajectory to Victory. Short, serious, productivity-focused, competitive-exam oriented. No books/caps clichés.
Construction (SVG `QorvixLogo.tsx`, works dark/light, mono + color, 16px favicon → 512 maskable):
- Rounded-square slate tile (16px radius) = app-icon feel like WhatsApp/Notion/Telegram/TickTick/Todoist.
- Progress circle: 75% indigo arc (gap at base = trajectory, stroke round) — study progress.
- Checkmark: green/white cut across circle — completion/victory.
- Focus target: center dot (white) — focus.
- Study timeline: base tick bar (indigo, 28×3 rounded) — timeline concept.
- Wordmark: QORVIX 800 tracking-tight + tagline `Trajectory to Victory` 10–11px muted.
Rules: min clear-space = dot diameter; min size 16px; never gradient-heavy, never clip-art; dark tile on light bg, light text on dark.
PNGs are generated from this exact SVG by `scripts/gen-icons.mjs` (zero-dep Node rasterizer): 192/512 `any`, 512 `maskable` (safe-zone zoom), 180 apple-touch.

## UI/UX Requirements Checklist

- Floating bottom nav always visible, thumb-reachable; FAB never covers content (safe-area padding).
- Pill indicators for status, heat dots for weakness, countdown urgency (green>30d, amber 7–30d, red <7d).
- Smooth transitions on tab switch, accordion tree, sheet modals for stage/syllabus pickers.
- Eye comfort: dark default, soft whites, no pure black/white flashes, 14px+ body.
