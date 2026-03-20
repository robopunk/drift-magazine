"use client";

import type { Objective } from "@/lib/types";
import { getStage, scoreToStage } from "@/lib/momentum";

interface TimelineLegendProps {
  objectives: Objective[];
  hoveredId: string | null;
  lockedIds: Set<string>;
  onHover: (id: string | null) => void;
  onToggleLock: (id: string) => void;
  colours: Map<string, string>;
}

export function TimelineLegend({ objectives, hoveredId, lockedIds, onHover, onToggleLock, colours }: TimelineLegendProps) {
  const alive = objectives.filter((o) => !o.is_in_graveyard);
  const buried = objectives.filter((o) => o.is_in_graveyard);

  function renderItem(obj: Objective) {
    const stage = getStage(scoreToStage(obj.momentum_score));
    const colour = colours.get(obj.id) ?? stage.colour;
    const isLocked = lockedIds.has(obj.id);
    const isHighlighted = hoveredId === obj.id || isLocked;

    return (
      <button
        key={obj.id}
        className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${isHighlighted ? "bg-muted" : "hover:bg-muted/50"}`}
        onMouseEnter={() => onHover(obj.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onToggleLock(obj.id)}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colour }} />
          <span className="text-sm">{stage.emoji}</span>
          <span className="font-mono text-muted-foreground">OBJ {String(obj.display_number).padStart(2, "0")}</span>
        </div>
        <p className="font-sans text-card-foreground truncate mt-0.5 pl-5">{obj.title}</p>
      </button>
    );
  }

  return (
    <div className="w-[210px] shrink-0 border-r border-border overflow-y-auto py-2 pr-2">
      <h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground px-2 mb-2">Objectives</h3>
      {alive.map(renderItem)}
      {buried.length > 0 && (
        <>
          <h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground px-2 mt-4 mb-2">Buried</h3>
          {buried.map(renderItem)}
        </>
      )}
    </div>
  );
}
