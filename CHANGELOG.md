# Changelog

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
