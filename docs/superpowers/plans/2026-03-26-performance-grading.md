# Performance Grading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 0–100 accountability score and 5-tier label (Exemplary / Solid / Watchlist / Drifting / Compromised) to every company, auto-computed from objective momentum and exit history, displayed on the company header and landing card.

**Architecture:** A Postgres `VOID` function `compute_accountability_score(company_id)` computes and writes the score + tier directly to the `companies` table. A trigger on `objectives` and `signals` keeps it current automatically. The frontend reads the new `accountability_tier` column alongside the existing `overall_commitment_score`. Display: tier label as primary (coloured mono), score as secondary metadata.

**Tech Stack:** Supabase SQL (run via Dashboard SQL Editor), TypeScript/React, Tailwind CSS, Vitest + React Testing Library

---

## File Map

| Action | File | Change |
|---|---|---|
| Supabase Dashboard | SQL migration (inline in Task 1) | Add `accountability_tier` column + `compute_accountability_score()` function + 2 triggers |
| Modify | `frontend/src/lib/types.ts` | Add `accountability_tier` to `Company` interface |
| Create | `frontend/src/lib/accountability.ts` | Tier colour map + tier label utility |
| Modify | `frontend/src/components/company/CompanyHeader.tsx` | Replace score block with tier-primary display |
| Modify | `frontend/src/components/landing/CompanyCard.tsx` | Replace progress bar with tier display |
| Modify | `frontend/src/__tests__/components/company/CompanyHeader.test.tsx` | Add `accountability_tier` to mock + new assertions |
| Modify | `frontend/src/__tests__/components/landing/CompanyCard.test.tsx` | Add `accountability_tier` to mock + new assertions |

> **Note on live DB state:** The live Supabase DB uses `is_in_graveyard boolean` on objectives (the `terminal_state` migration was deferred). The SQL in Task 1 is written for this state and uses `is_in_graveyard`. If the `terminal_state` migration is later applied, update the function body to use `terminal_state = 'buried'` and `terminal_state = 'proved'` instead.

---

### Task 1: Schema migration — run in Supabase Dashboard

**Where to run:** Supabase Dashboard → SQL Editor → New query

- [ ] **Step 1: Add the `accountability_tier` column**

Run this SQL in the Supabase Dashboard:

```sql
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS accountability_tier text
  CHECK (accountability_tier IN ('Exemplary', 'Solid', 'Watchlist', 'Drifting', 'Compromised'));
```

Verify:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'companies' AND column_name = 'accountability_tier';
```
Expected: one row, `data_type = text`.

- [ ] **Step 2: Create `compute_accountability_score()` function**

Run this SQL in the Supabase Dashboard:

```sql
CREATE OR REPLACE FUNCTION compute_accountability_score(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_weighted_sum   numeric := 0;
  v_total_weight   numeric := 0;
  v_base_score     numeric;
  v_proved_bonus   integer := 0;
  v_stale_penalty  integer := 0;
  v_silent_penalty integer := 0;
  v_transp_penalty integer := 0;
  v_final_score    integer;
  v_tier           text;
  r                record;
BEGIN
  -- 1. Weighted momentum average for active objectives
  --    (active = is_in_graveyard IS NOT TRUE)
  --    Objectives with a signal in the last 90 days get weight 2; others get weight 1.
  FOR r IN
    SELECT
      o.momentum_score,
      CASE
        WHEN MAX(s.signal_date) >= CURRENT_DATE - INTERVAL '90 days' THEN 2
        ELSE 1
      END AS weight
    FROM objectives o
    LEFT JOIN signals s
      ON s.objective_id = o.id AND s.is_draft = false
    WHERE o.company_id = p_company_id
      AND (o.is_in_graveyard IS NULL OR o.is_in_graveyard = false)
    GROUP BY o.id, o.momentum_score
  LOOP
    v_weighted_sum := v_weighted_sum + ((COALESCE(r.momentum_score, 0) + 4.0) / 8.0 * 100.0) * r.weight;
    v_total_weight := v_total_weight + r.weight;
  END LOOP;

  IF v_total_weight > 0 THEN
    v_base_score := v_weighted_sum / v_total_weight;
  ELSE
    v_base_score := 50; -- neutral when no active objectives
  END IF;

  -- 2. Stale penalty: active objectives with no signal in last 180 days → -5 each, cap -20
  SELECT LEAST(COUNT(*) * 5, 20) INTO v_stale_penalty
  FROM objectives o
  WHERE o.company_id = p_company_id
    AND (o.is_in_graveyard IS NULL OR o.is_in_graveyard = false)
    AND NOT EXISTS (
      SELECT 1 FROM signals s
      WHERE s.objective_id = o.id
        AND s.is_draft = false
        AND s.signal_date >= CURRENT_DATE - INTERVAL '180 days'
    );

  -- 3. Silent/phased graveyard exit penalty → -10 each, cap -30
  SELECT LEAST(COUNT(*) * 10, 30) INTO v_silent_penalty
  FROM objectives
  WHERE company_id = p_company_id
    AND is_in_graveyard = true
    AND exit_manner IN ('silent', 'phased');

  -- 4. Transparent/morphed exit penalty → -3 each, no cap
  SELECT COUNT(*) * 3 INTO v_transp_penalty
  FROM objectives
  WHERE company_id = p_company_id
    AND is_in_graveyard = true
    AND exit_manner IN ('transparent', 'morphed');

  -- 5. Proved bonus — only applies if terminal_state column exists (post-migration)
  --    For current live DB (is_in_graveyard only), v_proved_bonus stays 0.
  --    After terminal_state migration, update this block to:
  --    SELECT LEAST(COUNT(*) * 5, 20) INTO v_proved_bonus
  --    FROM objectives WHERE company_id = p_company_id AND terminal_state = 'proved';

  -- 6. Compute and clamp
  v_final_score := GREATEST(0, LEAST(100,
    ROUND(v_base_score + v_proved_bonus - v_stale_penalty - v_silent_penalty - v_transp_penalty)
  ));

  -- 7. Derive tier
  v_tier := CASE
    WHEN v_final_score >= 80 THEN 'Exemplary'
    WHEN v_final_score >= 60 THEN 'Solid'
    WHEN v_final_score >= 40 THEN 'Watchlist'
    WHEN v_final_score >= 20 THEN 'Drifting'
    ELSE 'Compromised'
  END;

  -- 8. Write back
  UPDATE companies
  SET overall_commitment_score = v_final_score,
      accountability_tier      = v_tier,
      updated_at               = now()
  WHERE id = p_company_id;
END;
$$;
```

- [ ] **Step 3: Verify the function was created**

```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'compute_accountability_score';
```
Expected: one row.

- [ ] **Step 4: Test the function against Sandoz**

```sql
-- Get Sandoz company_id first:
SELECT id FROM companies WHERE ticker ILIKE 'sdz';

-- Run the function (replace the UUID with the actual id):
SELECT compute_accountability_score('<sandoz-uuid-here>');

-- Verify result:
SELECT overall_commitment_score, accountability_tier
FROM companies WHERE ticker ILIKE 'sdz';
```
Expected: `overall_commitment_score` is an integer 0–100, `accountability_tier` is one of the 5 labels.

- [ ] **Step 5: Create triggers on objectives and signals**

```sql
CREATE OR REPLACE FUNCTION _recompute_accountability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM compute_accountability_score(OLD.company_id);
  ELSE
    PERFORM compute_accountability_score(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_accountability_objectives
  AFTER INSERT OR UPDATE OR DELETE ON objectives
  FOR EACH ROW EXECUTE FUNCTION _recompute_accountability();

CREATE TRIGGER trg_accountability_signals
  AFTER INSERT OR UPDATE OR DELETE ON signals
  FOR EACH ROW EXECUTE FUNCTION _recompute_accountability();
```

- [ ] **Step 6: Verify triggers fire — update a signal and check score changes**

```sql
-- Note current score:
SELECT overall_commitment_score FROM companies WHERE ticker ILIKE 'sdz';

-- Touch any signal for Sandoz (update confidence by 0 net-change to fire trigger):
UPDATE signals SET confidence = confidence WHERE company_id = (
  SELECT id FROM companies WHERE ticker ILIKE 'sdz'
) LIMIT 1;

-- Score should recompute (value may be same, but updated_at changes):
SELECT overall_commitment_score, accountability_tier, updated_at
FROM companies WHERE ticker ILIKE 'sdz';
```
Expected: `updated_at` is now(), `accountability_tier` is populated.

- [ ] **Step 7: Back-fill all existing companies**

```sql
SELECT compute_accountability_score(id) FROM companies WHERE tracking_active = true;
```

- [ ] **Step 8: Add migration to schema.sql for reference**

In `backend/schema.sql`, find the section after the `companies` table definition and add a comment block documenting the migration (do NOT run it again — just document it for future fresh installs):

```sql
-- ── V5 MIGRATION: ACCOUNTABILITY GRADING ────────────────────
-- Run once against existing DBs (already applied to live DB 2026-03-26):
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS accountability_tier text
--   CHECK (accountability_tier IN ('Exemplary','Solid','Watchlist','Drifting','Compromised'));
-- [Then create compute_accountability_score() and triggers as above]
```

- [ ] **Step 9: Commit schema.sql**

```bash
git add backend/schema.sql
git commit -m "docs(schema): document v5 accountability grading migration"
```

---

### Task 2: `lib/accountability.ts` — tier colour utility

**Files:**
- Create: `frontend/src/lib/accountability.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/lib/accountability.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { TIER_COLOURS, tierColour } from "@/lib/accountability";

describe("TIER_COLOURS", () => {
  it("has a colour for every tier", () => {
    const tiers = ["Exemplary", "Solid", "Watchlist", "Drifting", "Compromised"] as const;
    for (const tier of tiers) {
      expect(TIER_COLOURS[tier]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("tierColour", () => {
  it("returns correct colour for Solid", () => {
    expect(tierColour("Solid")).toBe("#65a30d");
  });

  it("returns fallback for null", () => {
    expect(tierColour(null)).toBe("#94a3b8");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend
npx vitest run src/__tests__/lib/accountability.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/accountability'`

- [ ] **Step 3: Create the utility**

Create `frontend/src/lib/accountability.ts`:

```typescript
export const TIER_COLOURS = {
  Exemplary:   "#16a34a",
  Solid:       "#65a30d",
  Watchlist:   "#d97706",
  Drifting:    "#ea580c",
  Compromised: "#dc2626",
} as const;

export type AccountabilityTier = keyof typeof TIER_COLOURS;

export function tierColour(tier: AccountabilityTier | null | undefined): string {
  if (!tier) return "#94a3b8"; // muted fallback
  return TIER_COLOURS[tier];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend
npx vitest run src/__tests__/lib/accountability.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/accountability.ts frontend/src/__tests__/lib/accountability.test.ts
git commit -m "feat(lib): add accountability tier colour utility"
```

---

### Task 3: Update `types.ts`

**Files:**
- Modify: `frontend/src/lib/types.ts`

- [ ] **Step 1: Add `accountability_tier` to the `Company` interface**

In `frontend/src/lib/types.ts`, find the `Company` interface (currently ends at `created_at: string;`). Add `accountability_tier` after `last_research_run`:

```typescript
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
  fiscal_year_end_month: number;
  last_research_run: string | null;
  accountability_tier: "Exemplary" | "Solid" | "Watchlist" | "Drifting" | "Compromised" | null;
  created_at: string;
}
```

- [ ] **Step 2: Run all tests to confirm nothing breaks**

```bash
cd frontend
npx vitest run
```
Expected: all existing tests pass (new field is nullable — no existing mocks break).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/types.ts
git commit -m "feat(types): add accountability_tier to Company interface"
```

---

### Task 4: Update `CompanyHeader.tsx`

**Files:**
- Modify: `frontend/src/components/company/CompanyHeader.tsx`

- [ ] **Step 1: Write the failing tests**

Check if `frontend/src/__tests__/components/company/CompanyHeader.test.tsx` exists. If it does not, create it:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import type { Company } from "@/lib/types";

const mockCompany: Company = {
  id: "1",
  name: "Sandoz AG",
  ticker: "SDZ",
  exchange: "SIX",
  sector: "pharma",
  initiative_name: "The Golden Decade",
  initiative_subtitle: null,
  ir_page_url: null,
  overall_commitment_score: 72,
  accountability_tier: "Solid",
  tracking_active: true,
  fiscal_year_end_month: 12,
  last_research_run: "2026-03-01",
  created_at: "2025-01-01",
};

describe("CompanyHeader", () => {
  it("renders company name", () => {
    render(<CompanyHeader company={mockCompany} editorialAssessment={null} />);
    expect(screen.getByText("Sandoz AG")).toBeInTheDocument();
  });

  it("renders tier label as primary text", () => {
    render(<CompanyHeader company={mockCompany} editorialAssessment={null} />);
    expect(screen.getByText("SOLID")).toBeInTheDocument();
  });

  it("renders score as secondary text", () => {
    render(<CompanyHeader company={mockCompany} editorialAssessment={null} />);
    expect(screen.getByText("72 / 100")).toBeInTheDocument();
  });

  it("renders Accountability label", () => {
    render(<CompanyHeader company={mockCompany} editorialAssessment={null} />);
    expect(screen.getByText("Accountability")).toBeInTheDocument();
  });

  it("renders nothing in grade block when tier is null", () => {
    const noTier = { ...mockCompany, accountability_tier: null };
    render(<CompanyHeader company={noTier} editorialAssessment={null} />);
    expect(screen.queryByText("SOLID")).not.toBeInTheDocument();
    expect(screen.queryByText("72 / 100")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend
npx vitest run src/__tests__/components/company/CompanyHeader.test.tsx
```
Expected: FAIL — "SOLID" not found, "72 / 100" not found.

- [ ] **Step 3: Update the component**

In `frontend/src/components/company/CompanyHeader.tsx`:

Add import at top:
```typescript
import { TIER_COLOURS } from "@/lib/accountability";
```

Replace the entire grade block (the `{company.overall_commitment_score != null && (...)}` section, currently lines 35–44):

```tsx
{company.accountability_tier != null && (
  <div className="text-right shrink-0">
    <div
      className="font-mono text-[1.05rem] font-semibold uppercase tracking-[0.05em]"
      style={{ color: TIER_COLOURS[company.accountability_tier] }}
    >
      {company.accountability_tier.toUpperCase()}
    </div>
    {company.overall_commitment_score != null && (
      <div className="font-mono text-[0.7rem] text-muted-foreground mt-0.5">
        {company.overall_commitment_score} / 100
      </div>
    )}
    <div className="font-mono text-[0.6rem] text-muted-foreground uppercase tracking-[0.12em] mt-0.5">
      Accountability
    </div>
  </div>
)}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend
npx vitest run src/__tests__/components/company/CompanyHeader.test.tsx
```
Expected: PASS (5 tests)

- [ ] **Step 5: Run all tests**

```bash
cd frontend
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/company/CompanyHeader.tsx frontend/src/__tests__/components/company/CompanyHeader.test.tsx
git commit -m "feat(CompanyHeader): show accountability tier as primary grade display"
```

---

### Task 5: Update `CompanyCard.tsx`

**Files:**
- Modify: `frontend/src/components/landing/CompanyCard.tsx`
- Modify: `frontend/src/__tests__/components/landing/CompanyCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Open `frontend/src/__tests__/components/landing/CompanyCard.test.tsx`. Add `accountability_tier: "Solid"` to the existing `mockCompany` object:

```typescript
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
  accountability_tier: "Solid",   // ← add this
  tracking_active: true,
  fiscal_year_end_month: 12,
  last_research_run: "2026-03-01",
  created_at: "2025-01-01",
  objectives: [],
  active_count: 4,
  drifting_count: 1,
  proved_count: 0,
  buried_count: 3,
  editorial_verdict: "On pace, but the cracks are showing in the margin story.",
};
```

Then add these two new tests at the bottom of the `describe` block:

```typescript
  it("renders accountability tier label", () => {
    render(<CompanyCard company={mockCompany} />);
    expect(screen.getByText("Solid")).toBeInTheDocument();
  });

  it("does not render a progress bar", () => {
    const { container } = render(<CompanyCard company={mockCompany} />);
    expect(container.querySelector(".h-1.bg-muted")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
cd frontend
npx vitest run src/__tests__/components/landing/CompanyCard.test.tsx
```
Expected: existing tests pass, new "tier label" test fails.

- [ ] **Step 3: Update the component**

In `frontend/src/components/landing/CompanyCard.tsx`:

Add import at top (after existing imports):
```typescript
import { TIER_COLOURS } from "@/lib/accountability";
```

Replace the entire bottom section of the card (the `{company.overall_commitment_score != null && (...)}` block at the end, currently lines 53–60) with:

```tsx
{company.accountability_tier != null && (
  <div className="mt-2 flex items-center justify-between">
    <span
      className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.06em]"
      style={{ color: TIER_COLOURS[company.accountability_tier] }}
    >
      {company.accountability_tier}
    </span>
    {company.overall_commitment_score != null && (
      <span className="font-mono text-[0.6rem] text-muted-foreground">
        {company.overall_commitment_score}
      </span>
    )}
  </div>
)}
```

Also remove the emoji from the top-right (the `<span className="text-lg" title={topStage}>` block and the `topStage` / `getStageEmoji` imports/logic) since the tier label replaces it:

Remove lines 3–4 (`import { scoreToStage, getStageEmoji }` and `const topStage = ...`) and remove the emoji `<span>` element.

The final top of the card's inner content becomes:
```tsx
<div className="flex items-start justify-between mb-2">
  <span className="font-mono text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
    {company.ticker}
  </span>
</div>
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
cd frontend
npx vitest run src/__tests__/components/landing/CompanyCard.test.tsx
```
Expected: all 6 tests pass.

- [ ] **Step 5: Run full test suite**

```bash
cd frontend
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/landing/CompanyCard.tsx frontend/src/__tests__/components/landing/CompanyCard.test.tsx
git commit -m "feat(CompanyCard): replace progress bar with accountability tier label"
```

---

### Task 6: Update roadmap + push to production

**Files:**
- Modify: `2026-03-25-2121-drift-visual-and-intelligence-roadmap.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Mark phases delivered in roadmap**

In `2026-03-25-2121-drift-visual-and-intelligence-roadmap.md`, update the Sub-project 4 table:

```markdown
| Phase | Scope | Status |
|---|---|---|
| 4.0 | Brainstorm + spec (this document) | ✅ Delivered |
| 4.1 | Schema — `accountability_tier` column, `compute_accountability_score()` function, triggers | ✅ Delivered |
| 4.2 | Frontend — `CompanyHeader` + `CompanyCard` grade display | ✅ Delivered |
```

And add to the Delivery log:
```markdown
| 2026-03-26 | 4.0-4.2 | Accountability score + tier: Postgres function, auto-trigger, CompanyHeader + CompanyCard display |
```

- [ ] **Step 2: Add CHANGELOG entry**

Add at the top of `CHANGELOG.md`:

```markdown
## [3.3.0] - 2026-03-26

### Added
- **Accountability score** — 0–100 grade auto-computed from objective momentum, exit history, and signal recency
- **Accountability tier** — 5-label classification: Exemplary / Solid / Watchlist / Drifting / Compromised
- **`compute_accountability_score()` Postgres function** — VOID function writing score + tier to `companies` table
- **Auto-trigger** — score recomputes on every `objectives` or `signals` change
- **`lib/accountability.ts`** — tier colour map utility
- `accountability_tier` field on `Company` type

### Changed
- **`CompanyHeader`** — grade block now shows tier label as primary, score as secondary metadata
- **`CompanyCard`** — replaces momentum emoji + progress bar with accountability tier label + score
```

- [ ] **Step 3: Final test run and build check**

```bash
cd frontend
npx vitest run && npm run build
```
Expected: all tests pass, build succeeds.

- [ ] **Step 4: Commit and push**

```bash
git add 2026-03-25-2121-drift-visual-and-intelligence-roadmap.md CHANGELOG.md
git commit -m "docs: mark Sub-project 4 delivered, add v3.3.0 changelog"
git push
```
