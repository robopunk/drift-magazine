interface AdSlotProps {
  slot: 1 | 2 | 3;
  className?: string;
}

export function AdSlot({ slot, className = "" }: AdSlotProps) {
  return (
    <div
      className={`border border-dashed border-border rounded-lg p-4 text-center ${className}`}
      data-ad-slot={slot}
    >
      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
        Sponsored
      </p>
    </div>
  );
}
