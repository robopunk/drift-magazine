import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompanyCard } from "@/components/landing/CompanyCard";
import type { CompanySummary } from "@/lib/types";

const mockCompany: CompanySummary = {
  id: "1",
  name: "Sandoz AG",
  ticker: "SDZ",
  exchange: "SIX",
  sector: "pharma",
  initiative_name: "The Golden Decade",
  initiative_subtitle: null,
  ir_page_url: null,
  overall_commitment_score: 72,
  tracking_active: true,
  fiscal_year_end_month: 12,
  last_research_run: "2026-03-01",
  created_at: "2025-01-01",
  objectives: [],
  active_count: 4,
  drifting_count: 1,
  proved_count: 0,
  buried_count: 3,
  editorial_verdict: "On pace, but the cracks are showing in the margin story.",
};

describe("CompanyCard", () => {
  it("renders company name and ticker", () => {
    render(<CompanyCard company={mockCompany} />);
    expect(screen.getByText("Sandoz AG")).toBeInTheDocument();
    expect(screen.getByText("SDZ")).toBeInTheDocument();
  });

  it("shows editorial verdict", () => {
    render(<CompanyCard company={mockCompany} />);
    expect(screen.getByText(/cracks are showing/)).toBeInTheDocument();
  });

  it("displays buried count", () => {
    render(<CompanyCard company={mockCompany} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("links to company page", () => {
    render(<CompanyCard company={mockCompany} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/company/sdz");
  });
});
