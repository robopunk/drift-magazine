# Committed Duration & Time-aware Tracking — Design Spec

**Created:** 2026-03-26
**Sub-project:** 3
**Status:** Approved
**Phases:** 3.1 (Schema), 3.2 (Agent), 3.3 (Frontend)

---

## Overview

Objectives are currently tracked on open-ended momentum. This sub-project adds commitment windows — the period a company stated it would deliver within. This makes tracking fairer (companies get credit for being within their window) and more informative (readers see whether a deadline passed silently).

---

## Decisions Locked During Brainstorm

| # | Question | Decision |
|---|----------|----------|
| 1 | Commitment types | Three-type enum: `annual`, `multi_year`, `evergreen` |
| 2 | Overdue behavior | Automatic status escalation: `active` → `watch` when deadline passes silently |
| 3 | Agent window updates | Agent can update `committed_until` on any run; changes logged as signals |
| 4 | Timeline visual | Deadline flag marker (dashed vertical line + flag at target date) |
| 5 | ObjectiveCard display | Deadline badge pill next to momentum badge |
| 6 | Signal classification | New `deadline_shifted` type for when commitment windows change |

---

## Phase 3.1 — Schema

### New fields on `objectives`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `committed_from` | `DATE` | `NULL` | Start of the commitment window (often same as `first_stated_date`, but can differ) |
| `committed_until` | `DATE` | `NULL` | Target delivery date |
| `commitment_type` | `TEXT` | `'evergreen'` | One of: `annual`, `multi_year`, `evergreen` |

**Constraints:**
- `commitment_type` validated via CHECK constraint: `commitment_type IN ('annual', 'multi_year', 'evergreen')`
- When `commitment_type = 'evergreen'`, both `committed_from` and `committed_until` should be `NULL`
- When `commitment_type` is `annual` or `multi_year`, both dates should be populated

### New enum value on `signal_classification`

Add `deadline_shifted` to the existing `signal_classification` enum.

### Automatic escalation trigger

A Postgres function handles deadline expiry:

- **Trigger condition:** `committed_until < CURRENT_DATE` AND `status = 'active'` AND `terminal_state IS NULL`
- **Action:** Set `status = 'watch'`
- **Side effect:** Insert a system-generated signal with:
  - `classification = 'absent'` (reuses existing classification — the deadline passed with no acknowledgment, which is a form of absence)
  - `excerpt = 'Committed window expired [committed_until] with no update from company. Status auto-escalated to watch.'`
  - `source_type = 'system'`
  - `confidence = 10`
  - `is_draft = false` (system signals auto-publish)
- **Execution:** Supabase scheduled function (pg_cron), runs daily

### View updates

- `v_company_summary`: include `committed_until`, `commitment_type` in the objectives JSON
- `v_latest_signals`: no changes (already includes all signal classifications)

### Seed data (Sandoz)

Update existing Sandoz objectives with commitment windows based on public disclosure context:

| Objective | commitment_type | committed_from | committed_until |
|-----------|----------------|----------------|-----------------|
| Global Biosimilar Leadership | multi_year | 2023-10-01 | 2028-12-31 |
| US Biosimilar Penetration | annual | 2024-01-01 | 2025-12-31 |
| Emerging Markets Volume Growth | annual | 2024-01-01 | 2025-12-31 |
| Next-Wave Biosimilar Pipeline | multi_year | 2023-10-01 | 2027-12-31 |
| Manufacturing Network Simplification | multi_year | 2023-10-01 | 2026-12-31 |
| Margin Expansion to 24-26% | annual | 2024-01-01 | 2025-12-31 |

Graveyard objectives: set `commitment_type = 'evergreen'` (historical, no window retroactively applied).

---

## Phase 3.2 — Agent

### Intake prompt additions

Add to `build_intake_prompt()`:

> For each objective, determine the committed delivery window:
> - **Annual**: tied to the company's fiscal year (ending month {fiscal_year_end_month}). Set `committed_from` to the fiscal year start, `committed_until` to the fiscal year end.
> - **Multi-year**: the company stated an explicit future target date (e.g., "by 2027", "within 3 years"). Set `committed_from` to `first_stated_date`, `committed_until` to the stated target.
> - **Evergreen**: no stated deadline — the company tracks this as an ongoing priority. Leave dates NULL.
>
> Output `commitment_type`, `committed_from` (YYYY-MM-DD), `committed_until` (YYYY-MM-DD) for each objective.

### Monthly prompt additions

Add to `build_monthly_prompt()`:

> For each objective with a committed window, check:
> 1. Has the company confirmed the original timeline is still on track?
> 2. Has the company extended or shortened the deadline? If so, classify as `deadline_shifted` and include the old date and new date in your excerpt.
> 3. Has the deadline passed with no acknowledgment? Note this in your assessment.
>
> Current commitment windows:
> {list of objectives with committed_from, committed_until, commitment_type}

### Correlation prompt additions

Add to `build_correlation_prompt()`:

> When evaluating momentum, consider the commitment window:
> - An objective approaching its deadline with strong signals deserves credit
> - An objective past its deadline with no acknowledgment is more concerning than one still within window
> - Deadline shifts (extensions) without explanation should be flagged

### Bug fix

Update `build_correlation_prompt()` to reference `terminal_state` instead of the deprecated `is_in_graveyard` field.

### Agent write logic

When the agent detects a deadline shift:
- Update `objectives.committed_until` with the new date
- Insert a signal with `classification = 'deadline_shifted'`
- Excerpt format: `"Deadline shifted from {old_date} to {new_date}. {reason if stated}"`

---

## Phase 3.3 — Frontend

### TypeScript types (`frontend/src/lib/types.ts`)

Add to `Objective` interface:

```typescript
committed_from: string | null;
committed_until: string | null;
commitment_type: 'annual' | 'multi_year' | 'evergreen';
```

### TimelineCanvas — Deadline Flag Marker

**Component:** New `DeadlineFlag` component rendered inside `TimelineCanvas`

**Rendering logic:**
- Only render when `commitment_type !== 'evergreen'` and `committed_until` is not null
- Calculate x-position from `committed_until` date using the existing month-to-x mapping
- If `committed_until` is beyond the canvas date range, render at the right edge with an arrow

**Visual spec:**
- Vertical dashed line: `stroke-dasharray="4,4"`, full canvas height
- Colour: amber `#f59e0b` when within window, red `#dc2626` when `committed_until < today`
- Flag triangle: 20px wide, 16px tall, solid fill at same colour, positioned at top of line
- Date label: mono 9px, positioned below the flag, same colour

**Interaction:** Hover shows tooltip with full commitment context: "Committed 2024-2025 (annual)" or "Target: Dec 2027 (multi-year)"

### ObjectiveCard — Deadline Badge

**Position:** Next to the existing momentum stage badge, right-aligned

**States:**
| State | Condition | Label | Colour |
|-------|-----------|-------|--------|
| Within window | `committed_until > today + 3 months` | `Due Dec 2025` | Muted amber text, no background |
| Approaching | `committed_until` within 3 months | `Due Dec 2025` | Amber text, faint amber background |
| Overdue | `committed_until < today` | `Overdue` | Red text, faint red background |
| Evergreen | `commitment_type = 'evergreen'` | *(no badge)* | — |

**Format:** Pill badge, mono font, 10px text, rounded-full

### TimelineLegend

Add entry: a small dashed vertical line icon + "Committed deadline" label

### No changes to

- BuriedCard, ProvedCard (terminal objectives have no active deadline)
- EvidenceTable, SearchBar, CompanyGrid, landing page
- TabBar (no new tabs — commitment is a property, not a category)

---

## Out of scope

- Firecrawl integration (separate sub-project, evaluated independently)
- Performance grading (Sub-project 4, depends on this sub-project)
- Email alerts on deadline expiry (future enhancement)
- Bulk commitment window editing in admin UI
