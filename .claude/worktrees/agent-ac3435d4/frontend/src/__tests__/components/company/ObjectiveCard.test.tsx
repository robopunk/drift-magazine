import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ObjectiveCard } from "@/components/company/ObjectiveCard";
import type { Objective } from "@/lib/types";

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

  it("shows Boardroom Allegory caption", () => {
    render(<ObjectiveCard objective={mockObjective} signals={[]} />);
    expect(screen.getByText(/altitude has a way/)).toBeInTheDocument();
  });

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
});
