import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProvedCard } from "@/components/company/ProvedCard";
import type { Objective } from "@/lib/types";

const mockProved: Objective = {
  id: "obj-p1", company_id: "c-1", display_number: 1,
  title: "Global Biosimilar Leadership", subtitle: null, original_quote: null,
  status: "achieved", first_stated_date: "2023-10-04", last_confirmed_date: "2026-03-15",
  exit_date: "2026-03-15", exit_manner: "achieved", transparency_score: "high",
  verdict_text: "Sandoz delivered on its founding promise: #1 global biosimilar company by revenue.",
  successor_objective_id: null, momentum_score: 3, terminal_state: "proved",
};

describe("ProvedCard", () => {
  it("renders the title", () => {
    render(<ProvedCard objective={mockProved} />);
    expect(screen.getByText("Global Biosimilar Leadership")).toBeInTheDocument();
  });

  it("shows PROVED badge", () => {
    render(<ProvedCard objective={mockProved} />);
    expect(screen.getByText(/PROVED/)).toBeInTheDocument();
  });

  it("shows trophy emoji", () => {
    render(<ProvedCard objective={mockProved} />);
    expect(screen.getByText("🏆")).toBeInTheDocument();
  });

  it("shows transparency score", () => {
    render(<ProvedCard objective={mockProved} />);
    expect(screen.getByText(/High/)).toBeInTheDocument();
  });

  it("shows verdict text", () => {
    render(<ProvedCard objective={mockProved} />);
    expect(screen.getByText(/Sandoz delivered/)).toBeInTheDocument();
  });

  it("shows final momentum score", () => {
    render(<ProvedCard objective={mockProved} />);
    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("shows date range with duration", () => {
    render(<ProvedCard objective={mockProved} />);
    // Should show something like "Oct 2023 → Mar 2026 · 29 months"
    expect(screen.getByText(/Oct 2023/)).toBeInTheDocument();
    expect(screen.getByText(/months/)).toBeInTheDocument();
  });
});
