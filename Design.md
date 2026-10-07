# QORVIX — Design (very important, user sees daily)

Goal: Telegram quality, WhatsApp smoothness, TickTick simplicity, Notion cleanliness. Premium minimalism, never cheap/colorful.

## Language
- Modern soft rounded (12–20px cards, 999px pills/chips/FAB/nav), clean borders `border-white/10 dark`, subtle shadow, light glass only on floating nav.
- Animations: 120–180ms ease-out, translateY 4px + fade. No flashy effects.

## Typography
- Font: Inter (primary), Manrope (alt). Large titles 22–28px/700, section 15–17px/600, body 14px/400, caption 12px muted. Excellent readability, line-height 1.5.

## Colors
- Primary Indigo/Blue `#4F46E5` (active chip/FAB/nav pill), Success Green `#16A34A`, Warning Amber `#F59E0B`, Danger Red `#DC2626`.
- Dark: premium slate `#0F172A` bg, `#1E293B` card, `#E2E8F0` text. Light: soft white `#F8FAFC` bg, `#FFFFFF` card, `#0F172A` text.
- Weakness gradient: Green→Yellow→Orange→Red for mistake heat.

## Layout (tablet-first)
- Max-width 820px centered on tablet, 480px on mobile, 1024px on desktop. Bottom floating island nav (translucent blur, rounded 24px, elevated 16px above edge, active pill highlight). Top AppBar (title left, menu right) + pill search + horizontal scroll chips with count badges.
- Job cards: status timeline card — left vertical color pill (category/year), middle bold title + subtitle stages/notes + banner for final milestone, right stage icons ✓ green / ✗ red / ○ amber. Rounded, crisp border, subtle elevation. FAB `+` docked above nav bottom-right.
- Eye comfort: generous padding, minimal taps (2 taps to study topic), clear hierarchy, dark-mode default on tablet.

## Logo — QORVIX
SVG: progress circle (75% indigo arc on slate), checkmark (white/green cut), focus target dot center, timeline tick at base. Wordmark QORVIX 700 tracking-tight + tagline. Works mono + color, dark/light, 16px favicon to 512 maskable.
