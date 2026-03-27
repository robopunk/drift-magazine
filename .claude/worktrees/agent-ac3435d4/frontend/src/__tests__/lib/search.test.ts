import { describe, it, expect } from "vitest";
import { filterCompanies } from "@/lib/search";
import type { CompanySummary } from "@/lib/types";

const mockCompanies: Pick<CompanySummary, "name" | "ticker" | "exchange">[] = [
  { name: "Sandoz AG", ticker: "SDZ", exchange: "SIX" },
  { name: "Roche Holding", ticker: "ROG", exchange: "SIX" },
  { name: "BP plc", ticker: "BP", exchange: "LSE" },
];

describe("filterCompanies", () => {
  it("returns all when query is empty", () => {
    expect(filterCompanies(mockCompanies, "")).toHaveLength(3);
  });

  it("matches company name case-insensitively", () => {
    expect(filterCompanies(mockCompanies, "sandoz")).toHaveLength(1);
    expect(filterCompanies(mockCompanies, "SANDOZ")).toHaveLength(1);
  });

  it("matches ticker", () => {
    expect(filterCompanies(mockCompanies, "SDZ")).toHaveLength(1);
    expect(filterCompanies(mockCompanies, "sdz")).toHaveLength(1);
  });

  it("matches exchange", () => {
    expect(filterCompanies(mockCompanies, "SIX")).toHaveLength(2);
  });

  it("returns empty for no match", () => {
    expect(filterCompanies(mockCompanies, "MSFT")).toHaveLength(0);
  });
});
