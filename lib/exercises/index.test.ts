import { describe, expect, it } from "vitest";
import { createExerciseAnalyzer, hasExerciseAnalyzer } from "@/lib/exercises/index";

describe("exercise analyzer registry", () => {
  it("resolves the four supported movement families", () => {
    expect(createExerciseAnalyzer("squat")?.exerciseId).toBe("squat");
    expect(createExerciseAnalyzer("push-up")?.exerciseId).toBe("push-up");
    expect(createExerciseAnalyzer("reverse-lunge")?.exerciseId).toBe("lunge");
    expect(createExerciseAnalyzer("plank")?.supportsReps).toBe(false);
  });

  it("fails closed for exercises without a calibrated analyzer", () => {
    expect(hasExerciseAnalyzer("mountain-climber")).toBe(false);
    expect(createExerciseAnalyzer("mountain-climber")).toBeNull();
  });
});
