import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BuriedCard } from "@/components/company/BuriedCard";
import type { Objective } from "@/lib/types";

const mockBuried: Objective = {
  id: "obj-g1", company_id: "c-1", display_number: 7,
  title: "China Growth Platform", subtitle: null, original_quote: null,
  status: "dropped", first_stated_date: "2023-10-04", last_confirmed_date: null,
  exit_date: "2024-06-30", exit_manner: "silent", transparency_score: "very_low",
  verdict_text: "Disappeared from communications without notice.",
  successor_objective_id: null, momentum_score: -4, is_in_graveyard: true,
};

describe("BuriedCard", () => {
  it("renders the title", () => {
    render(<BuriedCard objective={mockBuried} />);
    expect(screen.getByText("China Growth Platform")).toBeInTheDocument();
  });
  it("shows exit manner badge", () => {
    render(<BuriedCard objective={mockBuried} />);
    expect(screen.getByText("Silent Drop")).toBeInTheDocument();
  });
  it("shows transparency score", () => {
    render(<BuriedCard objective={mockBuried} />);
    expect(screen.getByText(/Very Low/)).toBeInTheDocument();
  });
});
