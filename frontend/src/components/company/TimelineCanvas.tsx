"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
import type { Objective, Signal } from "@/lib/types";
import { STAGES, getStage, scoreToStage, formatQuarter, computeRunningMomentum } from "@/lib/momentum";
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

interface TooltipState { objectiveId: string; viewportX: number; viewportY: number; }

const PADDING_X = 60;
const PADDING_Y = 30;

/** Select top 3 objectives by absolute momentum score, breaking ties by signal count */
function getDefaultSelection(objectives: Objective[], signals: Signal[]): Set<string> {
  const signalCounts = new Map<string, number>();
  for (const s of signals) {
    signalCounts.set(s.objective_id, (signalCounts.get(s.objective_id) ?? 0) + 1);
  }

  // Prefer active objectives for default selection; fall back to all if fewer than 3 active
  const active = objectives.filter((o) => !o.is_in_graveyard);
  const pool = active.length >= 3 ? active : objectives;

  const sorted = [...pool].sort((a, b) => {
    const absDiff = Math.abs(b.momentum_score) - Math.abs(a.momentum_score);
    if (absDiff !== 0) return absDiff;
    return (signalCounts.get(b.id) ?? 0) - (signalCounts.get(a.id) ?? 0);
  });

  return new Set(sorted.slice(0, 3).map((o) => o.id));
}

export function TimelineCanvas({ objectives, signals, onNavigateToEvidence }: TimelineCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<PanzoomObject | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(480);

  const groundY = useMemo(() => canvasHeight / 2, [canvasHeight]);
  const stageHeight = useMemo(() => (canvasHeight - PADDING_Y * 2) / 8, [canvasHeight]);

  // Selection state: replaces old lockedIds
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    getDefaultSelection(objectives, signals)
  );

  const colourMap = useMemo(() => {
    const map = new Map<string, string>();
    objectives.forEach((obj, i) => { map.set(obj.id, OBJECTIVE_COLOURS[i % OBJECTIVE_COLOURS.length]); });
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

  const [now] = useState(() => Date.now());
  const { minDate, maxDate } = useMemo(() => {
    const dates = signals.map((s) => new Date(s.signal_date).getTime());
    if (dates.length === 0) return { minDate: now - 86400000 * 365, maxDate: now };
    return { minDate: Math.min(...dates), maxDate: Math.max(...dates, now) };
  }, [signals, now]);

  const dateToX = useCallback((date: string): number => {
    const t = new Date(date).getTime();
    const range = maxDate - minDate || 1;
    return PADDING_X + ((t - minDate) / range) * (canvasWidth - PADDING_X * 2);
  }, [minDate, maxDate, canvasWidth]);

  const scoreToY = useCallback((score: number): number => {
    return PADDING_Y + (4 - score) * stageHeight;
  }, [stageHeight]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const parent = el.parentElement;
    const instance = Panzoom(el, { maxScale: 5, minScale: 0.5, contain: "outside" });
    parent?.addEventListener("wheel", instance.zoomWithWheel);
    panzoomRef.current = instance;
    return () => {
      parent?.removeEventListener("wheel", instance.zoomWithWheel);
      instance.destroy();
    };
  }, []);

  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setCanvasWidth(rect.width - 210);
      setCanvasHeight(rect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleZoom(delta: number) {
    if (!panzoomRef.current) return;
    panzoomRef.current.zoom(panzoomRef.current.getScale() + delta, { animate: true });
  }

  function handleReset() { panzoomRef.current?.reset({ animate: true }); }

  function toggleObjective(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev; // enforce minimum 1
        next.delete(id);
      } else {
        if (next.size >= 3) return prev; // enforce maximum 3
        next.add(id);
      }
      return next;
    });
  }

  // Only compute nodes for selected objectives
  const visibleObjectives = useMemo(
    () => objectives.filter((o) => selectedIds.has(o.id)),
    [objectives, selectedIds]
  );

  const objectiveNodes = useMemo(() => {
    return visibleObjectives.map((obj) => {
      const objSignals = signalsByObjective.get(obj.id) || [];
      const runningScores = computeRunningMomentum(objSignals.map((s) => s.classification));
      const points = objSignals.map((s, i) => ({
        x: dateToX(s.signal_date),
        y: scoreToY(runningScores[i]),
        signal: s,
        score: runningScores[i],
      }));
      return { objective: obj, points };
    });
  }, [visibleObjectives, signalsByObjective, dateToX, scoreToY]);

  const crossings = useMemo(() => {
    return visibleObjectives
      .filter((o) => o.momentum_score < 0 && o.last_confirmed_date)
      .map((o) => ({ objective: o, x: dateToX(o.last_confirmed_date!), y: groundY }));
  }, [visibleObjectives, dateToX, groundY]);

  const todayX = dateToX(new Date().toISOString());

  const quarterLabels = useMemo(() => {
    const labels: { x: number; label: string }[] = [];
    const start = new Date(minDate);
    // Align to next quarter start
    const qMonth = Math.ceil((start.getMonth() + 1) / 3) * 3;
    const d = new Date(start.getFullYear(), qMonth, 1);
    while (d.getTime() <= maxDate) {
      const iso = d.toISOString();
      labels.push({ x: dateToX(iso), label: formatQuarter(iso) });
      d.setMonth(d.getMonth() + 3);
    }
    return labels;
  }, [minDate, maxDate, dateToX]);

  const tooltipData = useMemo(() => {
    if (!tooltip) return null;
    const obj = objectives.find((o) => o.id === tooltip.objectiveId);
    if (!obj) return null;
    const signalList = signalsByObjective.get(obj.id);
    const latest = signalList?.[signalList.length - 1];
    return {
      objectiveName: obj.title,
      stage: scoreToStage(obj.momentum_score),
      latestSignalText: latest?.excerpt ?? null,
      latestSignalSource: latest?.source_name ?? null,
      latestSignalDate: latest?.signal_date ?? null,
      viewportX: tooltip.viewportX,
      viewportY: tooltip.viewportY,
    };
  }, [tooltip, objectives, signalsByObjective]);

  if (objectives.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground font-sans">
        No objectives tracked yet. Objectives are added after the first agent intake run.
      </div>
    );
  }

  return (
    <div className="flex border border-border rounded-lg overflow-hidden bg-card h-[calc(100vh-170px)] min-h-[400px]">
      <TimelineLegend
        objectives={objectives}
        selectedIds={selectedIds}
        onToggleSelection={toggleObjective}
        colours={colourMap}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border text-xs font-mono text-muted-foreground">
          <span>{selectedIds.size} of 3 selected</span>
          <div className="flex gap-2">
            <button onClick={() => handleZoom(0.2)} className="px-2 py-1 border border-border rounded hover:bg-muted">+</button>
            <button onClick={() => handleZoom(-0.2)} className="px-2 py-1 border border-border rounded hover:bg-muted">&minus;</button>
            <button onClick={handleReset} className="px-2 py-1 border border-border rounded hover:bg-muted">Reset</button>
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div ref={canvasRef} className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
            <svg className="absolute inset-0" width={canvasWidth} height={canvasHeight}>
              {/* Background zones */}
              <rect x={PADDING_X} y={PADDING_Y} width={canvasWidth - PADDING_X * 2} height={groundY - PADDING_Y} fill="var(--timeline-zone-above)" />
              <rect x={PADDING_X} y={groundY} width={canvasWidth - PADDING_X * 2} height={canvasHeight - PADDING_Y - groundY} fill="var(--timeline-zone-below)" />

              {/* Stage lines */}
              {STAGES.map((stage) => {
                const y = scoreToY(stage.score);
                const isGround = stage.score === 0;
                return (
                  <g key={stage.name}>
                    {!isGround && (
                      <line x1={PADDING_X} y1={y} x2={canvasWidth - PADDING_X} y2={y} stroke="var(--border)" strokeWidth={1} />
                    )}
                    <text x={8} y={y + 4} fontSize={10} fill="var(--muted-foreground)" fontFamily="var(--font-ibm-plex-mono)">
                      {stage.emoji}
                    </text>
                    <text x={28} y={y + 4} fontSize={8} fill="var(--muted-foreground)" fontFamily="var(--font-ibm-plex-mono)">
                      {stage.score > 0 ? "+" : ""}{stage.score}
                    </text>
                  </g>
                );
              })}

              {/* Ground line */}
              <line x1={PADDING_X} y1={groundY} x2={canvasWidth - PADDING_X} y2={groundY} stroke="var(--primary)" strokeWidth={2} />
              <text x={canvasWidth - PADDING_X - 4} y={groundY + 4} fontSize={9} fill="var(--primary)" fontFamily="var(--font-ibm-plex-mono)" textAnchor="end">GROUND LINE</text>

              {/* Today marker */}
              <line x1={todayX} y1={PADDING_Y} x2={todayX} y2={canvasHeight - PADDING_Y} stroke="var(--primary)" strokeWidth={1} strokeDasharray="6 3" opacity={0.5} />

              {/* Quarterly date labels */}
              {quarterLabels.map(({ x, label }) => (
                <text key={label} x={x} y={canvasHeight - 8} fontSize={10} fill="var(--muted-foreground)" fontFamily="var(--font-ibm-plex-mono)" textAnchor="middle" opacity={0.6}>
                  {label}
                </text>
              ))}

              {/* Paths for selected objectives only */}
              {objectiveNodes.map(({ objective, points }) => (
                <TimelinePath key={objective.id} points={points} colour={colourMap.get(objective.id) ?? "#999"} isBelowGround={objective.momentum_score < 0} />
              ))}
            </svg>

            {/* Nodes for selected objectives only */}
            {objectiveNodes.map(({ objective, points }) => {
              return points.map((pt, i) => {
                const stage = scoreToStage(pt.score);
                const stageInfo = getStage(stage);
                return (
                  <TimelineNode
                    key={`${objective.id}-${i}`}
                    emoji={stageInfo.emoji}
                    colour={colourMap.get(objective.id) ?? stageInfo.colour}
                    x={pt.x} y={pt.y}
                    label={objective.title}
                    onHover={(e: React.MouseEvent) => {
                      setHoveredId(objective.id);
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setTooltip({ objectiveId: objective.id, viewportX: rect.right, viewportY: rect.top });
                    }}
                    onLeave={() => { setHoveredId(null); setTooltip(null); }}
                    onClick={() => { if (pt.signal) onNavigateToEvidence(); }}
                  />
                );
              });
            })}

            {/* Crossing markers for selected objectives only */}
            {crossings.map(({ objective, x, y }) => (
              <CrossingMarker key={`cross-${objective.id}`} x={x} y={y} label={`Crossing ${formatQuarter(objective.last_confirmed_date!)}`} editorialNote={`${objective.title} crossed the ground line.`} />
            ))}
          </div>
        </div>
      </div>
      {tooltipData && <TimelineTooltip {...tooltipData} />}
    </div>
  );
}
