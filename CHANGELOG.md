# Changelog

## [3.0.0] - 2026-03-25

### Added
- Masthead green top rule (3px `var(--primary)` bar) and 36px Lora italic logo
- Organic cubic bezier spline paths replacing straight-segment polylines (`TimelinePath.tsx`)
- Area fill between spline and ground line — emerald above, muted red below, with clipPath split
- Dashed stroke for below-ground path segments
- 6-type SVG node system: origin, signal, latest, cadence, fiscal year-end, stale (`TimelineNode.tsx`)
- Vertical tick labels with stackIndex stagger for overlapping nodes
- Top axis month labels mirroring bottom axis (`TimelineCanvas.tsx`)
- 13 new tests (99 total, up from 86)

### Changed
- Masthead height increased from `h-14` to `h-16`; TabBar sticky offset updated to `top-16`
- Timeline nodes migrated from HTML overlay to native SVG `<g>` elements
- Path stroke width increased to 2.5px
- January gridlines emphasised at 0.3 opacity vs 0.15 for regular months
- Node `title` attributes removed (replaced by `aria-label` for accessibility)

## [2.2.0] - 2026-03-23

### Added
- Dedicated axis label area below stage grid — month/year labels no longer clip at canvas bottom
- Zero default selection — canvas loads with no objectives selected, empty state prompt visible
- Monthly vertical gridlines with January emphasis (opacity 0.3 vs 0.15 for regular months)
- Mouse drag panning on timeline with grab/grabbing cursor and 5px dead zone
- `AXIS_LABEL_HEIGHT` constant for asymmetric canvas layout
- `data-timeline-scroll` and `data-gridline` attributes for testability
- 5 new tests (86 total, up from 81)

### Changed
- Canvas height increased from 560 to 620 to accommodate dedicated axis label area
- `GROUND_Y` and `STAGE_HEIGHT` now derived from asymmetric padding model (`PADDING_Y` top, `AXIS_LABEL_HEIGHT` bottom)
- Today marker and below-ground zone use explicit stage grid bounds instead of symmetric padding
- `getDefaultSelection` returns empty set instead of top-3-by-momentum

### Removed
- 17-line `getDefaultSelection` heuristic (replaced by empty-set default)

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
