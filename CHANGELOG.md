# Changelog

## [2.1.0] - 2026-03-22

### Added
- Signal-specific node tooltips — each node shows its own signal data, classification badge, source, and date
- Fiscal year-end diamond nodes — amber-stroked diamond markers at FY-end months, with signal promotion via `isFiscalYearEnd` flag
- Monthly axis labels — 3-letter month abbreviations with January emphasis and year display
- Legend hover tooltip — portal tooltip showing objective subtitle and original quote on any legend row hover
- Zero selection state — deselect all objectives, empty canvas shows italic prompt
- `year_end_review` signal classification type
- `fiscal_year_end_month` column on companies table (default 12)
- `TimelineLegendTooltip` component (new file)
- 15 test files, 81 tests (up from 11 files / 41 tests)

### Changed
- Tooltip now shows per-node signal data instead of repeating latest signal on every node
- Boardroom Allegory captions removed from tooltip display
- Legend footer shows dynamic count ("X of Y selected") instead of hardcoded "X of 3"
- Min-1 selection constraint and shake animation removed from legend

### Removed
- Quarterly vertical dashed gridlines (replaced by monthly labels)
- `quarterLabels` memo and quarterly gridline rendering
- Shake animation on last-selected checkbox

## [2.0.0] - 2026-03-20

### Added
- Next.js 15 + TypeScript + Tailwind CSS frontend
- Interactive timeline canvas with panzoom, SVG paths, emoji nodes
- Tabbed company pages (Timeline, Objectives, Buried, Evidence)
- Magazine-style landing page with sector-grouped company grid
- Client-side search (name, ticker, exchange)
- Light/dark mode with cookie persistence
- Framer Motion page transitions and drawer animations
- Boardroom Allegory editorial captions for momentum stages
- Ad slot placements (sidebar + footer)
- Custom 404 page
- About page with methodology and momentum scale
- Admin dashboard ported to Next.js
- Exchange field added to companies table
- 41 tests (Vitest + React Testing Library)

### Changed
- Complete visual redesign: emerald + slate palette (replacing caffeine dark)
- New typography: DM Sans / Lora / IBM Plex Mono (replacing Playfair Display / Source Serif 4 / JetBrains Mono)
- Light mode primary (replacing dark-first)
- Agent schedule changed from monthly to bi-weekly (cron config only)
- Editorial voice refined: Economist x Vanity Fair with dry wit

### Removed
- Vanilla HTML/CSS/JS frontend (archived to v1-archive/)
- Caffeine dark palette
- v1 typography stack

## [1.0.0] - 2026-03-19

### Added
- Initial release: Sandoz company page, landing page, admin, timeline concept
- Research agent with Claude API
- Supabase schema with companies, objectives, signals, agent_runs
- Brand language guide and colour palette
