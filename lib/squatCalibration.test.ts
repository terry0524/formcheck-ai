import { describe, expect, it } from "vitest";
import { SquatEngine } from "@/lib/exerciseEngine";
import { SquatAnalyzer } from "@/lib/exercises/squatAnalyzer";
import type { SquatMetrics, SquatRepEvaluation } from "@/types/exercise";

type EngineMetrics = Omit<SquatMetrics, "hipDrop">;

function sample(kneeAngle: number, hipAngle: number, hipHeight: number, confidence = 0.95): EngineMetrics {
  return {
    leftKneeAngle: kneeAngle,
    rightKneeAngle: kneeAngle,
    kneeAngle,
    leftHipAngle: hipAngle,
    rightHipAngle: hipAngle,
    hipAngle,
    trunkAngle: Math.max(5, (180 - hipAngle) * 0.35),
    hipHeight,
    kneePosition: 0.25,
    kneeAlignmentDeviation: 0.02,
    kneeAlignmentReliable: true,
    confidence,
  };
}

const STANDING = sample(172, 168, 0.42);
const BOTTOM = sample(94, 88, 0.66);

class Scenario {
  readonly engine = new SquatEngine();
  timestamp = 50;
  completed: SquatRepEvaluation[] = [];

  hold(value: EngineMetrics | null, duration: number, step = 50) {
    for (let elapsed = 0; elapsed <= duration; elapsed += step) this.push(value, step);
  }

  move(from: EngineMetrics, to: EngineMetrics, duration: number, step = 50) {
    for (let elapsed = 0; elapsed <= duration; elapsed += step) {
      const progress = elapsed / duration;
      this.push(sample(
        from.kneeAngle + (to.kneeAngle - from.kneeAngle) * progress,
        from.hipAngle + (to.hipAngle - from.hipAngle) * progress,
        from.hipHeight + (to.hipHeight - from.hipHeight) * progress,
        Math.min(from.confidence, to.confidence),
      ), step);
    }
  }

  fullRep(downMs = 650, bottomMs = 350, upMs = 700, step = 50) {
    this.hold(STANDING, 300, step);
    this.move(STANDING, BOTTOM, downMs, step);
    this.hold(BOTTOM, bottomMs, step);
    this.move(BOTTOM, STANDING, upMs, step);
    this.hold(STANDING, 350, step);
  }

  private push(value: EngineMetrics | null, step: number) {
    const result = this.engine.updateMetrics(value, this.timestamp);
    if (result.completedRep) this.completed.push(result.completedRep);
    this.timestamp += step;
  }
}

describe("Squat calibration scenarios", () => {
  it("A. Normal Squat -> exactly one rep", () => {
    const scenario = new Scenario();
    scenario.fullRep();
    expect(scenario.completed).toHaveLength(1);
  });

  it("B. Shallow Squat -> counted at accepted bottom boundary and flagged shallow", () => {
    const scenario = new Scenario();
    const shallow = sample(116, 118, 0.55);
    scenario.hold(STANDING, 350);
    scenario.move(STANDING, shallow, 650);
    scenario.hold(shallow, 500);
    scenario.move(shallow, STANDING, 700);
    scenario.hold(STANDING, 400);
    expect(scenario.completed).toHaveLength(1);
    expect(scenario.completed[0].issues.map((issue) => issue.code)).toContain("shallow");
  });

  it("C. Very Slow Squat -> one rep", () => {
    const scenario = new Scenario();
    scenario.fullRep(4000, 1000, 4000, 100);
    expect(scenario.completed).toHaveLength(1);
  });

  it("D. Fast Squat -> one rep when reliable and phase durations remain plausible", () => {
    const scenario = new Scenario();
    scenario.fullRep(350, 200, 400, 40);
    expect(scenario.completed).toHaveLength(1);
  });

  it("E. Half movement then stand -> incomplete rep", () => {
    const scenario = new Scenario();
    const half = sample(126, 132, 0.52);
    scenario.hold(STANDING, 350);
    scenario.move(STANDING, half, 600);
    scenario.hold(half, 300);
    scenario.move(half, STANDING, 600);
    scenario.hold(STANDING, 400);
    expect(scenario.completed).toHaveLength(0);
  });

  it("F. Sit at bottom -> no duplicate count, one rep only after standing", () => {
    const scenario = new Scenario();
    scenario.hold(STANDING, 350);
    scenario.move(STANDING, BOTTOM, 650);
    scenario.hold(BOTTOM, 3000);
    expect(scenario.completed).toHaveLength(0);
    scenario.move(BOTTOM, STANDING, 700);
    scenario.hold(STANDING, 400);
    expect(scenario.completed).toHaveLength(1);
  });

  it("G. Small knee bending -> no rep", () => {
    const scenario = new Scenario();
    for (let cycle = 0; cycle < 5; cycle += 1) {
      const bend = sample(156, 154, 0.435);
      scenario.move(STANDING, bend, 250);
      scenario.move(bend, STANDING, 250);
    }
    expect(scenario.completed).toHaveLength(0);
  });

  it("H. Walk around camera -> no rep", () => {
    const scenario = new Scenario();
    for (let index = 0; index < 80; index += 1) {
      scenario.hold(sample(168, 164, 0.38 + (index % 10) * 0.008), 0);
    }
    expect(scenario.completed).toHaveLength(0);
  });

  it("I. Leave frame -> analysis is suspended and active cycle is rejected", () => {
    const scenario = new Scenario();
    scenario.hold(STANDING, 350);
    scenario.move(STANDING, BOTTOM, 650);
    scenario.hold(null, 700);
    const state = scenario.engine.updateMetrics(null, scenario.timestamp);
    expect(state.tracking).toBe(false);
    expect(state.completedRep).toBeNull();
    expect(scenario.completed).toHaveLength(0);
  });

  it("J. Return to frame -> clean standing recovery and one new rep", () => {
    const scenario = new Scenario();
    scenario.hold(STANDING, 350);
    scenario.move(STANDING, BOTTOM, 650);
    scenario.hold(null, 700);
    scenario.hold(STANDING, 500);
    scenario.fullRep();
    expect(scenario.completed).toHaveLength(1);
  });

  it("reports low-confidence input as unable to evaluate, never bad form", () => {
    const analyzer = new SquatAnalyzer();
    const detection = analyzer.detectState(null, 1000);
    expect(detection).toMatchObject({ state: "UNABLE_TO_EVALUATE", tracking: false });
    expect(analyzer.evaluateForm()).toBeNull();
    expect(analyzer.getFeedback()).toBeNull();
  });
});
