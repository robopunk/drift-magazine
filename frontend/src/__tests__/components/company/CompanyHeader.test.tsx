import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import type { Company } from "@/lib/types";

const mockCompany: Company = {
  id: "1",
  name: "Sandoz AG",
  ticker: "SDZ",
  exchange: "SIX",
  sector: "pharma",
  initiative_name: "The Golden Decade",
  initiative_subtitle: null,
  ir_page_url: null,
  overall_commitment_score: 72,
  accountability_tier: "Solid",
  tracking_active: true,
  fiscal_year_end_month: 12,
  last_research_run: "2026-03-01",
  created_at: "2025-01-01",
};

describe("CompanyHeader", () => {
  it("renders company name", () => {
    render(<CompanyHeader company={mockCompany} editorialAssessment={null} />);
    expect(screen.getByText("Sandoz AG")).toBeInTheDocument();
  });

  it("renders tier label as primary text", () => {
    render(<CompanyHeader company={mockCompany} editorialAssessment={null} />);
    expect(screen.getByText("SOLID")).toBeInTheDocument();
  });

  it("renders score as secondary text", () => {
    render(<CompanyHeader company={mockCompany} editorialAssessment={null} />);
    expect(screen.getByText("72 / 100")).toBeInTheDocument();
  });

  it("renders Accountability label", () => {
    render(<CompanyHeader company={mockCompany} editorialAssessment={null} />);
    expect(screen.getByText("Accountability")).toBeInTheDocument();
  });

  it("renders nothing in grade block when tier is null", () => {
    const noTier = { ...mockCompany, accountability_tier: null };
    render(<CompanyHeader company={noTier} editorialAssessment={null} />);
    expect(screen.queryByText("SOLID")).not.toBeInTheDocument();
    expect(screen.queryByText("72 / 100")).not.toBeInTheDocument();
  });
});
