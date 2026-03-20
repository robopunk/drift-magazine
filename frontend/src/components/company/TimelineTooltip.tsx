"use client";

import type { MomentumStage } from "@/lib/types";
import { getStage } from "@/lib/momentum";

interface TimelineTooltipProps {
  objectiveName: string;
  stage: MomentumStage;
  latestSignalText: string | null;
  latestSignalSource: string | null;
  latestSignalDate: string | null;
  x: number;
  y: number;
  canvasWidth: number;
}

export function TimelineTooltip({ objectiveName, stage, latestSignalText, latestSignalSource, latestSignalDate, x, y, canvasWidth }: TimelineTooltipProps) {
  const stageInfo = getStage(stage);
  const flipRight = x > canvasWidth * 0.7;

  return (
    <div
      className="absolute z-50 w-72 bg-card border border-border rounded-lg shadow-xl p-3 pointer-events-none"
      style={{ left: flipRight ? x - 288 : x + 16, top: y - 20 }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{stageInfo.emoji}</span>
        <span className="font-serif font-bold text-sm text-card-foreground truncate">{objectiveName}</span>
      </div>
      <span
        className="inline-block font-mono text-xs uppercase tracking-wider px-1.5 py-0.5 rounded mb-2"
        style={{ backgroundColor: stageInfo.colour + "20", color: stageInfo.colour }}
      >
        {stageInfo.label} ({stageInfo.score > 0 ? "+" : ""}{stageInfo.score})
      </span>
      <p className="font-serif italic text-xs text-muted-foreground mb-2">{stageInfo.caption}</p>
      {latestSignalText && (
        <div className="border-t border-border pt-2 mt-2">
          <p className="font-serif italic text-xs text-card-foreground line-clamp-3">&ldquo;{latestSignalText}&rdquo;</p>
          <p className="font-mono text-[0.65rem] text-muted-foreground mt-1">
            {latestSignalSource} {latestSignalDate && `\u00b7 ${latestSignalDate}`}
          </p>
        </div>
      )}
    </div>
  );
}
