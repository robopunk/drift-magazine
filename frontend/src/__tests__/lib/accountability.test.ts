import { describe, it, expect } from "vitest";
import { TIER_COLOURS, tierColour } from "@/lib/accountability";

describe("TIER_COLOURS", () => {
  it("has a colour for every tier", () => {
    const tiers = ["Exemplary", "Solid", "Watchlist", "Drifting", "Compromised"] as const;
    for (const tier of tiers) {
      expect(TIER_COLOURS[tier]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("tierColour", () => {
  it("returns correct colour for Solid", () => {
    expect(tierColour("Solid")).toBe("#65a30d");
  });

  it("returns fallback for null", () => {
    expect(tierColour(null)).toBe("#94a3b8");
  });
});
