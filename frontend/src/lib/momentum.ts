import type { MomentumStage } from "./types";

export interface StageDefinition {
  name: MomentumStage;
  label: string;
  score: number;
  emoji: string;
  colour: string;
  cssVar: string;
  caption: string;
}

export const STAGES: StageDefinition[] = [
  {
    name: "orbit", label: "Orbit", score: 4,
    emoji: "\u{1F680}", colour: "#059669", cssVar: "--momentum-orbit",
    caption: "Exceeded their own ambition \u2014 and now must live up to the sequel",
  },
  {
    name: "fly", label: "Fly", score: 3,
    emoji: "\u{1F985}", colour: "#16a34a", cssVar: "--momentum-fly",
    caption: "Soaring \u2014 though altitude has a way of making the ground look optional",
  },
  {
    name: "run", label: "Run", score: 2,
    emoji: "\u{1F3C3}", colour: "#65a30d", cssVar: "--momentum-run",
    caption: "On pace, on message, on record \u2014 the rarest trifecta",
  },
  {
    name: "walk", label: "Walk", score: 1,
    emoji: "\u{1F6B6}", colour: "#ca8a04", cssVar: "--momentum-walk",
    caption: "Progressing steadily, which in corporate parlance means \u2018not yet panicking\u2019",
  },
  {
    name: "watch", label: "Watch", score: 0,
    emoji: "\u{1F9CD}", colour: "#d97706", cssVar: "--momentum-watch",
    caption: "Standing still \u2014 the silence before the language starts to soften",
  },
  {
    name: "crawl", label: "Crawl", score: -1,
    emoji: "\u{1F40C}", colour: "#ea580c", cssVar: "--momentum-crawl",
    caption: "The adjectives are getting vaguer and the timelines more flexible",
  },
  {
    name: "drag", label: "Drag", score: -2,
    emoji: "\u{1FAA8}", colour: "#dc2626", cssVar: "--momentum-drag",
    caption: "The objective remains, technically \u2014 like a painting no one has moved but everyone avoids",
  },
  {
    name: "sink", label: "Sink", score: -3,
    emoji: "\u{1F573}\u{FE0F}", colour: "#b91c1c", cssVar: "--momentum-sink",
    caption: "Entering graveyard territory \u2014 and the comms team hasn\u2019t noticed yet",
  },
  {
    name: "buried", label: "Buried", score: -4,
    emoji: "\u{26B0}\u{FE0F}", colour: "#78716c", cssVar: "--momentum-buried",
    caption: "Confirmed off the record. No eulogy was issued.",
  },
];

const stageByName = new Map(STAGES.map((s) => [s.name, s]));
const stageByScore = new Map(STAGES.map((s) => [s.score, s]));

const FALLBACK_STAGE = STAGES.find((s) => s.score === 0)!;

export function getStage(name: MomentumStage): StageDefinition {
  return stageByName.get(name) ?? FALLBACK_STAGE;
}

export function getStageColour(name: MomentumStage): string {
  return (stageByName.get(name) ?? FALLBACK_STAGE).colour;
}

export function getStageEmoji(name: MomentumStage): string {
  return (stageByName.get(name) ?? FALLBACK_STAGE).emoji;
}

export function getStageCaption(name: MomentumStage): string {
  return (stageByName.get(name) ?? FALLBACK_STAGE).caption;
}

export function scoreToStage(score: number): MomentumStage {
  const clamped = Math.max(-4, Math.min(4, score));
  const rounded = Math.round(clamped);
  return (stageByScore.get(rounded) ?? FALLBACK_STAGE).name;
}

/** Map a signal classification to an approximate momentum score for timeline Y positioning */
export function classificationToScore(classification: string): number {
  switch (classification) {
    case "achieved": return 4;
    case "reinforced": return 3;
    case "stated": return 1;
    case "softened": return -1;
    case "reframed": return -2;
    case "absent": return -3;
    case "retired_transparent": return -3;
    case "retired_silent": return -4;
    default: return 0;
  }
}

export function formatQuarter(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  const year = String(d.getFullYear()).slice(-2);
  return `Q${q} '${year}`;
}
