"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import type { Objective, Signal } from "@/lib/types";
import { STAGES, getStage, scoreToStage, formatQuarter, computeRunningMomentum } from "@/lib/momentum";
import { generateMonthlyNodes } from "@/lib/timeline-nodes";
import { TimelineLegend } from "./TimelineLegend";
import { TimelineNode } from "./TimelineNode";
import { TimelinePath } from "./TimelinePath";
import { TimelineTooltip } from "./TimelineTooltip";
import { CrossingMarker } from "./CrossingMarker";

interface TimelineCanvasProps {
  objectives: Objective[];
  signals: Signal[];
  onNavigateToEvidence: () => void;
}

const OBJECTIVE_COLOURS = [
  "#059669", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#14b8a6", "#6366f1", "#ef4444", "#84cc16", "#06b6d4",
];

interface TooltipState {
  objectiveId: string;
  viewportX: number;
  viewportY: number;
  signal?: Signal;
  originalQuote?: string;
  firstStatedDate?: string;
  nodeScore?: number;
  staleInfo?: { lastSignalDate: string; monthsSilent: number } | null;
}

const PADDING_Y = 30;
const CANVAS_HEIGHT = 560;
const GROUND_Y = CANVAS_HEIGHT / 2;
const STAGE_HEIGHT = (CANVAS_HEIGHT - PADDING_Y * 2) / 8;
const MONTH_WIDTH = 40;
const LABEL_COL_WIDTH = 60;

function getDefaultSelection(objectives: Objective[], signals: Signal[]): Set<string> {
  const signalCounts = new Map<string, number>();
  for (const s of signals) {
    signalCounts.set(s.objective_id, (signalCounts.get(s.objective_id) ?? 0) + 1);
  }
  const withSignals = objectives.filter((o) => (signalCounts.get(o.id) ?? 0) > 0);
  const active = withSignals.filter((o) => !o.is_in_graveyard);
  const pool = active.length >= 3 ? active : withSignals.length >= 3 ? withSignals : objectives;

  const sorted = [...pool].sort((a, b) => {
    const absDiff = Math.abs(b.momentum_score) - Math.abs(a.momentum_score);
    if (absDiff !== 0) return absDiff;
    return (signalCounts.get(b.id) ?? 0) - (signalCounts.get(a.id) ?? 0);
  });

  return new Set(sorted.slice(0, 3).map((o) => o.id));
}

function scoreToY(score: number): number {
  return PADDING_Y + (4 - score) * STAGE_HEIGHT;
}

function formatDateRange(signals: Signal[]): string {
  if (signals.length === 0) return "";
  const dates = signals.map((s) => new Date(s.signal_date));
  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return `${fmt(min)} \u2014 ${fmt(max)}`;
}

export function TimelineCanvas({ objectives, signals, onNavigateToEvidence }: TimelineCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    getDefaultSelection(objectives, signals)
  );

  const colourMap = useMemo(() => {
    const map = new Map<string, string>();
    objectives.forEach((obj, i) => {
      map.set(obj.id, OBJECTIVE_COLOURS[i % OBJECTIVE_COLOURS.length]);
    });
    return map;
  }, [objectives]);

  const signalsByObjective = useMemo(() => {
    const map = new Map<string, Signal[]>();
    for (const s of signals) {
      const list = map.get(s.objective_id) || [];
      list.push(s);
      map.set(s.objective_id, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.signal_date).getTime() - new Date(b.signal_date).getTime());
    }
    return map;
  }, [signals]);

  const hasSignals = useCallback(
    (id: string) => (signalsByObjective.get(id)?.length ?? 0) > 0,
    [signalsByObjective]
  );

  // Compute date range across all signals
  const { minDate, maxDate, totalMonths } = useMemo(() => {
    const dates = signals.map((s) => new Date(s.signal_date).getTime());
    if (dates.length === 0) return { minDate: Date.now(), maxDate: Date.now(), totalMonths: 12 };
    const min = Math.min(...dates);
    const max = Math.max(...dates, Date.now());
    const minD = new Date(min);
    const maxD = new Date(max);
    const months = (maxD.getFullYear() - minD.getFullYear()) * 12 + (maxD.getMonth() - minD.getMonth()) + 2; // +2 for padding
    return { minDate: min, maxDate: max, totalMonths: Math.max(months, 12) };
  }, [signals]);

  const canvasWidth = Math.max(totalMonths * MONTH_WIDTH, 800);

  // Generate monthly nodes for visible objectives
  const visibleObjectives = useMemo(
    () => objectives.filter((o) => selectedIds.has(o.id)),
    [objectives, selectedIds]
  );

  const now = useMemo(() => new Date(), []);

  const objectiveNodeSets = useMemo(() => {
    return visibleObjectives.map((obj) => {
      const objSignals = signalsByObjective.get(obj.id) || [];
      const monthlyNodes = generateMonthlyNodes(objSignals, now);

      // Compute x and y for each node
      if (monthlyNodes.length > 0) {
        const originMonth = monthlyNodes[0].month;
        const globalOrigin = new Date(minDate);
        const globalOriginMonth = new Date(globalOrigin.getFullYear(), globalOrigin.getMonth(), 1);
        const originOffset = (originMonth.getFullYear() - globalOriginMonth.getFullYear()) * 12 +
          (originMonth.getMonth() - globalOriginMonth.getMonth());

        monthlyNodes.forEach((node, i) => {
          node.x = (originOffset + i) * MONTH_WIDTH + MONTH_WIDTH / 2;
          node.y = scoreToY(node.score);
        });
      }

      // Find latest signal node for emphasis
      let latestSignalIdx = -1;
      for (let i = monthlyNodes.length - 1; i >= 0; i--) {
        if (monthlyNodes[i].type === "origin" || monthlyNodes[i].type === "signal") {
          latestSignalIdx = i;
          break;
        }
      }

      return { objective: obj, nodes: monthlyNodes, latestSignalIdx };
    });
  }, [visibleObjectives, signalsByObjective, now, minDate]);

  // Crossings: detect ground-line crossings (both down and up)
  const crossings = useMemo(() => {
    const result: { objective: Objective; x: number; y: number; direction: "down" | "up" }[] = [];
    for (const { objective, nodes } of objectiveNodeSets) {
      for (let i = 1; i < nodes.length; i++) {
        const prev = nodes[i - 1];
        const curr = nodes[i];
        if (prev.score > 0 && curr.score <= 0) {
          result.push({ objective, x: curr.x, y: GROUND_Y, direction: "down" });
        } else if (prev.score <= 0 && curr.score > 0 && objective.exit_manner === "resurrected") {
          result.push({ objective, x: curr.x, y: GROUND_Y, direction: "up" });
        }
      }
    }
    return result;
  }, [objectiveNodeSets]);

  // Quarter gridlines for the scrollable area
  const quarterLabels = useMemo(() => {
    const labels: { x: number; label: string }[] = [];
    const start = new Date(minDate);
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    const qMonth = Math.ceil((start.getMonth() + 1) / 3) * 3;
    const d = new Date(start.getFullYear(), qMonth, 1);
    while (d.getTime() <= maxDate + 86400000 * 60) {
      const monthsFromStart =
        (d.getFullYear() - startMonth.getFullYear()) * 12 + (d.getMonth() - startMonth.getMonth());
      const x = monthsFromStart * MONTH_WIDTH + MONTH_WIDTH / 2;
      labels.push({ x, label: formatQuarter(d.toISOString()) });
      d.setMonth(d.getMonth() + 3);
    }
    return labels;
  }, [minDate, maxDate]);

  // Today marker
  const todayX = useMemo(() => {
    const today = new Date();
    const start = new Date(minDate);
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    const monthsFromStart =
      (today.getFullYear() - startMonth.getFullYear()) * 12 + (today.getMonth() - startMonth.getMonth());
    const dayFraction = today.getDate() / 30;
    return (monthsFromStart + dayFraction) * MONTH_WIDTH;
  }, [minDate]);

  // Tooltip data
  const tooltipData = useMemo(() => {
    if (!tooltip) return null;
    const obj = objectives.find((o) => o.id === tooltip.objectiveId);
    if (!obj) return null;
    const stage = scoreToStage(tooltip.nodeScore ?? obj.momentum_score);
    return {
      objectiveName: obj.title,
      stage,
      signal: tooltip.signal,
      originalQuote: tooltip.originalQuote,
      firstStatedDate: tooltip.firstStatedDate,
      viewportX: tooltip.viewportX,
      viewportY: tooltip.viewportY,
      staleInfo: tooltip.staleInfo ?? null,
    };
  }, [tooltip, objectives]);

  // Auto-scroll to recent on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll to show the rightmost content (most recent)
    el.scrollLeft = el.scrollWidth - el.clientWidth;
  }, [canvasWidth]);

  // Keyboard navigation for horizontal scroll
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    if (e.key === "ArrowRight") {
      el.scrollLeft += MONTH_WIDTH * 3;
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      el.scrollLeft -= MONTH_WIDTH * 3;
      e.preventDefault();
    }
  }, []);

  function toggleObjective(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        if (next.size >= 3) return prev;
        next.add(id);
      }
      return next;
    });
  }

  if (objectives.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground font-sans">
        No objectives tracked yet. Objectives are added after the first agent intake run.
      </div>
    );
  }

  const dateRangeLabel = formatDateRange(signals);

  return (
    <div className="flex border border-border rounded-lg overflow-hidden bg-card" style={{ height: CANVAS_HEIGHT + 44, minHeight: 500 }}>
      <TimelineLegend
        objectives={objectives}
        selectedIds={selectedIds}
        onToggleSelection={toggleObjective}
        onHoverObjective={setHoveredId}
        colours={colourMap}
        hasSignals={hasSignals}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border text-xs font-mono text-muted-foreground" style={{ height: 44 }}>
          <span>{selectedIds.size} of 3 selected</span>
          {dateRangeLabel && <span>{dateRangeLabel}</span>}
        </div>
        {/* Canvas area: fixed labels + scrollable data */}
        <div className="flex flex-1 min-h-0">
          {/* Fixed stage label column */}
          <div className="flex-none relative" style={{ width: LABEL_COL_WIDTH }}>
            <svg width={LABEL_COL_WIDTH} height={CANVAS_HEIGHT}>
              {STAGES.map((stage) => {
                const y = scoreToY(stage.score);
                const isGround = stage.score === 0;
                return (
                  <g key={stage.name}>
                    <text
                      x={4}
                      y={y + 4}
                      fontSize={9}
                      fill={isGround ? "var(--primary)" : "var(--muted-foreground)"}
                      fontFamily="var(--font-ibm-plex-mono)"
                    >
                      {stage.emoji} {stage.score > 0 ? "+" : ""}{stage.score}
                    </text>
                    <text
                      x={4}
                      y={y + 14}
                      fontSize={8}
                      fill={isGround ? "var(--primary)" : "var(--muted-foreground)"}
                      fontFamily="var(--font-ibm-plex-mono)"
                      opacity={0.7}
                    >
                      {stage.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          {/* Scrollable data area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden"
            tabIndex={0}
            onKeyDown={handleKeyDown}
          >
            <div className="relative" style={{ width: canvasWidth, height: CANVAS_HEIGHT }}>
              <svg className="absolute inset-0" width={canvasWidth} height={CANVAS_HEIGHT}>
                {/* Background zones */}
                <rect x={0} y={PADDING_Y} width={canvasWidth} height={GROUND_Y - PADDING_Y} fill="var(--timeline-zone-above)" />
                <rect x={0} y={GROUND_Y} width={canvasWidth} height={CANVAS_HEIGHT - PADDING_Y - GROUND_Y} fill="var(--timeline-zone-below)" />

                {/* Stage lines */}
                {STAGES.map((stage) => {
                  const y = scoreToY(stage.score);
                  const isGround = stage.score === 0;
                  return (
                    <g key={stage.name}>
                      {isGround ? (
                        <line x1={0} y1={y} x2={canvasWidth} y2={y} stroke="var(--primary)" strokeWidth={2} />
                      ) : (
                        <line x1={0} y1={y} x2={canvasWidth} y2={y} stroke="var(--border)" strokeWidth={0.5} />
                      )}
                    </g>
                  );
                })}

                {/* Ground line label */}
                <text x={canvasWidth - 8} y={GROUND_Y - 6} fontSize={9} fill="var(--primary)" fontFamily="var(--font-ibm-plex-mono)" textAnchor="end">
                  GROUND LINE
                </text>

                {/* Vertical quarter gridlines */}
                {quarterLabels.map(({ x, label }) => (
                  <g key={label}>
                    <line x1={x} y1={PADDING_Y} x2={x} y2={CANVAS_HEIGHT - PADDING_Y} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="4 4" />
                    <text x={x} y={CANVAS_HEIGHT - 8} fontSize={9} fill="var(--muted-foreground)" fontFamily="var(--font-ibm-plex-mono)" textAnchor="middle" opacity={0.6}>
                      {label}
                    </text>
                  </g>
                ))}

                {/* Today marker */}
                <line x1={todayX} y1={PADDING_Y} x2={todayX} y2={CANVAS_HEIGHT - PADDING_Y} stroke="var(--primary)" strokeWidth={1} strokeDasharray="6 3" opacity={0.5} />
                <text x={todayX} y={PADDING_Y - 4} fontSize={8} fill="var(--primary)" fontFamily="var(--font-ibm-plex-mono)" textAnchor="middle" opacity={0.7}>
                  Today
                </text>

                {/* Paths for selected objectives */}
                {objectiveNodeSets.map(({ objective, nodes }) => {
                  const colour = colourMap.get(objective.id) ?? "#999";
                  const points = nodes.map((n) => ({ x: n.x, y: n.y }));
                  const isBelowGround = objective.momentum_score <= 0;
                  const dimmed = hoveredId !== null && hoveredId !== objective.id;
                  return (
                    <g key={objective.id} opacity={dimmed ? 0.25 : 1} style={{ transition: "opacity 200ms" }}>
                      <TimelinePath points={points} colour={colour} isBelowGround={isBelowGround} />
                    </g>
                  );
                })}
              </svg>

              {/* DOM nodes for selected objectives */}
              {objectiveNodeSets.map(({ objective, nodes, latestSignalIdx }) => {
                const colour = colourMap.get(objective.id) ?? "#999";
                const dimmed = hoveredId !== null && hoveredId !== objective.id;
                return (
                  <div
                    key={objective.id}
                    style={{ opacity: dimmed ? 0.25 : 1, transition: "opacity 200ms" }}
                  >
                    {nodes.map((node, i) => {
                      const stageInfo = getStage(scoreToStage(node.score));
                      return (
                        <TimelineNode
                          key={`${objective.id}-${i}`}
                          type={node.type}
                          emoji={node.type === "origin" ? "\u{1F3AF}" : stageInfo.emoji}
                          colour={colour}
                          x={node.x}
                          y={node.y}
                          label={objective.title}
                          isLatestSignal={i === latestSignalIdx}
                          monthsSinceLastSignal={node.monthsSinceLastSignal}
                          onHover={
                            node.type === "cadence"
                              ? undefined
                              : (e: React.MouseEvent) => {
                                  setHoveredId(objective.id);
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setTooltip({
                                    objectiveId: objective.id,
                                    viewportX: rect.right,
                                    viewportY: rect.top,
                                    signal: node.type === "signal" ? node.signal : undefined,
                                    originalQuote: node.type === "origin" ? objective.original_quote ?? undefined : undefined,
                                    firstStatedDate: node.type === "origin" ? objective.first_stated_date ?? undefined : undefined,
                                    nodeScore: node.score,
                                    staleInfo:
                                      node.type === "stale"
                                        ? {
                                            lastSignalDate: (() => {
                                              const objSignals = signalsByObjective.get(objective.id);
                                              return objSignals?.[objSignals.length - 1]?.signal_date ?? "Unknown";
                                            })(),
                                            monthsSilent: node.monthsSinceLastSignal ?? 0,
                                          }
                                        : null,
                                  });
                                }
                          }
                          onLeave={
                            node.type === "cadence"
                              ? undefined
                              : () => {
                                  setHoveredId(null);
                                  setTooltip(null);
                                }
                          }
                          onClick={
                            node.type === "origin" || node.type === "signal"
                              ? () => onNavigateToEvidence()
                              : undefined
                          }
                        />
                      );
                    })}
                  </div>
                );
              })}

              {/* Crossing markers */}
              {crossings.map(({ objective, x, y, direction }) => (
                <CrossingMarker
                  key={`cross-${objective.id}-${x}`}
                  x={x}
                  y={y}
                  label={`${direction === "up" ? "Resurrected" : "Crossing"} ${formatQuarter(new Date(objective.last_confirmed_date ?? Date.now()).toISOString())}`}
                  editorialNote={
                    direction === "up"
                      ? `${objective.title} has been resurrected after burial.`
                      : `${objective.title} crossed the ground line.`
                  }
                  direction={direction}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      {tooltipData && <TimelineTooltip {...tooltipData} />}
    </div>
  );
}
