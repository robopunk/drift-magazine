"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
import type { Objective, Signal } from "@/lib/types";
import { STAGES, getStage, scoreToStage, formatQuarter, classificationToScore } from "@/lib/momentum";
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

interface TooltipState { objectiveId: string; x: number; y: number; }

const PADDING_X = 60;
const PADDING_Y = 40;
const CANVAS_HEIGHT = 500;
const GROUND_Y = CANVAS_HEIGHT / 2;
const STAGE_HEIGHT = (CANVAS_HEIGHT - PADDING_Y * 2) / 8;

export function TimelineCanvas({ objectives, signals, onNavigateToEvidence }: TimelineCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<PanzoomObject | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);

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
    return PADDING_Y + (4 - score) * STAGE_HEIGHT;
  }, []);

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
    const observer = new ResizeObserver((entries) => { setCanvasWidth(entries[0].contentRect.width - 210); });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleZoom(delta: number) {
    if (!panzoomRef.current) return;
    panzoomRef.current.zoom(panzoomRef.current.getScale() + delta, { animate: true });
  }

  function handleReset() { panzoomRef.current?.reset({ animate: true }); }

  function toggleLock(id: string) {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function getOpacity(objId: string): number {
    const hasIsolation = hoveredId !== null || lockedIds.size > 0;
    if (!hasIsolation) return 0.3;
    if (lockedIds.has(objId) || hoveredId === objId) return 1;
    return 0.1;
  }

  const objectiveNodes = useMemo(() => {
    return objectives.map((obj) => {
      const objSignals = signalsByObjective.get(obj.id) || [];
      const points = objSignals.map((s) => {
        const signalScore = classificationToScore(s.classification);
        return {
          x: dateToX(s.signal_date),
          y: scoreToY(signalScore),
          signal: s,
          score: signalScore,
        };
      });
      return { objective: obj, points };
    });
  }, [objectives, signalsByObjective, dateToX, scoreToY]);

  const crossings = useMemo(() => {
    return objectives
      .filter((o) => o.momentum_score < 0 && o.last_confirmed_date)
      .map((o) => ({ objective: o, x: dateToX(o.last_confirmed_date!), y: GROUND_Y }));
  }, [objectives, dateToX]);

  const todayX = dateToX(new Date().toISOString());

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
      x: tooltip.x,
      y: tooltip.y,
    };
  }, [tooltip, objectives, signalsByObjective]);

  const aboveCount = objectives.filter((o) => o.momentum_score > 0).length;
  const crossingCount = crossings.length;
  const belowCount = objectives.filter((o) => o.momentum_score < 0).length;

  if (objectives.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground font-sans">
        No objectives tracked yet. Objectives are added after the first agent intake run.
      </div>
    );
  }

  return (
    <div className="flex border border-border rounded-lg overflow-hidden bg-card" style={{ height: CANVAS_HEIGHT + 60 }}>
      <TimelineLegend objectives={objectives} hoveredId={hoveredId} lockedIds={lockedIds} onHover={setHoveredId} onToggleLock={toggleLock} colours={colourMap} />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border text-xs font-mono text-muted-foreground">
          <div className="flex gap-4">
            <span>{aboveCount} above</span>
            <span>{crossingCount} crossing</span>
            <span>{belowCount} below</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleZoom(0.2)} className="px-2 py-1 border border-border rounded hover:bg-muted">+</button>
            <button onClick={() => handleZoom(-0.2)} className="px-2 py-1 border border-border rounded hover:bg-muted">&minus;</button>
            <button onClick={handleReset} className="px-2 py-1 border border-border rounded hover:bg-muted">Reset</button>
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div ref={canvasRef} className="relative" style={{ width: canvasWidth, height: CANVAS_HEIGHT }}>
            <svg className="absolute inset-0" width={canvasWidth} height={CANVAS_HEIGHT}>
              {STAGES.map((stage) => {
                const y = scoreToY(stage.score);
                return (
                  <g key={stage.name}>
                    <line x1={PADDING_X} y1={y} x2={canvasWidth - PADDING_X} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray="4 4" />
                    <text x={8} y={y + 4} fontSize={11} fill="var(--muted-foreground)" fontFamily="var(--font-ibm-plex-mono)">{stage.emoji}</text>
                  </g>
                );
              })}
              <line x1={PADDING_X} y1={GROUND_Y} x2={canvasWidth - PADDING_X} y2={GROUND_Y} stroke="var(--primary)" strokeWidth={2} />
              <text x={canvasWidth - PADDING_X + 4} y={GROUND_Y + 4} fontSize={9} fill="var(--primary)" fontFamily="var(--font-ibm-plex-mono)">GROUND LINE</text>
              <line x1={todayX} y1={PADDING_Y} x2={todayX} y2={CANVAS_HEIGHT - PADDING_Y} stroke="var(--primary)" strokeWidth={1} strokeDasharray="6 3" opacity={0.5} />
              {objectiveNodes.map(({ objective, points }) => (
                <TimelinePath key={objective.id} points={points} colour={colourMap.get(objective.id) ?? "#999"} isBelowGround={objective.momentum_score < 0} opacity={getOpacity(objective.id)} />
              ))}
            </svg>
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
                  onHover={() => { setHoveredId(objective.id); setTooltip({ objectiveId: objective.id, x: pt.x, y: pt.y }); }}
                  onLeave={() => { if (!lockedIds.has(objective.id)) setHoveredId(null); setTooltip(null); }}
                  onClick={() => { if (pt.signal) onNavigateToEvidence(); }}
                />
                );
              });
            })}
            {crossings.map(({ objective, x, y }) => (
              <CrossingMarker key={`cross-${objective.id}`} x={x} y={y} label={`Crossing ${formatQuarter(objective.last_confirmed_date!)}`} editorialNote={`${objective.title} crossed the ground line.`} />
            ))}
            {tooltipData && <TimelineTooltip {...tooltipData} canvasWidth={canvasWidth} />}
          </div>
        </div>
      </div>
    </div>
  );
}
