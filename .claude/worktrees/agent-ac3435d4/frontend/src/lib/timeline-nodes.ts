import type { Signal, TimelineMonthNode } from "./types";
import { computeRunningMomentum } from "./momentum";

/**
 * Generate typed monthly nodes from a chronologically sorted signal list.
 * Produces one node per month from the first signal's month to `endDate`.
 * Interpolates cadence node scores between adjacent signals.
 */
export function generateMonthlyNodes(
  signals: Signal[],
  endDate: Date,
  fiscalYearEndMonth?: number
): TimelineMonthNode[] {
  if (signals.length === 0) return [];

  // Sort signals chronologically
  const sorted = [...signals].sort(
    (a, b) => new Date(a.signal_date).getTime() - new Date(b.signal_date).getTime()
  );

  // Compute running momentum for each signal
  const runningScores = computeRunningMomentum(sorted.map((s) => s.classification));

  // Build a map: "YYYY-MM" → { signal, score } (last signal in month wins)
  const signalsByMonth = new Map<string, { signal: Signal; score: number }>();
  sorted.forEach((sig, i) => {
    const key = monthKey(new Date(sig.signal_date));
    signalsByMonth.set(key, { signal: sig, score: runningScores[i] });
  });

  // Generate month range
  const startMonth = toMonthStart(new Date(sorted[0].signal_date));
  const endMonth = toMonthStart(endDate);
  const months: Date[] = [];
  const cursor = new Date(startMonth);
  while (cursor <= endMonth) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // First pass: assign types and raw scores (signals get their score, others get NaN)
  const nodes: TimelineMonthNode[] = [];
  let lastSignalIndex = -1;

  for (let i = 0; i < months.length; i++) {
    const key = monthKey(months[i]);
    const entry = signalsByMonth.get(key);
    const monthsSinceLastSignal = lastSignalIndex >= 0 ? i - lastSignalIndex : 0;

    if (entry) {
      const isFirst = nodes.filter((n) => n.type === "origin" || n.type === "signal").length === 0;
      nodes.push({
        type: isFirst ? "origin" : "signal",
        month: months[i],
        x: 0, // computed later by caller
        y: 0, // computed later by caller
        score: entry.score,
        signal: entry.signal,
      });
      lastSignalIndex = i;
    } else if (monthsSinceLastSignal >= 6) {
      nodes.push({
        type: "stale",
        month: months[i],
        x: 0,
        y: 0,
        score: NaN, // interpolated below
        monthsSinceLastSignal,
      });
    } else {
      nodes.push({
        type: "cadence",
        month: months[i],
        x: 0,
        y: 0,
        score: NaN, // interpolated below
      });
    }
  }

  // Second pass: interpolate scores for cadence and stale nodes
  for (let i = 0; i < nodes.length; i++) {
    if (!isNaN(nodes[i].score)) continue; // signal/origin — already has score

    // Find previous and next signal nodes
    const prevSignalIdx = findPrevSignal(nodes, i);
    const nextSignalIdx = findNextSignal(nodes, i);

    if (prevSignalIdx === -1) {
      // Before first signal — shouldn't happen (first month is always origin)
      nodes[i].score = 0;
    } else if (nextSignalIdx === -1) {
      // After last signal — flat at last known score
      nodes[i].score = nodes[prevSignalIdx].score;
    } else {
      // Between two signals — linear interpolation
      const prevScore = nodes[prevSignalIdx].score;
      const nextScore = nodes[nextSignalIdx].score;
      const span = nextSignalIdx - prevSignalIdx;
      const position = i - prevSignalIdx;
      nodes[i].score = prevScore + (nextScore - prevScore) * (position / span);
    }
  }

  // Third pass: insert or flag fiscal year-end nodes
  if (fiscalYearEndMonth != null && fiscalYearEndMonth >= 1 && fiscalYearEndMonth <= 12) {
    const fyMonthIndex = fiscalYearEndMonth - 1; // JS month (0-11)
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].month.getMonth() !== fyMonthIndex) continue;
      if (nodes[i].type === "origin" || nodes[i].type === "signal") {
        // Promote: keep type but flag as FY-end
        nodes[i].isFiscalYearEnd = true;
      } else {
        // Replace cadence/stale with fiscal-year-end node
        nodes[i] = {
          ...nodes[i],
          type: "fiscal-year-end",
        };
      }
    }
  }

  return nodes;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function findPrevSignal(nodes: TimelineMonthNode[], fromIndex: number): number {
  for (let i = fromIndex - 1; i >= 0; i--) {
    if (nodes[i].type === "origin" || nodes[i].type === "signal") return i;
  }
  return -1;
}

function findNextSignal(nodes: TimelineMonthNode[], fromIndex: number): number {
  for (let i = fromIndex + 1; i < nodes.length; i++) {
    if (nodes[i].type === "origin" || nodes[i].type === "signal") return i;
  }
  return -1;
}
