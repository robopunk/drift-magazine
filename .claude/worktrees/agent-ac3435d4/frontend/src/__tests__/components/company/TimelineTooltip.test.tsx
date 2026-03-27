import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineTooltip } from "@/components/company/TimelineTooltip";
import type { Signal } from "@/lib/types";

function makeSignal(overrides?: Partial<Signal>): Signal {
  return {
    id: "sig-1",
    objective_id: "obj-1",
    company_id: "c1",
    signal_date: "2025-06-15",
    source_type: "earnings_call",
    source_name: "Q2 Earnings Call",
    source_url: null,
    classification: "reinforced",
    confidence: 8,
    excerpt: "Revenue exceeded expectations in biosimilars",
    agent_reasoning: null,
    is_draft: false,
    reviewed_by: null,
    reviewed_at: null,
    ...overrides,
  };
}

describe("TimelineTooltip", () => {
  it("renders via portal into document.body", () => {
    const { container } = render(
      <TimelineTooltip
        objectiveName="Global Biosimilar Leadership"
        stage="fly"
        signal={makeSignal()}
        viewportX={200}
        viewportY={300}
      />
    );
    expect(container.querySelector("[data-tooltip]")).toBeNull();
    expect(document.body.querySelector("[data-tooltip]")).not.toBeNull();
  });

  it("displays signal-specific excerpt and source", () => {
    render(
      <TimelineTooltip
        objectiveName="Global Biosimilar Leadership"
        stage="fly"
        signal={makeSignal()}
        viewportX={200}
        viewportY={300}
      />
    );
    expect(screen.getByText(/Revenue exceeded expectations/)).toBeInTheDocument();
    expect(screen.getByText(/Q2 Earnings Call/)).toBeInTheDocument();
    expect(screen.getByText(/2025-06-15/)).toBeInTheDocument();
  });

  it("displays signal classification badge", () => {
    render(
      <TimelineTooltip
        objectiveName="Test"
        stage="run"
        signal={makeSignal({ classification: "softened" })}
        viewportX={200}
        viewportY={300}
      />
    );
    expect(screen.getByText(/SOFTENED/i)).toBeInTheDocument();
  });

  it("renders origin tooltip with original quote instead of signal", () => {
    render(
      <TimelineTooltip
        objectiveName="Global Biosimilar Leadership"
        stage="fly"
        originalQuote="We aim to be the undisputed global leader"
        firstStatedDate="2023-10-04"
        viewportX={200}
        viewportY={300}
      />
    );
    expect(screen.getByText(/We aim to be the undisputed global leader/)).toBeInTheDocument();
    expect(screen.getByText(/2023-10-04/)).toBeInTheDocument();
  });

  it("renders stale info when provided", () => {
    render(
      <TimelineTooltip
        objectiveName="Test"
        stage="watch"
        staleInfo={{ lastSignalDate: "2025-01-15", monthsSilent: 8 }}
        viewportX={200}
        viewportY={300}
      />
    );
    expect(screen.getByText(/8 months/)).toBeInTheDocument();
  });

  it("does not render Boardroom Allegory captions", () => {
    render(
      <TimelineTooltip
        objectiveName="Test"
        stage="drag"
        signal={makeSignal()}
        viewportX={200}
        viewportY={300}
      />
    );
    expect(screen.queryByText(/like a painting no one has moved/)).toBeNull();
  });

  it("uses position: fixed styling", () => {
    render(
      <TimelineTooltip
        objectiveName="Test"
        stage="fly"
        signal={makeSignal()}
        viewportX={200}
        viewportY={300}
      />
    );
    const tooltip = document.body.querySelector("[data-tooltip]") as HTMLElement;
    expect(tooltip.style.position).toBe("fixed");
  });
});
