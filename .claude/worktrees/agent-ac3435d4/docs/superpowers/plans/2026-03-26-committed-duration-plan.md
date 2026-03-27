# Committed Duration & Time-aware Tracking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add commitment windows to objectives so they are tracked against the time period the company committed to, not just open-ended momentum.

**Architecture:** Three new columns on `objectives` (`committed_from`, `committed_until`, `commitment_type`), a new `deadline_shifted` signal classification, a daily Postgres escalation function, agent prompt updates for commitment-aware research, and frontend components for a deadline flag on the timeline canvas and a deadline badge on ObjectiveCards.

**Tech Stack:** Postgres/Supabase (schema), Python + Anthropic SDK (agent), Next.js 15 + TypeScript + Tailwind CSS (frontend), Vitest + React Testing Library (tests)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `backend/schema.sql` | Add columns, enum value, trigger, view updates, seed data |
| Modify | `backend/agent.py` | Update prompts + write logic for commitment windows |
| Modify | `frontend/src/lib/types.ts` | Add commitment fields to TypeScript interfaces |
| Create | `frontend/src/components/company/DeadlineFlag.tsx` | SVG deadline flag marker for timeline canvas |
| Modify | `frontend/src/components/company/TimelineCanvas.tsx` | Render DeadlineFlag for objectives with deadlines |
| Modify | `frontend/src/components/company/ObjectiveCard.tsx` | Add deadline badge pill |
| Modify | `frontend/src/components/company/TimelineLegend.tsx` | Add deadline flag entry to legend |
| Create | `frontend/src/__tests__/components/company/DeadlineFlag.test.tsx` | Tests for DeadlineFlag component |
| Modify | `frontend/src/__tests__/components/company/ObjectiveCard.test.tsx` | Tests for deadline badge |
| Modify | `frontend/src/__tests__/components/company/TimelineCanvas.test.tsx` | Tests for deadline flag rendering |

---

## Task 1: Schema — Add commitment fields and enum value

**Files:**
- Modify: `backend/schema.sql`

- [ ] **Step 1: Add commitment columns to objectives table definition**

In `backend/schema.sql`, add the three new columns to the `objectives` CREATE TABLE block, after the `terminal_state` column (line 157):

```sql
  -- Commitment window
  committed_from        date,
  committed_until       date,
  commitment_type       text not null default 'evergreen'
                        check (commitment_type in ('annual', 'multi_year', 'evergreen')),
```

- [ ] **Step 2: Add `deadline_shifted` to signal_classification enum**

In the `signal_classification` enum definition (line 25-35), add a new value after `year_end_review`:

```sql
create type signal_classification as enum (
  'stated',
  'reinforced',
  'softened',
  'reframed',
  'absent',
  'achieved',
  'retired_transparent',
  'retired_silent',
  'year_end_review',
  'deadline_shifted'
);
```

- [ ] **Step 3: Add daily escalation function**

After the `refresh_company_counts` trigger (line 302), add the escalation function:

```sql
-- ── FUNCTION: auto-escalate overdue objectives ─────────────────
-- Called daily via pg_cron or Supabase scheduled function.
-- Moves active objectives past their committed_until to 'watch' status
-- and inserts an 'absent' signal noting the expiry.

create or replace function escalate_overdue_objectives()
returns void language plpgsql as $$
declare
  obj record;
begin
  for obj in
    select id, company_id, title, committed_until
    from objectives
    where committed_until < current_date
      and status = 'active'
      and terminal_state is null
      and commitment_type != 'evergreen'
  loop
    -- Escalate status
    update objectives set status = 'watch', status_changed_at = now()
    where id = obj.id;

    -- Insert system signal
    insert into signals (
      objective_id, company_id, signal_date, source_type, source_name,
      classification, confidence, excerpt, agent_reasoning, detected_by, is_draft
    ) values (
      obj.id, obj.company_id, current_date, 'other', 'System — Deadline Escalation',
      'absent', 10,
      'Committed window expired (' || obj.committed_until || ') with no update from company. Status auto-escalated to watch.',
      'Automatic escalation: objective was active past its committed_until date with no deadline_shifted signal.',
      'system', false
    );
  end loop;
end;
$$;
```

- [ ] **Step 4: Update v_company_summary view**

Replace the `v_company_summary` view (line 308-331) to include commitment fields in the objectives JSON:

```sql
create or replace view v_company_summary as
select
  c.id,
  c.name,
  c.ticker,
  c.sector,
  c.initiative_name,
  c.initiative_subtitle,
  c.logo_initials,
  c.accent_color,
  c.overall_commitment_score,
  c.active_objective_count,
  c.proved_count,
  c.graveyard_count,
  c.last_signal_date,
  c.last_research_run,
  json_agg(
    json_build_object(
      'status', o.status,
      'title', o.title,
      'terminal_state', o.terminal_state,
      'committed_until', o.committed_until,
      'commitment_type', o.commitment_type
    )
    order by o.display_order
  ) filter (where o.id is not null) as objectives_summary
from companies c
left join objectives o on o.company_id = c.id
where c.tracking_active = true
group by c.id;
```

- [ ] **Step 5: Add V4 migration comments**

After the V3 migration comments section (line 445), add:

```sql
-- ── V4 MIGRATIONS: Commitment Windows ───────────────────────────
-- Run these against existing installations to bring them up to v4 schema

-- Step 1: Add commitment columns
-- ALTER TABLE objectives ADD COLUMN committed_from date;
-- ALTER TABLE objectives ADD COLUMN committed_until date;
-- ALTER TABLE objectives ADD COLUMN commitment_type text NOT NULL DEFAULT 'evergreen'
--   CHECK (commitment_type IN ('annual', 'multi_year', 'evergreen'));

-- Step 2: Add new signal classification
-- ALTER TYPE signal_classification ADD VALUE 'deadline_shifted';

-- Step 3: Create escalation function (copy from above)

-- Step 4: Update v_company_summary view (copy from above)

-- Step 5: Seed Sandoz commitment windows
-- UPDATE objectives SET commitment_type = 'multi_year', committed_from = '2023-10-01', committed_until = '2028-12-31'
--   WHERE title = 'Global Biosimilar Leadership';
-- UPDATE objectives SET commitment_type = 'annual', committed_from = '2024-01-01', committed_until = '2025-12-31'
--   WHERE title = 'US Biosimilar Penetration';
-- UPDATE objectives SET commitment_type = 'annual', committed_from = '2024-01-01', committed_until = '2025-12-31'
--   WHERE title LIKE 'Emerging Markets%';
-- UPDATE objectives SET commitment_type = 'multi_year', committed_from = '2023-10-01', committed_until = '2027-12-31'
--   WHERE title LIKE 'Next-Wave%';
-- UPDATE objectives SET commitment_type = 'multi_year', committed_from = '2023-10-01', committed_until = '2026-12-31'
--   WHERE title LIKE 'Manufacturing%';
-- UPDATE objectives SET commitment_type = 'annual', committed_from = '2024-01-01', committed_until = '2025-12-31'
--   WHERE title LIKE 'Margin Expansion%';
```

- [ ] **Step 6: Commit**

```bash
git add backend/schema.sql
git commit -m "feat(schema): add commitment window fields, deadline_shifted classification, escalation function"
```

---

## Task 2: Agent — Update prompts and write logic

**Files:**
- Modify: `backend/agent.py`

- [ ] **Step 1: Add `deadline_shifted` to SIGNAL_CLASSES**

At line 54-64, add the new classification to the list:

```python
SIGNAL_CLASSES = [
    "stated",
    "reinforced",
    "softened",
    "reframed",
    "absent",
    "achieved",
    "retired_transparent",
    "retired_silent",
    "year_end_review",
    "deadline_shifted",
]
```

- [ ] **Step 2: Update build_intake_prompt to extract commitment windows**

In `build_intake_prompt()` (starts at line 182), add commitment window extraction to the return format. Replace the objectives JSON template inside the prompt string. After `"display_order": 1,` add:

```python
              "commitment_type": "annual|multi_year|evergreen",
              "committed_from": "YYYY-MM-DD or null if evergreen",
              "committed_until": "YYYY-MM-DD or null if evergreen",
```

And add this section before the `RETURN FORMAT` line:

```python
        5. For each objective, determine the committed delivery window:
           - ANNUAL: Tied to the company's fiscal year ending month {company.get('fiscal_year_end_month', 12)}.
             Set committed_from to the fiscal year start, committed_until to the fiscal year end.
           - MULTI_YEAR: The company stated an explicit future target date (e.g., "by 2027", "within 3 years").
             Set committed_from to first_stated_date, committed_until to the stated target.
           - EVERGREEN: No stated deadline — ongoing priority. Set both dates to null.
```

- [ ] **Step 3: Update build_monthly_prompt to check commitment windows**

In `build_monthly_prompt()` (starts at line 262), update the objective summary to include commitment info. Replace the `obj_summary` builder:

```python
    obj_summary = "\n".join([
        f"  - [{o['status'].upper()}] {o['title']} "
        f"(last confirmed: {o.get('last_confirmed_date', 'unknown')}, "
        f"commitment: {o.get('commitment_type', 'evergreen')}, "
        f"deadline: {o.get('committed_until', 'none')})"
        for o in objectives
    ])
```

Add commitment awareness section before the `CLASSIFICATION GUIDE:` line:

```python
        5. COMMITMENT WINDOW AWARENESS:
           For each objective with a committed window (commitment_type != 'evergreen'):
           - Has the company confirmed the original timeline is still on track?
           - Has the company extended or shortened the deadline?
             If so, classify as "deadline_shifted" and include old and new dates in excerpt.
           - Has the deadline passed with no acknowledgment? Note this.
```

Add `deadline_shifted` to the classification guide:

```python
        - "deadline_shifted"    → Company has moved its committed deadline (extended or shortened)
```

- [ ] **Step 4: Fix build_correlation_prompt — replace is_in_graveyard with terminal_state**

In `build_correlation_prompt()` (starts at line 361), fix the objective summary builder at line 370-377. Replace:

```python
        status_tag = "GRAVEYARD" if o.get("is_in_graveyard") else o.get("status", "active").upper()
```

with:

```python
        status_tag = "PROVED" if o.get("terminal_state") == "proved" else "BURIED" if o.get("terminal_state") == "buried" else o.get("status", "active").upper()
```

Replace the `Graveyard: {o.get('is_in_graveyard', False)}` in the f-string at line 375:

```python
            f"    Momentum: {o.get('momentum_score', 0)} | Status: {o.get('status')} | Terminal: {o.get('terminal_state', 'none')}\n"
```

Add commitment window context to the objective summary line:

```python
            f"    Commitment: {o.get('commitment_type', 'evergreen')} | Deadline: {o.get('committed_until', 'none')}\n"
```

- [ ] **Step 5: Add commitment awareness to correlation prompt**

In the correlation prompt text, add after the momentum score guidelines section:

```python
        COMMITMENT WINDOW CONTEXT:
        When evaluating momentum, consider the commitment window:
        - An objective approaching its deadline with strong signals deserves credit
        - An objective past its deadline with no acknowledgment is more concerning than one still within window
        - Deadline shifts (extensions) without explanation should be flagged
```

- [ ] **Step 6: Update correlation prompt JSON — replace is_in_graveyard with terminal_state**

In the `build_correlation_prompt()` return JSON template (around line 464-476), replace `"is_in_graveyard": false` with `"terminal_state": "proved|buried|null"`.

- [ ] **Step 7: Update run_correlation_pass — replace is_in_graveyard writes**

In `run_correlation_pass()` at line 742-743, replace:

```python
            if update.get("is_in_graveyard") is not None:
                obj_patch["is_in_graveyard"] = update["is_in_graveyard"]
```

with:

```python
            if update.get("terminal_state"):
                obj_patch["terminal_state"] = update["terminal_state"]
```

- [ ] **Step 8: Update run_monthly — replace is_in_graveyard writes**

In `run_monthly()` at line 630-632, replace:

```python
            if prop["proposed_status"] in ("dropped", "morphed"):
                obj_update["is_in_graveyard"] = True
                obj_update["exit_date"] = date.today().isoformat()
```

with:

```python
            if prop["proposed_status"] in ("dropped", "morphed"):
                obj_update["terminal_state"] = "buried"
                obj_update["exit_date"] = date.today().isoformat()
            elif prop["proposed_status"] == "achieved":
                obj_update["terminal_state"] = "proved"
                obj_update["exit_date"] = date.today().isoformat()
```

- [ ] **Step 9: Update intake run — save commitment fields**

In `run_intake()` at line 533-536, where objectives are saved, ensure commitment fields are included. After `obj_data["company_id"] = company_id` add:

```python
            # Ensure commitment fields are passed through
            # (agent returns commitment_type, committed_from, committed_until)
```

No code change needed here — `save_objective` already passes through all fields from the agent JSON. The agent prompt (updated in Step 2) will return the fields, and they'll be saved automatically.

- [ ] **Step 10: Commit**

```bash
git add backend/agent.py
git commit -m "feat(agent): add commitment window awareness to prompts, fix is_in_graveyard references"
```

---

## Task 3: Frontend — TypeScript types

**Files:**
- Modify: `frontend/src/lib/types.ts`

- [ ] **Step 1: Add commitment fields to Objective interface**

In `frontend/src/lib/types.ts`, add three fields to the `Objective` interface after `terminal_state` (line 74):

```typescript
export interface Objective {
  // ... existing fields ...
  terminal_state: TerminalState | null;
  committed_from: string | null;
  committed_until: string | null;
  commitment_type: 'annual' | 'multi_year' | 'evergreen';
}
```

- [ ] **Step 2: Add `deadline_shifted` to SignalClassification**

Update the `SignalClassification` type (line 8-11):

```typescript
export type SignalClassification =
  | "stated" | "reinforced" | "softened" | "reframed"
  | "absent" | "achieved" | "retired_transparent" | "retired_silent"
  | "year_end_review" | "deadline_shifted";
```

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/lib/types.ts
git commit -m "feat(types): add commitment window fields to Objective, deadline_shifted classification"
```

---

## Task 4: Frontend — DeadlineFlag component

**Files:**
- Create: `frontend/src/components/company/DeadlineFlag.tsx`
- Create: `frontend/src/__tests__/components/company/DeadlineFlag.test.tsx`

- [ ] **Step 1: Write the test file**

Create `frontend/src/__tests__/components/company/DeadlineFlag.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DeadlineFlag } from "@/components/company/DeadlineFlag";

function renderInSvg(ui: React.ReactElement) {
  return render(<svg viewBox="0 0 800 620">{ui}</svg>);
}

describe("DeadlineFlag", () => {
  it("renders a dashed vertical line at the given x position", () => {
    const { container } = renderInSvg(
      <DeadlineFlag x={200} canvasTop={30} canvasBottom={590} isOverdue={false} label="Dec 2025" />
    );
    const line = container.querySelector("line");
    expect(line).toBeInTheDocument();
    expect(line?.getAttribute("x1")).toBe("200");
    expect(line?.getAttribute("stroke-dasharray")).toBe("4,4");
  });

  it("uses amber colour when not overdue", () => {
    const { container } = renderInSvg(
      <DeadlineFlag x={200} canvasTop={30} canvasBottom={590} isOverdue={false} label="Dec 2025" />
    );
    const line = container.querySelector("line");
    expect(line?.getAttribute("stroke")).toBe("#f59e0b");
  });

  it("uses red colour when overdue", () => {
    const { container } = renderInSvg(
      <DeadlineFlag x={200} canvasTop={30} canvasBottom={590} isOverdue={true} label="Dec 2025" />
    );
    const line = container.querySelector("line");
    expect(line?.getAttribute("stroke")).toBe("#dc2626");
  });

  it("renders the flag triangle polygon", () => {
    const { container } = renderInSvg(
      <DeadlineFlag x={200} canvasTop={30} canvasBottom={590} isOverdue={false} label="Dec 2025" />
    );
    const polygon = container.querySelector("polygon");
    expect(polygon).toBeInTheDocument();
  });

  it("renders the date label text", () => {
    const { container } = renderInSvg(
      <DeadlineFlag x={200} canvasTop={30} canvasBottom={590} isOverdue={false} label="Dec 2025" />
    );
    const text = container.querySelector("text");
    expect(text?.textContent).toBe("Dec 2025");
  });

  it("does not render when x is 0", () => {
    const { container } = renderInSvg(
      <DeadlineFlag x={0} canvasTop={30} canvasBottom={590} isOverdue={false} label="Dec 2025" />
    );
    const g = container.querySelector("g[data-deadline-flag]");
    expect(g).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/components/company/DeadlineFlag.test.tsx
```

Expected: FAIL — module `@/components/company/DeadlineFlag` not found.

- [ ] **Step 3: Write the DeadlineFlag component**

Create `frontend/src/components/company/DeadlineFlag.tsx`:

```tsx
interface DeadlineFlagProps {
  x: number;
  canvasTop: number;
  canvasBottom: number;
  isOverdue: boolean;
  label: string;
}

export function DeadlineFlag({ x, canvasTop, canvasBottom, isOverdue, label }: DeadlineFlagProps) {
  if (x <= 0) return null;

  const colour = isOverdue ? "#dc2626" : "#f59e0b";
  const flagWidth = 20;
  const flagHeight = 16;

  return (
    <g data-deadline-flag>
      {/* Vertical dashed line */}
      <line
        x1={x}
        y1={canvasTop}
        x2={x}
        y2={canvasBottom}
        stroke={colour}
        strokeWidth={1.5}
        strokeDasharray="4,4"
        opacity={0.7}
      />
      {/* Flag triangle */}
      <polygon
        points={`${x},${canvasTop} ${x + flagWidth},${canvasTop + flagHeight / 2} ${x},${canvasTop + flagHeight}`}
        fill={colour}
        opacity={0.6}
      />
      {/* Date label */}
      <text
        x={x + 4}
        y={canvasTop + flagHeight + 12}
        fontSize={9}
        fontFamily="var(--font-ibm-plex-mono)"
        fill={colour}
        opacity={0.8}
      >
        {label}
      </text>
    </g>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/__tests__/components/company/DeadlineFlag.test.tsx
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/company/DeadlineFlag.tsx frontend/src/__tests__/components/company/DeadlineFlag.test.tsx
git commit -m "feat(DeadlineFlag): add SVG deadline flag marker component with tests"
```

---

## Task 5: Frontend — Integrate DeadlineFlag into TimelineCanvas

**Files:**
- Modify: `frontend/src/components/company/TimelineCanvas.tsx`
- Modify: `frontend/src/__tests__/components/company/TimelineCanvas.test.tsx`

- [ ] **Step 1: Write the test**

Add to the bottom of `frontend/src/__tests__/components/company/TimelineCanvas.test.tsx`:

```tsx
  it("renders a deadline flag for objectives with a committed_until date", () => {
    const objWithDeadline = [
      makeObjective({
        id: "d",
        title: "Deadline Objective",
        display_number: 4,
        momentum_score: 2,
        committed_until: "2026-06-30",
        committed_from: "2025-01-01",
        commitment_type: "annual" as const,
      }),
    ];
    const sigs = [makeSignal("d", "2025-06-01", "stated")];
    const { container } = render(
      <TimelineCanvas objectives={objWithDeadline} signals={sigs} onNavigateToEvidence={vi.fn()} />
    );
    // Select the objective first by clicking its legend entry
    const legendButton = screen.getByText("Deadline Objective").closest("button");
    if (legendButton) fireEvent.click(legendButton);
    const deadlineFlag = container.querySelector("[data-deadline-flag]");
    expect(deadlineFlag).toBeInTheDocument();
  });

  it("does not render deadline flag for evergreen objectives", () => {
    const objEvergreen = [
      makeObjective({
        id: "e",
        title: "Evergreen Objective",
        display_number: 5,
        momentum_score: 1,
        commitment_type: "evergreen" as const,
      }),
    ];
    const sigs = [makeSignal("e", "2025-06-01", "stated")];
    const { container } = render(
      <TimelineCanvas objectives={objEvergreen} signals={sigs} onNavigateToEvidence={vi.fn()} />
    );
    const legendButton = screen.getByText("Evergreen Objective").closest("button");
    if (legendButton) fireEvent.click(legendButton);
    const deadlineFlag = container.querySelector("[data-deadline-flag]");
    expect(deadlineFlag).not.toBeInTheDocument();
  });
```

Update the `makeObjective` helper to include commitment fields with defaults:

```tsx
function makeObjective(overrides: Partial<Objective> & { id: string; title: string }): Objective {
  return {
    company_id: "c1",
    display_number: 1,
    subtitle: null,
    original_quote: null,
    status: "on_record",
    first_stated_date: null,
    last_confirmed_date: null,
    exit_date: null,
    exit_manner: null,
    transparency_score: null,
    verdict_text: null,
    successor_objective_id: null,
    momentum_score: 0,
    terminal_state: null,
    committed_from: null,
    committed_until: null,
    commitment_type: "evergreen",
    ...overrides,
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/components/company/TimelineCanvas.test.tsx
```

Expected: FAIL — `data-deadline-flag` not found in DOM.

- [ ] **Step 3: Add DeadlineFlag rendering to TimelineCanvas**

In `frontend/src/components/company/TimelineCanvas.tsx`:

Add the import at the top (after the CrossingMarker import, line 11):

```typescript
import { DeadlineFlag } from "./DeadlineFlag";
```

Add a `useMemo` to compute deadline flag positions. Place it after the `todayX` memo (after line 229):

```typescript
  // Deadline flags for objectives with commitment windows
  const deadlineFlags = useMemo(() => {
    return visibleObjectives
      .filter((obj) => obj.commitment_type !== "evergreen" && obj.committed_until)
      .map((obj) => {
        const deadlineDate = new Date(obj.committed_until!);
        const start = new Date(minDate);
        const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
        const monthsFromStart =
          (deadlineDate.getFullYear() - startMonth.getFullYear()) * 12 +
          (deadlineDate.getMonth() - startMonth.getMonth());
        const dayFraction = deadlineDate.getDate() / 30;
        const x = (monthsFromStart + dayFraction) * MONTH_WIDTH;
        const isOverdue = deadlineDate < now;
        const label = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(deadlineDate);
        return { objectiveId: obj.id, x, isOverdue, label };
      });
  }, [visibleObjectives, minDate, now]);
```

Add the DeadlineFlag rendering inside the SVG, after the Today marker block (after line 493) and before the paths:

```tsx
                {/* Deadline flags */}
                {deadlineFlags.map(({ objectiveId, x, isOverdue, label }) => (
                  <DeadlineFlag
                    key={`deadline-${objectiveId}`}
                    x={x}
                    canvasTop={PADDING_Y}
                    canvasBottom={PADDING_Y + 8 * STAGE_HEIGHT}
                    isOverdue={isOverdue}
                    label={label}
                  />
                ))}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/__tests__/components/company/TimelineCanvas.test.tsx
```

Expected: all tests PASS (existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/company/TimelineCanvas.tsx frontend/src/__tests__/components/company/TimelineCanvas.test.tsx
git commit -m "feat(TimelineCanvas): render DeadlineFlag for objectives with commitment windows"
```

---

## Task 6: Frontend — ObjectiveCard deadline badge

**Files:**
- Modify: `frontend/src/components/company/ObjectiveCard.tsx`
- Modify: `frontend/src/__tests__/components/company/ObjectiveCard.test.tsx`

- [ ] **Step 1: Write the tests**

Add to `frontend/src/__tests__/components/company/ObjectiveCard.test.tsx`. First update the mock to include commitment fields:

```tsx
const mockObjective: Objective = {
  id: "obj-1", company_id: "c-1", display_number: 1,
  title: "Global Biosimilar Leadership", subtitle: "Market share by 2028",
  original_quote: null, status: "on_record",
  first_stated_date: "2023-10-04", last_confirmed_date: "2026-02-15",
  exit_date: null, exit_manner: null, transparency_score: null,
  verdict_text: null, successor_objective_id: null,
  momentum_score: 3, terminal_state: null,
  committed_from: null, committed_until: null, commitment_type: "evergreen",
};
```

Then add the new test cases:

```tsx
  it("shows 'Overdue' badge when committed_until is in the past", () => {
    const overdueObj = {
      ...mockObjective,
      commitment_type: "annual" as const,
      committed_from: "2024-01-01",
      committed_until: "2024-12-31",
    };
    render(<ObjectiveCard objective={overdueObj} signals={[]} />);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("shows 'Due' badge when committed_until is in the future", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureObj = {
      ...mockObjective,
      commitment_type: "annual" as const,
      committed_from: "2024-01-01",
      committed_until: futureDate.toISOString().split("T")[0],
    };
    render(<ObjectiveCard objective={futureObj} signals={[]} />);
    expect(screen.getByText(/^Due /)).toBeInTheDocument();
  });

  it("does not show deadline badge for evergreen objectives", () => {
    render(<ObjectiveCard objective={mockObjective} signals={[]} />);
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Due /)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/components/company/ObjectiveCard.test.tsx
```

Expected: FAIL — "Overdue" text not found, "Due" text not found.

- [ ] **Step 3: Add deadline badge to ObjectiveCard**

In `frontend/src/components/company/ObjectiveCard.tsx`, add a helper function before the component:

```tsx
function getDeadlineBadge(objective: Objective): { label: string; className: string } | null {
  if (objective.commitment_type === "evergreen" || !objective.committed_until) return null;

  const deadline = new Date(objective.committed_until);
  const now = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  if (deadline < now) {
    return { label: "Overdue", className: "text-red-500 bg-red-500/10" };
  }

  const dateLabel = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(deadline);

  if (deadline <= threeMonthsFromNow) {
    return { label: `Due ${dateLabel}`, className: "text-amber-500 bg-amber-500/10" };
  }

  return { label: `Due ${dateLabel}`, className: "text-amber-500/70" };
}
```

Then add the badge to the JSX. Inside the card header area, after the momentum stage badge `<span>` (after line 36), add:

```tsx
              {(() => {
                const badge = getDeadlineBadge(objective);
                if (!badge) return null;
                return (
                  <span className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ${badge.className}`}>
                    {badge.label}
                  </span>
                );
              })()}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/__tests__/components/company/ObjectiveCard.test.tsx
```

Expected: all 6 tests PASS (3 existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/company/ObjectiveCard.tsx frontend/src/__tests__/components/company/ObjectiveCard.test.tsx
git commit -m "feat(ObjectiveCard): add deadline badge pill for commitment windows"
```

---

## Task 7: Frontend — TimelineLegend deadline flag entry

**Files:**
- Modify: `frontend/src/components/company/TimelineLegend.tsx`

- [ ] **Step 1: Add deadline flag legend entry**

In `frontend/src/components/company/TimelineLegend.tsx`, add a legend key in the footer area. Replace the bottom bar (lines 141-145):

```tsx
      <div className="border-t border-border px-2 py-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <svg width={16} height={12} viewBox="0 0 16 12">
            <line x1={8} y1={0} x2={8} y2={12} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="2,2" opacity={0.7} />
            <polygon points="8,0 14,3 8,6" fill="#f59e0b" opacity={0.6} />
          </svg>
          <span className="font-mono text-[8.5px] text-muted-foreground">Committed deadline</span>
        </div>
        <div className="text-center">
          <span className="font-mono text-[9px] text-muted-foreground">
            {selectedIds.size} of {objectives.filter((o) => hasSignals(o.id)).length} selected
          </span>
        </div>
      </div>
```

- [ ] **Step 2: Run full test suite**

```bash
cd frontend && npx vitest run
```

Expected: all tests PASS. The TimelineLegend test may need the `"Committed deadline"` text check — verify no regressions.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/company/TimelineLegend.tsx
git commit -m "feat(TimelineLegend): add deadline flag key to legend footer"
```

---

## Task 8: Update test mocks across the test suite

**Files:**
- Modify: `frontend/src/__tests__/components/company/TimelineLegend.test.tsx`
- Modify: `frontend/src/__tests__/components/company/BuriedCard.test.tsx`
- Modify: `frontend/src/__tests__/components/company/ProvedCard.test.tsx`
- Modify: `frontend/src/__tests__/components/company/EvidenceTable.test.tsx`
- Modify: any other test file that creates mock `Objective` objects

- [ ] **Step 1: Find all test files with mock Objective objects**

Search for files that define mock Objective objects missing the new fields:

```bash
cd frontend && grep -rl "momentum_score" src/__tests__/ --include="*.tsx" --include="*.ts"
```

- [ ] **Step 2: Add commitment fields to all mock Objective objects**

For every mock Objective in every test file, add these three fields:

```typescript
committed_from: null,
committed_until: null,
commitment_type: "evergreen",
```

This is needed because the `Objective` interface now requires `commitment_type` (it's not optional — it has a database default of `'evergreen'` but TypeScript requires it).

- [ ] **Step 3: Run the full test suite**

```bash
cd frontend && npx vitest run
```

Expected: all tests PASS with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/__tests__/
git commit -m "test: add commitment_type defaults to all mock Objective objects"
```

---

## Task 9: Final verification and roadmap update

**Files:**
- Modify: `2026-03-25-2121-drift-visual-and-intelligence-roadmap.md`

- [ ] **Step 1: Run the full frontend test suite one more time**

```bash
cd frontend && npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 2: Run the frontend build**

```bash
cd frontend && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Update the roadmap**

In `2026-03-25-2121-drift-visual-and-intelligence-roadmap.md`, update Phase 3.0 status:

```markdown
| 3.0 | Brainstorm + spec session (Sonnet) | ✅ Delivered |
| 3.1 | Schema — `committed_until`, `target_date`, `commitment_type` fields | ✅ Delivered |
| 3.2 | Agent — fiscal-year-aware classification, multi-year window logic | ✅ Delivered |
| 3.3 | Frontend — committed window overlay on timeline, fairness indicators | ✅ Delivered |
```

Add to the delivery log:

```markdown
| 2026-03-26 | 3.0-3.3 | Committed duration: commitment_type enum, deadline_shifted classification, DeadlineFlag component, ObjectiveCard badge, agent prompt updates |
```

- [ ] **Step 4: Commit roadmap update**

```bash
git add 2026-03-25-2121-drift-visual-and-intelligence-roadmap.md
git commit -m "docs: update roadmap and changelog for v3.2.0 committed duration tracking"
```
