import type { Objective, ExitManner, TransparencyScore } from "@/lib/types";
import { getStage } from "@/lib/momentum";

interface BuriedCardProps { objective: Objective; }

const EXIT_MANNER_CONFIG: Record<ExitManner, { label: string; colour: string }> = {
  silent: { label: "Silent Drop", colour: "#ef4444" },
  morphed: { label: "Morphed", colour: "#3b82f6" },
  phased: { label: "Phased Out", colour: "#f59e0b" },
  transparent: { label: "Transparent Exit", colour: "#22c55e" },
  achieved: { label: "Achieved", colour: "#059669" },
};

const TRANSPARENCY_LABELS: Record<TransparencyScore, string> = {
  very_low: "Very Low", low: "Low", medium: "Medium", high: "High",
};

const TRANSPARENCY_WIDTH: Record<TransparencyScore, string> = {
  very_low: "15%", low: "35%", medium: "60%", high: "90%",
};

export function BuriedCard({ objective }: BuriedCardProps) {
  const manner = objective.exit_manner ? EXIT_MANNER_CONFIG[objective.exit_manner] : null;
  const stage = getStage("buried");
  const dateRange = [objective.first_stated_date, objective.exit_date].filter(Boolean).join(" \u2192 ");

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {manner && <div className="h-[3px]" style={{ backgroundColor: manner.colour }} />}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            {manner && (
              <span
                className="inline-block font-mono text-xs uppercase tracking-wider px-2 py-0.5 rounded mb-2"
                style={{ backgroundColor: manner.colour + "20", color: manner.colour }}
              >
                {manner.label}
              </span>
            )}
            <h3 className="font-serif font-bold text-base text-card-foreground">{objective.title}</h3>
          </div>
          <span className="text-xl shrink-0 ml-2">{stage.emoji}</span>
        </div>
        {dateRange && (
          <p className="font-mono text-xs text-muted-foreground mt-1">{dateRange}</p>
        )}
        {objective.verdict_text && (
          <p className="font-sans text-sm text-card-foreground mt-3 leading-relaxed">{objective.verdict_text}</p>
        )}
        <div className="mt-3 p-2 bg-muted rounded">
          <p className="font-serif italic text-xs text-muted-foreground">{stage.caption}</p>
        </div>
        {objective.transparency_score && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[0.65rem] text-muted-foreground uppercase tracking-wider">Transparency</span>
              <span className="font-mono text-xs text-muted-foreground">{TRANSPARENCY_LABELS[objective.transparency_score]}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-muted-foreground/40 rounded-full"
                style={{ width: TRANSPARENCY_WIDTH[objective.transparency_score] }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
