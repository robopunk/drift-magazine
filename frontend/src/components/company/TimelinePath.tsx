"use client";

interface Point { x: number; y: number; }

interface TimelinePathProps {
  points: Point[];
  colour: string;
  isBelowGround: boolean;
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

export function TimelinePath({ points, colour, isBelowGround }: TimelinePathProps) {
  if (points.length < 2) return null;
  return (
    <path
      d={toSmoothPath(points)}
      fill="none"
      stroke={colour}
      strokeWidth={isBelowGround ? 1.5 : 2.5}
      strokeDasharray={isBelowGround ? "6 4" : "none"}
    />
  );
}
