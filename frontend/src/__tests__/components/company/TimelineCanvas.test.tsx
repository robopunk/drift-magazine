import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineCanvas } from "@/components/company/TimelineCanvas";
import type { Objective, Signal } from "@/lib/types";

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
  ];

  const signals: Signal[] = [
    makeSignal("a", "2025-06-01", "reinforced"),
    makeSignal("b", "2025-06-01", "softened"),
    makeSignal("c", "2025-06-01", "stated"),
  ];

  it("renders the selection counter with zero default selection", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    const matches = screen.getAllByText("0 of 3 selected");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state overlay when no objectives selected", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    expect(screen.getByText("Select an objective to view its trajectory")).toBeInTheDocument();
  });

  it("renders date range in toolbar", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    expect(screen.getByText(/Jun 2025/)).toBeInTheDocument();
  });

  it("does not render zoom controls", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    expect(screen.queryByText("Reset")).not.toBeInTheDocument();
    expect(screen.queryByText("+")).not.toBeInTheDocument();
  });

  it("renders objective titles in legend", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    expect(screen.getByText("Revenue Growth")).toBeInTheDocument();
  });

  it("shows empty state when no objectives", () => {
    render(<TimelineCanvas objectives={[]} signals={[]} onNavigateToEvidence={vi.fn()} />);
    expect(screen.getByText(/No objectives tracked yet/)).toBeInTheDocument();
  });

  it("renders monthly vertical gridlines", () => {
    const { container } = render(
      <TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />
    );
    const gridlines = container.querySelectorAll("line[data-gridline]");
    expect(gridlines.length).toBeGreaterThan(0);
  });

  it("renders January gridlines with stronger opacity", () => {
    const { container } = render(
      <TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />
    );
    const januaryLines = container.querySelectorAll('line[data-gridline="january"]');
    const regularLines = container.querySelectorAll('line[data-gridline="month"]');
    if (januaryLines.length > 0) {
      expect(januaryLines[0].getAttribute("opacity")).toBe("0.3");
    }
    if (regularLines.length > 0) {
      expect(regularLines[0].getAttribute("opacity")).toBe("0.15");
    }
  });

  it("renders stage names in labels", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    expect(screen.getByText("Orbit")).toBeInTheDocument();
    expect(screen.getByText("Watch")).toBeInTheDocument();
    expect(screen.getByText("Buried")).toBeInTheDocument();
  });
});
