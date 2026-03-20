"use client";
import { useState } from "react";
import type { Signal, Objective, SignalClassification } from "@/lib/types";

interface EvidenceTableProps { signals: Signal[]; objectives: Objective[]; }

const FILTER_OPTIONS: { label: string; value: SignalClassification | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Reinforced", value: "reinforced" },
  { label: "Softened", value: "softened" },
  { label: "Absent", value: "absent" },
  { label: "Reframed", value: "reframed" },
  { label: "Stated", value: "stated" },
  { label: "Achieved", value: "achieved" },
  { label: "Retired", value: "retired_transparent" },
];

const CLASSIFICATION_COLOURS: Record<string, string> = {
  reinforced: "#22c55e", stated: "#22c55e", softened: "#d97706",
  reframed: "#3b82f6", absent: "#dc2626", achieved: "#059669",
  retired_transparent: "#6b7280", retired_silent: "#dc2626",
};

const PAGE_SIZE = 20;

export function EvidenceTable({ signals, objectives }: EvidenceTableProps) {
  const [filter, setFilter] = useState<SignalClassification | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const objMap = new Map(objectives.map((o) => [o.id, o]));
  const filtered =
    filter === "all"
      ? signals
      : signals.filter((s) =>
          filter === "retired_transparent"
            ? s.classification === "retired_transparent" || s.classification === "retired_silent"
            : s.classification === filter
        );
  const visible = filtered.slice(0, visibleCount);

  if (signals.length === 0) {
    return (
      <p className="text-center py-20 text-muted-foreground font-sans">No signals recorded yet.</p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setFilter(opt.value); setVisibleCount(PAGE_SIZE); }}
            className={`px-3 py-1 rounded-full font-mono text-xs transition-colors ${
              filter === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2 pr-4">Date</th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2 pr-4">Classification</th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2 pr-4">Objective</th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2 pr-4">Excerpt</th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2 pr-4">Source</th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2">Conf.</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((signal) => {
              const obj = objMap.get(signal.objective_id);
              const isExpanded = expanded === signal.id;
              return (
                <tr
                  key={signal.id}
                  onClick={() => setExpanded(isExpanded ? null : signal.id)}
                  className="border-b border-border hover:bg-muted/50 cursor-pointer"
                >
                  <td className="font-mono text-xs text-muted-foreground py-2 pr-4 whitespace-nowrap">{signal.signal_date}</td>
                  <td className="py-2 pr-4">
                    <span
                      className="font-mono text-xs uppercase"
                      style={{ color: CLASSIFICATION_COLOURS[signal.classification] ?? "#6b7280" }}
                    >
                      {signal.classification.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-sans text-card-foreground">
                    {obj && <span className="text-xs">{obj.title}</span>}
                  </td>
                  <td className="py-2 pr-4">
                    {signal.excerpt && (
                      <p className="font-serif italic text-xs text-card-foreground line-clamp-1">{signal.excerpt}</p>
                    )}
                    {isExpanded && signal.agent_reasoning && (
                      <p className="font-sans text-xs text-muted-foreground mt-1 bg-muted p-2 rounded">
                        {signal.agent_reasoning}
                      </p>
                    )}
                  </td>
                  <td className="font-mono text-xs text-muted-foreground py-2 pr-4 whitespace-nowrap">{signal.source_name}</td>
                  <td className="font-mono text-xs text-muted-foreground py-2">
                    <span className="bg-muted px-1.5 py-0.5 rounded">{signal.confidence}/10</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {visibleCount < filtered.length && (
        <div className="text-center mt-4">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="px-4 py-2 bg-muted text-muted-foreground rounded font-sans text-sm hover:bg-muted/80 transition-colors"
          >
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
