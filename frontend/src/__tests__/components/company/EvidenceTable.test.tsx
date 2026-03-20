import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EvidenceTable } from "@/components/company/EvidenceTable";
import type { Signal, Objective } from "@/lib/types";

const mockObjectives: Objective[] = [{
  id: "obj-1", company_id: "c-1", display_number: 1,
  title: "Global Biosimilar Leadership", subtitle: null, original_quote: null,
  status: "on_record", first_stated_date: null, last_confirmed_date: null,
  exit_date: null, exit_manner: null, transparency_score: null,
  verdict_text: null, successor_objective_id: null, momentum_score: 3, is_in_graveyard: false,
}];

const mockSignals: Signal[] = [
  { id: "s-1", objective_id: "obj-1", company_id: "c-1", signal_date: "2026-02-15", source_type: "earnings_call", source_name: "FY2025 Results", source_url: null, classification: "reinforced", confidence: 8, excerpt: "We remain committed to global biosimilar leadership.", agent_reasoning: "Explicit reaffirmation.", is_draft: false, reviewed_by: null, reviewed_at: null },
  { id: "s-2", objective_id: "obj-1", company_id: "c-1", signal_date: "2025-07-01", source_type: "interim_results", source_name: "H1 2025 Report", source_url: null, classification: "softened", confidence: 6, excerpt: "We continue to pursue biosimilar opportunities.", agent_reasoning: null, is_draft: false, reviewed_by: null, reviewed_at: null },
];

describe("EvidenceTable", () => {
  it("renders signal dates", () => {
    render(<EvidenceTable signals={mockSignals} objectives={mockObjectives} />);
    expect(screen.getByText("2026-02-15")).toBeInTheDocument();
    expect(screen.getByText("2025-07-01")).toBeInTheDocument();
  });
  it("renders classification badges", () => {
    render(<EvidenceTable signals={mockSignals} objectives={mockObjectives} />);
    expect(screen.getByText("reinforced")).toBeInTheDocument();
    expect(screen.getByText("softened")).toBeInTheDocument();
  });
  it("renders filter pills", () => {
    render(<EvidenceTable signals={mockSignals} objectives={mockObjectives} />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Reinforced")).toBeInTheDocument();
  });
  it("filters by classification when clicking a pill", async () => {
    render(<EvidenceTable signals={mockSignals} objectives={mockObjectives} />);
    await userEvent.click(screen.getByText("Softened"));
    expect(screen.getByText("softened")).toBeInTheDocument();
    expect(screen.queryByText("reinforced")).not.toBeInTheDocument();
  });
});
