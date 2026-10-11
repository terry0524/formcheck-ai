import { describe, expect, it } from "vitest";
import { scoreSquatRep, SquatFormCoach } from "@/lib/formFeedback";
import type { SquatAnalysis, SquatMetrics, SquatRepSummary } from "@/types/exercise";

const goodSummary: SquatRepSummary = {
  minKneeAngle: 96,
  minHipAngle: 92,
  maxHipDrop: 0.16,
  maxTrunkAngle: 32,
  maxKneeAlignmentDeviation: 0.03,
  kneeAlignmentMeasured: true,
};

function analysis(overrides: Partial<SquatMetrics> = {}): SquatAnalysis {
  return {
    repCount: 0,
    phase: "BOTTOM",
    tracking: true,
    repCompleted: false,
    completedRep: null,
    rejectedReason: null,
    metrics: {
      leftKneeAngle: 110,
      rightKneeAngle: 110,
      kneeAngle: 110,
      leftHipAngle: 105,
      rightHipAngle: 105,
      hipAngle: 105,
      trunkAngle: 30,
      hipHeight: 0.62,
      hipDrop: 0.08,
      kneePosition: 0.2,
      kneeAlignmentDeviation: 0.03,
      kneeAlignmentReliable: true,
      confidence: 0.95,
      ...overrides,
    },
  };
}

describe("scoreSquatRep", () => {
  it("scores an in-range rep as GOOD with no penalties", () => {
    expect(scoreSquatRep(1, goodSummary, 1000)).toMatchObject({
      score: 100,
      label: "GOOD",
      issues: [],
      penalties: { depth: 0, trunkLean: 0, kneeAlignment: 0 },
    });
  });

  it("marks a counted but shallow rep as NEEDS IMPROVEMENT", () => {
    const result = scoreSquatRep(3, { ...goodSummary, minKneeAngle: 116, maxHipDrop: 0.1 }, 1000);
    expect(result.label).toBe("NEEDS IMPROVEMENT");
    expect(result.score).toBe(72);
    expect(result.categoryScores).toEqual({ depth: 31, trunk: 100, alignment: 100 });
    expect(result.issues.map((issue) => issue.code)).toContain("shallow");
  });

  it("does not score knee alignment when the camera angle is unsuitable", () => {
    const result = scoreSquatRep(1, {
      ...goodSummary,
      kneeAlignmentMeasured: false,
      maxKneeAlignmentDeviation: null,
    }, 1000);
    expect(result.penalties.kneeAlignment).toBe(0);
    expect(result.categoryScores.alignment).toBeNull();
    expect(result.availableWeight).toBe(75);
    expect(result.issues.map((issue) => issue.code)).not.toContain("knee-alignment");
  });

  it("records trunk and reliable knee-alignment issues independently", () => {
    const result = scoreSquatRep(1, {
      ...goodSummary,
      maxTrunkAngle: 50,
      maxKneeAlignmentDeviation: 0.2,
    }, 1000);
    expect(result.issues.map((issue) => issue.code)).toEqual(["trunk-lean", "knee-alignment"]);
    expect(result.penalties).toMatchObject({ trunkLean: 17, kneeAlignment: 15 });
  });
});

describe("SquatFormCoach", () => {
  it("requires persistence and suppresses the same cue during cooldown", () => {
    const coach = new SquatFormCoach();
    const shallow = analysis();
    expect(coach.update(shallow, 0)).toBeNull();
    expect(coach.update(shallow, 200)).toBeNull();
    expect(coach.update(shallow, 350)).toMatchObject({ code: "shallow", message: "조금 더 내려가세요." });
    expect(coach.update(shallow, 800)).toBeNull();
    expect(coach.update(shallow, 1200)).toBeNull();
    expect(coach.update(shallow, 7500)).toBeNull();
    expect(coach.update(shallow, 7900)).toMatchObject({ code: "shallow" });
  });

  it("skips knee feedback when alignment is not reliable", () => {
    const coach = new SquatFormCoach();
    const unsuitableAngle = analysis({
      kneeAngle: 95,
      hipDrop: 0.16,
      kneeAlignmentReliable: false,
      kneeAlignmentDeviation: null,
    });
    expect(coach.update(unsuitableAngle, 0)).toBeNull();
    expect(coach.update(unsuitableAngle, 500)).toBeNull();
  });
});
