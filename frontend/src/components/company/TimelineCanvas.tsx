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
import { DeadlineFlag } from "./DeadlineFlag";

interface TimelineCanvasProps {
  objectives: Objective[];
  signals: Signal[];
  onNavigateToEvidence: () => void;
  fiscalYearEndMonth?: number;
}

const OBJECTIVE_COLOURS = [
  "#059669", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#14b8a6", "#6366f1", "#ef4444", "#84cc16", "#06b6d4",
];

const EXIT_MANNER_LABELS_CANVAS: Record<string, string> = {
  silent: "SILENT DROP",
  phased: "PHASED OUT",
  morphed: "MORPHED",
  transparent: "TRANSPARENT EXIT",
  achieved: "ACHIEVED",
  resurrected: "RESURRECTED",
};

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

const PADDING_Y = 60;
const CANVAS_HEIGHT = 650;
const AXIS_LABEL_HEIGHT = 40;
const STAGE_HEIGHT = (CANVAS_HEIGHT - PADDING_Y - AXIS_LABEL_HEIGHT) / 8;
const GROUND_Y = PADDING_Y + 4 * STAGE_HEIGHT;
const MONTH_WIDTH = 40;
const LABEL_COL_WIDTH = 60;
const HORIZONTAL_PADDING = 40;

function getDefaultSelection(): Set<string> {
  return new Set<string>();
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

export function TimelineCanvas({ objectives, signals, onNavigateToEvidence, fiscalYearEndMonth }: TimelineCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const mouseIsDown = useRef(false);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    getDefaultSelection()
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

  const canvasWidth = Math.max(totalMonths * MONTH_WIDTH + HORIZONTAL_PADDING * 2, 800);

  // Generate monthly nodes for visible objectives
  const visibleObjectives = useMemo(
    () => objectives.filter((o) => selectedIds.has(o.id)),
    [objectives, selectedIds]
  );

  const now = useMemo(() => new Date(), []);

  const objectiveNodeSets = useMemo(() => {
    return visibleObjectives.map((obj) => {
      const objSignals = signalsByObjective.get(obj.id) || [];
      const monthlyNodes = generateMonthlyNodes(objSignals, now, fiscalYearEndMonth);

      // Compute x and y for each node
      if (monthlyNodes.length > 0) {
        const originMonth = monthlyNodes[0].month;
        const globalOrigin = new Date(minDate);
        const globalOriginMonth = new Date(globalOrigin.getFullYear(), globalOrigin.getMonth(), 1);
        const originOffset = (originMonth.getFullYear() - globalOriginMonth.getFullYear()) * 12 +
          (originMonth.getMonth() - globalOriginMonth.getMonth());

        monthlyNodes.forEach((node, i) => {
          node.x = (originOffset + i) * MONTH_WIDTH + MONTH_WIDTH / 2 + HORIZONTAL_PADDING;
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

      // Add terminal node for proved/buried objectives
      const hasTerminalState = obj.terminal_state || (obj.is_in_graveyard === true);
      if (hasTerminalState && obj.exit_date) {
        const exitDate = new Date(obj.exit_date);
        const globalOrigin = new Date(minDate);
        const globalOriginMonth = new Date(globalOrigin.getFullYear(), globalOrigin.getMonth(), 1);
        const exitMonthOffset = (exitDate.getFullYear() - globalOriginMonth.getFullYear()) * 12 +
          (exitDate.getMonth() - globalOriginMonth.getMonth());
        const terminalX = exitMonthOffset * MONTH_WIDTH + MONTH_WIDTH / 2 + HORIZONTAL_PADDING;
        const terminalY = scoreToY(obj.momentum_score);
        const terminalType = obj.terminal_state === "proved" ? "terminal-proved" : "terminal-buried";

        monthlyNodes.push({
          type: terminalType,
          month: exitDate,
          x: terminalX,
          y: terminalY,
          score: obj.momentum_score,
        });
      }

      return { objective: obj, nodes: monthlyNodes, latestSignalIdx };
    });
  }, [visibleObjectives, signalsByObjective, now, minDate, fiscalYearEndMonth]);

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

  // Monthly axis labels
  const monthLabels = useMemo(() => {
    const labels: { x: number; label: string; isJanuary: boolean; year: number }[] = [];
    const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const start = new Date(minDate);
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    for (let i = 0; i < totalMonths; i++) {
      const d = new Date(startMonth);
      d.setMonth(d.getMonth() + i);
      labels.push({
        x: i * MONTH_WIDTH + MONTH_WIDTH / 2 + HORIZONTAL_PADDING,
        label: MONTH_ABBR[d.getMonth()],
        isJanuary: d.getMonth() === 0,
        year: d.getFullYear(),
      });
    }
    return labels;
  }, [minDate, totalMonths]);

  // Today marker
  const todayX = useMemo(() => {
    const today = new Date();
    const start = new Date(minDate);
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    const monthsFromStart =
      (today.getFullYear() - startMonth.getFullYear()) * 12 + (today.getMonth() - startMonth.getMonth());
    const dayFraction = today.getDate() / 30;
    return (monthsFromStart + dayFraction) * MONTH_WIDTH + HORIZONTAL_PADDING;
  }, [minDate]);

  // Deadline flags for objectives with commitment windows
  const deadlineFlags = useMemo(() => {
    return visibleObjectives
      .filter((obj) => obj.commitment_type !== "evergreen" && obj.committed_until)
      .map((obj) => {
        const deadlineDate = new Date(obj.committed_until!);
        const start = new Date(minDate);
        const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
        const monthsFromStart =
          (deadlineDate.getFullYear() - startMonth.getFullYear()) * 12 +
          (deadlineDate.getMonth() - startMonth.getMonth());
        const dayFraction = deadlineDate.getDate() / 30;
        const x = (monthsFromStart + dayFraction) * MONTH_WIDTH + HORIZONTAL_PADDING;
        const isOverdue = deadlineDate < now;
        const label = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(deadlineDate);
        return { objectiveId: obj.id, x, isOverdue, label };
      });
  }, [visibleObjectives, minDate, now]);

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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    mouseIsDown.current = true;
    isDragging.current = false;
    dragStartX.current = e.clientX;
    dragStartScrollLeft.current = el.scrollLeft;
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseIsDown.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragStartX.current;
    if (!isDragging.current && Math.abs(dx) < 5) return;
    isDragging.current = true;
    el.scrollLeft = dragStartScrollLeft.current - dx;
  }, []);

  const handleMouseUp = useCallback(() => {
    mouseIsDown.current = false;
    isDragging.current = false;
    const el = scrollRef.current;
    if (!el) return;
    el.style.cursor = "grab";
    el.style.userSelect = "";
  }, []);

  function toggleObjective(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
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
          <span>{selectedIds.size} of {objectives.filter((o) => hasSignals(o.id)).length} selected</span>
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
            data-timeline-scroll
            tabIndex={0}
            style={{ cursor: "grab" }}
            onKeyDown={handleKeyDown}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="relative" style={{ width: canvasWidth, height: CANVAS_HEIGHT }}>
              <svg className="absolute inset-0" width={canvasWidth} height={CANVAS_HEIGHT}>
                {/* Background zones */}
                <rect x={0} y={PADDING_Y} width={canvasWidth} height={GROUND_Y - PADDING_Y} fill="var(--timeline-zone-above)" />
                <rect x={0} y={GROUND_Y} width={canvasWidth} height={PADDING_Y + 8 * STAGE_HEIGHT - GROUND_Y} fill="var(--timeline-zone-below)" />

                {/* Stage lines (non-ground only — ground line rendered after paths for correct z-order) */}
                {STAGES.map((stage) => {
                  const y = scoreToY(stage.score);
                  const isGround = stage.score === 0;
                  if (isGround) return null;
                  return (
                    <g key={stage.name}>
                      <line x1={0} y1={y} x2={canvasWidth} y2={y} stroke="var(--border)" strokeWidth={0.5} />
                    </g>
                  );
                })}

                {/* Monthly vertical gridlines */}
                {monthLabels.map(({ x, isJanuary }, i) => (
                  <line
                    key={`grid-${i}`}
                    data-gridline={isJanuary ? "january" : "month"}
                    x1={x}
                    y1={PADDING_Y}
                    x2={x}
                    y2={PADDING_Y + 8 * STAGE_HEIGHT}
                    stroke="var(--border)"
                    strokeWidth={0.5}
                    opacity={isJanuary ? 0.3 : 0.15}
                  />
                ))}

                {/* Monthly axis labels */}
                {monthLabels.map(({ x, label, isJanuary, year }, i) => (
                  <g key={`month-${i}`}>
                    <text
                      x={x}
                      y={CANVAS_HEIGHT - AXIS_LABEL_HEIGHT + 18}
                      fontSize={9}
                      fill={isJanuary ? "var(--foreground)" : "var(--muted-foreground)"}
                      fontFamily="var(--font-ibm-plex-mono)"
                      textAnchor="middle"
                      fontWeight={isJanuary ? 600 : 400}
                      opacity={isJanuary ? 1 : 0.5}
                    >
                      {label}
                    </text>
                    {isJanuary && (
                      <text
                        x={x}
                        y={CANVAS_HEIGHT - AXIS_LABEL_HEIGHT + 30}
                        fontSize={9}
                        fill="var(--primary)"
                        fontFamily="var(--font-ibm-plex-mono)"
                        textAnchor="middle"
                        fontWeight={500}
                      >
                        {year}
                      </text>
                    )}
                  </g>
                ))}

                {/* Top axis labels — mirror of bottom */}
                {monthLabels.map(({ x, label, isJanuary, year }, i) => (
                  <g key={`month-top-${i}`}>
                    <text
                      x={x}
                      y={PADDING_Y - 14}
                      fontSize={9}
                      fill={isJanuary ? "var(--foreground)" : "var(--muted-foreground)"}
                      fontFamily="var(--font-ibm-plex-mono)"
                      textAnchor="middle"
                      fontWeight={isJanuary ? 600 : 400}
                      opacity={isJanuary ? 1 : 0.5}
                    >
                      {label}
                    </text>
                    {isJanuary && (
                      <text
                        x={x}
                        y={PADDING_Y - 4}
                        fontSize={9}
                        fill="var(--primary)"
                        fontFamily="var(--font-ibm-plex-mono)"
                        textAnchor="middle"
                        fontWeight={500}
                      >
                        {year}
                      </text>
                    )}
                  </g>
                ))}

                {/* Today marker */}
                <line x1={todayX} y1={PADDING_Y} x2={todayX} y2={PADDING_Y + 8 * STAGE_HEIGHT} stroke="var(--primary)" strokeWidth={1} strokeDasharray="6 3" opacity={0.5} />
                <text x={todayX} y={PADDING_Y - 4} fontSize={8} fill="var(--primary)" fontFamily="var(--font-ibm-plex-mono)" textAnchor="middle" opacity={0.7}>
                  Today
                </text>

                {/* Deadline flags */}
                {deadlineFlags.map(({ objectiveId, x, isOverdue, label }) => (
                  <DeadlineFlag
                    key={`deadline-${objectiveId}`}
                    x={x}
                    canvasTop={PADDING_Y}
                    canvasBottom={PADDING_Y + 8 * STAGE_HEIGHT}
                    isOverdue={isOverdue}
                    label={label}
                  />
                ))}

                {/* Paths for selected objectives */}
                {objectiveNodeSets.map(({ objective, nodes }) => {
                  const colour = colourMap.get(objective.id) ?? "#999";
                  const points = nodes.map((n) => ({ x: n.x, y: n.y }));
                  const dimmed = hoveredId !== null && hoveredId !== objective.id;
                  return (
                    <g key={objective.id} opacity={dimmed ? 0.25 : 1} style={{ transition: "opacity 200ms" }}>
                      <TimelinePath
                        points={points}
                        colour={colour}
                        groundY={GROUND_Y}
                        id={objective.id}
                        canvasWidth={canvasWidth}
                        canvasHeight={CANVAS_HEIGHT}
                      />
                    </g>
                  );
                })}

                {/* Ground line — rendered after path fills so it sits on top of fills but below nodes */}
                <line x1={0} y1={GROUND_Y} x2={canvasWidth} y2={GROUND_Y} stroke="var(--primary)" strokeWidth={2} />
                <text x={canvasWidth - 8} y={GROUND_Y - 6} fontSize={9} fill="var(--primary)" fontFamily="var(--font-ibm-plex-mono)" textAnchor="end">
                  GROUND LINE
                </text>

                {/* SVG nodes for selected objectives */}
                {objectiveNodeSets.map(({ objective, nodes, latestSignalIdx }, objIdx) => {
                  const colour = colourMap.get(objective.id) ?? "#999";
                  const dimmed = hoveredId !== null && hoveredId !== objective.id;
                  return (
                    <g
                      key={objective.id}
                      opacity={dimmed ? 0.25 : 1}
                      style={{ transition: "opacity 200ms" }}
                    >
                      {nodes.map((node, i) => {
                        const stageInfo = getStage(scoreToStage(node.score));
                        const nodeColour =
                          node.type === "fiscal-year-end" && !node.isFiscalYearEnd
                            ? "#f59e0b"
                            : colour;
                        const effectiveType =
                          node.type === "terminal-proved" || node.type === "terminal-buried"
                            ? node.type
                            : node.type === "signal" && i === latestSignalIdx ? "latest" : node.type;
                        const stageLabel =
                          node.type === "terminal-proved"
                            ? "PROVED"
                            : node.type === "terminal-buried"
                            ? (objective.exit_manner ? EXIT_MANNER_LABELS_CANVAS[objective.exit_manner] : "BURIED")
                            : node.type !== "cadence" && node.type !== "stale" && node.type !== "origin"
                            ? `${stageInfo.emoji} ${stageInfo.label.toUpperCase()} ${node.score >= 0 ? "+" : ""}${node.score}`
                            : undefined;
                        const dateLabel =
                          node.type === "origin" && objective.first_stated_date
                            ? new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
                                new Date(objective.first_stated_date)
                              )
                            : undefined;
                        return (
                          <TimelineNode
                            key={`${objective.id}-${i}`}
                            type={effectiveType}
                            x={node.x}
                            y={node.y}
                            colour={nodeColour}
                            label={stageLabel}
                            dateLabel={dateLabel}
                            stackIndex={objIdx}
                            monthsSinceLastSignal={node.monthsSinceLastSignal}
                            onHover={
                              node.type === "cadence" ||
                              (node.type === "fiscal-year-end" && !node.signal)
                                ? undefined
                                : (e: React.MouseEvent<SVGGElement>) => {
                                    setHoveredId(objective.id);
                                    const rect = (e.currentTarget as Element).getBoundingClientRect();
                                    setTooltip({
                                      objectiveId: objective.id,
                                      viewportX: rect.right,
                                      viewportY: rect.top,
                                      signal:
                                        node.type === "signal" ? node.signal : undefined,
                                      originalQuote:
                                        node.type === "origin"
                                          ? objective.original_quote ?? undefined
                                          : undefined,
                                      firstStatedDate:
                                        node.type === "origin"
                                          ? objective.first_stated_date ?? undefined
                                          : undefined,
                                      nodeScore: node.score,
                                      staleInfo:
                                        node.type === "stale"
                                          ? {
                                              lastSignalDate: (() => {
                                                const objSignals = signalsByObjective.get(objective.id);
                                                return (
                                                  objSignals?.[objSignals.length - 1]?.signal_date ??
                                                  "Unknown"
                                                );
                                              })(),
                                              monthsSilent: node.monthsSinceLastSignal ?? 0,
                                            }
                                          : null,
                                    });
                                  }
                            }
                            onLeave={
                              node.type === "cadence" ||
                              (node.type === "fiscal-year-end" && !node.signal)
                                ? undefined
                                : () => {
                                    setHoveredId(null);
                                    setTooltip(null);
                                  }
                            }
                            onClick={
                              effectiveType === "origin" || effectiveType === "signal" || effectiveType === "latest"
                                ? () => onNavigateToEvidence()
                                : undefined
                            }
                          />
                        );
                      })}
                    </g>
                  );
                })}
              </svg>

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

              {/* Empty state overlay */}
              {visibleObjectives.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="font-serif italic text-sm text-muted-foreground opacity-40">
                    Select an objective to view its trajectory
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {tooltipData && <TimelineTooltip {...tooltipData} />}
    </div>
  );
}
