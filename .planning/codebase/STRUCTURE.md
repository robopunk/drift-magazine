# Project Structure

## Root-Level Organization

```
drift-magazine/
├── frontend/              # Next.js 15 application (primary deliverable)
├── backend/               # Python research agent + SQL schema
├── brand/                 # Editorial standards and visual guides
├── docs/                  # Documentation and specifications
├── v1-archive/            # Original vanilla HTML/CSS/JS (reference only)
├── .planning/             # GSD project planning artifacts
├── CHANGELOG.md           # Version history
└── CLAUDE.md              # Project-level instructions and context
```

---

## Frontend Structure (`frontend/`)

### App Router Pages (`frontend/src/app/`)

```
app/
├── layout.tsx             # Root layout with Masthead, Footer, ThemeToggle
├── page.tsx               # Landing page (Hero, CompanyGrid, SearchBar, SignalFeed)
├── company/
│   └── [ticker]/
│       ├── page.tsx       # Dynamic company page (server component with server-side data fetch)
│       ├── client.tsx     # Client wrapper for interactive timeline canvas
│       └── layout.tsx     # Company page layout
├── about/
│   └── page.tsx           # About page
├── admin/
│   └── page.tsx           # Admin review interface (draft signals)
├── not-found.tsx          # Custom 404
├── error.tsx              # Error boundary
└── globals.css            # Global styles, CSS variables, Tailwind directives
```

**Key Pattern:** Dynamic company pages use server components for data fetching (Supabase queries), with client-side boundary at the interactive timeline canvas to preserve interactivity and minimize bundle size.

### Components (`frontend/src/components/`)

```
components/
├── layout/
│   ├── Masthead.tsx       # Header with logo and theme toggle
│   ├── Footer.tsx         # Footer (forced dark surface)
│   ├── ThemeToggle.tsx    # Light/dark mode switch
│   └── PageTransition.tsx # Framer Motion page transition wrapper
│
├── landing/
│   ├── Hero.tsx           # Above-the-fold hero section
│   ├── SearchBar.tsx      # Company search with real-time filtering
│   ├── CompanyCard.tsx    # Individual company grid card (objective count, momentum, accountability tier)
│   ├── CompanyGrid.tsx    # Responsive grid of company cards
│   ├── SignalFeed.tsx     # Recent signals feed (landing page sidebar)
│   └── AdSlot.tsx         # Carbon/EthicalAds placeholder
│
├── company/
│   ├── TimelineCanvas.tsx    # Interactive timeline container (Panzoom)
│   ├── TimelineNode.tsx      # SVG emoji node for momentum stage
│   ├── TimelinePath.tsx      # Spline path connecting nodes (with area fill)
│   ├── TimelineLegend.tsx    # Momentum scale legend
│   ├── TimelineLegendTooltip.tsx # Legend hover info
│   ├── TimelineTooltip.tsx   # Node hover info
│   ├── CrossingMarker.tsx    # Graveyard crossing event marker
│   ├── ObjectiveCard.tsx     # Active objective display with signals
│   ├── BuriedCard.tsx        # Graveyard entry card
│   ├── EvidenceTable.tsx     # Expandable signal details drawer
│   ├── TabBar.tsx            # Tabs: Objectives / Graveyard
│   └── MobileObjectiveList.tsx # Mobile-only stacked list view
│
├── mobile/
│   └── (responsive wrappers)
│
├── ui/
│   ├── Skeleton.tsx        # Loading placeholder
│   └── Toast.tsx           # Toast notification system
│
└── __tests__/
    └── (test files mirroring component structure)
```

**Key Pattern:** Component organization mirrors the information hierarchy — layout (chrome), landing (discovery), company (editorial canvas). Each component is self-contained with type definitions.

### Utilities & Types (`frontend/src/lib/`)

```
lib/
├── types.ts               # Core TypeScript interfaces (Company, Objective, Signal, MomentumStage)
├── momentum.ts            # Momentum scale definition (9 stages with emojis, colours, captions)
├── timeline-nodes.ts      # Helper functions for node positioning and animation
├── theme.ts               # Theme utilities (light/dark mode, colour helpers)
├── search.ts              # Client-side search filtering
├── supabase.ts            # Supabase client configuration
└── constants.ts           # Global constants (magic numbers, enums)
```

### Tests (`frontend/src/__tests__/`)

```
__tests__/
├── components/
│   ├── CompanyCard.test.tsx
│   ├── CompanyGrid.test.tsx
│   ├── TimelineCanvas.test.tsx
│   ├── TimelineNode.test.tsx
│   ├── ObjectiveCard.test.tsx
│   ├── BuriedCard.test.tsx
│   ├── EvidenceTable.test.tsx
│   ├── TabBar.test.tsx
│   └── (other component tests)
│
├── lib/
│   ├── momentum.test.ts
│   ├── timeline-nodes.test.ts
│   └── theme.test.ts
│
└── pages/
    └── company.test.tsx
```

**Note:** 99 tests across 21 files (as of latest commit). Tests use Vitest + React Testing Library with factory functions for mock data (`createMockCompany()`, `createMockObjective()`, etc.).

### Configuration Files

```
frontend/
├── package.json           # Dependencies, scripts (next dev, build, test)
├── tsconfig.json          # TypeScript configuration
├── next.config.ts         # Next.js config (redirects, image optimization)
├── tailwind.config.ts     # Tailwind CSS customization
├── tailwind.config.json   # (alternative config location)
├── vitest.config.ts       # Vitest test runner config
├── jest.setup.ts          # Jest setup file (for React Testing Library)
└── .env.local.example     # Environment variable template
```

---

## Backend Structure (`backend/`)

```
backend/
├── schema.sql             # Complete Supabase/Postgres schema
│                           # - Tables: companies, objectives, signals, agent_runs
│                           # - Views: v_company_summary, v_latest_signals, v_pending_review
│                           # - RLS policies, triggers, seed data (Sandoz)
│
└── agent.py               # Python research agent (bi-weekly runs)
                            # - Commands: --intake, --company-id, --review, --approve, --reject
                            # - Integration: Claude API + web search
```

**Key Pattern:** Agent writes draft signals only; all publication is human-reviewed. Audit trails maintained in database.

---

## Brand & Documentation Structure

### Brand (`brand/`)

```
brand/
├── brand-language.html    # Editorial standards document
│                           # - Voice rules (Economist + Vanity Fair tone)
│                           # - Classification system (objective status, signal types)
│                           # - Momentum scale nomenclature
│                           # - Graveyard exit types (Silent Drop, Morphed, etc.)
│                           # - Worked examples
│
└── colour-palette.html    # Interactive colour guide (v1 reference)
                            # Note: v2 palette defined in docs/specs/2026-03-19-drift-v2-design.md
```

### Docs (`docs/`)

```
docs/
├── setup.md               # Development setup guide
├── revenue-model.html     # Interactive financial projection
│
└── specs/
    └── 2026-03-19-drift-v2-design.md
                            # Canonical v2 design specification
                            # - Typography (DM Sans, Lora, IBM Plex Mono)
                            # - Colour palette (Emerald + Slate)
                            # - Component design rules
                            # - Motion and animation guidelines
                            # - Anti-slop rules (no generic AI aesthetics)
```

---

## Archive Structure (`v1-archive/`)

```
v1-archive/
├── sandoz.html            # v1 Sandoz example page
├── index.html             # v1 landing page
├── admin.html             # v1 admin interface
├── timeline-concept.html  # Timeline visual prototype
└── _archive-v1.html       # Consolidated v1 reference
```

**Purpose:** Reference only. v2 (current Next.js implementation) supersedes all v1 code. Archive retained for historical context and design precedent.

---

## Naming Conventions

### File Names
- **Components:** PascalCase (e.g., `TimelineCanvas.tsx`, `ObjectiveCard.tsx`)
- **Utilities:** camelCase (e.g., `momentum.ts`, `timeline-nodes.ts`)
- **Tests:** `[ComponentName].test.tsx` or `[utilityName].test.ts`
- **Styles:** Tailwind utilities only; no separate `.css` files for components

### Component Exports
- Default export for the component itself
- Named exports for sub-components (if any) and test helpers
- Example:
  ```typescript
  export default CompanyCard
  export { CompanyCardSkeleton } // Loading state variant
  ```

### Type Definitions
- Interfaces prefixed with capitalized component/module name (e.g., `CompanyCardProps`, `MomentumStage`)
- Defined in `types.ts` or co-located in component file for private types
- Database-derived types generated from Supabase schema (manual or ORM in future)

### Directory Naming
- **Plural** for collections (e.g., `components/`, `__tests__/`, `docs/`)
- **Singular** for feature areas (e.g., `app/company/` not `companies/`)

---

## Data Flow

### Frontend → Backend
1. Client requests company page at `/company/[ticker]`
2. Server component (Next.js) queries Supabase for company data, objectives, signals
3. Data passed to client components for interactive rendering
4. User interactions (drag timeline, expand drawer) remain client-side; no server round-trip needed

### Backend → Frontend
1. Python agent runs bi-weekly (cron)
2. Queries Supabase for all companies due for research
3. For each company: web search + Claude API → draft signals
4. Writes to `signals` table with `is_draft = true`
5. Human reviews in admin UI or CLI (`--review`, `--approve`)
6. Approved signals immediately visible on company page

---

## Build & Deployment

### Local Development
```bash
cd frontend && npm install && npm run dev    # Runs on http://localhost:3000
cd backend && python agent.py                 # Requires .env with API keys
```

### Production
- Frontend: Vercel (Next.js optimized deployment)
- Backend: Supabase (serverless Postgres)
- Agent: Cloud Run or similar (bi-weekly cron trigger)

### Key Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...              # Agent only
ANTHROPIC_API_KEY=...                 # Agent only
```

---

## Key Architectural Decisions

1. **Server components for data fetching** — reduces client bundle, enables server-side Supabase queries with RLS
2. **Client boundary at timeline canvas** — interactive Panzoom + D3-like coordinate math requires client-side rendering
3. **Tailwind + CSS variables** — maintains design consistency, supports theme toggle without JavaScript switching
4. **Agent outputs as drafts** — editorial judgment required; no automated publishing
5. **Single monorepo** — frontend, backend, brand docs, and agent all version-controlled together

