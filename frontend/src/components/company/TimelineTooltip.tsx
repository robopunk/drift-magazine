"use client";

import { useRef, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { MomentumStage } from "@/lib/types";
import { getStage } from "@/lib/momentum";

interface TimelineTooltipProps {
  objectiveName: string;
  stage: MomentumStage;
  latestSignalText: string | null;
  latestSignalSource: string | null;
  latestSignalDate: string | null;
  viewportX: number;
  viewportY: number;
  staleInfo?: {
    lastSignalDate: string;
    monthsSilent: number;
  } | null;
}

const TOOLTIP_WIDTH = 288;
const EDGE_MARGIN = 16;
const MIN_TOP = 8;

export function TimelineTooltip({
  objectiveName,
  stage,
  latestSignalText,
  latestSignalSource,
  latestSignalDate,
  viewportX,
  viewportY,
  staleInfo,
}: TimelineTooltipProps) {
  const stageInfo = getStage(stage);
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    let left = viewportX + 16;
    let top = viewportY - 20;

    // Horizontal flip: if right edge exceeds viewport
    if (left + TOOLTIP_WIDTH > window.innerWidth - EDGE_MARGIN) {
      left = viewportX - TOOLTIP_WIDTH - 16;
    }

    // Vertical clamp: if bottom edge exceeds viewport
    if (top + rect.height > window.innerHeight - EDGE_MARGIN) {
      top = window.innerHeight - EDGE_MARGIN - rect.height;
    }

    // Clamp top to minimum
    if (top < MIN_TOP) {
      top = MIN_TOP;
    }

    setPosition({ left, top });
  }, [viewportX, viewportY]);

  const tooltip = (
    <div
      ref={ref}
      data-tooltip
      className="z-[9999] w-72 bg-card border border-border rounded-lg shadow-xl p-3 pointer-events-none"
      style={{ position: "fixed", left: position?.left ?? -9999, top: position?.top ?? -9999, opacity: position ? 1 : 0 }}
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
      {staleInfo && (
        <div className="border-t border-border pt-2 mt-2">
          <p className="font-mono text-xs text-amber-500">
            No update for {staleInfo.monthsSilent} months
          </p>
          <p className="font-mono text-[0.65rem] text-muted-foreground mt-1">
            Last signal: {staleInfo.lastSignalDate}
          </p>
        </div>
      )}
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

  if (typeof document === "undefined") return null;
  return createPortal(tooltip, document.body);
}
