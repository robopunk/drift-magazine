"use client";

import { useRef, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Objective } from "@/lib/types";

interface TimelineLegendTooltipProps {
  objective: Objective;
  anchorRect: DOMRect;
}

const TOOLTIP_WIDTH = 280;
const EDGE_MARGIN = 16;

export function TimelineLegendTooltip({ objective, anchorRect }: TimelineLegendTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    let left = anchorRect.right + 8;
    let top = anchorRect.top + anchorRect.height / 2 - rect.height / 2;

    // Horizontal: flip left if clipped
    if (left + TOOLTIP_WIDTH > window.innerWidth - EDGE_MARGIN) {
      left = anchorRect.left - TOOLTIP_WIDTH - 8;
    }
    // Vertical: clamp
    if (top + rect.height > window.innerHeight - EDGE_MARGIN) {
      top = window.innerHeight - EDGE_MARGIN - rect.height;
    }
    if (top < EDGE_MARGIN) {
      top = EDGE_MARGIN;
    }

    setPosition({ left, top });
  }, [anchorRect]);

  const tooltip = (
    <div
      ref={ref}
      data-legend-tooltip
      className="z-[9999] bg-card border border-border rounded-lg shadow-xl p-3 pointer-events-none"
      style={{
        position: "fixed",
        width: TOOLTIP_WIDTH,
        left: position?.left ?? -9999,
        top: position?.top ?? -9999,
        opacity: position ? 1 : 0,
      }}
    >
      {objective.subtitle && (
        <p className="font-serif text-[13px] font-medium text-card-foreground mb-1.5">
          {objective.subtitle}
        </p>
      )}
      {objective.original_quote && (
        <p className="font-serif italic text-xs text-card-foreground opacity-65 leading-relaxed">
          &ldquo;{objective.original_quote}&rdquo;
        </p>
      )}
      {objective.first_stated_date && (
        <p className="font-mono text-[10px] text-muted-foreground opacity-40 mt-2">
          First stated: {objective.first_stated_date}
        </p>
      )}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(tooltip, document.body);
}
