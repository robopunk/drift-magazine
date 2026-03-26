"use client";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { Objective, Signal } from "@/lib/types";
import { getStage, scoreToStage } from "@/lib/momentum";
import { EvidenceDrawer } from "./EvidenceDrawer";

function getDeadlineBadge(objective: Objective): { label: string; className: string } | null {
  if (objective.commitment_type === "evergreen" || !objective.committed_until) return null;

  const deadline = new Date(objective.committed_until);
  const now = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  if (deadline < now) {
    return { label: "Overdue", className: "text-red-500 bg-red-500/10" };
  }

  const dateLabel = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(deadline);

  if (deadline <= threeMonthsFromNow) {
    return { label: `Due ${dateLabel}`, className: "text-amber-500 bg-amber-500/10" };
  }

  return { label: `Due ${dateLabel}`, className: "text-amber-500/70" };
}

interface ObjectiveCardProps { objective: Objective; signals: Signal[]; }

export function ObjectiveCard({ objective, signals }: ObjectiveCardProps) {
  const [expanded, setExpanded] = useState(false);
  const stage = getStage(scoreToStage(objective.momentum_score));
  const warningLevel =
    objective.momentum_score <= -2
      ? "border-status-dropped"
      : objective.momentum_score <= 0
      ? "border-status-watch"
      : "border-border";

  return (
    <div className={`bg-card border-2 ${warningLevel} rounded-lg overflow-hidden`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                OBJ {String(objective.display_number).padStart(2, "0")}
              </span>
              <span
                className="font-mono text-xs uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                style={{ backgroundColor: stage.colour + "20", color: stage.colour }}
              >
                <span aria-hidden="true">{stage.emoji}</span>
                <span>{stage.label}</span>
                <span>({stage.score > 0 ? "+" : ""}{stage.score})</span>
              </span>
              {(() => {
                const badge = getDeadlineBadge(objective);
                if (!badge) return null;
                return (
                  <span className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ${badge.className}`}>
                    {badge.label}
                  </span>
                );
              })()}
            </div>
            <h3 className="font-serif font-bold text-base text-card-foreground">{objective.title}</h3>
            {objective.subtitle && (
              <p className="font-sans text-sm text-muted-foreground mt-0.5">{objective.subtitle}</p>
            )}
          </div>
          <div className="text-2xl font-serif font-bold text-foreground shrink-0 ml-4">
            {objective.momentum_score > 0 ? "+" : ""}{objective.momentum_score}
          </div>
        </div>
        <div className="mt-3 p-2 bg-muted rounded">
          <p className="font-serif italic text-xs text-muted-foreground">{stage.caption}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-mono text-muted-foreground">
          <span>{signals.length} signals</span>
          {objective.first_stated_date && <span>First stated: {objective.first_stated_date}</span>}
          {objective.last_confirmed_date && <span>Last confirmed: {objective.last_confirmed_date}</span>}
        </div>
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${((objective.momentum_score + 4) / 8) * 100}%`,
              backgroundColor: stage.colour,
            }}
          />
        </div>
      </button>
      <AnimatePresence>
        {expanded && <EvidenceDrawer signals={signals} onClose={() => setExpanded(false)} />}
      </AnimatePresence>
    </div>
  );
}
