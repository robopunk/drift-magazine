import { describe, it, expect } from "vitest";
import {
  STAGES,
  getStage,
  getStageColour,
  getStageEmoji,
  getStageCaption,
  scoreToStage,
} from "@/lib/momentum";

describe("momentum", () => {
  it("has exactly 9 stages from +4 to -4", () => {
    expect(STAGES).toHaveLength(9);
    expect(STAGES[0].score).toBe(4);
    expect(STAGES[8].score).toBe(-4);
  });

  it("getStage returns correct stage for name", () => {
    const fly = getStage("fly");
    expect(fly.score).toBe(3);
    expect(fly.emoji).toBe("\u{1F985}");
  });

  it("getStageColour returns hex colour", () => {
    expect(getStageColour("orbit")).toBe("#059669");
    expect(getStageColour("buried")).toBe("#78716c");
  });

  it("getStageEmoji returns emoji", () => {
    expect(getStageEmoji("watch")).toBe("\u{1F9CD}");
  });

  it("getStageCaption returns Boardroom Allegory caption", () => {
    const caption = getStageCaption("buried");
    expect(caption).toContain("No eulogy was issued");
  });

  it("scoreToStage maps numeric score to stage name", () => {
    expect(scoreToStage(4)).toBe("orbit");
    expect(scoreToStage(0)).toBe("watch");
    expect(scoreToStage(-4)).toBe("buried");
  });

  it("scoreToStage clamps out-of-range scores", () => {
    expect(scoreToStage(5)).toBe("orbit");
    expect(scoreToStage(-5)).toBe("buried");
  });
});
