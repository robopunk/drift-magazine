"use client";

interface Point { x: number; y: number; }

interface TimelinePathProps {
  points: Point[];
  colour: string;
  isBelowGround: boolean;
  groundY: number;
  id: string;
}

function toSmoothPath(points: Point[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
    d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

function toFillPath(points: Point[], groundY: number): string {
  const spline = toSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${spline} L ${last.x} ${groundY} L ${first.x} ${groundY} Z`;
}

export function TimelinePath({ points, colour, groundY, id }: TimelinePathProps) {
  if (points.length < 2) return null;
  const splinePath = toSmoothPath(points);
  const fillPath = toFillPath(points, groundY);
  const aboveId = `above-${id}`;
  const belowId = `below-${id}`;
  return (
    <g>
      <defs>
        <clipPath id={aboveId}>
          <rect x={0} y={0} width={10000} height={groundY} />
        </clipPath>
        <clipPath id={belowId}>
          <rect x={0} y={groundY} width={10000} height={10000} />
        </clipPath>
      </defs>
      {/* Fill — above ground (emerald) */}
      <path
        d={fillPath}
        fill="var(--primary)"
        fillOpacity={0.08}
        stroke="none"
        clipPath={`url(#${aboveId})`}
      />
      {/* Fill — below ground (destructive red) */}
      <path
        d={fillPath}
        fill="var(--destructive)"
        fillOpacity={0.08}
        stroke="none"
        clipPath={`url(#${belowId})`}
      />
      {/* Stroke — solid above ground */}
      <path
        d={splinePath}
        fill="none"
        stroke={colour}
        strokeWidth={2.5}
        clipPath={`url(#${aboveId})`}
      />
      {/* Stroke — dashed below ground */}
      <path
        d={splinePath}
        fill="none"
        stroke={colour}
        strokeWidth={2}
        strokeDasharray="6 4"
        clipPath={`url(#${belowId})`}
      />
    </g>
  );
}
