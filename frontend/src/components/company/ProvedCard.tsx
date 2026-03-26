import type { Objective, TransparencyScore } from "@/lib/types";
import { getStage, scoreToStage } from "@/lib/momentum";

interface ProvedCardProps { objective: Objective; }

const TRANSPARENCY_LABELS: Record<TransparencyScore, string> = {
  very_low: "Very Low", low: "Low", medium: "Medium", high: "High",
};

const TRANSPARENCY_WIDTH: Record<TransparencyScore, string> = {
  very_low: "15%", low: "35%", medium: "60%", high: "90%",
};

function computeDurationMonths(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(dateStr));
}

export function ProvedCard({ objective }: ProvedCardProps) {
  const stage = getStage(scoreToStage(objective.momentum_score));
  const dateRange = [objective.first_stated_date, objective.exit_date].filter(Boolean);
  const duration = objective.first_stated_date && objective.exit_date
    ? computeDurationMonths(objective.first_stated_date, objective.exit_date)
    : null;

  const dateLabel = dateRange.length > 0
    ? dateRange.map((d) => formatDate(d!)).join(" → ")
      + (duration !== null ? ` · ${duration} months` : "")
    : null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="h-[3px]" style={{ backgroundColor: "#059669" }} />
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <span
              className="inline-block font-mono text-xs uppercase tracking-wider px-2 py-0.5 rounded mb-2"
              style={{ backgroundColor: "rgba(5,150,105,0.15)", color: "#059669" }}
            >
              PROVED
            </span>
            <h3 className="font-serif font-bold text-base text-card-foreground">{objective.title}</h3>
          </div>
          <span className="text-xl shrink-0 ml-2">🏆</span>
        </div>
        {dateLabel && (
          <p className="font-mono text-xs text-muted-foreground mt-1">{dateLabel}</p>
        )}
        {objective.verdict_text && (
          <p className="font-sans text-sm text-card-foreground mt-3 leading-relaxed">{objective.verdict_text}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="font-mono text-[0.65rem] text-muted-foreground uppercase tracking-wider">Final momentum</span>
          <span className="font-serif text-lg font-bold" style={{ color: stage.colour }}>
            {objective.momentum_score >= 0 ? "+" : ""}{objective.momentum_score}
          </span>
        </div>
        <div className="mt-3 p-2 rounded" style={{ backgroundColor: "rgba(5,150,105,0.06)" }}>
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
                className="h-full rounded-full"
                style={{ width: TRANSPARENCY_WIDTH[objective.transparency_score], backgroundColor: "#059669" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
