"use client";

import { useRef, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { MomentumStage, Signal } from "@/lib/types";
import { getStage } from "@/lib/momentum";

interface TimelineTooltipProps {
  objectiveName: string;
  stage: MomentumStage;
  signal?: Signal;
  originalQuote?: string;
  firstStatedDate?: string;
  viewportX: number;
  viewportY: number;
  staleInfo?: { lastSignalDate: string; monthsSilent: number } | null;
}

const TOOLTIP_WIDTH = 288;
const EDGE_MARGIN = 16;
const MIN_TOP = 8;

export function TimelineTooltip({
  objectiveName,
  stage,
  signal,
  originalQuote,
  firstStatedDate,
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

    if (left + TOOLTIP_WIDTH > window.innerWidth - EDGE_MARGIN) {
      left = viewportX - TOOLTIP_WIDTH - 16;
    }
    if (top + rect.height > window.innerHeight - EDGE_MARGIN) {
      top = window.innerHeight - EDGE_MARGIN - rect.height;
    }
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
      {/* Header: name + momentum badge */}
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

      {/* Stale warning */}
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

      {/* Origin node: original quote */}
      {originalQuote && (
        <div className="border-t border-border pt-2 mt-2">
          <p className="font-serif italic text-xs text-card-foreground line-clamp-3">&ldquo;{originalQuote}&rdquo;</p>
          {firstStatedDate && (
            <p className="font-mono text-[0.65rem] text-muted-foreground mt-1">
              First stated: {firstStatedDate}
            </p>
          )}
        </div>
      )}

      {/* Signal node: specific signal data */}
      {signal && (
        <div className="border-t border-border pt-2 mt-2">
          <span
            className="inline-block font-mono text-[0.6rem] uppercase tracking-wider px-1 py-0.5 rounded mb-1.5"
            style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
          >
            {signal.classification.replace(/_/g, " ")}
          </span>
          {signal.excerpt && (
            <p className="font-serif italic text-xs text-card-foreground line-clamp-3">&ldquo;{signal.excerpt}&rdquo;</p>
          )}
          <p className="font-mono text-[0.65rem] text-muted-foreground mt-1">
            {signal.source_name} {signal.signal_date && `\u00b7 ${signal.signal_date}`}
          </p>
        </div>
      )}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(tooltip, document.body);
}
