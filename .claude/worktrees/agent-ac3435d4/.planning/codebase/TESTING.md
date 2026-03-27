# Testing Patterns

**Analysis Date:** 2026-03-26

## Test Framework Setup

**Runner:**
- Vitest v4.1.0
- Config: `frontend/vitest.config.ts`
- Environment: jsdom (DOM simulation for React testing)
- Setup file: `src/test-setup.ts` (imports @testing-library/jest-dom)

**Assertion Library:**
- @testing-library/jest-dom v6.9.1
- Vitest's built-in `expect` API
- React Testing Library v16.3.2 for component testing

**Run Commands:**
```bash
npm run test              # Run all tests once (vitest run)
npm run test:watch       # Watch mode (vitest)
npm test -- --coverage   # Coverage report (via vitest)
```

## Test File Organization

**Location Pattern:**
- Tests co-located in `frontend/src/__tests__/` directory
- Mirror the component structure: `__tests__/components/{category}/{Component}.test.tsx`
- Utility tests in `__tests__/lib/{utility}.test.ts`

**Structure:**
```
frontend/src/
├── __tests__/
│   ├── components/
│   │   ├── company/
│   │   │   ├── BuriedCard.test.tsx
│   │   │   ├── ObjectiveCard.test.tsx
│   │   │   ├── TimelineCanvas.test.tsx
│   │   │   └── ...
│   │   ├── landing/
│   │   │   ├── CompanyCard.test.tsx
│   │   │   └── SearchBar.test.tsx
│   │   └── layout/
│   │       └── Masthead.test.tsx
│   └── lib/
│       ├── momentum.test.ts
│       ├── search.test.ts
│       └── timeline-nodes.test.ts
```

**Naming Convention:**
- Test file = `{Component}.test.tsx` or `{utility}.test.ts`
- No separate directory nesting; flat structure per feature area

**Current Coverage:**
- 21 test files total (17 component tests, 3 library tests in first count)
- 99+ tests across the suite
- All files follow the same structural pattern

## Test Structure Pattern

**Suite Organization:**
- Top-level `describe()` block per component/utility
- Logical groupings within describe blocks for related tests
- One `it()` per behavior being tested

**Example from `src/__tests__/components/landing/CompanyCard.test.tsx`:**
```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompanyCard } from "@/components/landing/CompanyCard";
import type { CompanySummary } from "@/lib/types";

const mockCompany: CompanySummary = {
  // ... mock data
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
});
```

**Library Test Structure:**
Example from `src/__tests__/lib/momentum.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { STAGES, getStage, getStageColour, scoreToStage } from "@/lib/momentum";

describe("momentum", () => {
  it("has exactly 9 stages from +4 to -4", () => {
    expect(STAGES).toHaveLength(9);
    expect(STAGES[0].score).toBe(4);
    expect(STAGES[8].score).toBe(-4);
  });

  it("getStage returns correct stage for name", () => {
    const fly = getStage("fly");
    expect(fly.score).toBe(3);
    expect(fly.emoji).toBe("\u{1F985}");
  });
});
```

## Setup & Teardown

**No Explicit Setup:**
- Each test is independent
- Mock data created within test or at module level
- No shared beforeEach/afterEach blocks in current codebase

**Mock Data Factory Pattern:**
- Create factory functions for commonly mocked objects
- Example from `src/__tests__/components/company/TimelineCanvas.test.tsx`:
```typescript
function makeObjective(overrides: Partial<Objective> & { id: string; title: string }): Objective {
  return {
    company_id: "c1",
    display_number: 1,
    subtitle: null,
    status: "on_record",
    momentum_score: 0,
    terminal_state: null,
    committed_from: null,
    committed_until: null,
    commitment_type: "evergreen",
    ...overrides,
  };
}

function makeSignal(objectiveId: string, date: string, classification: string): Signal {
  return {
    id: `sig-${objectiveId}-${date}`,
    objective_id: objectiveId,
    company_id: "c1",
    signal_date: date,
    source_type: "annual_report",
    // ...
    ...overrides,
  };
}
```

**Test Data Naming:**
- Prefix with `mock` for component props: `mockCompany`, `mockObjective`
- Factory functions use `make` prefix: `makeObjective()`, `makeSignal()`

## Mocking Patterns

**Browser APIs:**
- ResizeObserver mocked globally using `vi.stubGlobal()`
- Example from `src/__tests__/components/company/TimelineCanvas.test.tsx`:
```typescript
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);
```

**Event Handlers:**
- Mock functions created with `vi.fn()`
- Used for callback testing
- Example:
```typescript
const onNavigateToEvidence = vi.fn();
render(<TimelineCanvas
  objectives={objectives}
  signals={signals}
  onNavigateToEvidence={onNavigateToEvidence}
/>);
```

**No Supabase Mocking in Current Tests:**
- Current tests are unit/component level
- Do not test API integration
- Supabase client mocking would be needed for integration tests (not yet present)

**What NOT to Mock:**
- Component rendering logic (use actual component under test)
- Utility functions (test real implementation)
- Type definitions (import actual types)

**What to Mock:**
- External library classes (ResizeObserver, Supabase client)
- Browser APIs that jsdom doesn't support
- Network requests (when testing API integration)

## React Component Testing

**Rendering Pattern:**
- Use React Testing Library's `render()` function
- Always import `@testing-library/react`
- Test component behavior, not implementation
- Example:
```typescript
render(<CompanyCard company={mockCompany} />);
```

**Assertion Patterns:**
- Query by text: `screen.getByText("label")` or `screen.getByText(/regex/)`
- Query by role: `screen.getByRole("link")`
- Query by test ID: `screen.getByTestId("id")` (minimal use)
- Regex patterns for flexible matching: `/cracks are showing/`

**Example from `src/__tests__/components/company/ObjectiveCard.test.tsx`:**
```typescript
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
});
```

**Testing State Changes:**
- Use `userEvent` from @testing-library/user-event for user interactions
- Use `fireEvent` for direct event triggering when needed
- Test resulting UI changes after state updates

**Testing Props:**
- Create multiple mock variations
- Test conditional rendering based on props
- Example from `src/__tests__/components/company/ObjectiveCard.test.tsx`:
```typescript
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
```

**Snapshot Testing:**
- Not used in current codebase
- Prefer explicit assertion over snapshots for maintainability

## Utility Function Testing

**Pure Function Testing:**
- Test with multiple input variations
- Test edge cases (empty inputs, boundaries, null/undefined)
- Example from `src/__tests__/lib/search.test.ts`:
```typescript
describe("filterCompanies", () => {
  it("returns all when query is empty", () => {
    expect(filterCompanies(mockCompanies, "")).toHaveLength(3);
  });

  it("matches company name case-insensitively", () => {
    expect(filterCompanies(mockCompanies, "sandoz")).toHaveLength(1);
    expect(filterCompanies(mockCompanies, "SANDOZ")).toHaveLength(1);
  });

  it("returns empty for no match", () => {
    expect(filterCompanies(mockCompanies, "MSFT")).toHaveLength(0);
  });
});
```

**Constant/Data Structure Testing:**
- Verify structure and content of exported constants
- Example from `src/__tests__/lib/momentum.test.ts`:
```typescript
it("has exactly 9 stages from +4 to -4", () => {
  expect(STAGES).toHaveLength(9);
  expect(STAGES[0].score).toBe(4);
  expect(STAGES[8].score).toBe(-4);
});
```

**Computed Value Testing:**
- Test transformation functions with various inputs
- Example from `src/__tests__/lib/momentum.test.ts`:
```typescript
it("scoreToStage clamps out-of-range scores", () => {
  expect(scoreToStage(5)).toBe("orbit");
  expect(scoreToStage(-5)).toBe("buried");
});
```

## Coverage & Test Quality

**Current State:**
- 99 tests across 21 files
- Strong component test coverage for UI elements
- Library utility functions have focused test suites

**Coverage Areas:**
- Component rendering and props
- User interactions (clicks, state changes)
- Conditional rendering (based on data state)
- Utility function edge cases
- Data transformations (momentum calculation, filtering)

**Not Yet Tested:**
- End-to-end workflows (multiple pages/components together)
- Supabase integration (no mocking or integration tests)
- API error scenarios
- Network failures

**Best Practices Observed:**
- One assertion per behavior
- Descriptive test names
- Mock data that mirrors real data shape
- Factory functions for common test data
- No test interdependencies

## Test-Specific Imports & Helpers

**Standard Imports Pattern:**
```typescript
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Component } from "@/components/...";
import type { PropType } from "@/lib/types";
```

**Available Helpers from React Testing Library:**
- `render()` — Render a React component
- `screen.getByText()` — Find element by text content
- `screen.getByRole()` — Find element by ARIA role
- `screen.getByTestId()` — Find element by test ID
- `screen.queryByText()` — Returns null if not found (for "not in document" tests)
- `fireEvent.click()` — Trigger click event
- `within()` — Scope queries to a container

**Vitest Helpers:**
- `vi.fn()` — Create a mock function
- `vi.stubGlobal()` — Mock global objects (ResizeObserver)
- `beforeEach()`, `afterEach()` — Setup/teardown (if needed)

## When to Write Tests

**Must Test:**
- Component rendering (props → output)
- User interactions that change state
- Conditional rendering logic
- Utility function transformations

**Good to Test:**
- Edge cases (empty arrays, null values, boundary conditions)
- Type-driven behavior (union type handling)

**Skip Tests For:**
- React framework behavior (hooks work correctly)
- Tailwind CSS styling (handled by build)
- Type checking errors (TypeScript handles this)

---

*Testing analysis: 2026-03-26*
