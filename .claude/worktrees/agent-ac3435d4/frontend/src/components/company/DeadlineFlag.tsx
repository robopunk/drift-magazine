interface DeadlineFlagProps {
  x: number;
  canvasTop: number;
  canvasBottom: number;
  isOverdue: boolean;
  label: string;
}

export function DeadlineFlag({ x, canvasTop, canvasBottom, isOverdue, label }: DeadlineFlagProps) {
  if (x <= 0) return null;

  const colour = isOverdue ? "#dc2626" : "#f59e0b";
  const flagWidth = 20;
  const flagHeight = 16;

  return (
    <g data-deadline-flag>
      {/* Vertical dashed line */}
      <line
        x1={x}
        y1={canvasTop}
        x2={x}
        y2={canvasBottom}
        stroke={colour}
        strokeWidth={1.5}
        strokeDasharray="4,4"
        opacity={0.7}
      />
      {/* Flag triangle */}
      <polygon
        points={`${x},${canvasTop} ${x + flagWidth},${canvasTop + flagHeight / 2} ${x},${canvasTop + flagHeight}`}
        fill={colour}
        opacity={0.6}
      />
      {/* Date label */}
      <text
        x={x + 4}
        y={canvasTop + flagHeight + 12}
        fontSize={9}
        fontFamily="var(--font-ibm-plex-mono)"
        fill={colour}
        opacity={0.8}
      >
        {label}
      </text>
    </g>
  );
}
