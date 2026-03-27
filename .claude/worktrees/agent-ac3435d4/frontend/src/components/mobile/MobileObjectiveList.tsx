"use client";

import { useState } from "react";
import type { Objective } from "@/lib/types";
import { getStage, scoreToStage } from "@/lib/momentum";

interface MobileObjectiveListProps { objectives: Objective[]; }

export function MobileObjectiveList({ objectives }: MobileObjectiveListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sorted = [...objectives].sort((a, b) => b.momentum_score - a.momentum_score);
  const groundIndex = sorted.findIndex((o) => o.momentum_score < 0);

  return (
    <div>
      <div className="bg-muted p-3 rounded-lg mb-4 text-xs font-sans text-muted-foreground text-center">
        For the full interactive timeline, visit on desktop.
      </div>
      <div className="space-y-2">
        {sorted.map((obj, i) => {
          const stage = getStage(scoreToStage(obj.momentum_score));
          const isExpanded = expandedId === obj.id;
          const showDivider = i === groundIndex && groundIndex > 0;
          return (
            <div key={obj.id}>
              {showDivider && (
                <div className="flex items-center gap-2 py-2">
                  <div className="flex-1 h-px bg-primary" />
                  <span className="font-mono text-[0.65rem] text-primary uppercase">Ground Line</span>
                  <div className="flex-1 h-px bg-primary" />
                </div>
              )}
              <button onClick={() => setExpandedId(isExpanded ? null : obj.id)} className="w-full text-left p-3 bg-card border border-border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{stage.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-sm font-medium text-card-foreground truncate">{obj.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">{stage.label} ({stage.score > 0 ? "+" : ""}{stage.score})</p>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="font-serif italic text-xs text-muted-foreground">{stage.caption}</p>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
