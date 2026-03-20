"use client";

interface CrossingMarkerProps { x: number; y: number; label: string; editorialNote: string; }

export function CrossingMarker({ x, y, label, editorialNote }: CrossingMarkerProps) {
  return (
    <div className="absolute group cursor-pointer" style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}>
      <div className="relative w-4 h-4">
        <div className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-40" />
        <div className="absolute inset-0.5 rounded-full bg-destructive" />
      </div>
      <span className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[0.65rem] text-destructive">{label}</span>
      <div className="hidden group-hover:block absolute left-5 top-6 w-48 bg-card border border-border rounded p-2 shadow-lg z-40">
        <p className="font-serif italic text-xs text-card-foreground">{editorialNote}</p>
      </div>
    </div>
  );
}
