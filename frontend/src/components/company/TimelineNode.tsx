"use client";

interface TimelineNodeProps {
  emoji: string;
  colour: string;
  x: number;
  y: number;
  label: string;
  onHover: (e: React.MouseEvent) => void;
  onLeave: () => void;
  onClick: () => void;
}

export function TimelineNode({ emoji, colour, x, y, label, onHover, onLeave, onClick }: TimelineNodeProps) {
  return (
    <div
      className="absolute flex items-center justify-center w-[26px] h-[26px] rounded-full bg-card border-2 cursor-pointer hover:scale-[1.3] hover:shadow-lg transition-all duration-200 select-none"
      style={{
        left: x,
        top: y,
        borderColor: colour,
        transform: "translate(-50%, -50%)",
      }}
      title={label}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <span className="text-[0.85rem] leading-none">{emoji}</span>
    </div>
  );
}
