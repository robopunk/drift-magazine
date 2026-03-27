import type { Signal } from "@/lib/types";

interface SignalFeedProps {
  signals: Signal[];
}

const CLASSIFICATION_COLOURS: Record<string, string> = {
  reinforced: "text-status-active",
  stated: "text-status-active",
  softened: "text-status-watch",
  reframed: "text-status-morphed",
  absent: "text-status-dropped",
  achieved: "text-status-active",
  retired_transparent: "text-muted-foreground",
  retired_silent: "text-status-dropped",
};

export function SignalFeed({ signals }: SignalFeedProps) {
  if (signals.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Latest Signals
      </h3>
      <div className="space-y-3">
        {signals.slice(0, 8).map((signal) => (
          <div key={signal.id} className="text-sm">
            <span
              className={`font-mono text-xs uppercase ${CLASSIFICATION_COLOURS[signal.classification] ?? "text-muted-foreground"}`}
            >
              {signal.classification.replace("_", " ")}
            </span>
            {signal.excerpt && (
              <p className="font-serif italic text-muted-foreground text-xs mt-0.5 line-clamp-2">
                {signal.excerpt}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
