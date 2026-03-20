import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObjectiveCard } from "@/components/company/ObjectiveCard";
import type { Objective, Signal } from "@/lib/types";

const mockObjective: Objective = {
  id: "obj-1", company_id: "c-1", display_number: 1,
  title: "Global Biosimilar Leadership", subtitle: "Market share by 2028",
  original_quote: null, status: "on_record",
  first_stated_date: "2023-10-04", last_confirmed_date: "2026-02-15",
  exit_date: null, exit_manner: null, transparency_score: null,
  verdict_text: null, successor_objective_id: null,
  momentum_score: 3, is_in_graveyard: false,
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
});
