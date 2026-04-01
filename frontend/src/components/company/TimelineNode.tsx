"use client";

import type { TimelineNodeType } from "@/lib/types";

interface TimelineNodeProps {
  type: TimelineNodeType;
  x: number;
  y: number;
  colour: string;
  /** Stage emoji + text shown above latest nodes only. e.g. "🦅 FLY +3" */
  label?: string;
  /** Formatted date shown above origin nodes. e.g. "Oct 2023" */
  dateLabel?: string;
  /** Pre-computed tick height in px from proximity-bucket stagger. */
  tickHeight: number;
  monthsSinceLastSignal?: number;
  onHover?: (e: React.MouseEvent<SVGGElement>) => void;
  onLeave?: () => void;
  onClick?: () => void;
}

export function TimelineNode({
  type,
  x,
  y,
  colour,
  label,
  dateLabel,
  tickHeight,
  monthsSinceLastSignal,
  onHover,
  onLeave,
  onClick,
}: TimelineNodeProps) {
  if (type === "cadence") {
    return (
      <g>
        <circle cx={x} cy={y} r={2} fill="var(--border)" />
      </g>
    );
  }

  if (type === "stale") {
    return (
      <g
        aria-label={`No update for ${monthsSinceLastSignal ?? "?"} months`}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      >
        <circle cx={x} cy={y} r={5} fill="none" stroke="var(--exit-phased)" strokeWidth={1.5} />
        <text
          x={x}
          y={y}
          fontSize={8}
          fill="var(--exit-phased)"
          textAnchor="middle"
          dominantBaseline="central"
          fontWeight="bold"
        >
          !
        </text>
      </g>
    );
  }

  if (type === "fiscal-year-end") {
    return (
      <g onMouseEnter={onHover} onMouseLeave={onLeave}>
        <circle cx={x} cy={y} r={3.5} fill="var(--exit-phased)" opacity={0.85} />
      </g>
    );
  }

  if (type === "terminal-proved" || type === "terminal-buried") {
    const isProved = type === "terminal-proved";
    const tickTopY = y - tickHeight;
    return (
      <g
        aria-label={label}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onClick={onClick}
        style={onClick ? { cursor: "pointer" } : undefined}
      >
        <circle cx={x} cy={y} r={10} fill={colour} fillOpacity={0.20} />
        <circle cx={x} cy={y} r={6} fill={colour} />
        <use
          href={isProved ? "#icon-proved" : "#icon-buried"}
          x={x - 4}
          y={y - 4}
          width={8}
          height={8}
          color="var(--primary-foreground)"
        />
        <line
          x1={x}
          y1={y - 10}
          x2={x}
          y2={tickTopY}
          stroke="var(--foreground)"
          strokeWidth={1.5}
          opacity={0.95}
        />
        {label && (
          <text
            x={x}
            y={tickTopY - 14}
            fontSize={9}
            fill={colour}
            textAnchor="middle"
            fontFamily="var(--font-ibm-plex-mono)"
            fontWeight="bold"
          >
            {label}
          </text>
        )}
      </g>
    );
  }

  if (type === "origin") {
    const tickTopY = y - tickHeight;
    return (
      <g
        aria-label={dateLabel}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onClick={onClick}
        style={onClick ? { cursor: "pointer" } : undefined}
      >
        <circle cx={x} cy={y} r={9} fill={colour} fillOpacity={0.20} />
        <circle cx={x} cy={y} r={5} fill={colour} />
        <line
          x1={x}
          y1={y - 9}
          x2={x}
          y2={tickTopY}
          stroke="var(--border)"
          strokeWidth={1}
          strokeDasharray="2,3"
          opacity={0.5}
        />
        {dateLabel && (
          <text
            x={x}
            y={tickTopY - 4}
            fontSize={8}
            fill="var(--muted-foreground)"
            textAnchor="middle"
            fontFamily="var(--font-ibm-plex-mono)"
          >
            {dateLabel}
          </text>
        )}
      </g>
    );
  }

  // signal or latest
  const isLatest = type === "latest";
  const tickTopY = y - tickHeight;

  return (
    <g
      aria-label={label}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <circle cx={x} cy={y} r={isLatest ? 8 : 5} fill={colour} fillOpacity={0.30}
        className={isLatest ? "node-pulse" : undefined} />
      <circle cx={x} cy={y} r={isLatest ? 4 : 2.5} fill={colour} />
      {isLatest && label && (
        <text
          x={x}
          y={y}
          fontSize={18}
          textAnchor="middle"
          dominantBaseline="central"
          dy={1}
        >
          {label.split(" ")[0]}
        </text>
      )}
      <line
        x1={x}
        y1={y - (isLatest ? 8 : 5)}
        x2={x}
        y2={tickTopY}
        stroke={isLatest ? "var(--foreground)" : "var(--border)"}
        strokeWidth={isLatest ? 1.5 : 1}
        {...(!isLatest && { strokeDasharray: "2,3" })}
        opacity={isLatest ? 0.95 : 0.5}
      />
      {isLatest && label && (
        <text
          x={x}
          y={tickTopY - 4}
          fontSize={11}
          fill="var(--foreground)"
          textAnchor="middle"
          fontFamily="var(--font-ibm-plex-mono)"
          fontWeight="bold"
        >
          {label}
        </text>
      )}
    </g>
  );
}
