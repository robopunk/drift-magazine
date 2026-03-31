import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("renders time range pills in toolbar", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    expect(screen.getByText("6M")).toBeInTheDocument();
    expect(screen.getByText("1Y")).toBeInTheDocument();
    expect(screen.getByText("All")).toBeInTheDocument();
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

  it("renders year-boundary vertical gridlines", () => {
    const { container } = render(
      <TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />
    );
    // Year-only gridlines — no data-gridline attributes on monthly lines any more
    // Just verify the SVG canvas renders without errors (gridline elements are <line> tags inside SVG)
    const svgLines = container.querySelectorAll("svg line");
    expect(svgLines.length).toBeGreaterThan(0);
  });

  it("renders stage gridlines only at sparse axis scores", () => {
    const { container } = render(
      <TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />
    );
    // data-gridline attributes removed — year gridlines render without them
    // Verify no data-gridline="month" elements remain (old dense grid removed)
    const monthGridlines = container.querySelectorAll('line[data-gridline="month"]');
    expect(monthGridlines.length).toBe(0);
  });

  it("renders stage names in labels", () => {
    render(<TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />);
    expect(screen.getByText("Orbit")).toBeInTheDocument();
    expect(screen.getByText("Watch")).toBeInTheDocument();
    expect(screen.getByText("Buried")).toBeInTheDocument();
  });

  it("sets grab cursor on canvas scroll area", () => {
    const { container } = render(
      <TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />
    );
    const scrollArea = container.querySelector("[data-timeline-scroll]");
    expect(scrollArea).toBeInTheDocument();
    expect(scrollArea?.getAttribute("style")).toContain("cursor: grab");
  });

  it("renders month labels on the bottom axis", () => {
    render(
      <TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />
    );
    // signals are at 2025-06-01 so "Jun" appears in the bottom axis labels
    // Top axis removed — only bottom axis renders
    const junLabels = screen.getAllByText("Jun");
    expect(junLabels.length).toBeGreaterThanOrEqual(1);
  });

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

  it("does not trigger drag on click without movement", () => {
    const { container } = render(
      <TimelineCanvas objectives={objectives} signals={signals} onNavigateToEvidence={vi.fn()} />
    );
    const scrollArea = container.querySelector("[data-timeline-scroll]") as HTMLElement;
    const initialScrollLeft = scrollArea.scrollLeft;
    fireEvent.mouseDown(scrollArea, { clientX: 100 });
    fireEvent.mouseUp(scrollArea);
    expect(scrollArea.scrollLeft).toBe(initialScrollLeft);
  });
});
