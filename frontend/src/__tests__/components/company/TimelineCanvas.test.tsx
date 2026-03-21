import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineCanvas } from "@/components/company/TimelineCanvas";
import type { Objective, Signal } from "@/lib/types";

// Mock panzoom
vi.mock("@panzoom/panzoom", () => ({
  default: () => ({
    zoomWithWheel: vi.fn(),
    zoom: vi.fn(),
    getScale: () => 1,
    reset: vi.fn(),
    destroy: vi.fn(),
  }),
}));

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);

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
    is_in_graveyard: false,
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
    source_name: "Annual Report",
    source_url: null,
    classification: classification as Signal["classification"],
    confidence: 8,
    excerpt: "Test excerpt",
    agent_reasoning: null,
    is_draft: false,
    reviewed_by: null,
    reviewed_at: null,
  };
}

describe("TimelineCanvas", () => {
  const objectives: Objective[] = [
    makeObjective({ id: "a", title: "Revenue Growth", display_number: 1, momentum_score: 3 }),
    makeObjective({ id: "b", title: "Market Share", display_number: 2, momentum_score: -2 }),
    makeObjective({ id: "c", title: "Pipeline", display_number: 3, momentum_score: 1 }),
    makeObjective({ id: "d", title: "Cost Cutting", display_number: 4, momentum_score: -1 }),
    makeObjective({ id: "e", title: "Expansion", display_number: 5, momentum_score: 0 }),
  ];

  const signals: Signal[] = [
    makeSignal("a", "2025-06-01", "reinforced"),
    makeSignal("b", "2025-06-01", "softened"),
    makeSignal("c", "2025-06-01", "stated"),
    makeSignal("d", "2025-06-01", "absent"),
    makeSignal("e", "2025-06-01", "stated"),
  ];

  it("renders the selection counter", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    // Default selection is top 3 by absolute momentum: a(3), b(|-2|=2), c(1) or d(|-1|=1)
    const matches = screen.getAllByText("3 of 3 selected");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders objective titles in legend (not OBJ IDs)", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    expect(screen.getByText("Revenue Growth")).toBeInTheDocument();
    expect(screen.queryByText(/OBJ 01/)).toBeNull();
  });

  it("shows empty state when no objectives", () => {
    render(<TimelineCanvas objectives={[]} signals={[]} onNavigateToEvidence={vi.fn()} />);
    expect(screen.getByText(/No objectives tracked yet/)).toBeInTheDocument();
  });
});
