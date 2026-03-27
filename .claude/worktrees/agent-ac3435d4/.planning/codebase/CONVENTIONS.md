# Coding Conventions

**Analysis Date:** 2026-03-26

## TypeScript & Type Definitions

**Type Files:**
- `src/lib/types.ts` — Canonical domain types (Company, Objective, Signal, AgentRun, CompanySummary)

**Type Patterns:**
- Union types for classifications (e.g., `ObjectiveStatus`, `SignalClassification`, `ExitManner`, `MomentumStage`)
- Explicit nullable fields using `| null` (not optional `?`)
- Interface pattern for data structures: `interface Company { ... }`
- Type pattern for discriminated unions: `export type TerminalState = "proved" | "buried"`

**Example from `src/lib/types.ts`:**
```typescript
export type ObjectiveStatus =
  | "on_record" | "watch" | "drifting" | "achieved" | "dropped" | "morphed";

export interface Objective {
  id: string;
  company_id: string;
  display_number: number;
  title: string;
  momentum_score: number;
  terminal_state: TerminalState | null;
  commitment_type: 'annual' | 'multi_year' | 'evergreen';
}
```

**Generic Constraints:**
- Use interface inheritance for constraints (e.g., `interface Searchable { name: string; ticker: string; }`)
- Example from `src/lib/search.ts`: `filterCompanies<T extends Searchable>(...)`

## React Component Patterns

**Naming:**
- PascalCase for component files and exports: `Masthead.tsx`, `export function Masthead()`
- Component files are always capitalized
- Props interfaces use `{ComponentName}Props` suffix: `interface MastheadProps { ... }`

**Client vs Server Components:**
- Client components start with `"use client"` directive at the top
- Server-rendered pages in `src/app/` (App Router)
- Components in `src/components/` are client components unless explicitly server-rendered
- Example from `src/components/layout/Masthead.tsx`:
```typescript
"use client";
import { useState } from "react";
export function Masthead({ initialTheme }: MastheadProps) { ... }
```

**Props Structure:**
- Props are typed as interfaces, not inline
- Optional props use `undefined` as default, not optional syntax
- Destructure props in function signature

**Example from `src/components/company/ObjectiveCard.tsx`:**
```typescript
interface ObjectiveCardProps {
  objective: Objective;
  signals: Signal[];
}

export function ObjectiveCard({ objective, signals }: ObjectiveCardProps) {
  const [expanded, setExpanded] = useState(false);
  // ...
}
```

**Hooks Usage:**
- `useState` for local component state
- `useRef` for imperative DOM references (drag handlers, scroll position)
- `useCallback` for memoized callbacks passed to children
- `useMemo` for computed values that feed into render
- Example from `src/components/company/TimelineCanvas.tsx`:
```typescript
const scrollRef = useRef<HTMLDivElement>(null);
const [hoveredId, setHoveredId] = useState<string | null>(null);
const [tooltip, setTooltip] = useState<TooltipState | null>(null);
```

## Styling Approach

**Tailwind CSS + CSS Variables:**
- All colors use CSS variable mapping in Tailwind config
- Never hardcode hex values in component classes
- CSS variables defined in `src/app/globals.css`
- Tailwind config at `tailwind.config.ts` maps variables to Tailwind color palette

**CSS Variable Categories:**
- **Base theme:** `--background`, `--card`, `--foreground`, `--border`, `--input`, `--primary`
- **Momentum spectrum:** `--momentum-orbit` through `--momentum-buried` (9 stages)
- **Status semantic:** `--status-active`, `--status-watch`, `--status-drifting`, `--status-dropped`
- **Exit manner:** `--exit-silent`, `--exit-morphed`, `--exit-phased`, `--exit-transparent`
- **Forced dark surfaces:** `--forced-dark-bg`, `--forced-dark-card`, `--forced-dark-text`, `--forced-dark-accent` (for masthead/footer)

**Example from `src/components/layout/Masthead.tsx`:**
```typescript
// Always use CSS variables through Tailwind
<header className="bg-[var(--forced-dark-bg)] text-[var(--forced-dark-text)]">
  <div className="bg-[var(--forced-dark-accent)]" />
</header>

// Never:
<header className="bg-[#0f172a]">
```

**Theme Toggle:**
- Dark mode class: `.dark` selector
- Light mode is default (`:root`)
- All CSS variables have light + dark variants defined in `globals.css`

**Typography:**
- Font families mapped in `tailwind.config.ts`:
  - `font-sans` = DM Sans (UI labels, metadata)
  - `font-serif` = Lora (headlines, editorial prose)
  - `font-mono` = IBM Plex Mono (data labels, classifications, dates)
- Never use Inter, Roboto, Arial, or system fonts
- Example from `src/components/layout/Masthead.tsx`:
```typescript
<Link href="/" className="font-serif italic text-4xl">
  Drift<span>.</span>
</Link>
```

**Utility Classes:**
- Use Tailwind utilities exclusively for layout and spacing
- Responsive prefixes: `md:`, `sm:`, `lg:`, `xl:` (mobile-first)
- Example: `className="hidden md:flex items-center gap-6"`

## Naming Conventions

**Files:**
- Components: PascalCase (`Masthead.tsx`, `ObjectiveCard.tsx`)
- Utilities/helpers: camelCase (`timeline-nodes.ts`, `search.ts`, `momentum.ts`, `theme.ts`)
- Tests: mirror component name with `.test.ts` or `.test.tsx` suffix
- Types: `types.ts` for domain types; type files grouped by feature

**Functions:**
- camelCase for all functions: `getStageColour()`, `scoreToStage()`, `filterCompanies()`
- Prefix with `get` for accessor functions
- Prefix with `is`/`has` for boolean checks: `isFiscalYearEnd`, `isFirst`
- Example from `src/lib/momentum.ts`:
```typescript
export function getStage(name: MomentumStage): StageDefinition
export function scoreToStage(score: number): MomentumStage
export function classificationToDelta(classification: string): number
```

**Variables:**
- camelCase for all variables
- Descriptive names, no single-letter except loop variables
- Constants in UPPER_SNAKE_CASE (const STAGES, const PADDING_Y)
- State variables with paired setter: `[hoveredId, setHoveredId]`

**Classes/Interfaces/Types:**
- PascalCase for all type definitions
- Interface naming: `{Entity}`, `{Entity}Props`, `{Entity}Summary`
- Type naming: lowercase union types for discriminators (`ObjectiveStatus`, `MomentumStage`)
- Example from `src/lib/types.ts`:
```typescript
export interface Company { ... }
export interface CompanySummary extends Company { ... }
export type MomentumStage = "orbit" | "fly" | ...
```

**Class Names (Tailwind):**
- Use computed strings for dynamic values: `style={{ color: stage.colour }}`
- Never interpolate directly; use Tailwind opacity: `bg-red-500/10`
- Array patterns for conditionals: `{shouldHide ? "hidden" : ""}`

## Import Organization

**Order:**
1. React/Next.js imports
2. Third-party libraries (framer-motion, @supabase/supabase-js)
3. Local absolute imports (using `@/` alias)
4. Local relative imports

**Example from `src/components/company/ObjectiveCard.tsx`:**
```typescript
"use client";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { Objective, Signal } from "@/lib/types";
import { getStage, scoreToStage } from "@/lib/momentum";
import { EvidenceDrawer } from "./EvidenceDrawer";
```

**Path Aliases:**
- `@/` maps to `src/` (defined in `tsconfig.json`)
- Always use absolute imports from `@/` instead of relative paths like `../../../`
- Exception: sibling component imports can use relative (e.g., `./EvidenceDrawer`)

**Type Imports:**
- Use `import type { Type }` for type-only imports
- Separates type definitions from values at the top of files

## Comments & Documentation

**When to Comment:**
- Complex algorithms (e.g., timeline interpolation in `timeline-nodes.ts`)
- Non-obvious business logic (e.g., momentum calculation deltas)
- Edge cases or surprising behavior
- Never comment obvious code

**JSDoc/TSDoc:**
- Use for exported functions and utilities
- Example from `src/lib/timeline-nodes.ts`:
```typescript
/**
 * Generate typed monthly nodes from a chronologically sorted signal list.
 * Produces one node per month from the first signal's month to `endDate`.
 * Interpolates cadence node scores between adjacent signals.
 */
export function generateMonthlyNodes(
  signals: Signal[],
  endDate: Date,
  fiscalYearEndMonth?: number
): TimelineMonthNode[]
```

**Inline Comments:**
- Use for non-obvious fixes or workarounds
- Example from `src/components/company/TimelineCanvas.tsx`:
```typescript
// Sort signals chronologically
const sorted = [...signals].sort(
  (a, b) => new Date(a.signal_date).getTime() - new Date(b.signal_date).getTime()
);
```

## Function Design

**Parameters:**
- Maximum 3 parameters; use objects for more
- Named parameters over positional
- Type each parameter explicitly

**Example from `src/lib/timeline-nodes.ts`:**
```typescript
// Good: semantic parameter names
function generateMonthlyNodes(
  signals: Signal[],
  endDate: Date,
  fiscalYearEndMonth?: number
)

// Alternative for complex cases would use object:
interface GenerateMonthlyNodesOptions {
  signals: Signal[];
  endDate: Date;
  fiscalYearEndMonth?: number;
}
```

**Return Values:**
- Always declare return type explicitly
- Use union types for multiple return shapes
- Null/undefined only when genuinely optional
- Example from `src/components/company/ObjectiveCard.tsx`:
```typescript
function getDeadlineBadge(objective: Objective):
  { label: string; className: string } | null
```

**Size Guidelines:**
- Keep functions under 50 lines when practical
- Break complex components into smaller components or hooks
- Each function should do one thing

## Module Design & Exports

**Export Patterns:**
- Named exports for all public functions/components
- Default exports only for pages (App Router)
- Example from `src/lib/momentum.ts`:
```typescript
export const STAGES: StageDefinition[] = [...]
export function getStage(name: MomentumStage): StageDefinition
export function scoreToStage(score: number): MomentumStage
export function classificationToDelta(classification: string): number
```

**Barrel Files:**
- Not used in current structure
- Import directly from modules: `import { getStage } from "@/lib/momentum"`

**Re-exports:**
- Minimal re-export of types; import from `types.ts` directly

## Git Commit Messages

**Format:**
```
type(scope): description

[optional body explaining why]
```

**Types observed:**
- `feat` — new feature (`feat(CompanyCard): replace progress bar with accountability tier label`)
- `fix` — bug fix (`fix: use is_in_graveyard fallback for objectives filtering`)
- `docs` — documentation (`docs: mark Sub-project 4 delivered`)
- `test` — test additions (`test: add commitment_type defaults to all mock Objective objects`)
- `chore` — dependencies, config (`chore: add firecrawl-py dependency`)
- `refactor` — code restructuring (no behaviour change)

**Scope Examples:**
- Component name: `CompanyCard`, `ObjectiveCard`, `TimelineCanvas`
- Feature area: `lib`, `types`, `agent`, `schema`

**Examples from recent commits:**
- `feat(CompanyCard): replace progress bar with accountability tier label`
- `feat(types): add accountability_tier to Company interface`
- `fix: use is_in_graveyard fallback for objectives filtering`
- `docs(schema): document v5 accountability grading migration`

## Linting & Formatting

**ESLint Config:**
- File: `eslint.config.mjs`
- Uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Run: `npm run lint`

**Prettier:**
- Not explicitly configured; follows Next.js defaults
- Tailwind CSS Automatic Class Sorting enabled via Tailwind CSS v4 integration

**TypeScript Strict Mode:**
- Enabled in `tsconfig.json`
- `strict: true` enforces all checks
- `noEmit: true` (build only, no output files)
- `jsx: "react-jsx"` (React 17+ JSX transform)

---

*Convention analysis: 2026-03-26*
