"use client";

interface Point { x: number; y: number; }

interface TimelinePathProps {
  points: Point[];
  colour: string;
  groundY: number;
  id: string;
  canvasWidth: number;
  canvasHeight: number;
}

export function toSmoothPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  // Centripetal Catmull-Rom (alpha = 0.5)
  const alpha = 0.5;
  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const dt0 = Math.pow(Math.hypot(p1.x - p0.x, p1.y - p0.y), alpha) || 1;
    const dt1 = Math.pow(Math.hypot(p2.x - p1.x, p2.y - p1.y), alpha) || 1;
    const dt2 = Math.pow(Math.hypot(p3.x - p2.x, p3.y - p2.y), alpha) || 1;

    // Tangents
    const t1x = (p2.x - p0.x) / (dt0 + dt1) - (p2.x - p1.x) / dt1 + (p1.x - p0.x) / dt0;
    const t1y = (p2.y - p0.y) / (dt0 + dt1) - (p2.y - p1.y) / dt1 + (p1.y - p0.y) / dt0;
    const t2x = (p3.x - p1.x) / (dt1 + dt2) - (p3.x - p2.x) / dt2 + (p2.x - p1.x) / dt1;
    const t2y = (p3.y - p1.y) / (dt1 + dt2) - (p3.y - p2.y) / dt2 + (p2.y - p1.y) / dt1;

    // Scale tangents by segment parameterization
    const cp1x = p1.x + (t1x * dt1) / 3;
    const cp1y = p1.y + (t1y * dt1) / 3;
    const cp2x = p2.x - (t2x * dt1) / 3;
    const cp2y = p2.y - (t2y * dt1) / 3;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function toFillPath(points: Point[], groundY: number): string {
  const spline = toSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${spline} L ${last.x} ${groundY} L ${first.x} ${groundY} Z`;
}

export function TimelinePath({ points, colour, groundY, id, canvasWidth, canvasHeight }: TimelinePathProps) {
  if (points.length < 2) return null;
  const splinePath = toSmoothPath(points);
  const fillPath = toFillPath(points, groundY);
  const aboveId = `above-${id}`;
  const belowId = `below-${id}`;
  return (
    <g>
      <defs>
        <clipPath id={aboveId}>
          <rect x={0} y={0} width={canvasWidth} height={groundY + 1} />
        </clipPath>
        <clipPath id={belowId}>
          <rect x={0} y={groundY + 1} width={canvasWidth} height={canvasHeight} />
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
