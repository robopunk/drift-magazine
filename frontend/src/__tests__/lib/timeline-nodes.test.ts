import { describe, it, expect } from "vitest";
import { generateMonthlyNodes } from "@/lib/timeline-nodes";
import type { Signal } from "@/lib/types";

function makeSignal(date: string, classification: string): Signal {
  return {
    id: `sig-${date}`,
    objective_id: "obj-1",
    company_id: "c1",
    signal_date: date,
    source_type: "annual_report",
    source_name: "Annual Report",
    source_url: null,
    classification: classification as Signal["classification"],
    confidence: 8,
    excerpt: "Test excerpt",
    agent_reasoning: null,
    is_draft: false,
    reviewed_by: null,
    reviewed_at: null,
  };
}

describe("generateMonthlyNodes", () => {
  it("returns empty array for no signals", () => {
    const nodes = generateMonthlyNodes([], new Date("2025-06-01"));
    expect(nodes).toEqual([]);
  });

  it("marks the first signal as origin", () => {
    const signals = [makeSignal("2025-01-15", "stated")];
    const nodes = generateMonthlyNodes(signals, new Date("2025-03-01"));
    expect(nodes[0].type).toBe("origin");
    expect(nodes[0].signal).toBeDefined();
  });

  it("creates cadence nodes for months without signals", () => {
    const signals = [
      makeSignal("2025-01-15", "stated"),
      makeSignal("2025-04-10", "reinforced"),
    ];
    const nodes = generateMonthlyNodes(signals, new Date("2025-05-01"));
    // Jan = origin, Feb = cadence, Mar = cadence, Apr = signal, May = cadence (current)
    expect(nodes).toHaveLength(5);
    expect(nodes[0].type).toBe("origin");
    expect(nodes[1].type).toBe("cadence");
    expect(nodes[2].type).toBe("cadence");
    expect(nodes[3].type).toBe("signal");
    expect(nodes[4].type).toBe("cadence");
  });

  it("interpolates cadence nodes between signals at different scores", () => {
    const signals = [
      makeSignal("2025-01-15", "stated"),   // score: +1
      makeSignal("2025-04-10", "reinforced"), // score: +1.5 → clamped running
    ];
    const nodes = generateMonthlyNodes(signals, new Date("2025-04-30"));
    // Feb and Mar should be interpolated between Jan score and Apr score
    const janScore = nodes[0].score;
    const aprScore = nodes[3].score;
    const febScore = nodes[1].score;
    const marScore = nodes[2].score;
    // Interpolation: Feb is 1/3 of the way, Mar is 2/3
    expect(febScore).toBeCloseTo(janScore + (aprScore - janScore) * (1 / 3), 1);
    expect(marScore).toBeCloseTo(janScore + (aprScore - janScore) * (2 / 3), 1);
  });

  it("keeps cadence nodes flat after last signal", () => {
    const signals = [makeSignal("2025-01-15", "stated")];
    const nodes = generateMonthlyNodes(signals, new Date("2025-04-01"));
    // Jan = origin, Feb = cadence, Mar = cadence, Apr = cadence
    const originScore = nodes[0].score;
    expect(nodes[1].score).toBe(originScore);
    expect(nodes[2].score).toBe(originScore);
    expect(nodes[3].score).toBe(originScore);
  });

  it("uses last signal when multiple exist in one month", () => {
    const signals = [
      makeSignal("2025-01-05", "stated"),
      makeSignal("2025-01-20", "reinforced"),
    ];
    const nodes = generateMonthlyNodes(signals, new Date("2025-02-01"));
    // Jan should be origin but use the running score after both signals
    expect(nodes[0].type).toBe("origin");
    expect(nodes[0].signal?.signal_date).toBe("2025-01-20");
  });

  it("marks stale warning after 6 months without signal", () => {
    const signals = [makeSignal("2025-01-15", "stated")];
    const nodes = generateMonthlyNodes(signals, new Date("2025-09-01"));
    // Jul (month 7) = first stale warning (6 months after Jan)
    const julNode = nodes[6]; // index 6 = July
    expect(julNode.type).toBe("stale");
    expect(julNode.monthsSinceLastSignal).toBe(6);
  });

  it("single signal followed by 12 months of cadence/stale stays flat", () => {
    const signals = [makeSignal("2025-01-15", "stated")];
    const nodes = generateMonthlyNodes(signals, new Date("2026-01-15"));
    const originScore = nodes[0].score;
    for (let i = 1; i < nodes.length; i++) {
      expect(nodes[i].score).toBe(originScore);
    }
  });

  it("stale appears at month 6 even when node would be cadence at month 9", () => {
    const signals = [makeSignal("2025-01-15", "stated")];
    const nodes = generateMonthlyNodes(signals, new Date("2025-12-01"));
    // Months 1-5 after origin = cadence, month 6+ = stale
    expect(nodes[5].type).toBe("cadence"); // Jun (5 months gap)
    expect(nodes[6].type).toBe("stale");   // Jul (6 months gap)
    expect(nodes[6].monthsSinceLastSignal).toBe(6);
    expect(nodes[9].type).toBe("stale");   // Oct (9 months gap)
    expect(nodes[9].monthsSinceLastSignal).toBe(9);
  });
});

describe("fiscal year-end nodes", () => {
  it("inserts fiscal-year-end node at the matching month", () => {
    const signals = [
      makeSignal("2025-01-15", "stated"),
      makeSignal("2025-06-10", "reinforced"),
    ];
    const nodes = generateMonthlyNodes(signals, new Date("2026-02-01"), 12);
    // December 2025 should be fiscal-year-end
    const fyNode = nodes.find(
      (n) => n.type === "fiscal-year-end" && n.month.getMonth() === 11
    );
    expect(fyNode).toBeDefined();
  });

  it("does not insert fiscal-year-end node outside signal range", () => {
    const signals = [
      makeSignal("2025-03-15", "stated"),
      makeSignal("2025-06-10", "reinforced"),
    ];
    // End before December — no FY-end node for month 12
    const nodes = generateMonthlyNodes(signals, new Date("2025-09-01"), 12);
    const fyNodes = nodes.filter((n) => n.type === "fiscal-year-end");
    expect(fyNodes).toHaveLength(0);
  });

  it("promotes signal node at FY-end month with isFiscalYearEnd flag", () => {
    const signals = [
      makeSignal("2025-01-15", "stated"),
      makeSignal("2025-12-10", "reinforced"),
    ];
    const nodes = generateMonthlyNodes(signals, new Date("2026-02-01"), 12);
    const decNode = nodes.find((n) => n.month.getMonth() === 11 && n.month.getFullYear() === 2025);
    expect(decNode?.type).toBe("signal"); // stays signal
    expect(decNode?.isFiscalYearEnd).toBe(true);
  });

  it("uses custom fiscal year-end month", () => {
    const signals = [
      makeSignal("2025-01-15", "stated"),
      makeSignal("2025-06-10", "reinforced"),
    ];
    // FY-end in March (month 3)
    const nodes = generateMonthlyNodes(signals, new Date("2025-09-01"), 3);
    const marchNode = nodes.find(
      (n) => n.type === "fiscal-year-end" && n.month.getMonth() === 2
    );
    expect(marchNode).toBeDefined();
  });

  it("backward compat: omitting fiscalYearEndMonth produces no FY-end nodes", () => {
    const signals = [makeSignal("2025-01-15", "stated")];
    const nodes = generateMonthlyNodes(signals, new Date("2026-03-01"));
    const fyNodes = nodes.filter((n) => n.type === "fiscal-year-end");
    expect(fyNodes).toHaveLength(0);
  });
});
