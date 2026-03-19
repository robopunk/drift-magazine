# Drift v2 — Complete Redesign Specification

**Date:** 2026-03-19
**Author:** Stefano + Claude Opus 4.6
**Status:** Approved
**Version:** 2.0.0

---

## 1. Overview

Drift v2 is a complete visual and structural redesign of the Drift strategic accountability research platform. The editorial concept and data model are preserved from v1; everything visual — colour palette, typography, layout, timeline implementation, and interaction model — is reinvented.

### What stays
- The editorial concept: tracking what companies publicly commit to and how that language changes
- The data model: companies, objectives, signals, momentum scale, graveyard/buried classification
- The 9-stage momentum scale (Orbit → Buried)
- The ground-line metaphor (above = alive, below = buried)
- The research agent and Supabase backend

### What changes
- Complete new colour palette (emerald + slate, replacing caffeine dark)
- New typography system (DM Sans / Lora / IBM Plex Mono)
- Light mode primary with dark mode toggle
- New site structure: dual identity (magazine landing + data platform)
- New timeline: interactive canvas with emoji nodes (replacing horizontal scroll)
- Tabbed company pages (replacing single vertical scroll)
- Next.js 15 + TypeScript + Tailwind CSS (replacing vanilla HTML/CSS/JS)
- New editorial voice: Economist × Vanity Fair, grey-scale morality, dry wit

---

## 2. Editorial Voice

### Personality
A senior investigative journalist for a high-end, sophisticated business and ethics magazine. A blend of The Economist's analytical clarity and Vanity Fair's narrative flair.

### Key directives
- **Avoid binary narratives** — no heroes, no villains. If a failure is found, balance it with analysis of performance. If success is praised, investigate the cost.
- **Investigative depth** — focus on systemic causes, not surface symptoms
- **Eloquence over simplicity** — sophisticated, precise language. No corporate jargon. Rhythmic, polished prose.
- **The "wink"** — subtle, dry humour. Wit to highlight ironies and absurdities, but never undermining the investigation's seriousness.
- **Structure** — compelling narrative hook → hard data/evidence → counter-perspective → nuanced synthesis

### Where the voice lives
- Company card editorial verdicts (landing page)
- Editorial assessment blocks (company page header)
- Boardroom Allegory captions (momentum icons)
- Buried card descriptions and winks
- Signal excerpts and agent reasoning

---

## 3. Colour Palette

### Light Mode (Primary)
```css
:root {
  --background: #f0f8ff;
  --card: #ffffff;
  --muted: #f3f4f6;
  --accent: #d1fae5;
  --secondary: #e0f2fe;
  --border: #e5e7eb;
  --input: #e5e7eb;
  --primary: #22c55e;
  --ring: #22c55e;
  --foreground: #374151;
  --muted-foreground: #6b7280;
  --card-foreground: #374151;
  --primary-foreground: #ffffff;
  --secondary-foreground: #4b5563;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
}
```

### Dark Mode (Toggle)
```css
.dark {
  --background: #0f172a;
  --card: #1e293b;
  --muted: #1e293b;
  --accent: #374151;
  --secondary: #2d3748;
  --border: #4b5563;
  --input: #4b5563;
  --primary: #34d399;
  --ring: #34d399;
  --foreground: #d1d5db;
  --muted-foreground: #6b7280;
  --card-foreground: #d1d5db;
  --primary-foreground: #0f172a;
  --secondary-foreground: #a1a1aa;
  --destructive: #ef4444;
  --destructive-foreground: #0f172a;
}
```

### Status colours (semantic only)
| Status | Colour | Usage |
|---|---|---|
| On Record / Active | `#22c55e` (green) | Healthy objectives, reinforced signals |
| Under Watch | `#d97706` (amber) | Stalling objectives, Watch stage |
| Drifting | `#ea580c` (orange) | Crawl stage, softened signals |
| Dropped / Buried | `#dc2626` (red) | Drag/Sink/Buried, absent signals |
| Morphed | `#3b82f6` (blue) | Reframed objectives |

### Momentum spectrum colours
| Stage | Score | Colour |
|---|---|---|
| Orbit | +4 | `#059669` |
| Fly | +3 | `#16a34a` |
| Run | +2 | `#65a30d` |
| Walk | +1 | `#ca8a04` |
| Watch | 0 | `#d97706` |
| Crawl | -1 | `#ea580c` |
| Drag | -2 | `#dc2626` |
| Sink | -3 | `#b91c1c` |
| Buried | -4 | `#78716c` |

---

## 4. Typography

| Role | Font | Usage |
|---|---|---|
| UI / Navigation | **DM Sans** | Nav items, buttons, card descriptions, body UI text |
| Editorial / Headlines | **Lora** | Headlines, editorial verdicts, pull quotes, wink captions, signal excerpts |
| Metadata / Labels | **IBM Plex Mono** | Ticker symbols, dates, scores, stage labels, classification badges, filters |

### Rules
- No other fonts. No fallbacks to system-ui, Inter, or Roboto.
- Lora italic for editorial captions and winks
- IBM Plex Mono uppercase with letter-spacing for all labels and metadata
- Minimum font size: 0.65rem for labels, 0.875rem for body text (supersedes v1 CLAUDE.md rule; CLAUDE.md will be updated to match)

---

## 5. Momentum Icons

### Emoji set
| Stage | Icon | Score |
|---|---|---|
| Orbit | 🚀 | +4 |
| Fly | 🦅 | +3 |
| Run | 🏃 | +2 |
| Walk | 🚶 | +1 |
| Watch | 🧍 | 0 |
| Crawl | 🐌 | -1 |
| Drag | 🪨 | -2 |
| Sink | 🕳️ | -3 |
| Buried | ⚰️ | -4 |

### Boardroom Allegory captions (Set 1)
| Stage | Caption |
|---|---|
| Orbit | "Exceeded their own ambition — and now must live up to the sequel" |
| Fly | "Soaring — though altitude has a way of making the ground look optional" |
| Run | "On pace, on message, on record — the rarest trifecta" |
| Walk | "Progressing steadily, which in corporate parlance means 'not yet panicking'" |
| Watch | "Standing still — the silence before the language starts to soften" |
| Crawl | "The adjectives are getting vaguer and the timelines more flexible" |
| Drag | "The objective remains, technically — like a painting no one has moved but everyone avoids" |
| Sink | "Entering graveyard territory — and the comms team hasn't noticed yet" |
| Buried | "Confirmed off the record. No eulogy was issued." |

These captions appear in:
- Timeline tooltip on hover
- Objective card wink section
- Buried card wink section
- Mobile list view (truncated, expandable)

---

## 6. Site Architecture

### Routes
| Route | Page | Purpose |
|---|---|---|
| `/` | Magazine Landing | Editorial dashboard — company grid with verdicts, search, sector filters, ads |
| `/company/[ticker]` | Company Page | Tabbed view — Timeline, Objectives, Buried, Evidence |
| `/about` | About / Methodology | How Drift works, momentum scale explained, editorial standards |
| `/admin` | Admin Dashboard | Signal review queue, company intake, agent run history |

### Navigation items
| Nav label | Target | Behaviour |
|---|---|---|
| Companies | `/` | Scrolls to company grid if already on landing |
| Sectors | `/#sectors` | Anchor scroll to sector-grouped grid on landing |
| Buried | `/company/[current]?tab=buried` or `/#buried` on landing | Context-dependent — on a company page, opens Buried tab; on landing, filters to companies with buried entries |
| Methodology | `/about#methodology` | Anchor to methodology section on about page |
| About | `/about` | Full about page |

### Shared elements
- **Masthead** — Always dark regardless of theme mode (`#0f172a` background, light text). This is a "forced dark" island — it does not switch with the light/dark toggle. Logo "Drift." (Lora serif, white, period in `#34d399`). Nav items in DM Sans. Dark mode toggle (☀/🌙). Responsive hamburger on mobile.
- **Footer** — Same forced dark treatment. Logo, nav links, copyright. Company page footer includes ad slot.

---

## 7. Magazine Landing Page (`/`)

### Layout
```
┌─────────────────────────────────────────────┐
│ Masthead (dark)                              │
├─────────────────────────────────────────────┤
│ Hero — tagline + search + CTA               │
├──────────────────────────┬──────────────────┤
│ Company grid (2/3)       │ Sidebar (1/3)    │
│                          │ ├ Ad Slot 1      │
│ ┌─ Pharma ──────────┐   │ ├ Latest Signals │
│ │ SDZ  ROG  NVS     │   │ ├ Ad Slot 2      │
│ └────────────────────┘   │ ├ How It Works   │
│ ┌─ Energy ──────────┐   │ └────────────────┘
│ │ BP   SHEL  TTE    │   │                   │
│ └────────────────────┘   │                   │
│ ┌─ Technology ──────┐   │                   │
│ │ ...               │   │                   │
│ └────────────────────┘   │                   │
├─────────────────────────────────────────────┤
│ Footer (dark)                                │
└─────────────────────────────────────────────┘
```

### Hero
- Headline: "What companies commit to. *What the record shows.*" (Lora, green italic on second line)
- Subtext: one-sentence Drift description (DM Sans)
- CTA button: "Browse Research →" (emerald primary)
- Search bar: "Search companies, tickers, exchanges..." (instant client-side filtering)

### Company grid
- **Grouped by sector** with collapse/expand per sector
- Sector headers: Pharma, Energy, Technology, Consumer, Finance (expandable)
- 3-column card grid within each sector
- Each card contains:
  - Ticker badge (IBM Plex Mono, green background)
  - Emoji momentum indicator + commitment score
  - Company name (Lora, bold)
  - One-line editorial verdict (Lora, italic, grey) — the Vanity Fair voice
  - Stats: objective count, drifting count, buried count
  - Momentum bar (colour-coded gradient)

### Search
- Searches against: company name, ticker symbol (exchange field to be added to companies table: `exchange VARCHAR`, e.g. "SIX", "NYSE", "XETRA")
- Instant client-side filtering (suitable for dozens to low hundreds of companies)
- Server-side search can be added later if needed

### Sidebar
- **Ad Slot 1** — 300×250 or native text. Carbon Ads / EthicalAds. Labelled "Sponsored" or "Partner."
- **Latest Signals** — Feed of recent signal events. Colour-coded by classification (reinforced/softened/absent/buried). Shows company, objective, time ago.
- **Ad Slot 2** — Native text format, same visual format as signal entries, marked "Sponsored."
- **How It Works** — 3-step summary linking to /about.

---

## 8. Company Page (`/company/[ticker]`)

### Layout
```
┌─────────────────────────────────────────────┐
│ Masthead (dark)                              │
├─────────────────────────────────────────────┤
│ Sticky Company Header                        │
│ ├ Ticker + Name + Initiative subtitle        │
│ ├ Commitment Index (score/100)               │
│ ├ Editorial Assessment block                 │
│ └ Last updated: [date]                       │
├─────────────────────────────────────────────┤
│ Tab Bar: Timeline | Objectives | Buried | Ev │
├─────────────────────────────────────────────┤
│ Active Tab Content                           │
├─────────────────────────────────────────────┤
│ Ad Slot 3 (footer-level)                     │
├─────────────────────────────────────────────┤
│ Footer (dark)                                │
└─────────────────────────────────────────────┘
```

### Sticky company header
- Stays visible when scrolling within tabs
- Ticker badge + company name (Lora, bold) + initiative subtitle (Lora, italic)
- Commitment index: large score number with /100
- Editorial assessment: bordered block with green label, Lora body text summarising the company's current state
- "Last updated" timestamp (from most recent agent run)

### Tab bar
- Sticky below company header
- Tabs: Timeline | Objectives (count) | Buried (count, red badge) | Evidence (count)
- URL updates per tab: `/company/sdz?tab=buried`. Default tab (no param) = Timeline.
- Active tab has green underline

---

## 9. Timeline Tab (Interactive Canvas)

### Architecture
- **Tech:** DOM nodes (emoji) + SVG overlay (trajectory paths) + lightweight pan/zoom library (panzoom or d3-zoom)
- **Layout:** Legend sidebar (210px) + canvas area (remaining width)
- **Height:** ~70% of viewport when active

### Components

#### Toolbar
- Company name + date range
- Stats: X above ground, Y crossing, Z below
- Time range pills: 6M | 1Y | All
- Zoom controls: +, −, reset

#### Legend sidebar
- Lists all objectives with: colour dot, emoji, OBJ number, name, stage + signal count
- "Buried" section at bottom with greyed entries
- Hover: highlights that objective's path + nodes, dims everything else
- Click: locks isolation (click again or click background to unlock)
- Multi-select: click multiple to compare

#### Canvas
- Light grid background
- Y-axis: momentum stages (+4 to -4) with emoji labels
- X-axis: time (quarters)
- Ground line: horizontal, green (#22c55e), subtle glow, "GROUND LINE" label
- Zone labels: "ABOVE GROUND" / "BELOW GROUND" in vertical text, very faint
- Today marker: dashed green vertical line

#### Trajectory paths (SVG)
- One curved path per objective, connecting signal points over time
- Colour matches the objective's assigned colour
- Above-ground paths: solid, 2-2.5px stroke
- Below-ground paths: dashed, reduced opacity
- Buried paths: fade out at termination point

#### Emoji nodes (DOM)
- Positioned at each signal point along the path
- Circular white background with coloured border matching stage
- Emoji inside at ~1.1rem
- Hover: scales 1.3×, elevated shadow
- Click: opens tooltip

#### Tooltip
- Appears on node hover
- Contains: emoji + objective name, stage badge, Boardroom Allegory caption, latest signal text with source/date, "View full evidence record →" link
- Smart positioning to avoid canvas edges

#### Crossing markers
- Pulsing red dot at ground-line crossing points
- Compact label: "⚠ Crossing Q3 '24"
- Hover: shows brief editorial note

### Interaction states
1. **Default** — All paths at 30% opacity, all nodes visible
2. **Hover legend** — Target path full opacity, others dim to 10%. 300ms transition.
3. **Click legend** — Locks isolation. Click again to unlock.
4. **Hover node** — Tooltip appears. Node scales 1.3×.
5. **Click node** — Navigates to Evidence tab with signal pre-selected.
6. **Crossing event** — Pulsing red marker. Hover for editorial note.
7. **Zoom** — Scroll-wheel zooms time axis. Centres on cursor. Range: full dates to ~3 months. Pinch-zoom on trackpad.
8. **Pan** — Click-drag to pan. Momentum deceleration. Bounded to date range.

---

## 10. Objectives Tab

### Layout
- 2-column card grid
- Cards sorted by momentum (highest first)

### Objective card
- **Header:** OBJ number, title (Lora bold), subtitle, stage badge (emoji + name + score)
- **Score:** large number, right-aligned
- **Wink:** Boardroom Allegory caption (Lora italic, grey background strip)
- **Stats row:** signal count, evidence count, first stated date, last confirmed date
- **Momentum bar:** 4px, colour-coded gradient
- **Warning state:** amber border for Watch/Crawl, red border for Drag/Sink
- **Crossing note:** "⚠ Crossed ground line Q3 2024" in stats row for below-ground objectives

### Evidence drawer
- Click a card → expands inline, spanning both columns
- Shows full signal history: date, classification badge, excerpt, confidence score
- "✕ CLOSE" button top-right
- Scrollable if many entries

---

## 11. Buried Tab

### Layout
- Intro block: ⚰️ emoji, title, editorial description, entry count by manner
- 2-column card grid

### Buried card
- **Top colour bar** (3px) coded by exit manner:
  - Silent Drop: red (#ef4444)
  - Morphed: blue (#3b82f6)
  - Phased Out: amber (#f59e0b)
  - Transparent Exit: green (#22c55e)
- **Manner badge:** coloured chip (e.g. "Silent Drop" in red)
- **Coffin emoji** top-right
- **Title + dates on record** (e.g. "Oct 2023 → Q2 2024 · ~8 months")
- **Description:** what happened, in editorial voice
- **Wink:** the sharpest editorial writing on the site (Lora italic)
- **Transparency score:** label + visual bar

---

## 12. Evidence Tab

### Layout
- Filter pills by classification: All | Reinforced | Softened | Absent | Reframed | Stated | Achieved | Retired (covers both `retired_transparent` and `retired_silent` from the data model)
- Full-width table

### Table columns
| Column | Font | Notes |
|---|---|---|
| Date | IBM Plex Mono | Quarter or month format |
| Classification | IBM Plex Mono, coloured | Uppercase badge |
| Objective | DM Sans + emoji prefix | Clickable, links to Objectives tab |
| Excerpt | Lora italic | Key quote from the signal |
| Source | IBM Plex Mono | Source document name |
| Confidence | IBM Plex Mono | X/10 in grey badge |

### Features
- Sortable by date, classification, or objective
- "Load more" pagination (not infinite scroll)
- Clicking a row expands to show full agent reasoning

---

## 13. Mobile Design

### Breakpoint
- Below 768px: mobile layout activates

### Timeline tab on mobile
- Interactive canvas is replaced with a **vertical objective list**
- Sorted by momentum (highest first, descending through ground line to buried)
- Ground line appears as a horizontal divider in the list
- Each row: emoji, name, stage + signals, truncated wink caption, momentum bar
- Tap row to expand: full caption, latest signal, evidence link
- Banner at top: "For the full interactive timeline, visit on desktop."

### Other tabs on mobile
- Objectives: single-column card stack
- Buried: single-column card stack
- Evidence: horizontally scrollable table or card-based list
- All editorial content (captions, winks, verdicts) preserved at mobile widths

---

## 14. Ad Placement

### Slots
| Slot | Location | Format | Rules |
|---|---|---|---|
| Slot 1 | Landing sidebar, above signal feed | 300×250 or native text | Carbon Ads / EthicalAds |
| Slot 2 | Landing sidebar, inline with signals | Native text, matches signal format | Marked "Sponsored" |
| Slot 3 | Company page, below tab content | Full-width, low-profile banner | "Research powered by [Sponsor]" |

### Rules
- No ads inside the timeline canvas
- No ads that push content down on load
- No interstitials, no auto-play
- Maximum 2 visible ads per page at any scroll position
- All ads clearly labelled "Sponsored" or "Partner"
- Ad design uses the same typography and colour system

---

## 15. Dark Mode

- Light mode is the default
- Dark mode toggle in masthead (☀/🌙)
- Also respects system preference (`prefers-color-scheme: dark`) on first visit
- **Persistence:** User's manual choice stored via cookie (not localStorage) to prevent flash of wrong theme on SSR page loads. Next.js reads the cookie in middleware/layout to set the initial class. Falls back to system preference if no cookie is set.
- Token system ensures all components adapt via CSS variables
- Both modes use the same typography, layout, and interaction patterns
- **Exception:** Masthead and footer are always dark (`#0f172a`) regardless of theme mode

---

## 16. Loading, Error, and Empty States

### Loading states
- **Company page:** Skeleton loader matching the sticky header + tab bar layout. Pulsing grey blocks for content areas. No spinner.
- **Timeline canvas:** Light grid renders immediately. "Loading objectives..." text centred in canvas while data fetches. Nodes animate in on arrival (Framer Motion stagger).
- **Landing page:** Skeleton cards in the grid (3 per row, pulsing). Sector headers load first.

### Error states
- **404 — Unknown ticker:** Custom 404 page. "This company isn't tracked by Drift yet." with a link back to the landing page and a suggestion to check the ticker.
- **Network error:** Toast notification at top of page: "Unable to load data. Retrying..." with automatic retry (3 attempts, exponential backoff). Content area shows last cached state if available.
- **Agent error:** Visible only in admin UI. Company pages show "Last updated: [date]" which naturally communicates staleness.

### Empty states
- **No companies in database:** Landing page shows the hero, then a single centred message: "No companies tracked yet. Add one in the admin dashboard." (Only relevant during initial setup.)
- **No objectives for a company:** Objectives tab shows: "No objectives tracked yet for [Company]. Objectives are added after the first agent intake run."
- **No buried entries:** Buried tab shows: "No buried objectives. All commitments remain on record." (This is a positive state — style it accordingly.)
- **No evidence:** Evidence tab shows: "No signals recorded yet."
- **Timeline with one data point:** Single node renders at the correct position. No path drawn (a path needs ≥2 points). Ground line and axes still render normally.

---

## 17. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 + TypeScript |
| Styling | Tailwind CSS |
| Animation | Framer Motion (page transitions, node entrance/exit stagger, evidence drawer expand/collapse) + CSS transitions (hover states, opacity changes, tooltip show/hide, scale transforms) |
| Timeline pan/zoom | Lightweight library (panzoom or d3-zoom only) |
| Timeline paths | SVG, calculated in JS |
| Timeline nodes | DOM elements (divs with emoji) |
| Backend | Supabase (Postgres) — existing schema |
| Research agent | Python — existing agent.py, bi-weekly cron |
| Fonts | Google Fonts: DM Sans, Lora, IBM Plex Mono |

---

## 18. Agent Schedule

- Bi-weekly cron (every 2 weeks) — changed from v1's monthly schedule. This is a cron configuration change only; no schema modifications needed. The `last_research_run` timestamp on the companies table updates automatically.
- Iterates all companies where `tracking_active = true`
- Produces draft signals → admin review queue
- Company cards on landing page show "Last updated: [date]" from most recent agent run

---

## 19. Versioning

- Git repository initialized, v1 tagged as `v1.0.0`
- v2 development on `master` branch
- Semantic versioning: `MAJOR.MINOR.PATCH`
- `CHANGELOG.md` updated with each release
- Git tags for all releases
- `brand/SKILL.md` to be updated for v2 tokens, fonts, and motion rules (superseding v1 caffeine-era spec). This will be part of the implementation plan.

---

## 20. File Structure

```
drift-magazine/
├── CLAUDE.md                    # Updated for v2
├── CHANGELOG.md                 # New
├── docs/
│   ├── setup.md                 # Updated for Next.js
│   ├── revenue-model.html       # Existing
│   └── specs/
│       └── 2026-03-19-drift-v2-design.md  # This file
├── brand/                       # Updated for v2 tokens
│   ├── brand-language.html
│   └── colour-palette.html
├── backend/                     # Existing
│   ├── agent.py
│   ├── schema.sql
│   └── requirements.txt
├── frontend/                    # Next.js app
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── public/
│   └── src/
│       ├── app/
│       │   ├── layout.tsx       # Root layout, fonts, theme provider
│       │   ├── page.tsx         # Landing page
│       │   ├── company/
│       │   │   └── [ticker]/
│       │   │       └── page.tsx # Company page
│       │   ├── about/
│       │   │   └── page.tsx
│       │   └── admin/
│       │       └── page.tsx
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Masthead.tsx
│       │   │   ├── Footer.tsx
│       │   │   └── ThemeToggle.tsx
│       │   ├── landing/
│       │   │   ├── Hero.tsx
│       │   │   ├── CompanyGrid.tsx
│       │   │   ├── CompanyCard.tsx
│       │   │   ├── SectorGroup.tsx
│       │   │   ├── SearchBar.tsx
│       │   │   ├── SignalFeed.tsx
│       │   │   └── AdSlot.tsx
│       │   ├── company/
│       │   │   ├── CompanyHeader.tsx
│       │   │   ├── TabBar.tsx
│       │   │   ├── TimelineCanvas.tsx
│       │   │   ├── TimelineLegend.tsx
│       │   │   ├── TimelineNode.tsx
│       │   │   ├── TimelineTooltip.tsx
│       │   │   ├── CrossingMarker.tsx
│       │   │   ├── ObjectiveCard.tsx
│       │   │   ├── EvidenceDrawer.tsx
│       │   │   ├── BuriedCard.tsx
│       │   │   └── EvidenceTable.tsx
│       │   └── mobile/
│       │       └── MobileObjectiveList.tsx
│       ├── lib/
│       │   ├── supabase.ts
│       │   ├── types.ts
│       │   └── momentum.ts      # Stage definitions, colours, icons, captions
│       └── styles/
│           └── globals.css       # Tailwind base + CSS variables
└── v1-archive/                  # Snapshot of original HTML files
    ├── index.html
    ├── sandoz.html
    ├── admin.html
    └── timeline-concept.html
```
