interface AdSlotProps {
  slot: number;
  variant?: "sidebar" | "banner" | "inline";
  className?: string;
}

const variantStyles: Record<"sidebar" | "banner" | "inline", string> = {
  sidebar: "p-4",
  banner: "p-6 w-full",
  inline: "p-3",
};

export function AdSlot({ slot, variant = "sidebar", className = "" }: AdSlotProps) {
  return (
    <div
      className={`border border-dashed border-border rounded-lg text-center ${variantStyles[variant]} ${className}`}
      data-ad-slot={slot}
    >
      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
        Advertisement
      </p>
    </div>
  );
}
