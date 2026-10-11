import { afterEach, describe, expect, it, vi } from "vitest";
import { loadLatestSquatWorkout, saveSquatWorkout } from "@/lib/workoutStorage";
import type { SquatWorkoutRecord } from "@/types/workout";

const record: SquatWorkoutRecord = {
  id: "session-1",
  exercise: "squat",
  targetReps: 5,
  feedbackMode: "screen",
  voiceFrequency: "minimal",
  startedAt: "2026-09-14T00:00:00.000Z",
  updatedAt: "2026-09-14T00:01:00.000Z",
  reps: [{
    rep: 1,
    score: 74,
    label: "NEEDS IMPROVEMENT",
    issues: [{ code: "shallow", message: "조금 더 내려가세요." }],
    summary: {
      minKneeAngle: 116,
      minHipAngle: 100,
      maxHipDrop: 0.1,
      maxTrunkAngle: 32,
      maxKneeAlignmentDeviation: null,
      kneeAlignmentMeasured: false,
    },
    categoryScores: { depth: 31, trunk: 100, alignment: null },
    availableWeight: 75,
    penalties: { depth: 26, trunkLean: 0, kneeAlignment: 0 },
    completedAt: 1000,
  }],
};

afterEach(() => vi.unstubAllGlobals());

describe("squat workout storage", () => {
  it("round-trips the complete per-rep evaluation", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      setItem: (key: string, value: string) => values.set(key, value),
      getItem: (key: string) => values.get(key) ?? null,
    });

    expect(saveSquatWorkout(record)).toBe(true);
    expect(loadLatestSquatWorkout()).toEqual(record);
  });

  it("fails closed when stored data cannot be parsed", () => {
    vi.stubGlobal("localStorage", {
      setItem: vi.fn(),
      getItem: () => "not-json",
    });

    expect(loadLatestSquatWorkout()).toBeNull();
  });
});
