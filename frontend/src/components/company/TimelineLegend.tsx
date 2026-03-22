"use client";

import { useState } from "react";
import type { Objective } from "@/lib/types";
import { getStage, scoreToStage } from "@/lib/momentum";

interface TimelineLegendProps {
  objectives: Objective[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onHoverObjective: (id: string | null) => void;
  colours: Map<string, string>;
  hasSignals: (id: string) => boolean;
}

const EXIT_MANNER_LABELS: Record<string, string> = {
  silent: "SILENT DROP",
  phased: "PHASED OUT",
  morphed: "MORPHED",
  transparent: "TRANSPARENT EXIT",
  achieved: "ACHIEVED",
  resurrected: "RESURRECTED",
};

export function TimelineLegend({ objectives, selectedIds, onToggleSelection, onHoverObjective, colours, hasSignals }: TimelineLegendProps) {
  const alive = objectives.filter((o) => !o.is_in_graveyard);
  const buried = objectives.filter((o) => o.is_in_graveyard);
  const atLimit = selectedIds.size >= 3;
  const isLastSelected = selectedIds.size <= 1;
  const [shakingId, setShakingId] = useState<string | null>(null);

  function renderItem(obj: Objective) {
    const stage = getStage(scoreToStage(obj.momentum_score));
    const colour = colours.get(obj.id) ?? stage.colour;
    const isSelected = selectedIds.has(obj.id);
    const hasData = hasSignals(obj.id);
    const isDisabled = (!isSelected && atLimit) || !hasData;
    const isBuried = obj.is_in_graveyard;

    return (
      <button
        key={obj.id}
        className={`w-full text-left px-2.5 py-2 rounded-md text-xs transition-all ${
          shakingId === obj.id ? "animate-[shake_0.3s_ease-in-out]" : ""
        } ${!hasData ? "opacity-40 cursor-not-allowed" : ""} ${
          isSelected
            ? "border border-current"
            : isDisabled
            ? "opacity-60 cursor-not-allowed border border-transparent"
            : "opacity-60 hover:opacity-80 border border-transparent"
        }`}
        style={
          isSelected
            ? {
                borderColor: colour,
                backgroundColor: `color-mix(in srgb, ${colour} 6%, transparent)`,
              }
            : undefined
        }
        onClick={() => {
          if (isDisabled) return;
          if (isSelected && isLastSelected) {
            setShakingId(obj.id);
            setTimeout(() => setShakingId(null), 300);
            return;
          }
          onToggleSelection(obj.id);
        }}
        onMouseEnter={() => {
          if (selectedIds.has(obj.id)) onHoverObjective(obj.id);
        }}
        onMouseLeave={() => onHoverObjective(null)}
        aria-disabled={isDisabled}
      >
        <div className="flex items-start gap-2">
          <span
            className="mt-0.5 shrink-0 w-[14px] h-[14px] rounded-sm border-2 flex items-center justify-center"
            style={{
              borderColor: colour,
              backgroundColor: isSelected ? colour : "transparent",
            }}
          >
            {isSelected && (
              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2,6 5,9 10,3" />
              </svg>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[12.5px] leading-tight text-card-foreground">
              {obj.title}
            </p>
            <p className="font-mono text-[9.5px] uppercase tracking-wider mt-0.5" style={{ color: colour }}>
              {isBuried && obj.exit_manner
                ? (
                    <>
                      {EXIT_MANNER_LABELS[obj.exit_manner] ?? obj.exit_manner.toUpperCase()}
                      {obj.exit_manner === "resurrected" && (
                        <span className="ml-1 text-[9px]" title="Resurrected">&#x2191;</span>
                      )}
                    </>
                  )
                : `${stage.label} (${stage.score > 0 ? "+" : ""}${stage.score})`}
            </p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="w-[210px] shrink-0 border-r border-border flex flex-col">
      <div className="flex-1 overflow-y-auto py-2 px-1.5">
        <h3 className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted-foreground px-2 mb-2">
          Objectives
        </h3>
        {alive.map(renderItem)}
        {buried.length > 0 && (
          <>
            <div className="border-t border-border my-3 mx-2" />
            <h3 className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted-foreground px-2 mb-2">
              Buried
            </h3>
            {buried.map(renderItem)}
          </>
        )}
      </div>
      <div className="border-t border-border px-2 py-2 text-center">
        <span className="font-mono text-[9px] text-muted-foreground">
          {selectedIds.size} of 3 selected
        </span>
      </div>
    </div>
  );
}
