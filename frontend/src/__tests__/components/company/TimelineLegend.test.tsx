import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineLegend } from "@/components/company/TimelineLegend";
import type { Objective } from "@/lib/types";

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
    momentum_score: 2,
    is_in_graveyard: false,
    ...overrides,
  };
}

const objectives: Objective[] = [
  makeObjective({ id: "a", title: "Revenue Growth", display_number: 1, momentum_score: 3 }),
  makeObjective({ id: "b", title: "Market Penetration", display_number: 2, momentum_score: 2 }),
  makeObjective({ id: "c", title: "Pipeline Expansion", display_number: 3, momentum_score: 1 }),
  makeObjective({ id: "d", title: "Cost Reduction", display_number: 4, momentum_score: -1 }),
];

const colours = new Map([
  ["a", "#059669"],
  ["b", "#3b82f6"],
  ["c", "#8b5cf6"],
  ["d", "#ec4899"],
]);

describe("TimelineLegend", () => {
  it("renders objective titles (not OBJ IDs)", () => {
    render(
      <TimelineLegend
        objectives={objectives}
        selectedIds={new Set(["a"])}
        onToggleSelection={vi.fn()}
        onHoverObjective={vi.fn()}
        colours={colours}
        hasSignals={() => true}
      />
    );
    expect(screen.getByText("Revenue Growth")).toBeInTheDocument();
    expect(screen.queryByText(/OBJ/)).toBeNull();
  });

  it("calls onToggleSelection when checkbox clicked", async () => {
    const toggle = vi.fn();
    render(
      <TimelineLegend
        objectives={objectives}
        selectedIds={new Set(["a"])}
        onToggleSelection={toggle}
        onHoverObjective={vi.fn()}
        colours={colours}
        hasSignals={() => true}
      />
    );
    await userEvent.click(screen.getByText("Market Penetration"));
    expect(toggle).toHaveBeenCalledWith("b");
  });

  it("shows N of 3 selected counter", () => {
    render(
      <TimelineLegend
        objectives={objectives}
        selectedIds={new Set(["a", "b"])}
        onToggleSelection={vi.fn()}
        onHoverObjective={vi.fn()}
        colours={colours}
        hasSignals={() => true}
      />
    );
    expect(screen.getByText("2 of 3 selected")).toBeInTheDocument();
  });

  it("disables unchecked items when 3 are selected (max enforcement)", async () => {
    const toggle = vi.fn();
    render(
      <TimelineLegend
        objectives={objectives}
        selectedIds={new Set(["a", "b", "c"])}
        onToggleSelection={toggle}
        onHoverObjective={vi.fn()}
        colours={colours}
        hasSignals={() => true}
      />
    );
    const costBtn = screen.getByText("Cost Reduction").closest("button")!;
    expect(costBtn).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(costBtn);
    expect(toggle).not.toHaveBeenCalled();
  });

  it("still calls toggle for selected items when at limit (allows deselection)", async () => {
    const toggle = vi.fn();
    render(
      <TimelineLegend
        objectives={objectives}
        selectedIds={new Set(["a", "b", "c"])}
        onToggleSelection={toggle}
        onHoverObjective={vi.fn()}
        colours={colours}
        hasSignals={() => true}
      />
    );
    await userEvent.click(screen.getByText("Revenue Growth"));
    expect(toggle).toHaveBeenCalledWith("a");
  });

  it("shows tooltip with subtitle and quote on hover", async () => {
    const objWithQuote = [
      makeObjective({
        id: "a",
        title: "Revenue Growth",
        display_number: 1,
        momentum_score: 3,
        subtitle: "Become the global leader in biosimilars",
        original_quote: "We aim to be the undisputed global leader",
        first_stated_date: "2023-10-04",
      }),
    ];
    render(
      <TimelineLegend
        objectives={objWithQuote}
        selectedIds={new Set(["a"])}
        onToggleSelection={vi.fn()}
        onHoverObjective={vi.fn()}
        colours={colours}
        hasSignals={() => true}
      />
    );
    await userEvent.hover(screen.getByText("Revenue Growth"));
    expect(screen.getByText("Become the global leader in biosimilars")).toBeInTheDocument();
    expect(screen.getByText(/We aim to be the undisputed global leader/)).toBeInTheDocument();
    expect(screen.getByText(/2023-10-04/)).toBeInTheDocument();
  });

  it("renders buried section with exit manner label for graveyard objectives", () => {
    const withBuried = [
      ...objectives,
      makeObjective({ id: "e", title: "China Growth", display_number: 5, is_in_graveyard: true, momentum_score: -4, exit_manner: "silent" }),
    ];
    const coloursWithBuried = new Map([...colours, ["e", "#78716c"]]);
    render(
      <TimelineLegend
        objectives={withBuried}
        selectedIds={new Set(["a"])}
        onToggleSelection={vi.fn()}
        onHoverObjective={vi.fn()}
        colours={coloursWithBuried}
        hasSignals={() => true}
      />
    );
    expect(screen.getByText("Buried")).toBeInTheDocument();
    expect(screen.getByText("China Growth")).toBeInTheDocument();
    expect(screen.getByText("SILENT DROP")).toBeInTheDocument();
    // Verify no strikethrough
    const title = screen.getByText("China Growth");
    expect(title.className).not.toContain("line-through");
  });
});
