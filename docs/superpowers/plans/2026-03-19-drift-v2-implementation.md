# Drift v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Drift strategic accountability platform as a Next.js 15 app with emerald+slate design system, interactive timeline canvas, tabbed company pages, and magazine-style landing page.

**Architecture:** Next.js 15 App Router with TypeScript. Supabase client for data fetching. CSS variables for theming (light/dark via cookie). Framer Motion for page/component animations. DOM nodes + SVG paths + panzoom for the interactive timeline. All v1 HTML files archived to `v1-archive/`.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Framer Motion, @panzoom/panzoom, @supabase/supabase-js, Google Fonts (DM Sans, Lora, IBM Plex Mono), Vitest + React Testing Library

**Spec:** `docs/specs/2026-03-19-drift-v2-design.md`

---

## File Structure

```
frontend/                         # Next.js app root
  package.json
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  vitest.config.ts
  public/
  src/
    app/
      layout.tsx                  # Root layout: fonts, ThemeProvider, Masthead, Footer
      page.tsx                    # Landing page
      not-found.tsx               # Custom 404
      company/
        [ticker]/
          page.tsx                # Company page with tabs (server component)
          client.tsx              # Client wrapper for tab state and interactions
      about/
        page.tsx                  # About / Methodology
      admin/
        page.tsx                  # Admin dashboard (ported from v1)
    components/
      layout/
        Masthead.tsx              # Always-dark nav bar
        Footer.tsx                # Always-dark footer
        ThemeToggle.tsx           # Light/dark toggle with cookie persistence
      landing/
        Hero.tsx                  # Tagline, search CTA, description
        SearchBar.tsx             # Client-side search input
        CompanyGrid.tsx           # Sector-grouped grid container
        SectorGroup.tsx           # Collapsible sector section
        CompanyCard.tsx           # Individual company card
        SignalFeed.tsx            # Latest signals sidebar feed
        AdSlot.tsx                # Ad placement component
      company/
        CompanyHeader.tsx         # Sticky header: ticker, name, score, assessment
        TabBar.tsx                # Sticky tab navigation
        TimelineCanvas.tsx        # Main timeline: canvas + legend + toolbar
        TimelineLegend.tsx        # Sidebar legend with objective list
        TimelineNode.tsx          # Emoji node on canvas
        TimelineTooltip.tsx       # Hover tooltip for nodes
        TimelinePath.tsx          # SVG trajectory path for one objective
        CrossingMarker.tsx        # Pulsing red ground-line crossing marker
        ObjectiveCard.tsx         # Objective card for Objectives tab
        EvidenceDrawer.tsx        # Expandable evidence panel inside objective card
        BuriedCard.tsx            # Buried objective card
        EvidenceTable.tsx         # Full evidence table for Evidence tab
      mobile/
        MobileObjectiveList.tsx   # Mobile timeline replacement
      ui/
        Skeleton.tsx              # Skeleton loader primitives
        Toast.tsx                 # Error toast notification
    lib/
      supabase.ts                # Supabase client (shared, anon key)
      types.ts                   # TypeScript types matching DB schema
      momentum.ts                # Stage definitions, colours, icons, captions
      search.ts                  # Client-side search/filter logic
      theme.ts                   # Theme cookie read/write helpers
    styles/
      globals.css                # Tailwind directives + CSS custom properties (light/dark)
    __tests__/
      lib/
        momentum.test.ts
        search.test.ts
        theme.test.ts
      components/
        layout/
          ThemeToggle.test.tsx
        landing/
          CompanyCard.test.tsx
          SearchBar.test.tsx
        company/
          TabBar.test.tsx
          TimelineNode.test.tsx
          ObjectiveCard.test.tsx
          BuriedCard.test.tsx
          EvidenceTable.test.tsx
v1-archive/                       # Snapshot of original HTML files (moved from frontend/)
  index.html
  sandoz.html
  admin.html
  timeline-concept.html
  _archive-v1.html
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `frontend/package.json`, `frontend/next.config.ts`, `frontend/tailwind.config.ts`, `frontend/tsconfig.json`, `frontend/vitest.config.ts`, `frontend/src/styles/globals.css`
- Move: `frontend/*.html` to `v1-archive/`

- [ ] **Step 1: Archive v1 HTML files**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
mkdir -p v1-archive
mv frontend/index.html v1-archive/
mv frontend/sandoz.html v1-archive/
mv frontend/admin.html v1-archive/
mv frontend/timeline-concept.html v1-archive/
mv frontend/_archive-v1.html v1-archive/
```

- [ ] **Step 2: Initialize Next.js project**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

When prompted:
- Would you like to use Turbopack? **Yes**
- Would you like to customize the default import alias? **No**

- [ ] **Step 3: Install dependencies**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npm install framer-motion @supabase/supabase-js @panzoom/panzoom
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
// frontend/vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 5: Create test setup file**

```typescript
// frontend/src/test-setup.ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 6: Add test script to package.json**

In `frontend/package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Write globals.css with full CSS variable system**

Replace `frontend/src/styles/globals.css` (or `frontend/src/app/globals.css` depending on scaffolding) with the complete theme token system from spec Section 3:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
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

    /* Momentum spectrum */
    --momentum-orbit: #059669;
    --momentum-fly: #16a34a;
    --momentum-run: #65a30d;
    --momentum-walk: #ca8a04;
    --momentum-watch: #d97706;
    --momentum-crawl: #ea580c;
    --momentum-drag: #dc2626;
    --momentum-sink: #b91c1c;
    --momentum-buried: #78716c;

    /* Status semantic */
    --status-active: #22c55e;
    --status-watch: #d97706;
    --status-drifting: #ea580c;
    --status-dropped: #dc2626;
    --status-morphed: #3b82f6;

    /* Exit manner */
    --exit-silent: #ef4444;
    --exit-morphed: #3b82f6;
    --exit-phased: #f59e0b;
    --exit-transparent: #22c55e;

    /* Forced dark surfaces (masthead/footer) */
    --forced-dark-bg: #0f172a;
    --forced-dark-card: #1e293b;
    --forced-dark-text: #d1d5db;
    --forced-dark-accent: #34d399;
  }

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

  * {
    border-color: var(--border);
  }

  body {
    background-color: var(--background);
    color: var(--foreground);
  }
}
```

- [ ] **Step 8: Configure Tailwind for CSS variables and fonts**

Update `frontend/tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        border: "var(--border)",
        input: "var(--input)",
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        ring: "var(--ring)",
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
        momentum: {
          orbit: "var(--momentum-orbit)",
          fly: "var(--momentum-fly)",
          run: "var(--momentum-run)",
          walk: "var(--momentum-walk)",
          watch: "var(--momentum-watch)",
          crawl: "var(--momentum-crawl)",
          drag: "var(--momentum-drag)",
          sink: "var(--momentum-sink)",
          buried: "var(--momentum-buried)",
        },
        status: {
          active: "var(--status-active)",
          watch: "var(--status-watch)",
          drifting: "var(--status-drifting)",
          dropped: "var(--status-dropped)",
          morphed: "var(--status-morphed)",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
        serif: ["var(--font-lora)", "serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 9: Update next.config.ts**

```typescript
// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 10: Verify project builds**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 11: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add v1-archive/ frontend/ .gitignore
git commit -m "feat: scaffold Next.js 15 project, archive v1 HTML files

Initialize frontend/ with Next.js 15 + TypeScript + Tailwind CSS.
Full CSS variable system for light/dark themes. Vitest configured.
Original HTML files moved to v1-archive/."
```

---

## Task 2: Core Library Files

**Files:**
- Create: `frontend/src/lib/types.ts`, `frontend/src/lib/momentum.ts`, `frontend/src/lib/supabase.ts`, `frontend/src/lib/theme.ts`, `frontend/src/lib/search.ts`
- Test: `frontend/src/__tests__/lib/momentum.test.ts`, `frontend/src/__tests__/lib/search.test.ts`, `frontend/src/__tests__/lib/theme.test.ts`

### Task 2a: Types

- [ ] **Step 1: Create TypeScript types matching the DB schema**

```typescript
// frontend/src/lib/types.ts

export type SectorType =
  | "pharma" | "tech" | "energy" | "consumer" | "finance"
  | "industrials" | "healthcare" | "real_estate" | "telecom" | "other";

export type ObjectiveStatus =
  | "on_record" | "watch" | "drifting" | "achieved" | "dropped" | "morphed";

// Note: The DB stores "active" but the v2 schema uses "on_record".
// If the DB still uses the old enum, update schema.sql to rename it,
// or map on fetch: status === "active" ? "on_record" : status

export type SignalClassification =
  | "stated" | "reinforced" | "softened" | "reframed"
  | "absent" | "achieved" | "retired_transparent" | "retired_silent";

export type ExitManner =
  | "silent" | "phased" | "morphed" | "transparent" | "achieved";

export type TransparencyScore = "very_low" | "low" | "medium" | "high";

export type SourceType =
  | "annual_report" | "interim_results" | "earnings_call"
  | "investor_day" | "press_release" | "sec_filing" | "prospectus"
  | "conference_presentation" | "regulatory_filing" | "other";

export type MomentumStage =
  | "orbit" | "fly" | "run" | "walk" | "watch"
  | "crawl" | "drag" | "sink" | "buried";

export interface Company {
  id: string;
  name: string;
  ticker: string;
  exchange: string | null;
  sector: SectorType;
  initiative_name: string | null;
  initiative_subtitle: string | null;
  ir_page_url: string | null;
  overall_commitment_score: number | null;
  tracking_active: boolean;
  last_research_run: string | null;
  created_at: string;
}

export interface Objective {
  id: string;
  company_id: string;
  display_number: number;
  title: string;
  subtitle: string | null;
  original_quote: string | null;
  status: ObjectiveStatus;
  first_stated_date: string | null;
  last_confirmed_date: string | null;
  exit_date: string | null;
  exit_manner: ExitManner | null;
  transparency_score: TransparencyScore | null;
  verdict_text: string | null;
  successor_objective_id: string | null;
  momentum_score: number;
  is_in_graveyard: boolean;
}

export interface Signal {
  id: string;
  objective_id: string;
  company_id: string;
  signal_date: string;
  source_type: SourceType;
  source_name: string | null;
  source_url: string | null;
  classification: SignalClassification;
  confidence: number;
  excerpt: string | null;
  agent_reasoning: string | null;
  is_draft: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface AgentRun {
  id: string;
  company_id: string;
  triggered_by: string;
  status: string;
  signals_proposed: number;
  signals_approved: number;
  estimated_cost_usd: number | null;
  run_summary: string | null;
  created_at: string;
}

// View types for landing page
export interface CompanySummary extends Company {
  objectives: Objective[];
  active_count: number;
  drifting_count: number;
  buried_count: number;
  editorial_verdict: string | null;
}
```

### Task 2b: Momentum definitions

- [ ] **Step 2: Write failing test for momentum helpers**

```typescript
// frontend/src/__tests__/lib/momentum.test.ts
import { describe, it, expect } from "vitest";
import {
  STAGES,
  getStage,
  getStageColour,
  getStageEmoji,
  getStageCaption,
  scoreToStage,
} from "@/lib/momentum";

describe("momentum", () => {
  it("has exactly 9 stages from +4 to -4", () => {
    expect(STAGES).toHaveLength(9);
    expect(STAGES[0].score).toBe(4);
    expect(STAGES[8].score).toBe(-4);
  });

  it("getStage returns correct stage for name", () => {
    const fly = getStage("fly");
    expect(fly.score).toBe(3);
    expect(fly.emoji).toBe("\u{1F985}"); // eagle emoji
  });

  it("getStageColour returns hex colour", () => {
    expect(getStageColour("orbit")).toBe("#059669");
    expect(getStageColour("buried")).toBe("#78716c");
  });

  it("getStageEmoji returns emoji", () => {
    expect(getStageEmoji("watch")).toBe("\u{1F9CD}"); // standing person
  });

  it("getStageCaption returns Boardroom Allegory caption", () => {
    const caption = getStageCaption("buried");
    expect(caption).toContain("No eulogy was issued");
  });

  it("scoreToStage maps numeric score to stage name", () => {
    expect(scoreToStage(4)).toBe("orbit");
    expect(scoreToStage(0)).toBe("watch");
    expect(scoreToStage(-4)).toBe("buried");
  });

  it("scoreToStage clamps out-of-range scores", () => {
    expect(scoreToStage(5)).toBe("orbit");
    expect(scoreToStage(-5)).toBe("buried");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/lib/momentum.test.ts
```

Expected: FAIL — module `@/lib/momentum` not found.

- [ ] **Step 4: Implement momentum.ts**

```typescript
// frontend/src/lib/momentum.ts
import type { MomentumStage } from "./types";

export interface StageDefinition {
  name: MomentumStage;
  label: string;
  score: number;
  emoji: string;
  colour: string;
  cssVar: string;
  caption: string;
}

export const STAGES: StageDefinition[] = [
  {
    name: "orbit", label: "Orbit", score: 4,
    emoji: "\u{1F680}", colour: "#059669", cssVar: "--momentum-orbit",
    caption: "Exceeded their own ambition \u2014 and now must live up to the sequel",
  },
  {
    name: "fly", label: "Fly", score: 3,
    emoji: "\u{1F985}", colour: "#16a34a", cssVar: "--momentum-fly",
    caption: "Soaring \u2014 though altitude has a way of making the ground look optional",
  },
  {
    name: "run", label: "Run", score: 2,
    emoji: "\u{1F3C3}", colour: "#65a30d", cssVar: "--momentum-run",
    caption: "On pace, on message, on record \u2014 the rarest trifecta",
  },
  {
    name: "walk", label: "Walk", score: 1,
    emoji: "\u{1F6B6}", colour: "#ca8a04", cssVar: "--momentum-walk",
    caption: "Progressing steadily, which in corporate parlance means \u2018not yet panicking\u2019",
  },
  {
    name: "watch", label: "Watch", score: 0,
    emoji: "\u{1F9CD}", colour: "#d97706", cssVar: "--momentum-watch",
    caption: "Standing still \u2014 the silence before the language starts to soften",
  },
  {
    name: "crawl", label: "Crawl", score: -1,
    emoji: "\u{1F40C}", colour: "#ea580c", cssVar: "--momentum-crawl",
    caption: "The adjectives are getting vaguer and the timelines more flexible",
  },
  {
    name: "drag", label: "Drag", score: -2,
    emoji: "\u{1FAA8}", colour: "#dc2626", cssVar: "--momentum-drag",
    caption: "The objective remains, technically \u2014 like a painting no one has moved but everyone avoids",
  },
  {
    name: "sink", label: "Sink", score: -3,
    emoji: "\u{1F573}\u{FE0F}", colour: "#b91c1c", cssVar: "--momentum-sink",
    caption: "Entering graveyard territory \u2014 and the comms team hasn\u2019t noticed yet",
  },
  {
    name: "buried", label: "Buried", score: -4,
    emoji: "\u{26B0}\u{FE0F}", colour: "#78716c", cssVar: "--momentum-buried",
    caption: "Confirmed off the record. No eulogy was issued.",
  },
];

const stageByName = new Map(STAGES.map((s) => [s.name, s]));
const stageByScore = new Map(STAGES.map((s) => [s.score, s]));

export function getStage(name: MomentumStage): StageDefinition {
  return stageByName.get(name)!;
}

export function getStageColour(name: MomentumStage): string {
  return stageByName.get(name)!.colour;
}

export function getStageEmoji(name: MomentumStage): string {
  return stageByName.get(name)!.emoji;
}

export function getStageCaption(name: MomentumStage): string {
  return stageByName.get(name)!.caption;
}

export function scoreToStage(score: number): MomentumStage {
  const clamped = Math.max(-4, Math.min(4, score));
  const rounded = Math.round(clamped);
  return stageByScore.get(rounded)!.name;
}

export function formatQuarter(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  const year = String(d.getFullYear()).slice(-2);
  return `Q${q} '${year}`;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/lib/momentum.test.ts
```

Expected: All 7 tests PASS.

### Task 2c: Theme helpers

- [ ] **Step 6: Write failing test for theme helpers**

```typescript
// frontend/src/__tests__/lib/theme.test.ts
import { describe, it, expect } from "vitest";
import { THEME_COOKIE_NAME, resolveTheme } from "@/lib/theme";

describe("theme", () => {
  it("exports the cookie name constant", () => {
    expect(THEME_COOKIE_NAME).toBe("drift-theme");
  });

  it("resolveTheme returns cookie value when present", () => {
    expect(resolveTheme("dark", "light")).toBe("dark");
    expect(resolveTheme("light", "dark")).toBe("light");
  });

  it("resolveTheme falls back to system preference", () => {
    expect(resolveTheme(null, "dark")).toBe("dark");
    expect(resolveTheme(undefined, "light")).toBe("light");
  });

  it("resolveTheme defaults to light when no preference", () => {
    expect(resolveTheme(null, null)).toBe("light");
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/lib/theme.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 8: Implement theme.ts**

```typescript
// frontend/src/lib/theme.ts

export const THEME_COOKIE_NAME = "drift-theme";
export type Theme = "light" | "dark";

export function resolveTheme(
  cookieValue: string | null | undefined,
  systemPreference: string | null | undefined
): Theme {
  if (cookieValue === "dark" || cookieValue === "light") return cookieValue;
  if (systemPreference === "dark") return "dark";
  if (systemPreference === "light") return "light";
  return "light";
}

export function setThemeCookie(theme: Theme): void {
  document.cookie = `${THEME_COOKIE_NAME}=${theme};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
}
```

- [ ] **Step 9: Run test to verify it passes**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/lib/theme.test.ts
```

Expected: All 4 tests PASS.

### Task 2d: Search helpers

- [ ] **Step 10: Write failing test for search**

```typescript
// frontend/src/__tests__/lib/search.test.ts
import { describe, it, expect } from "vitest";
import { filterCompanies } from "@/lib/search";
import type { CompanySummary } from "@/lib/types";

const mockCompanies: Pick<CompanySummary, "name" | "ticker" | "exchange">[] = [
  { name: "Sandoz AG", ticker: "SDZ", exchange: "SIX" },
  { name: "Roche Holding", ticker: "ROG", exchange: "SIX" },
  { name: "BP plc", ticker: "BP", exchange: "LSE" },
];

describe("filterCompanies", () => {
  it("returns all when query is empty", () => {
    expect(filterCompanies(mockCompanies, "")).toHaveLength(3);
  });

  it("matches company name case-insensitively", () => {
    expect(filterCompanies(mockCompanies, "sandoz")).toHaveLength(1);
    expect(filterCompanies(mockCompanies, "SANDOZ")).toHaveLength(1);
  });

  it("matches ticker", () => {
    expect(filterCompanies(mockCompanies, "SDZ")).toHaveLength(1);
    expect(filterCompanies(mockCompanies, "sdz")).toHaveLength(1);
  });

  it("matches exchange", () => {
    expect(filterCompanies(mockCompanies, "SIX")).toHaveLength(2);
  });

  it("returns empty for no match", () => {
    expect(filterCompanies(mockCompanies, "MSFT")).toHaveLength(0);
  });
});
```

- [ ] **Step 11: Run test to verify it fails**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/lib/search.test.ts
```

Expected: FAIL.

- [ ] **Step 12: Implement search.ts**

```typescript
// frontend/src/lib/search.ts

interface Searchable {
  name: string;
  ticker: string;
  exchange: string | null;
}

export function filterCompanies<T extends Searchable>(
  companies: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return companies;
  return companies.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.ticker.toLowerCase().includes(q) ||
      (c.exchange && c.exchange.toLowerCase().includes(q))
  );
}
```

- [ ] **Step 13: Run test to verify it passes**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/lib/search.test.ts
```

Expected: All 5 tests PASS.

### Task 2e: Supabase client

- [ ] **Step 14: Create Supabase client**

```typescript
// frontend/src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 15: Create .env.example for frontend**

```
# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

- [ ] **Step 16: Run all lib tests**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/lib/
```

Expected: All tests PASS.

- [ ] **Step 17: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add frontend/src/lib/ frontend/src/__tests__/lib/ frontend/src/test-setup.ts frontend/.env.example
git commit -m "feat: add core library files — types, momentum, theme, search, supabase

TDD: 16 tests covering momentum stages, theme resolution, and
company search. TypeScript types match the existing DB schema."
```

---

## Task 3: Root Layout and Theme Provider

**Files:**
- Create: `frontend/src/app/layout.tsx`
- Modify: existing scaffolded layout

- [ ] **Step 1: Implement root layout with fonts and theme**

```tsx
// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import { DM_Sans, Lora, IBM_Plex_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { THEME_COOKIE_NAME } from "@/lib/theme";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Drift. | Strategic Accountability Research",
  description:
    "What companies commit to. What the record shows. What disappeared.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const isDark = themeCookie === "dark";

  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${lora.variable} ${ibmPlexMono.variable} ${isDark ? "dark" : ""}`}
    >
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Move globals.css to correct location**

If `create-next-app` placed `globals.css` in `src/app/globals.css`, keep it there and update the import. If it's in `src/styles/globals.css`, move the import in layout accordingly. Ensure the CSS variable definitions from Task 1 Step 7 are in the active globals file.

- [ ] **Step 3: Verify build**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add frontend/src/app/layout.tsx frontend/src/app/globals.css
git commit -m "feat: root layout with Google Fonts, theme cookie, dark class"
```

---

## Task 4: Layout Components — Masthead, Footer, ThemeToggle

**Files:**
- Create: `frontend/src/components/layout/Masthead.tsx`, `frontend/src/components/layout/Footer.tsx`, `frontend/src/components/layout/ThemeToggle.tsx`
- Test: `frontend/src/__tests__/components/layout/ThemeToggle.test.tsx`

- [ ] **Step 1: Write failing test for ThemeToggle**

```tsx
// frontend/src/__tests__/components/layout/ThemeToggle.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

describe("ThemeToggle", () => {
  it("renders a button", () => {
    render(<ThemeToggle initialTheme="light" />);
    expect(screen.getByRole("button", { name: /theme/i })).toBeInTheDocument();
  });

  it("toggles between light and dark icons on click", async () => {
    render(<ThemeToggle initialTheme="light" />);
    const button = screen.getByRole("button", { name: /theme/i });
    const initialText = button.textContent;
    await userEvent.click(button);
    expect(button.textContent).not.toBe(initialText);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/components/layout/ThemeToggle.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement ThemeToggle**

```tsx
// frontend/src/components/layout/ThemeToggle.tsx
"use client";

import { useState, useEffect } from "react";
import { setThemeCookie, type Theme } from "@/lib/theme";

interface ThemeToggleProps {
  initialTheme?: Theme;
}

export function ThemeToggle({ initialTheme }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(initialTheme ?? "light");

  useEffect(() => {
    // Sync with DOM if no initialTheme provided (e.g., in test)
    if (!initialTheme) {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    }
  }, [initialTheme]);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    setThemeCookie(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="text-lg p-1 hover:opacity-80 transition-opacity"
    >
      {theme === "light" ? "\u{2600}\u{FE0F}" : "\u{1F319}"}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/components/layout/ThemeToggle.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Implement Masthead**

Spec Section 6: Always dark (`#0f172a`), Logo "Drift." (Lora, white, period in `#34d399`), nav items in DM Sans, ThemeToggle, responsive hamburger.

```tsx
// frontend/src/components/layout/Masthead.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { label: "Companies", href: "/" },
  { label: "Sectors", href: "/#sectors" },
  { label: "Buried", href: "/#buried" },
  { label: "Methodology", href: "/about#methodology" },
  { label: "About", href: "/about" },
];

interface MastheadProps {
  initialTheme?: "light" | "dark";
}

export function Masthead({ initialTheme }: MastheadProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-[var(--forced-dark-bg)] text-[var(--forced-dark-text)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="font-serif text-xl font-bold text-white tracking-tight">
          Drift<span className="text-[var(--forced-dark-accent)]">.</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-sans text-[var(--forced-dark-text)] hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle initialTheme={initialTheme} />
        </nav>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle initialTheme={initialTheme} />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="text-[var(--forced-dark-text)] hover:text-white"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path d="M6 6l12 12M6 18L18 6" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-[var(--forced-dark-card)] px-4 pb-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-sm font-sans text-[var(--forced-dark-text)] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
```

- [ ] **Step 6: Implement Footer**

```tsx
// frontend/src/components/layout/Footer.tsx
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[var(--forced-dark-bg)] text-[var(--forced-dark-text)] border-t border-[var(--forced-dark-card)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/" className="font-serif text-lg font-bold text-white tracking-tight">
          Drift<span className="text-[var(--forced-dark-accent)]">.</span>
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link href="/" className="hover:text-white transition-colors">Companies</Link>
          <Link href="/about" className="hover:text-white transition-colors">About</Link>
          <Link href="/about#methodology" className="hover:text-white transition-colors">Methodology</Link>
        </nav>
        <p className="text-xs text-[var(--muted-foreground)]">
          &copy; {new Date().getFullYear()} Drift. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 7: Add Masthead and Footer to root layout**

Update `frontend/src/app/layout.tsx` body contents:

```tsx
<body className="font-sans antialiased bg-background text-foreground min-h-screen flex flex-col">
  <Masthead initialTheme={isDark ? "dark" : "light"} />
  <main className="flex-1">{children}</main>
  <Footer />
</body>
```

Add imports for `Masthead` and `Footer`.

- [ ] **Step 8: Verify build**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npm run build
```

Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add frontend/src/components/layout/ frontend/src/__tests__/components/layout/ frontend/src/app/layout.tsx
git commit -m "feat: Masthead, Footer, ThemeToggle — always-dark layout shell

Masthead: forced dark bg, Drift. logo, nav links, responsive hamburger.
Footer: matching dark treatment. ThemeToggle: cookie-persisted light/dark."
```

---

## Task 5: Landing Page — Hero, SearchBar, AdSlot

**Files:**
- Create: `frontend/src/components/landing/Hero.tsx`, `frontend/src/components/landing/SearchBar.tsx`, `frontend/src/components/landing/AdSlot.tsx`
- Test: `frontend/src/__tests__/components/landing/SearchBar.test.tsx`

- [ ] **Step 1: Write failing test for SearchBar**

```tsx
// frontend/src/__tests__/components/landing/SearchBar.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "@/components/landing/SearchBar";

describe("SearchBar", () => {
  it("renders search input with placeholder", () => {
    render(<SearchBar value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/search companies/i)).toBeInTheDocument();
  });

  it("calls onChange with input value", async () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole("searchbox"), "SDZ");
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/components/landing/SearchBar.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement SearchBar**

```tsx
// frontend/src/components/landing/SearchBar.tsx
"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative w-full max-w-md">
      <input
        type="search"
        role="searchbox"
        placeholder="Search companies, tickers, exchanges..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 pl-10 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-sans text-sm"
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/components/landing/SearchBar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Implement Hero**

```tsx
// frontend/src/components/landing/Hero.tsx
import { SearchBar } from "./SearchBar";

interface HeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Hero({ searchQuery, onSearchChange }: HeroProps) {
  return (
    <section className="py-16 sm:py-20 px-4 text-center">
      <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
        What companies commit to.{" "}
        <span className="italic text-primary">What the record shows.</span>
      </h1>
      <p className="mt-4 text-muted-foreground font-sans text-base sm:text-lg max-w-2xl mx-auto">
        Drift tracks the language of corporate commitment — and the silence that follows when it fades.
      </p>
      <div className="mt-8 flex justify-center">
        <SearchBar value={searchQuery} onChange={onSearchChange} />
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Implement AdSlot**

```tsx
// frontend/src/components/landing/AdSlot.tsx

interface AdSlotProps {
  slot: 1 | 2 | 3;
  className?: string;
}

export function AdSlot({ slot, className = "" }: AdSlotProps) {
  return (
    <div
      className={`border border-dashed border-border rounded-lg p-4 text-center ${className}`}
      data-ad-slot={slot}
    >
      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
        Sponsored
      </p>
      {/* Ad network script (Carbon Ads / EthicalAds) will be injected here */}
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add frontend/src/components/landing/Hero.tsx frontend/src/components/landing/SearchBar.tsx frontend/src/components/landing/AdSlot.tsx frontend/src/__tests__/components/landing/
git commit -m "feat: Hero, SearchBar, AdSlot components for landing page"
```

---

## Task 6: Landing Page — CompanyCard, SectorGroup, CompanyGrid, SignalFeed

**Files:**
- Create: `frontend/src/components/landing/CompanyCard.tsx`, `frontend/src/components/landing/SectorGroup.tsx`, `frontend/src/components/landing/CompanyGrid.tsx`, `frontend/src/components/landing/SignalFeed.tsx`
- Test: `frontend/src/__tests__/components/landing/CompanyCard.test.tsx`

- [ ] **Step 1: Write failing test for CompanyCard**

```tsx
// frontend/src/__tests__/components/landing/CompanyCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompanyCard } from "@/components/landing/CompanyCard";
import type { CompanySummary } from "@/lib/types";

const mockCompany: CompanySummary = {
  id: "1",
  name: "Sandoz AG",
  ticker: "SDZ",
  exchange: "SIX",
  sector: "pharma",
  initiative_name: "The Golden Decade",
  initiative_subtitle: null,
  ir_page_url: null,
  overall_commitment_score: 72,
  tracking_active: true,
  last_research_run: "2026-03-01",
  created_at: "2025-01-01",
  objectives: [],
  active_count: 4,
  drifting_count: 1,
  buried_count: 3,
  editorial_verdict: "On pace, but the cracks are showing in the margin story.",
};

describe("CompanyCard", () => {
  it("renders company name and ticker", () => {
    render(<CompanyCard company={mockCompany} />);
    expect(screen.getByText("Sandoz AG")).toBeInTheDocument();
    expect(screen.getByText("SDZ")).toBeInTheDocument();
  });

  it("shows editorial verdict", () => {
    render(<CompanyCard company={mockCompany} />);
    expect(screen.getByText(/cracks are showing/)).toBeInTheDocument();
  });

  it("displays buried count", () => {
    render(<CompanyCard company={mockCompany} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("links to company page", () => {
    render(<CompanyCard company={mockCompany} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/company/sdz");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/components/landing/CompanyCard.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement CompanyCard**

```tsx
// frontend/src/components/landing/CompanyCard.tsx
import Link from "next/link";
import type { CompanySummary } from "@/lib/types";
import { scoreToStage, getStageEmoji } from "@/lib/momentum";

interface CompanyCardProps {
  company: CompanySummary;
}

export function CompanyCard({ company }: CompanyCardProps) {
  // Map 0-100 commitment score to -4..+4 momentum range
  // 0=Buried(-4), 50=Watch(0), 100=Orbit(+4)
  const topStage = company.overall_commitment_score != null
    ? scoreToStage(Math.round((company.overall_commitment_score / 100) * 8 - 4))
    : "watch";

  return (
    <Link
      href={`/company/${company.ticker.toLowerCase()}`}
      className="block bg-card border border-border rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
          {company.ticker}
        </span>
        <span className="text-lg" title={topStage}>
          {getStageEmoji(topStage)}
        </span>
      </div>

      <h3 className="font-serif font-bold text-card-foreground text-base leading-snug">
        {company.name}
      </h3>

      {company.editorial_verdict && (
        <p className="mt-1.5 text-sm font-serif italic text-muted-foreground leading-relaxed line-clamp-2">
          {company.editorial_verdict}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs font-mono text-muted-foreground">
        <span>{company.active_count} active</span>
        {company.drifting_count > 0 && (
          <span className="text-status-drifting">{company.drifting_count} drifting</span>
        )}
        {company.buried_count > 0 && (
          <span className="text-status-dropped">{company.buried_count} buried</span>
        )}
      </div>

      {company.overall_commitment_score != null && (
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${company.overall_commitment_score}%` }}
          />
        </div>
      )}
    </Link>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/components/landing/CompanyCard.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Implement SectorGroup**

```tsx
// frontend/src/components/landing/SectorGroup.tsx
"use client";

import { useState } from "react";
import type { CompanySummary, SectorType } from "@/lib/types";
import { CompanyCard } from "./CompanyCard";

const SECTOR_LABELS: Record<SectorType, string> = {
  pharma: "Pharma",
  tech: "Technology",
  energy: "Energy",
  consumer: "Consumer",
  finance: "Finance",
  industrials: "Industrials",
  healthcare: "Healthcare",
  real_estate: "Real Estate",
  telecom: "Telecom",
  other: "Other",
};

interface SectorGroupProps {
  sector: SectorType;
  companies: CompanySummary[];
}

export function SectorGroup({ sector, companies }: SectorGroupProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section id={`sector-${sector}`} className="mb-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-4 group"
      >
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {SECTOR_LABELS[sector]}
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          ({companies.length})
        </span>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 6: Implement CompanyGrid**

```tsx
// frontend/src/components/landing/CompanyGrid.tsx
"use client";

import { useState, useMemo } from "react";
import type { CompanySummary, SectorType } from "@/lib/types";
import { filterCompanies } from "@/lib/search";
import { SectorGroup } from "./SectorGroup";
import { Hero } from "./Hero";

interface CompanyGridProps {
  companies: CompanySummary[];
}

const SECTOR_ORDER: SectorType[] = [
  "pharma", "energy", "tech", "consumer", "finance",
  "industrials", "healthcare", "real_estate", "telecom", "other",
];

export function CompanyGrid({ companies }: CompanyGridProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => filterCompanies(companies, query),
    [companies, query]
  );

  const grouped = useMemo(() => {
    const map = new Map<SectorType, CompanySummary[]>();
    for (const c of filtered) {
      const list = map.get(c.sector) || [];
      list.push(c);
      map.set(c.sector, list);
    }
    return SECTOR_ORDER.filter((s) => map.has(s)).map((s) => ({
      sector: s,
      companies: map.get(s)!,
    }));
  }, [filtered]);

  return (
    <>
      <Hero searchQuery={query} onSearchChange={setQuery} />
      <div id="sectors" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {grouped.length === 0 ? (
          <p className="text-center text-muted-foreground font-sans py-12">
            No companies match your search.
          </p>
        ) : (
          grouped.map(({ sector, companies: sectorCompanies }) => (
            <SectorGroup key={sector} sector={sector} companies={sectorCompanies} />
          ))
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 7: Implement SignalFeed**

```tsx
// frontend/src/components/landing/SignalFeed.tsx
import type { Signal } from "@/lib/types";

interface SignalFeedProps {
  signals: Signal[];
}

const CLASSIFICATION_COLOURS: Record<string, string> = {
  reinforced: "text-status-active",
  stated: "text-status-active",
  softened: "text-status-watch",
  reframed: "text-status-morphed",
  absent: "text-status-dropped",
  achieved: "text-status-active",
  retired_transparent: "text-muted-foreground",
  retired_silent: "text-status-dropped",
};

export function SignalFeed({ signals }: SignalFeedProps) {
  if (signals.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Latest Signals
      </h3>
      <div className="space-y-3">
        {signals.slice(0, 8).map((signal) => (
          <div key={signal.id} className="text-sm">
            <span className={`font-mono text-xs uppercase ${CLASSIFICATION_COLOURS[signal.classification] ?? "text-muted-foreground"}`}>
              {signal.classification.replace("_", " ")}
            </span>
            {signal.excerpt && (
              <p className="font-serif italic text-muted-foreground text-xs mt-0.5 line-clamp-2">
                {signal.excerpt}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add frontend/src/components/landing/ frontend/src/__tests__/components/landing/
git commit -m "feat: landing page components — CompanyCard, SectorGroup, CompanyGrid, SignalFeed

Sector-grouped company grid with client-side search filtering.
CompanyCard shows ticker, editorial verdict, momentum bar.
SignalFeed for sidebar latest signals."
```

---

## Task 7: Landing Page Assembly

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Implement landing page with Supabase data fetching**

```tsx
// frontend/src/app/page.tsx
import { supabase } from "@/lib/supabase";
import { CompanyGrid } from "@/components/landing/CompanyGrid";
import { SignalFeed } from "@/components/landing/SignalFeed";
import { AdSlot } from "@/components/landing/AdSlot";
import type { CompanySummary, Signal } from "@/lib/types";

async function getCompanies(): Promise<CompanySummary[]> {
  const { data, error } = await supabase
    .from("v_company_summary")
    .select("*")
    .eq("tracking_active", true)
    .order("name");

  if (error) {
    console.error("Failed to fetch companies:", error);
    return [];
  }
  return data ?? [];
}

async function getLatestSignals(): Promise<Signal[]> {
  const { data, error } = await supabase
    .from("v_latest_signals")
    .select("*")
    .eq("is_draft", false)
    .order("signal_date", { ascending: false })
    .limit(8);

  if (error) {
    console.error("Failed to fetch signals:", error);
    return [];
  }
  return data ?? [];
}

export default async function LandingPage() {
  const [companies, signals] = await Promise.all([
    getCompanies(),
    getLatestSignals(),
  ]);

  return (
    <div className="flex flex-col lg:flex-row max-w-7xl mx-auto">
      {/* Main content — 2/3 */}
      <div className="flex-1 min-w-0">
        {companies.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground font-sans">
              No companies tracked yet. Add one in the admin dashboard.
            </p>
          </div>
        ) : (
          <CompanyGrid companies={companies} />
        )}
      </div>

      {/* Sidebar — 1/3 */}
      <aside className="w-full lg:w-80 lg:ml-8 px-4 lg:px-0 py-8 lg:py-16 space-y-6 shrink-0">
        <AdSlot slot={1} />
        <SignalFeed signals={signals} />
        <AdSlot slot={2} />
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            How It Works
          </h3>
          <ol className="space-y-2 text-sm font-sans text-muted-foreground">
            <li><strong className="text-foreground">1.</strong> We read what companies publicly commit to.</li>
            <li><strong className="text-foreground">2.</strong> Our research agent monitors how the language changes.</li>
            <li><strong className="text-foreground">3.</strong> Drift tracks when commitments weaken, vanish, or are buried.</li>
          </ol>
        </div>
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npm run build
```

Expected: Build succeeds (Supabase calls will fail at runtime without env vars, but build should succeed).

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add frontend/src/app/page.tsx
git commit -m "feat: assemble landing page with Supabase data fetching

Server-side fetch from v_company_summary and v_latest_signals.
Sidebar with ad slots, signal feed, how-it-works. Empty state handled."
```

---

## Task 8: Company Page — Header and TabBar

**Files:**
- Create: `frontend/src/app/company/[ticker]/page.tsx`, `frontend/src/components/company/CompanyHeader.tsx`, `frontend/src/components/company/TabBar.tsx`
- Test: `frontend/src/__tests__/components/company/TabBar.test.tsx`

- [ ] **Step 1: Write failing test for TabBar**

```tsx
// frontend/src/__tests__/components/company/TabBar.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TabBar } from "@/components/company/TabBar";

describe("TabBar", () => {
  const counts = { objectives: 6, buried: 3, evidence: 42 };

  it("renders all four tab labels", () => {
    render(<TabBar activeTab="timeline" onTabChange={() => {}} counts={counts} />);
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText(/Objectives/)).toBeInTheDocument();
    expect(screen.getByText(/Buried/)).toBeInTheDocument();
    expect(screen.getByText(/Evidence/)).toBeInTheDocument();
  });

  it("shows counts next to tab labels", () => {
    render(<TabBar activeTab="timeline" onTabChange={() => {}} counts={counts} />);
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("calls onTabChange when clicking a tab", async () => {
    const onTabChange = vi.fn();
    render(<TabBar activeTab="timeline" onTabChange={onTabChange} counts={counts} />);
    await userEvent.click(screen.getByText(/Objectives/));
    expect(onTabChange).toHaveBeenCalledWith("objectives");
  });

  it("marks active tab with green underline class", () => {
    render(<TabBar activeTab="buried" onTabChange={() => {}} counts={counts} />);
    const buriedTab = screen.getByText(/Buried/).closest("button");
    expect(buriedTab?.className).toContain("border-primary");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/components/company/TabBar.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement TabBar**

```tsx
// frontend/src/components/company/TabBar.tsx
"use client";

export type TabId = "timeline" | "objectives" | "buried" | "evidence";

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  counts: {
    objectives: number;
    buried: number;
    evidence: number;
  };
}

const TABS: { id: TabId; label: string; countKey?: keyof TabBarProps["counts"] }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "objectives", label: "Objectives", countKey: "objectives" },
  { id: "buried", label: "Buried", countKey: "buried" },
  { id: "evidence", label: "Evidence", countKey: "evidence" },
];

export function TabBar({ activeTab, onTabChange, counts }: TabBarProps) {
  return (
    <div className="border-b border-border sticky top-14 z-40 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-0">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tab.countKey ? counts[tab.countKey] : undefined;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-3 text-sm font-sans font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {count != null && (
                <span
                  className={`ml-1.5 text-xs font-mono px-1.5 py-0.5 rounded-full ${
                    tab.id === "buried" && count > 0
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/components/company/TabBar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Implement CompanyHeader**

```tsx
// frontend/src/components/company/CompanyHeader.tsx
import type { Company } from "@/lib/types";

interface CompanyHeaderProps {
  company: Company;
  editorialAssessment: string | null;
}

export function CompanyHeader({ company, editorialAssessment }: CompanyHeaderProps) {
  return (
    <div className="sticky top-14 z-30 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
                {company.ticker}
              </span>
              {company.exchange && (
                <span className="font-mono text-xs text-muted-foreground">
                  {company.exchange}
                </span>
              )}
            </div>
            <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-foreground">
              {company.name}
            </h1>
            {company.initiative_name && (
              <p className="font-serif italic text-muted-foreground text-sm mt-0.5">
                {company.initiative_name}
                {company.initiative_subtitle && ` — ${company.initiative_subtitle}`}
              </p>
            )}
          </div>

          {company.overall_commitment_score != null && (
            <div className="text-right shrink-0">
              <div className="text-4xl font-serif font-bold text-foreground">
                {company.overall_commitment_score}
              </div>
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                / 100
              </div>
            </div>
          )}
        </div>

        {editorialAssessment && (
          <div className="mt-4 p-3 border border-primary/20 rounded-lg bg-primary/5">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
              Editorial Assessment
            </span>
            <p className="mt-1 font-serif text-sm text-foreground leading-relaxed">
              {editorialAssessment}
            </p>
          </div>
        )}

        {company.last_research_run && (
          <p className="mt-2 text-xs font-mono text-muted-foreground">
            Last updated: {new Date(company.last_research_run).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Implement company page shell**

```tsx
// frontend/src/app/company/[ticker]/page.tsx
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Company, Objective, Signal } from "@/lib/types";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { CompanyPageClient } from "./client";

interface Props {
  params: Promise<{ ticker: string }>;
}

async function getCompanyByTicker(ticker: string): Promise<Company | null> {
  const { data } = await supabase
    .from("companies")
    .select("*")
    .ilike("ticker", ticker)
    .single();
  return data;
}

async function getObjectives(companyId: string): Promise<Objective[]> {
  const { data } = await supabase
    .from("objectives")
    .select("*")
    .eq("company_id", companyId)
    .order("momentum_score", { ascending: false });
  return data ?? [];
}

async function getSignals(companyId: string): Promise<Signal[]> {
  const { data } = await supabase
    .from("signals")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_draft", false)
    .order("signal_date", { ascending: false });
  return data ?? [];
}

export default async function CompanyPage({ params }: Props) {
  const { ticker } = await params;
  const company = await getCompanyByTicker(ticker);

  if (!company) notFound();

  const [objectives, signals] = await Promise.all([
    getObjectives(company.id),
    getSignals(company.id),
  ]);

  const buried = objectives.filter((o) => o.is_in_graveyard);
  const active = objectives.filter((o) => !o.is_in_graveyard);

  return (
    <>
      <CompanyHeader
        company={company}
        editorialAssessment={null /* populated from editorial content later */}
      />
      <CompanyPageClient
        company={company}
        objectives={objectives}
        activeObjectives={active}
        buriedObjectives={buried}
        signals={signals}
      />
    </>
  );
}
```

- [ ] **Step 7: Create client wrapper for tabs**

```tsx
// frontend/src/app/company/[ticker]/client.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Company, Objective, Signal } from "@/lib/types";
import { TabBar, type TabId } from "@/components/company/TabBar";
import { AdSlot } from "@/components/landing/AdSlot";

interface CompanyPageClientProps {
  company: Company;
  objectives: Objective[];
  activeObjectives: Objective[];
  buriedObjectives: Objective[];
  signals: Signal[];
}

export function CompanyPageClient({
  company,
  objectives,
  activeObjectives,
  buriedObjectives,
  signals,
}: CompanyPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as TabId) || "timeline";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    const url = tab === "timeline"
      ? `/company/${company.ticker.toLowerCase()}`
      : `/company/${company.ticker.toLowerCase()}?tab=${tab}`;
    router.replace(url, { scroll: false });
  }

  return (
    <>
      <TabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={{
          objectives: activeObjectives.length,
          buried: buriedObjectives.length,
          evidence: signals.length,
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "timeline" && (
          <div className="text-center py-20 text-muted-foreground font-sans">
            Timeline canvas — implemented in Task 10.
          </div>
        )}
        {activeTab === "objectives" && (
          <div className="text-center py-20 text-muted-foreground font-sans">
            Objectives tab — implemented in Task 11.
          </div>
        )}
        {activeTab === "buried" && (
          <div className="text-center py-20 text-muted-foreground font-sans">
            Buried tab — implemented in Task 12.
          </div>
        )}
        {activeTab === "evidence" && (
          <div className="text-center py-20 text-muted-foreground font-sans">
            Evidence tab — implemented in Task 13.
          </div>
        )}
      </div>
      <AdSlot slot={3} className="max-w-7xl mx-auto px-4 mb-8" />
    </>
  );
}
```

- [ ] **Step 8: Create custom 404 page**

```tsx
// frontend/src/app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <h1 className="font-serif text-3xl font-bold text-foreground">
        Company Not Found
      </h1>
      <p className="mt-4 font-sans text-muted-foreground">
        This company isn&apos;t tracked by Drift yet. Please check the ticker and try again.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg font-sans text-sm hover:opacity-90 transition-opacity"
      >
        Browse All Companies
      </Link>
    </div>
  );
}
```

- [ ] **Step 9: Verify build**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npm run build
```

Expected: Build succeeds.

- [ ] **Step 10: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add frontend/src/app/company/ frontend/src/app/not-found.tsx frontend/src/components/company/CompanyHeader.tsx frontend/src/components/company/TabBar.tsx frontend/src/__tests__/components/company/
git commit -m "feat: company page shell — header, tab bar, routing, 404

Sticky company header with ticker/score/assessment. Tab bar with
URL-synced navigation. Custom 404 for unknown tickers. Tab content
placeholders ready for timeline/objectives/buried/evidence."
```

---

## Task 9: Skeleton and Toast UI Primitives

**Files:**
- Create: `frontend/src/components/ui/Skeleton.tsx`, `frontend/src/components/ui/Toast.tsx`

- [ ] **Step 1: Implement Skeleton**

```tsx
// frontend/src/components/ui/Skeleton.tsx
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-muted ${className}`}
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 2: Implement Toast**

```tsx
// frontend/src/components/ui/Toast.tsx
"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "error" | "info";
  onDismiss: () => void;
}

export function Toast({ message, type = "error", onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-sans ${
        type === "error"
          ? "bg-destructive text-destructive-foreground"
          : "bg-card text-card-foreground border border-border"
      }`}
      role="alert"
    >
      {message}
      <button onClick={onDismiss} className="ml-3 font-bold opacity-70 hover:opacity-100">
        &times;
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create loading.tsx for landing page skeleton**

```tsx
// frontend/src/app/loading.tsx
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Hero skeleton */}
      <div className="text-center mb-12">
        <Skeleton className="h-10 w-96 mx-auto mb-4" />
        <Skeleton className="h-5 w-64 mx-auto mb-8" />
        <Skeleton className="h-10 w-80 mx-auto rounded-lg" />
      </div>
      {/* Grid skeleton */}
      <Skeleton className="h-5 w-32 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create loading.tsx for company page skeleton**

```tsx
// frontend/src/app/company/[ticker]/loading.tsx
import { Skeleton } from "@/components/ui/Skeleton";

export default function CompanyLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header skeleton */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Skeleton className="h-6 w-16 mb-2 rounded" />
          <Skeleton className="h-8 w-64 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-12 w-16" />
      </div>
      {/* Tab bar skeleton */}
      <div className="flex gap-4 border-b border-border mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 mb-2" />
        ))}
      </div>
      {/* Content skeleton */}
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add frontend/src/components/ui/ frontend/src/app/loading.tsx frontend/src/app/company/
git commit -m "feat: Skeleton and Toast UI primitives, loading states for pages

Skeleton loaders for landing page and company page matching spec
Section 16. Toast for network errors with auto-dismiss."
```

---

## Task 10: Timeline Canvas (Centrepiece)

This is the most complex component. It has 5 sub-components: TimelineCanvas (orchestrator), TimelineLegend, TimelineNode, TimelinePath, TimelineTooltip, CrossingMarker.

**Files:**
- Create: `frontend/src/components/company/TimelineCanvas.tsx`, `frontend/src/components/company/TimelineLegend.tsx`, `frontend/src/components/company/TimelineNode.tsx`, `frontend/src/components/company/TimelinePath.tsx`, `frontend/src/components/company/TimelineTooltip.tsx`, `frontend/src/components/company/CrossingMarker.tsx`
- Test: `frontend/src/__tests__/components/company/TimelineNode.test.tsx`

- [ ] **Step 1: Write failing test for TimelineNode**

```tsx
// frontend/src/__tests__/components/company/TimelineNode.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineNode } from "@/components/company/TimelineNode";

describe("TimelineNode", () => {
  const props = {
    emoji: "\u{1F680}",
    colour: "#059669",
    x: 100,
    y: 50,
    label: "Global Biosimilar Leadership",
    onHover: vi.fn(),
    onLeave: vi.fn(),
    onClick: vi.fn(),
  };

  it("renders the emoji", () => {
    render(<TimelineNode {...props} />);
    expect(screen.getByText("\u{1F680}")).toBeInTheDocument();
  });

  it("calls onHover on mouseenter", async () => {
    render(<TimelineNode {...props} />);
    await userEvent.hover(screen.getByText("\u{1F680}"));
    expect(props.onHover).toHaveBeenCalled();
  });

  it("calls onClick on click", async () => {
    render(<TimelineNode {...props} />);
    await userEvent.click(screen.getByText("\u{1F680}"));
    expect(props.onClick).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/components/company/TimelineNode.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement TimelineNode**

```tsx
// frontend/src/components/company/TimelineNode.tsx
"use client";

interface TimelineNodeProps {
  emoji: string;
  colour: string;
  x: number;
  y: number;
  label: string;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}

export function TimelineNode({
  emoji,
  colour,
  x,
  y,
  label,
  onHover,
  onLeave,
  onClick,
}: TimelineNodeProps) {
  return (
    <div
      className="absolute flex items-center justify-center w-9 h-9 rounded-full bg-card border-2 cursor-pointer hover:scale-[1.3] hover:shadow-lg transition-all duration-200 select-none"
      style={{
        left: x,
        top: y,
        borderColor: colour,
        transform: "translate(-50%, -50%)",
      }}
      title={label}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <span className="text-[1.1rem] leading-none">{emoji}</span>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/components/company/TimelineNode.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Implement TimelineTooltip**

```tsx
// frontend/src/components/company/TimelineTooltip.tsx
"use client";

import type { MomentumStage } from "@/lib/types";
import { getStage } from "@/lib/momentum";

interface TimelineTooltipProps {
  objectiveName: string;
  stage: MomentumStage;
  latestSignalText: string | null;
  latestSignalSource: string | null;
  latestSignalDate: string | null;
  x: number;
  y: number;
  canvasWidth: number;
}

export function TimelineTooltip({
  objectiveName,
  stage,
  latestSignalText,
  latestSignalSource,
  latestSignalDate,
  x,
  y,
  canvasWidth,
}: TimelineTooltipProps) {
  const stageInfo = getStage(stage);
  const flipRight = x > canvasWidth * 0.7;

  return (
    <div
      className="absolute z-50 w-72 bg-card border border-border rounded-lg shadow-xl p-3 pointer-events-none"
      style={{
        left: flipRight ? x - 288 : x + 16,
        top: y - 20,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{stageInfo.emoji}</span>
        <span className="font-serif font-bold text-sm text-card-foreground truncate">
          {objectiveName}
        </span>
      </div>

      <span
        className="inline-block font-mono text-xs uppercase tracking-wider px-1.5 py-0.5 rounded mb-2"
        style={{ backgroundColor: stageInfo.colour + "20", color: stageInfo.colour }}
      >
        {stageInfo.label} ({stageInfo.score > 0 ? "+" : ""}{stageInfo.score})
      </span>

      <p className="font-serif italic text-xs text-muted-foreground mb-2">
        {stageInfo.caption}
      </p>

      {latestSignalText && (
        <div className="border-t border-border pt-2 mt-2">
          <p className="font-serif italic text-xs text-card-foreground line-clamp-3">
            &ldquo;{latestSignalText}&rdquo;
          </p>
          <p className="font-mono text-[0.65rem] text-muted-foreground mt-1">
            {latestSignalSource} {latestSignalDate && `\u00b7 ${latestSignalDate}`}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Implement TimelinePath (SVG trajectory)**

```tsx
// frontend/src/components/company/TimelinePath.tsx
"use client";

interface Point {
  x: number;
  y: number;
}

interface TimelinePathProps {
  points: Point[];
  colour: string;
  isBelowGround: boolean;
  opacity: number;
}

function toSmoothPath(points: Point[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
    d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export function TimelinePath({ points, colour, isBelowGround, opacity }: TimelinePathProps) {
  if (points.length < 2) return null;

  return (
    <path
      d={toSmoothPath(points)}
      fill="none"
      stroke={colour}
      strokeWidth={isBelowGround ? 1.5 : 2.5}
      strokeDasharray={isBelowGround ? "6 4" : "none"}
      opacity={opacity}
      className="transition-opacity duration-300"
    />
  );
}
```

- [ ] **Step 7: Implement CrossingMarker**

```tsx
// frontend/src/components/company/CrossingMarker.tsx
"use client";

interface CrossingMarkerProps {
  x: number;
  y: number;
  label: string;
  editorialNote: string;
}

export function CrossingMarker({ x, y, label, editorialNote }: CrossingMarkerProps) {
  return (
    <div
      className="absolute group cursor-pointer"
      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
    >
      {/* Pulsing red dot */}
      <div className="relative w-4 h-4">
        <div className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-40" />
        <div className="absolute inset-0.5 rounded-full bg-destructive" />
      </div>

      {/* Label */}
      <span className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[0.65rem] text-destructive">
        {label}
      </span>

      {/* Hover tooltip */}
      <div className="hidden group-hover:block absolute left-5 top-6 w-48 bg-card border border-border rounded p-2 shadow-lg z-40">
        <p className="font-serif italic text-xs text-card-foreground">{editorialNote}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Implement TimelineLegend**

```tsx
// frontend/src/components/company/TimelineLegend.tsx
"use client";

import type { Objective } from "@/lib/types";
import { getStage, scoreToStage } from "@/lib/momentum";

interface TimelineLegendProps {
  objectives: Objective[];
  hoveredId: string | null;
  lockedIds: Set<string>;
  onHover: (id: string | null) => void;
  onToggleLock: (id: string) => void;
  colours: Map<string, string>;
}

export function TimelineLegend({
  objectives,
  hoveredId,
  lockedIds,
  onHover,
  onToggleLock,
  colours,
}: TimelineLegendProps) {
  const alive = objectives.filter((o) => !o.is_in_graveyard);
  const buried = objectives.filter((o) => o.is_in_graveyard);

  function renderItem(obj: Objective) {
    const stage = getStage(scoreToStage(obj.momentum_score));
    const colour = colours.get(obj.id) ?? stage.colour;
    const isLocked = lockedIds.has(obj.id);
    const isHighlighted = hoveredId === obj.id || isLocked;

    return (
      <button
        key={obj.id}
        className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
          isHighlighted ? "bg-muted" : "hover:bg-muted/50"
        }`}
        onMouseEnter={() => onHover(obj.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onToggleLock(obj.id)}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: colour }}
          />
          <span className="text-sm">{stage.emoji}</span>
          <span className="font-mono text-muted-foreground">
            OBJ {String(obj.display_number).padStart(2, "0")}
          </span>
        </div>
        <p className="font-sans text-card-foreground truncate mt-0.5 pl-5">
          {obj.title}
        </p>
      </button>
    );
  }

  return (
    <div className="w-[210px] shrink-0 border-r border-border overflow-y-auto py-2 pr-2">
      <h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground px-2 mb-2">
        Objectives
      </h3>
      {alive.map(renderItem)}

      {buried.length > 0 && (
        <>
          <h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground px-2 mt-4 mb-2">
            Buried
          </h3>
          {buried.map(renderItem)}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 9: Implement TimelineCanvas (orchestrator)**

This is the main component that wires together the legend, canvas, paths, nodes, tooltips, and crossing markers. It handles panzoom, layout calculations, and interaction states.

```tsx
// frontend/src/components/company/TimelineCanvas.tsx
"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
import type { Objective, Signal, MomentumStage } from "@/lib/types";
import { STAGES, getStage, scoreToStage, formatQuarter } from "@/lib/momentum";
import { TimelineLegend } from "./TimelineLegend";
import { TimelineNode } from "./TimelineNode";
import { TimelinePath } from "./TimelinePath";
import { TimelineTooltip } from "./TimelineTooltip";
import { CrossingMarker } from "./CrossingMarker";

interface TimelineCanvasProps {
  objectives: Objective[];
  signals: Signal[];
  onNavigateToEvidence: (signalId: string) => void;
}

// Assign distinct colours to objectives for path rendering
const OBJECTIVE_COLOURS = [
  "#059669", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#14b8a6", "#6366f1", "#ef4444", "#84cc16", "#06b6d4",
];

interface TooltipState {
  objectiveId: string;
  x: number;
  y: number;
}

// Layout constants — outside component to avoid deps issues
const PADDING_X = 60;
const PADDING_Y = 40;
const CANVAS_HEIGHT = 500;
const GROUND_Y = CANVAS_HEIGHT / 2;
const STAGE_HEIGHT = (CANVAS_HEIGHT - PADDING_Y * 2) / 8;

export function TimelineCanvas({
  objectives,
  signals,
  onNavigateToEvidence,
}: TimelineCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<PanzoomObject | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);

  // Colour assignments
  const colourMap = useMemo(() => {
    const map = new Map<string, string>();
    objectives.forEach((obj, i) => {
      map.set(obj.id, OBJECTIVE_COLOURS[i % OBJECTIVE_COLOURS.length]);
    });
    return map;
  }, [objectives]);

  // Group signals by objective
  const signalsByObjective = useMemo(() => {
    const map = new Map<string, Signal[]>();
    for (const s of signals) {
      const list = map.get(s.objective_id) || [];
      list.push(s);
      map.set(s.objective_id, list);
    }
    // Sort each by date
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.signal_date).getTime() - new Date(b.signal_date).getTime());
    }
    return map;
  }, [signals]);

  // Date range
  const { minDate, maxDate } = useMemo(() => {
    const dates = signals.map((s) => new Date(s.signal_date).getTime());
    if (dates.length === 0) return { minDate: Date.now() - 86400000 * 365, maxDate: Date.now() };
    return { minDate: Math.min(...dates), maxDate: Math.max(...dates, Date.now()) };
  }, [signals]);


  const dateToX = useCallback((date: string): number => {
    const t = new Date(date).getTime();
    const range = maxDate - minDate || 1;
    return PADDING_X + ((t - minDate) / range) * (canvasWidth - PADDING_X * 2);
  }, [minDate, maxDate, canvasWidth]);

  const scoreToY = useCallback((score: number): number => {
    return PADDING_Y + (4 - score) * STAGE_HEIGHT;
  }, []);

  // Initialize panzoom
  useEffect(() => {
    if (!canvasRef.current) return;
    const instance = Panzoom(canvasRef.current, {
      maxScale: 5,
      minScale: 0.5,
      contain: "outside",
    });
    canvasRef.current.parentElement?.addEventListener("wheel", instance.zoomWithWheel);
    panzoomRef.current = instance;
    return () => {
      canvasRef.current?.parentElement?.removeEventListener("wheel", instance.zoomWithWheel);
      instance.destroy();
    };
  }, []);

  // Measure canvas
  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setCanvasWidth(entries[0].contentRect.width - 210);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleZoom(delta: number) {
    if (!panzoomRef.current) return;
    const currentScale = panzoomRef.current.getScale();
    panzoomRef.current.zoom(currentScale + delta, { animate: true });
  }

  function handleReset() {
    panzoomRef.current?.reset({ animate: true });
  }

  function toggleLock(id: string) {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Determine opacity for each objective
  function getOpacity(objId: string): number {
    const hasIsolation = hoveredId !== null || lockedIds.size > 0;
    if (!hasIsolation) return 0.3;
    if (lockedIds.has(objId) || hoveredId === objId) return 1;
    return 0.1;
  }

  // Compute node positions for each objective
  const objectiveNodes = useMemo(() => {
    return objectives.map((obj) => {
      const objSignals = signalsByObjective.get(obj.id) || [];
      const points = objSignals.map((s) => ({
        x: dateToX(s.signal_date),
        y: scoreToY(obj.momentum_score), // Use current momentum for now; could interpolate per signal
        signal: s,
      }));
      return { objective: obj, points };
    });
  }, [objectives, signalsByObjective, dateToX, scoreToY]);

  // Find crossing points (objectives with momentum_score going from >=0 to <0)
  const crossings = useMemo(() => {
    return objectives
      .filter((o) => o.momentum_score < 0 && o.last_confirmed_date)
      .map((o) => ({
        objective: o,
        x: dateToX(o.last_confirmed_date!),
        y: GROUND_Y,
      }));
  }, [objectives, dateToX]);

  // Today marker
  const todayX = dateToX(new Date().toISOString());

  // Tooltip data
  const tooltipData = useMemo(() => {
    if (!tooltip) return null;
    const obj = objectives.find((o) => o.id === tooltip.objectiveId);
    if (!obj) return null;
    const signalList = signalsByObjective.get(obj.id);
    const latest = signalList?.[signalList.length - 1];
    return {
      objectiveName: obj.title,
      stage: scoreToStage(obj.momentum_score),
      latestSignalText: latest?.excerpt ?? null,
      latestSignalSource: latest?.source_name ?? null,
      latestSignalDate: latest?.signal_date ?? null,
      x: tooltip.x,
      y: tooltip.y,
    };
  }, [tooltip, objectives, signalsByObjective]);

  // Stats
  const aboveCount = objectives.filter((o) => o.momentum_score > 0).length;
  const crossingCount = crossings.length;
  const belowCount = objectives.filter((o) => o.momentum_score < 0).length;

  if (objectives.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground font-sans">
        No objectives tracked yet. Objectives are added after the first agent intake run.
      </div>
    );
  }

  return (
    <div className="flex border border-border rounded-lg overflow-hidden bg-card" style={{ height: CANVAS_HEIGHT + 60 }}>
      {/* Legend sidebar */}
      <TimelineLegend
        objectives={objectives}
        hoveredId={hoveredId}
        lockedIds={lockedIds}
        onHover={setHoveredId}
        onToggleLock={toggleLock}
        colours={colourMap}
      />

      {/* Canvas area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border text-xs font-mono text-muted-foreground">
          <div className="flex gap-4">
            <span>{aboveCount} above</span>
            <span>{crossingCount} crossing</span>
            <span>{belowCount} below</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleZoom(0.2)} className="px-2 py-1 border border-border rounded hover:bg-muted">+</button>
            <button onClick={() => handleZoom(-0.2)} className="px-2 py-1 border border-border rounded hover:bg-muted">&minus;</button>
            <button onClick={handleReset} className="px-2 py-1 border border-border rounded hover:bg-muted">Reset</button>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative flex-1 overflow-hidden">
          <div ref={canvasRef} className="relative" style={{ width: canvasWidth, height: CANVAS_HEIGHT }}>
            {/* Grid background */}
            <svg className="absolute inset-0" width={canvasWidth} height={CANVAS_HEIGHT}>
              {/* Y-axis labels + horizontal grid lines */}
              {STAGES.map((stage) => {
                const y = scoreToY(stage.score);
                return (
                  <g key={stage.name}>
                    <line x1={PADDING_X} y1={y} x2={canvasWidth - PADDING_X} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray="4 4" />
                    <text x={8} y={y + 4} fontSize={11} fill="var(--muted-foreground)" fontFamily="var(--font-ibm-plex-mono)">
                      {stage.emoji}
                    </text>
                  </g>
                );
              })}

              {/* Ground line */}
              <line
                x1={PADDING_X}
                y1={GROUND_Y}
                x2={canvasWidth - PADDING_X}
                y2={GROUND_Y}
                stroke="var(--primary)"
                strokeWidth={2}
              />
              <text x={canvasWidth - PADDING_X + 4} y={GROUND_Y + 4} fontSize={9} fill="var(--primary)" fontFamily="var(--font-ibm-plex-mono)">
                GROUND LINE
              </text>

              {/* Today marker */}
              <line
                x1={todayX}
                y1={PADDING_Y}
                x2={todayX}
                y2={CANVAS_HEIGHT - PADDING_Y}
                stroke="var(--primary)"
                strokeWidth={1}
                strokeDasharray="6 3"
                opacity={0.5}
              />

              {/* Trajectory paths */}
              {objectiveNodes.map(({ objective, points }) => (
                <TimelinePath
                  key={objective.id}
                  points={points}
                  colour={colourMap.get(objective.id) ?? "#999"}
                  isBelowGround={objective.momentum_score < 0}
                  opacity={getOpacity(objective.id)}
                />
              ))}
            </svg>

            {/* Emoji nodes */}
            {objectiveNodes.map(({ objective, points }) => {
              const stage = scoreToStage(objective.momentum_score);
              const stageInfo = getStage(stage);
              return points.map((pt, i) => (
                <TimelineNode
                  key={`${objective.id}-${i}`}
                  emoji={stageInfo.emoji}
                  colour={colourMap.get(objective.id) ?? stageInfo.colour}
                  x={pt.x}
                  y={pt.y}
                  label={objective.title}
                  onHover={() => {
                    setHoveredId(objective.id);
                    setTooltip({ objectiveId: objective.id, x: pt.x, y: pt.y });
                  }}
                  onLeave={() => {
                    if (!lockedIds.has(objective.id)) setHoveredId(null);
                    setTooltip(null);
                  }}
                  onClick={() => {
                    if (pt.signal) onNavigateToEvidence(pt.signal.id);
                  }}
                />
              ));
            })}

            {/* Crossing markers */}
            {crossings.map(({ objective, x, y }) => (
              <CrossingMarker
                key={`cross-${objective.id}`}
                x={x}
                y={y}
                label={`Crossing ${formatQuarter(objective.last_confirmed_date!)}`}
                editorialNote={`${objective.title} crossed the ground line.`}
              />
            ))}

            {/* Tooltip */}
            {tooltipData && (
              <TimelineTooltip
                {...tooltipData}
                canvasWidth={canvasWidth}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Wire TimelineCanvas into company page client**

Update `frontend/src/app/company/[ticker]/client.tsx` — replace the timeline placeholder:

```tsx
// Replace the timeline placeholder with:
{activeTab === "timeline" && (
  <TimelineCanvas
    objectives={objectives}
    signals={signals}
    onNavigateToEvidence={(signalId) => {
      handleTabChange("evidence");
      // Could scroll to signal — future enhancement
    }}
  />
)}
```

Add import: `import { TimelineCanvas } from "@/components/company/TimelineCanvas";`

- [ ] **Step 11: Implement MobileObjectiveList (mobile timeline fallback)**

```tsx
// frontend/src/components/mobile/MobileObjectiveList.tsx
"use client";

import { useState } from "react";
import type { Objective } from "@/lib/types";
import { getStage, scoreToStage } from "@/lib/momentum";

interface MobileObjectiveListProps {
  objectives: Objective[];
}

export function MobileObjectiveList({ objectives }: MobileObjectiveListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...objectives].sort((a, b) => b.momentum_score - a.momentum_score);
  const groundIndex = sorted.findIndex((o) => o.momentum_score < 0);

  return (
    <div>
      <div className="bg-muted p-3 rounded-lg mb-4 text-xs font-sans text-muted-foreground text-center">
        For the full interactive timeline, visit on desktop.
      </div>

      <div className="space-y-2">
        {sorted.map((obj, i) => {
          const stage = getStage(scoreToStage(obj.momentum_score));
          const isExpanded = expandedId === obj.id;
          const showDivider = i === groundIndex && groundIndex > 0;

          return (
            <div key={obj.id}>
              {showDivider && (
                <div className="flex items-center gap-2 py-2">
                  <div className="flex-1 h-px bg-primary" />
                  <span className="font-mono text-[0.65rem] text-primary uppercase">Ground Line</span>
                  <div className="flex-1 h-px bg-primary" />
                </div>
              )}

              <button
                onClick={() => setExpandedId(isExpanded ? null : obj.id)}
                className="w-full text-left p-3 bg-card border border-border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{stage.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-sm font-medium text-card-foreground truncate">
                      {obj.title}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {stage.label} ({stage.score > 0 ? "+" : ""}{stage.score})
                    </p>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="font-serif italic text-xs text-muted-foreground">
                      {stage.caption}
                    </p>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 12: Update timeline tab to show mobile fallback on small screens**

In `client.tsx`, update the timeline tab rendering:

```tsx
{activeTab === "timeline" && (
  <>
    <div className="hidden md:block">
      <TimelineCanvas
        objectives={objectives}
        signals={signals}
        onNavigateToEvidence={(signalId) => handleTabChange("evidence")}
      />
    </div>
    <div className="block md:hidden">
      <MobileObjectiveList objectives={objectives} />
    </div>
  </>
)}
```

Add import: `import { MobileObjectiveList } from "@/components/mobile/MobileObjectiveList";`

- [ ] **Step 13: Run all tests**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 14: Verify build**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npm run build
```

Expected: Build succeeds.

- [ ] **Step 15: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add frontend/src/components/company/Timeline*.tsx frontend/src/components/company/CrossingMarker.tsx frontend/src/components/mobile/ frontend/src/app/company/ frontend/src/__tests__/components/company/TimelineNode.test.tsx
git commit -m "feat: interactive timeline canvas with panzoom, legend, tooltips

DOM emoji nodes + SVG trajectory paths + panzoom for pan/zoom.
Legend sidebar with hover highlight, click-to-lock isolation.
Tooltips with Boardroom Allegory captions. Crossing markers.
Mobile fallback with vertical objective list."
```

---

## Task 11: Objectives Tab

**Files:**
- Create: `frontend/src/components/company/ObjectiveCard.tsx`, `frontend/src/components/company/EvidenceDrawer.tsx`
- Test: `frontend/src/__tests__/components/company/ObjectiveCard.test.tsx`

- [ ] **Step 1: Write failing test for ObjectiveCard**

```tsx
// frontend/src/__tests__/components/company/ObjectiveCard.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObjectiveCard } from "@/components/company/ObjectiveCard";
import type { Objective, Signal } from "@/lib/types";

const mockObjective: Objective = {
  id: "obj-1",
  company_id: "c-1",
  display_number: 1,
  title: "Global Biosimilar Leadership",
  subtitle: "Market share by 2028",
  original_quote: null,
  status: "on_record",
  first_stated_date: "2023-10-04",
  last_confirmed_date: "2026-02-15",
  exit_date: null,
  exit_manner: null,
  transparency_score: null,
  verdict_text: null,
  successor_objective_id: null,
  momentum_score: 3,
  is_in_graveyard: false,
};

describe("ObjectiveCard", () => {
  it("renders objective title and number", () => {
    render(<ObjectiveCard objective={mockObjective} signals={[]} />);
    expect(screen.getByText("Global Biosimilar Leadership")).toBeInTheDocument();
    expect(screen.getByText(/OBJ 01/)).toBeInTheDocument();
  });

  it("shows momentum stage emoji and label", () => {
    render(<ObjectiveCard objective={mockObjective} signals={[]} />);
    expect(screen.getByText("Fly")).toBeInTheDocument();
  });

  it("shows Boardroom Allegory caption", () => {
    render(<ObjectiveCard objective={mockObjective} signals={[]} />);
    expect(screen.getByText(/altitude has a way/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/components/company/ObjectiveCard.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement ObjectiveCard**

```tsx
// frontend/src/components/company/ObjectiveCard.tsx
"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { Objective, Signal } from "@/lib/types";
import { getStage, scoreToStage } from "@/lib/momentum";
import { EvidenceDrawer } from "./EvidenceDrawer";

interface ObjectiveCardProps {
  objective: Objective;
  signals: Signal[];
}

export function ObjectiveCard({ objective, signals }: ObjectiveCardProps) {
  const [expanded, setExpanded] = useState(false);
  const stage = getStage(scoreToStage(objective.momentum_score));

  const warningLevel =
    objective.momentum_score <= -2
      ? "border-status-dropped"
      : objective.momentum_score <= 0
        ? "border-status-watch"
        : "border-border";

  return (
    <div className={`bg-card border-2 ${warningLevel} rounded-lg overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                OBJ {String(objective.display_number).padStart(2, "0")}
              </span>
              <span
                className="font-mono text-xs uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ backgroundColor: stage.colour + "20", color: stage.colour }}
              >
                {stage.emoji} {stage.label} ({stage.score > 0 ? "+" : ""}{stage.score})
              </span>
            </div>
            <h3 className="font-serif font-bold text-base text-card-foreground">
              {objective.title}
            </h3>
            {objective.subtitle && (
              <p className="font-sans text-sm text-muted-foreground mt-0.5">
                {objective.subtitle}
              </p>
            )}
          </div>

          <div className="text-2xl font-serif font-bold text-foreground shrink-0 ml-4">
            {objective.momentum_score > 0 ? "+" : ""}
            {objective.momentum_score}
          </div>
        </div>

        {/* Boardroom Allegory caption */}
        <div className="mt-3 p-2 bg-muted rounded">
          <p className="font-serif italic text-xs text-muted-foreground">
            {stage.caption}
          </p>
        </div>

        {/* Stats row */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-mono text-muted-foreground">
          <span>{signals.length} signals</span>
          {objective.first_stated_date && (
            <span>First stated: {objective.first_stated_date}</span>
          )}
          {objective.last_confirmed_date && (
            <span>Last confirmed: {objective.last_confirmed_date}</span>
          )}
          {objective.momentum_score < 0 && objective.last_confirmed_date && (
            <span className="text-destructive">
              Crossed ground line {objective.last_confirmed_date}
            </span>
          )}
        </div>

        {/* Momentum bar */}
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${((objective.momentum_score + 4) / 8) * 100}%`,
              backgroundColor: stage.colour,
            }}
          />
        </div>
      </button>

      {/* Evidence drawer */}
      <AnimatePresence>
        {expanded && <EvidenceDrawer signals={signals} onClose={() => setExpanded(false)} />}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 4: Implement EvidenceDrawer**

```tsx
// frontend/src/components/company/EvidenceDrawer.tsx
"use client";

import { motion } from "framer-motion";
import type { Signal } from "@/lib/types";

interface EvidenceDrawerProps {
  signals: Signal[];
  onClose: () => void;
}

const CLASSIFICATION_COLOURS: Record<string, string> = {
  reinforced: "#22c55e",
  stated: "#22c55e",
  softened: "#d97706",
  reframed: "#3b82f6",
  absent: "#dc2626",
  achieved: "#059669",
  retired_transparent: "#6b7280",
  retired_silent: "#dc2626",
};

export function EvidenceDrawer({ signals, onClose }: EvidenceDrawerProps) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="border-t border-border overflow-hidden"
    >
      <div className="p-4 max-h-80 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Signal History
          </h4>
          <button
            onClick={onClose}
            className="font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            CLOSE
          </button>
        </div>

        {signals.length === 0 ? (
          <p className="text-sm text-muted-foreground font-sans">No signals recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {signals.map((signal) => (
              <div key={signal.id} className="flex gap-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground shrink-0 w-20">
                  {signal.signal_date}
                </span>
                <span
                  className="font-mono text-xs uppercase shrink-0 w-24"
                  style={{ color: CLASSIFICATION_COLOURS[signal.classification] ?? "#6b7280" }}
                >
                  {signal.classification.replace("_", " ")}
                </span>
                <div className="flex-1 min-w-0">
                  {signal.excerpt && (
                    <p className="font-serif italic text-card-foreground text-xs">
                      &ldquo;{signal.excerpt}&rdquo;
                    </p>
                  )}
                  <span className="font-mono text-[0.65rem] text-muted-foreground">
                    {signal.confidence}/10 confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/components/company/ObjectiveCard.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Wire Objectives tab into company page**

In `client.tsx`, replace objectives placeholder:

```tsx
{activeTab === "objectives" && (
  activeObjectives.length === 0 ? (
    <p className="text-center py-20 text-muted-foreground font-sans">
      No objectives tracked yet for {company.name}. Objectives are added after the first agent intake run.
    </p>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {activeObjectives.map((obj) => (
        <ObjectiveCard
          key={obj.id}
          objective={obj}
          signals={signals.filter((s) => s.objective_id === obj.id)}
        />
      ))}
    </div>
  )
)}
```

Add import: `import { ObjectiveCard } from "@/components/company/ObjectiveCard";`

- [ ] **Step 7: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add frontend/src/components/company/ObjectiveCard.tsx frontend/src/components/company/EvidenceDrawer.tsx frontend/src/app/company/ frontend/src/__tests__/components/company/ObjectiveCard.test.tsx
git commit -m "feat: Objectives tab — ObjectiveCard with EvidenceDrawer

Cards show stage badge, Boardroom Allegory caption, momentum bar.
Warning borders for Watch/Crawl/Drag/Sink. Framer Motion drawer
for signal history. Empty state handled."
```

---

## Task 12: Buried Tab

**Files:**
- Create: `frontend/src/components/company/BuriedCard.tsx`
- Test: `frontend/src/__tests__/components/company/BuriedCard.test.tsx`

- [ ] **Step 1: Write failing test for BuriedCard**

```tsx
// frontend/src/__tests__/components/company/BuriedCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BuriedCard } from "@/components/company/BuriedCard";
import type { Objective } from "@/lib/types";

const mockBuried: Objective = {
  id: "obj-g1",
  company_id: "c-1",
  display_number: 7,
  title: "China Growth Platform",
  subtitle: null,
  original_quote: null,
  status: "dropped",
  first_stated_date: "2023-10-04",
  last_confirmed_date: null,
  exit_date: "2024-06-30",
  exit_manner: "silent",
  transparency_score: "very_low",
  verdict_text: "Disappeared from communications without notice.",
  successor_objective_id: null,
  momentum_score: -4,
  is_in_graveyard: true,
};

describe("BuriedCard", () => {
  it("renders the title", () => {
    render(<BuriedCard objective={mockBuried} />);
    expect(screen.getByText("China Growth Platform")).toBeInTheDocument();
  });

  it("shows exit manner badge", () => {
    render(<BuriedCard objective={mockBuried} />);
    expect(screen.getByText("Silent Drop")).toBeInTheDocument();
  });

  it("shows transparency score", () => {
    render(<BuriedCard objective={mockBuried} />);
    expect(screen.getByText(/Very Low/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/components/company/BuriedCard.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement BuriedCard**

```tsx
// frontend/src/components/company/BuriedCard.tsx
import type { Objective, ExitManner, TransparencyScore } from "@/lib/types";
import { getStage } from "@/lib/momentum";

interface BuriedCardProps {
  objective: Objective;
}

const EXIT_MANNER_CONFIG: Record<ExitManner, { label: string; colour: string }> = {
  silent: { label: "Silent Drop", colour: "#ef4444" },
  morphed: { label: "Morphed", colour: "#3b82f6" },
  phased: { label: "Phased Out", colour: "#f59e0b" },
  transparent: { label: "Transparent Exit", colour: "#22c55e" },
  achieved: { label: "Achieved", colour: "#059669" },
};

const TRANSPARENCY_LABELS: Record<TransparencyScore, string> = {
  very_low: "Very Low",
  low: "Low",
  medium: "Medium",
  high: "High",
};

const TRANSPARENCY_WIDTH: Record<TransparencyScore, string> = {
  very_low: "15%",
  low: "35%",
  medium: "60%",
  high: "90%",
};

export function BuriedCard({ objective }: BuriedCardProps) {
  const manner = objective.exit_manner ? EXIT_MANNER_CONFIG[objective.exit_manner] : null;
  const stage = getStage("buried");

  const dateRange = [
    objective.first_stated_date,
    objective.exit_date,
  ].filter(Boolean).join(" \u2192 ");

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Top colour bar */}
      {manner && (
        <div className="h-[3px]" style={{ backgroundColor: manner.colour }} />
      )}

      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            {manner && (
              <span
                className="inline-block font-mono text-xs uppercase tracking-wider px-2 py-0.5 rounded mb-2"
                style={{ backgroundColor: manner.colour + "20", color: manner.colour }}
              >
                {manner.label}
              </span>
            )}
            <h3 className="font-serif font-bold text-base text-card-foreground">
              {objective.title}
            </h3>
          </div>
          <span className="text-xl shrink-0 ml-2">{stage.emoji}</span>
        </div>

        {dateRange && (
          <p className="font-mono text-xs text-muted-foreground mt-1">
            {dateRange}
          </p>
        )}

        {objective.verdict_text && (
          <p className="font-sans text-sm text-card-foreground mt-3 leading-relaxed">
            {objective.verdict_text}
          </p>
        )}

        {/* Wink — the Boardroom Allegory caption */}
        <div className="mt-3 p-2 bg-muted rounded">
          <p className="font-serif italic text-xs text-muted-foreground">
            {stage.caption}
          </p>
        </div>

        {/* Transparency score */}
        {objective.transparency_score && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[0.65rem] text-muted-foreground uppercase tracking-wider">
                Transparency
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {TRANSPARENCY_LABELS[objective.transparency_score]}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-muted-foreground/40 rounded-full"
                style={{ width: TRANSPARENCY_WIDTH[objective.transparency_score] }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/components/company/BuriedCard.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Wire Buried tab into company page**

In `client.tsx`, replace buried placeholder:

```tsx
{activeTab === "buried" && (
  buriedObjectives.length === 0 ? (
    <div className="text-center py-20">
      <p className="font-serif text-lg text-foreground">No buried objectives.</p>
      <p className="font-sans text-sm text-muted-foreground mt-1">
        All commitments remain on record.
      </p>
    </div>
  ) : (
    <>
      <div className="mb-6 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{"\u26B0\uFE0F"}</span>
          <h2 className="font-serif font-bold text-lg text-foreground">The Buried</h2>
        </div>
        <p className="font-serif italic text-sm text-muted-foreground">
          Objectives that companies stated publicly and then quietly dropped, reframed,
          or allowed to disappear without announcement.
        </p>
        <div className="mt-2 flex gap-3 text-xs font-mono text-muted-foreground">
          {/* Count by exit manner */}
          {Object.entries(
            buriedObjectives.reduce<Record<string, number>>((acc, o) => {
              const key = o.exit_manner ?? "unknown";
              acc[key] = (acc[key] ?? 0) + 1;
              return acc;
            }, {})
          ).map(([manner, count]) => (
            <span key={manner}>{count} {manner}</span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {buriedObjectives.map((obj) => (
          <BuriedCard key={obj.id} objective={obj} />
        ))}
      </div>
    </>
  )
)}
```

Add import: `import { BuriedCard } from "@/components/company/BuriedCard";`

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add frontend/src/components/company/BuriedCard.tsx frontend/src/app/company/ frontend/src/__tests__/components/company/BuriedCard.test.tsx
git commit -m "feat: Buried tab — BuriedCard with exit manner, transparency bar

Colour-coded top bar by exit manner (Silent/Morphed/Phased/Transparent).
Boardroom Allegory wink caption. Transparency score bar. Intro block
with counts. Positive empty state."
```

---

## Task 13: Evidence Tab

**Files:**
- Create: `frontend/src/components/company/EvidenceTable.tsx`
- Test: `frontend/src/__tests__/components/company/EvidenceTable.test.tsx`

- [ ] **Step 1: Write failing test for EvidenceTable**

```tsx
// frontend/src/__tests__/components/company/EvidenceTable.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EvidenceTable } from "@/components/company/EvidenceTable";
import type { Signal, Objective } from "@/lib/types";

const mockObjectives: Objective[] = [
  {
    id: "obj-1", company_id: "c-1", display_number: 1,
    title: "Global Biosimilar Leadership", subtitle: null, original_quote: null,
    status: "on_record", first_stated_date: null, last_confirmed_date: null,
    exit_date: null, exit_manner: null, transparency_score: null,
    verdict_text: null, successor_objective_id: null, momentum_score: 3,
    is_in_graveyard: false,
  },
];

const mockSignals: Signal[] = [
  {
    id: "s-1", objective_id: "obj-1", company_id: "c-1",
    signal_date: "2026-02-15", source_type: "earnings_call",
    source_name: "FY2025 Results", source_url: null,
    classification: "reinforced", confidence: 8,
    excerpt: "We remain committed to global biosimilar leadership.",
    agent_reasoning: "Explicit reaffirmation of the objective.",
    is_draft: false, reviewed_by: null, reviewed_at: null,
  },
  {
    id: "s-2", objective_id: "obj-1", company_id: "c-1",
    signal_date: "2025-07-01", source_type: "interim_results",
    source_name: "H1 2025 Report", source_url: null,
    classification: "softened", confidence: 6,
    excerpt: "We continue to pursue biosimilar opportunities.",
    agent_reasoning: null,
    is_draft: false, reviewed_by: null, reviewed_at: null,
  },
];

describe("EvidenceTable", () => {
  it("renders signal dates", () => {
    render(<EvidenceTable signals={mockSignals} objectives={mockObjectives} />);
    expect(screen.getByText("2026-02-15")).toBeInTheDocument();
    expect(screen.getByText("2025-07-01")).toBeInTheDocument();
  });

  it("renders classification badges", () => {
    render(<EvidenceTable signals={mockSignals} objectives={mockObjectives} />);
    expect(screen.getByText("reinforced")).toBeInTheDocument();
    expect(screen.getByText("softened")).toBeInTheDocument();
  });

  it("renders filter pills", () => {
    render(<EvidenceTable signals={mockSignals} objectives={mockObjectives} />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Reinforced")).toBeInTheDocument();
  });

  it("filters by classification when clicking a pill", async () => {
    render(<EvidenceTable signals={mockSignals} objectives={mockObjectives} />);
    await userEvent.click(screen.getByText("Softened"));
    expect(screen.getByText("softened")).toBeInTheDocument();
    expect(screen.queryByText("reinforced")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/components/company/EvidenceTable.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement EvidenceTable**

```tsx
// frontend/src/components/company/EvidenceTable.tsx
"use client";

import { useState } from "react";
import type { Signal, Objective, SignalClassification } from "@/lib/types";

interface EvidenceTableProps {
  signals: Signal[];
  objectives: Objective[];
}

const FILTER_OPTIONS: { label: string; value: SignalClassification | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Reinforced", value: "reinforced" },
  { label: "Softened", value: "softened" },
  { label: "Absent", value: "absent" },
  { label: "Reframed", value: "reframed" },
  { label: "Stated", value: "stated" },
  { label: "Achieved", value: "achieved" },
  { label: "Retired", value: "retired_transparent" },
];

const CLASSIFICATION_COLOURS: Record<string, string> = {
  reinforced: "#22c55e",
  stated: "#22c55e",
  softened: "#d97706",
  reframed: "#3b82f6",
  absent: "#dc2626",
  achieved: "#059669",
  retired_transparent: "#6b7280",
  retired_silent: "#dc2626",
};

const PAGE_SIZE = 20;

export function EvidenceTable({ signals, objectives }: EvidenceTableProps) {
  const [filter, setFilter] = useState<SignalClassification | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const objMap = new Map(objectives.map((o) => [o.id, o]));

  const filtered = filter === "all"
    ? signals
    : signals.filter((s) =>
        filter === "retired_transparent"
          ? s.classification === "retired_transparent" || s.classification === "retired_silent"
          : s.classification === filter
      );

  const visible = filtered.slice(0, visibleCount);

  if (signals.length === 0) {
    return (
      <p className="text-center py-20 text-muted-foreground font-sans">
        No signals recorded yet.
      </p>
    );
  }

  return (
    <div>
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setFilter(opt.value); setVisibleCount(PAGE_SIZE); }}
            className={`px-3 py-1 rounded-full font-mono text-xs transition-colors ${
              filter === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2 pr-4">Date</th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2 pr-4">Classification</th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2 pr-4">Objective</th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2 pr-4">Excerpt</th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2 pr-4">Source</th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2">Conf.</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((signal) => {
              const obj = objMap.get(signal.objective_id);
              const isExpanded = expanded === signal.id;
              const stage = obj ? obj.momentum_score : 0;

              return (
                <tr
                  key={signal.id}
                  onClick={() => setExpanded(isExpanded ? null : signal.id)}
                  className="border-b border-border hover:bg-muted/50 cursor-pointer"
                >
                  <td className="font-mono text-xs text-muted-foreground py-2 pr-4 whitespace-nowrap">
                    {signal.signal_date}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className="font-mono text-xs uppercase"
                      style={{ color: CLASSIFICATION_COLOURS[signal.classification] ?? "#6b7280" }}
                    >
                      {signal.classification.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-sans text-card-foreground">
                    {obj && (
                      <span className="text-xs">
                        {obj.title}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {signal.excerpt && (
                      <p className="font-serif italic text-xs text-card-foreground line-clamp-1">
                        {signal.excerpt}
                      </p>
                    )}
                    {isExpanded && signal.agent_reasoning && (
                      <p className="font-sans text-xs text-muted-foreground mt-1 bg-muted p-2 rounded">
                        {signal.agent_reasoning}
                      </p>
                    )}
                  </td>
                  <td className="font-mono text-xs text-muted-foreground py-2 pr-4 whitespace-nowrap">
                    {signal.source_name}
                  </td>
                  <td className="font-mono text-xs text-muted-foreground py-2">
                    <span className="bg-muted px-1.5 py-0.5 rounded">{signal.confidence}/10</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      {visibleCount < filtered.length && (
        <div className="text-center mt-4">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="px-4 py-2 bg-muted text-muted-foreground rounded font-sans text-sm hover:bg-muted/80 transition-colors"
          >
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run src/__tests__/components/company/EvidenceTable.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Wire Evidence tab into company page**

In `client.tsx`, replace evidence placeholder:

```tsx
{activeTab === "evidence" && (
  <EvidenceTable signals={signals} objectives={objectives} />
)}
```

Add import: `import { EvidenceTable } from "@/components/company/EvidenceTable";`

- [ ] **Step 6: Run all tests**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 7: Verify build**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npm run build
```

Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add frontend/src/components/company/EvidenceTable.tsx frontend/src/app/company/ frontend/src/__tests__/components/company/EvidenceTable.test.tsx
git commit -m "feat: Evidence tab — filterable signal table with classification colours

Filter pills by classification. Sortable table with date, classification,
objective, excerpt, source, confidence. Click to expand agent reasoning.
Load more pagination."
```

---

## Task 14: About Page

**Files:**
- Create: `frontend/src/app/about/page.tsx`

- [ ] **Step 1: Implement About page**

```tsx
// frontend/src/app/about/page.tsx
import { STAGES } from "@/lib/momentum";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-serif text-3xl font-bold text-foreground">
        About Drift<span className="text-primary">.</span>
      </h1>

      <p className="mt-4 font-serif text-foreground leading-relaxed">
        Drift is a strategic accountability research platform. We track what major
        companies publicly commit to — and monitor how that language changes, weakens,
        or disappears over time.
      </p>

      <p className="mt-3 font-serif text-muted-foreground leading-relaxed">
        Most tools measure outcomes. Drift measures the{" "}
        <em>language of commitment</em> and the silence that follows when commitment fades.
      </p>

      <h2 id="methodology" className="mt-12 font-serif text-2xl font-bold text-foreground">
        Methodology
      </h2>

      <p className="mt-4 font-sans text-foreground leading-relaxed">
        Every company tracked by Drift goes through the same process:
      </p>

      <ol className="mt-4 space-y-3 font-sans text-foreground">
        <li><strong>1. Intake</strong> — We identify the company&apos;s publicly stated strategic objectives from investor communications, earnings calls, and official disclosures.</li>
        <li><strong>2. Monitoring</strong> — Our research agent reviews new disclosures bi-weekly, classifying each mention as reinforced, softened, reframed, or absent.</li>
        <li><strong>3. Classification</strong> — Each objective is placed on the Momentum Scale based on the evidence trail.</li>
        <li><strong>4. Editorial review</strong> — Every signal is a draft until a human reviewer approves it. The agent reads; the human verifies.</li>
      </ol>

      <h2 className="mt-12 font-serif text-2xl font-bold text-foreground">
        The Momentum Scale
      </h2>

      <p className="mt-4 font-sans text-muted-foreground">
        Nine stages from Orbit (+4) to Buried (-4). The ground line at zero separates alive commitments from those entering graveyard territory.
      </p>

      <div className="mt-6 space-y-2">
        {STAGES.map((stage) => (
          <div key={stage.name} className="flex items-center gap-3 p-2 rounded bg-card border border-border">
            <span className="text-xl w-8 text-center">{stage.emoji}</span>
            <div className="flex-1">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider" style={{ color: stage.colour }}>
                {stage.label} ({stage.score > 0 ? "+" : ""}{stage.score})
              </span>
              <p className="font-serif italic text-xs text-muted-foreground mt-0.5">
                {stage.caption}
              </p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-serif text-2xl font-bold text-foreground">
        The Buried
      </h2>

      <p className="mt-4 font-sans text-foreground leading-relaxed">
        The Graveyard records objectives that companies stated publicly and then quietly dropped,
        reframed, or allowed to disappear. Each entry is classified by how it ended: Silent Drop,
        Phased Out, Morphed, or Transparent Exit.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add frontend/src/app/about/
git commit -m "feat: About page with methodology, momentum scale, buried explanation"
```

---

## Task 15: Admin Page (Port from v1)

**Files:**
- Create: `frontend/src/app/admin/page.tsx`

- [ ] **Step 1: Implement admin page shell**

The v1 admin was a full HTML page. For v2, create a minimal admin shell that connects to the same Supabase data. The full admin will be enhanced iteratively.

```tsx
// frontend/src/app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Signal, AgentRun } from "@/lib/types";

export default function AdminPage() {
  const [draftSignals, setDraftSignals] = useState<Signal[]>([]);
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);

  useEffect(() => {
    async function load() {
      const [signalRes, runRes] = await Promise.all([
        supabase
          .from("signals")
          .select("*")
          .eq("is_draft", true)
          .order("signal_date", { ascending: false }),
        supabase
          .from("agent_runs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      setDraftSignals(signalRes.data ?? []);
      setRecentRuns(runRes.data ?? []);
    }
    load();
  }, []);

  async function approveSignal(id: string) {
    await supabase.from("signals").update({ is_draft: false }).eq("id", id);
    setDraftSignals((prev) => prev.filter((s) => s.id !== id));
  }

  async function rejectSignal(id: string) {
    await supabase.from("signals").delete().eq("id", id);
    setDraftSignals((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-serif text-2xl font-bold text-foreground mb-8">
        Admin Dashboard
      </h1>

      {/* Review Queue */}
      <section className="mb-12">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Pending Review ({draftSignals.length})
        </h2>

        {draftSignals.length === 0 ? (
          <p className="text-muted-foreground font-sans">No signals pending review.</p>
        ) : (
          <div className="space-y-3">
            {draftSignals.map((signal) => (
              <div key={signal.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {signal.signal_date} &middot; {signal.classification}
                    </span>
                    {signal.excerpt && (
                      <p className="font-serif italic text-sm text-card-foreground mt-1">
                        &ldquo;{signal.excerpt}&rdquo;
                      </p>
                    )}
                    {signal.agent_reasoning && (
                      <p className="font-sans text-xs text-muted-foreground mt-1">
                        {signal.agent_reasoning}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => approveSignal(signal.id)}
                      className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-sans"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectSignal(signal.id)}
                      className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-xs font-sans"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Agent Runs */}
      <section>
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Recent Agent Runs
        </h2>

        {recentRuns.length === 0 ? (
          <p className="text-muted-foreground font-sans">No agent runs recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2">Date</th>
                <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2">Status</th>
                <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2">Proposed</th>
                <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2">Approved</th>
                <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run) => (
                <tr key={run.id} className="border-b border-border">
                  <td className="font-mono text-xs py-2">{run.created_at}</td>
                  <td className="font-mono text-xs py-2">{run.status}</td>
                  <td className="font-mono text-xs py-2">{run.signals_proposed}</td>
                  <td className="font-mono text-xs py-2">{run.signals_approved}</td>
                  <td className="font-mono text-xs py-2">
                    {run.estimated_cost_usd ? `$${run.estimated_cost_usd.toFixed(2)}` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add frontend/src/app/admin/
git commit -m "feat: admin dashboard — signal review queue, agent run history

Approve/reject draft signals. Recent agent runs table. Connects to
existing Supabase tables. Minimal shell for v2 launch."
```

---

## Task 16: Schema Migration — Add Exchange Field

**Files:**
- Modify: `backend/schema.sql`

- [ ] **Step 1: Add exchange column to companies table**

Add after the `ticker` column definition in `backend/schema.sql`:

```sql
-- Add exchange field (v2)
alter table companies add column if not exists exchange varchar(10);
comment on column companies.exchange is 'Stock exchange code, e.g. SIX, NYSE, LSE, XETRA';
```

Also update the `create table companies` block to include `exchange` for new installations.

- [ ] **Step 2: Update Sandoz seed data**

In the seed data section, update the Sandoz insert to include `exchange = 'SIX'`.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add backend/schema.sql
git commit -m "feat: add exchange column to companies table (v2 schema)"
```

---

## Task 17: Framer Motion Page Transitions

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Add page transition wrapper**

Create a client component for page transitions:

```tsx
// frontend/src/components/layout/PageTransition.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Wrap main content in layout**

In `layout.tsx`, wrap `{children}` with `<PageTransition>`:

```tsx
<main className="flex-1">
  <PageTransition>{children}</PageTransition>
</main>
```

- [ ] **Step 3: Verify build**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add frontend/src/components/layout/PageTransition.tsx frontend/src/app/layout.tsx
git commit -m "feat: Framer Motion page transitions (fade + slide)"
```

---

## Task 18: Final Integration, Build Verification, and Cleanup

**Files:**
- Various

- [ ] **Step 1: Run full test suite**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 2: Run production build**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Verify all pages load in dev server**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npm run dev
```

Manually verify:
- `/` — Landing page renders (may show empty state without DB)
- `/company/sdz` — Company page renders (or 404 without DB)
- `/about` — About page renders with momentum scale
- `/admin` — Admin dashboard renders

- [ ] **Step 4: Lint check**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine/frontend"
npx next lint
```

Fix any lint errors that surface.

- [ ] **Step 5: Commit any fixes**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add -A
git commit -m "fix: lint and build cleanup"
```

---

## Task 19: Update Brand and Documentation

**Files:**
- Modify: `brand/SKILL.md` (update for v2 tokens, fonts, motion rules)
- Modify: `CLAUDE.md` (update for v2 project state)
- Modify: `docs/setup.md` (update for Next.js)
- Create: `CHANGELOG.md`

- [ ] **Step 1: Update agent cron schedule**

Update the agent cron configuration from monthly to bi-weekly (every 2 weeks). This is a cron configuration change only — no schema or code modifications. Update the cron entry (system crontab or scheduling service) from `0 0 1 * *` to `0 0 */14 * *` (or equivalent bi-weekly schedule). Document the new schedule in `docs/setup.md`.

- [ ] **Step 2: Update brand/SKILL.md**

Update the skill file to reflect v2 design tokens:
- Replace caffeine dark palette with emerald + slate
- Replace Playfair Display/Source Serif 4/JetBrains Mono with DM Sans/Lora/IBM Plex Mono
- Update motion rules for Framer Motion
- Update anti-slop rules

- [ ] **Step 3: Update CLAUDE.md**

Update the project-level CLAUDE.md sections:
- Current state table (add Next.js frontend, mark v1 files as archived)
- Brand & Design System (point to v2 spec for canonical reference)
- Typography section (DM Sans / Lora / IBM Plex Mono)
- Colour tokens (emerald + slate, light/dark modes)
- Tech stack (Next.js 15 + TypeScript + Tailwind)
- File structure (reflect new layout)

- [ ] **Step 4: Update docs/setup.md**

Update for Next.js development workflow:
- Prerequisites: Node.js 18+, npm
- Frontend setup: `cd frontend && npm install && npm run dev`
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Agent schedule: bi-weekly cron

- [ ] **Step 5: Create CHANGELOG.md**

```markdown
# Changelog

## [2.0.0] - 2026-03-XX

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
```

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git add brand/SKILL.md CLAUDE.md CHANGELOG.md docs/setup.md
git commit -m "docs: update brand, CLAUDE.md, setup.md, and changelog for v2"
```

- [ ] **Step 7: Tag v2.0.0**

```bash
cd "c:/Users/stefa/OneDrive/AIWorkspace/content/drift magazine"
git tag -a v2.0.0 -m "Drift v2.0.0 — complete redesign"
```
