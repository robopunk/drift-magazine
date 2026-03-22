"use client";

import type { TimelineNodeType } from "@/lib/types";

interface TimelineNodeProps {
  type: TimelineNodeType;
  emoji?: string;
  colour: string;
  x: number;
  y: number;
  label: string;
  isLatestSignal?: boolean;
  monthsSinceLastSignal?: number;
  onHover?: (e: React.MouseEvent) => void;
  onLeave?: () => void;
  onClick?: () => void;
}

const SIZE: Record<TimelineNodeType, number> = {
  origin: 32,
  signal: 24,
  cadence: 8,
  stale: 12,
  "fiscal-year-end": 14,
};

const LATEST_SCALE = 1.25;

export function TimelineNode({
  type,
  emoji,
  colour,
  x,
  y,
  label,
  isLatestSignal,
  monthsSinceLastSignal,
  onHover,
  onLeave,
  onClick,
}: TimelineNodeProps) {
  const baseSize = SIZE[type];
  const size = isLatestSignal ? baseSize * LATEST_SCALE : baseSize;

  // Cadence node: plain grey dot, no interactivity
  if (type === "cadence") {
    return (
      <div
        className="absolute rounded-full"
        style={{
          left: x,
          top: y,
          width: size,
          height: size,
          backgroundColor: "var(--timeline-cadence-dot)",
          transform: "translate(-50%, -50%)",
        }}
      />
    );
  }

  // Stale warning node: amber bordered dot with "!"
  if (type === "stale") {
    return (
      <div
        className="absolute flex items-center justify-center rounded-full bg-card cursor-pointer hover:scale-110 transition-transform duration-200"
        style={{
          left: x,
          top: y,
          width: size,
          height: size,
          border: "1.5px solid #f59e0b",
          transform: "translate(-50%, -50%)",
        }}
        aria-label={`No update for ${monthsSinceLastSignal ?? "?"} months`}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      >
        <span className="text-[8px] font-bold text-amber-500 leading-none select-none">!</span>
      </div>
    );
  }

  // Fiscal year-end node: amber diamond
  if (type === "fiscal-year-end") {
    return (
      <div
        className="absolute flex items-center justify-center bg-card cursor-pointer hover:scale-110 transition-transform duration-200"
        style={{
          left: x,
          top: y,
          width: size,
          height: size,
          border: `2px solid ${colour}`,
          transform: "translate(-50%, -50%) rotate(45deg)",
        }}
        aria-label={label}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      />
    );
  }

  // Origin and Signal nodes: interactive with emoji
  const strokeWidth = type === "origin" ? 2.5 : 2;

  return (
    <div
      className="absolute flex items-center justify-center rounded-full bg-card cursor-pointer hover:scale-[1.3] hover:shadow-lg transition-all duration-200 select-none"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        border: `${strokeWidth}px solid ${colour}`,
        transform: "translate(-50%, -50%)",
        filter: isLatestSignal ? `drop-shadow(0 0 4px ${colour})` : undefined,
      }}
      aria-label={label}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <span
        className="leading-none select-none"
        style={{ fontSize: type === "origin" ? "1rem" : "0.85rem" }}
      >
        {emoji}
      </span>
    </div>
  );
}
