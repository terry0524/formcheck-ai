import { describe, expect, it } from "vitest";
import { extractSquatMetrics, SquatEngine } from "@/lib/exerciseEngine";
import { POSE_INDEX } from "@/lib/bodyVisibility";
import type { SquatMetrics, SquatRepEvaluation } from "@/types/exercise";
import type { PoseFrame, PoseLandmark } from "@/types/pose";

type EngineMetrics = Omit<SquatMetrics, "hipDrop">;

function metrics(kneeAngle: number, hipAngle: number, hipHeight: number): EngineMetrics {
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
    confidence: 0.95,
  };
}

class Sequence {
  timestamp = 50;
  completed: SquatRepEvaluation[] = [];

  constructor(readonly engine: SquatEngine) {}

  hold(sample: EngineMetrics, duration: number) {
    for (let elapsed = 0; elapsed <= duration; elapsed += 50) {
      this.capture(this.engine.updateMetrics(sample, this.timestamp).completedRep);
      this.timestamp += 50;
    }
  }

  move(from: EngineMetrics, to: EngineMetrics, duration: number) {
    for (let elapsed = 0; elapsed <= duration; elapsed += 50) {
      const progress = elapsed / duration;
      const knee = from.kneeAngle + (to.kneeAngle - from.kneeAngle) * progress;
      const hip = from.hipAngle + (to.hipAngle - from.hipAngle) * progress;
      const height = from.hipHeight + (to.hipHeight - from.hipHeight) * progress;
      this.capture(this.engine.updateMetrics(metrics(knee, hip, height), this.timestamp).completedRep);
      this.timestamp += 50;
    }
  }

  fullRep(bottomPause = 350) {
    const standing = metrics(172, 168, 0.42);
    const bottom = metrics(94, 88, 0.66);
    this.hold(standing, 300);
    this.move(standing, bottom, 650);
    this.hold(bottom, bottomPause);
    this.move(bottom, standing, 700);
    this.hold(standing, 350);
  }

  private capture(evaluation: SquatRepEvaluation | null) {
    if (evaluation) this.completed.push(evaluation);
  }
}

describe("SquatEngine", () => {
  it("extracts bilateral knee, hip, trunk, height, and knee-position metrics", () => {
    const landmarks: PoseLandmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.95 }));
    for (const side of [
      [POSE_INDEX.leftShoulder, POSE_INDEX.leftHip, POSE_INDEX.leftKnee, POSE_INDEX.leftAnkle, 0.4],
      [POSE_INDEX.rightShoulder, POSE_INDEX.rightHip, POSE_INDEX.rightKnee, POSE_INDEX.rightAnkle, 0.6],
    ] as const) {
      const [shoulder, hip, knee, ankle, x] = side;
      landmarks[shoulder] = { x, y: 0.2, z: 0, visibility: 0.95 };
      landmarks[hip] = { x, y: 0.4, z: 0, visibility: 0.95 };
      landmarks[knee] = { x, y: 0.65, z: 0, visibility: 0.95 };
      landmarks[ankle] = { x, y: 0.9, z: 0, visibility: 0.95 };
    }
    const frame: PoseFrame = { timestamp: 0, landmarks, worldLandmarks: landmarks, inferenceMs: 8 };
    const result = extractSquatMetrics(frame);
    expect(result?.leftKneeAngle).toBeCloseTo(180);
    expect(result?.rightKneeAngle).toBeCloseTo(180);
    expect(result?.hipAngle).toBeCloseTo(180);
    expect(result?.trunkAngle).toBeCloseTo(0);
    expect(result?.hipHeight).toBeCloseTo(0.4);
    expect(result?.kneePosition).toBeCloseTo(0);
  });

  it("counts exactly five complete squat sequences", () => {
    const engine = new SquatEngine();
    const sequence = new Sequence(engine);
    for (let rep = 0; rep < 5; rep += 1) sequence.fullRep();
    expect(engine.updateMetrics(metrics(172, 168, 0.42), sequence.timestamp).repCount).toBe(5);
    expect(sequence.completed).toHaveLength(5);
    expect(sequence.completed.every((rep) => rep.label === "GOOD")).toBe(true);
  });

  it("counts a parallel-depth rep but records it as shallow", () => {
    const engine = new SquatEngine();
    const sequence = new Sequence(engine);
    const standing = metrics(172, 168, 0.42);
    const shallowBottom = metrics(116, 118, 0.55);
    sequence.hold(standing, 350);
    sequence.move(standing, shallowBottom, 650);
    sequence.hold(shallowBottom, 500);
    sequence.move(shallowBottom, standing, 700);
    sequence.hold(standing, 400);
    expect(sequence.completed).toHaveLength(1);
    expect(sequence.completed[0]).toMatchObject({ label: "NEEDS IMPROVEMENT" });
    expect(sequence.completed[0].issues.map((issue) => issue.code)).toContain("shallow");
  });

  it("rejects a half squat that never reaches BOTTOM", () => {
    const engine = new SquatEngine();
    const sequence = new Sequence(engine);
    const standing = metrics(172, 168, 0.42);
    const halfSquat = metrics(126, 132, 0.52);
    sequence.hold(standing, 350);
    sequence.move(standing, halfSquat, 550);
    sequence.hold(halfSquat, 250);
    sequence.move(halfSquat, standing, 550);
    sequence.hold(standing, 400);
    expect(engine.updateMetrics(standing, sequence.timestamp).repCount).toBe(0);
  });

  it("completes a full cycle when the standing knee estimate plateaus below 160 degrees", () => {
    const sequence = new Sequence(new SquatEngine());
    const standing = metrics(172, 168, 0.42);
    const bottom = metrics(94, 88, 0.66);
    const returned = metrics(158, 170, 0.42);
    sequence.hold(standing, 350);
    sequence.move(standing, bottom, 650);
    sequence.hold(bottom, 350);
    sequence.move(bottom, returned, 700);
    sequence.hold(returned, 500);
    expect(sequence.completed).toHaveLength(1);
    sequence.hold(returned, 1000);
    expect(sequence.completed).toHaveLength(1);
  });

  it("does not cancel a stable finish for small negative knee-velocity jitter", () => {
    const sequence = new Sequence(new SquatEngine());
    const standing = metrics(172, 168, 0.42);
    const bottom = metrics(94, 88, 0.66);
    sequence.hold(standing, 350);
    sequence.move(standing, bottom, 650);
    sequence.hold(bottom, 350);
    sequence.move(bottom, metrics(158, 170, 0.42), 700);
    for (let index = 0; index < 12; index += 1) {
      sequence.hold(metrics(index % 2 ? 155 : 158, 170, 0.42), 0);
    }
    expect(sequence.completed).toHaveLength(1);
  });

  it("does not complete when the user remains substantially knee-flexed after rising", () => {
    const sequence = new Sequence(new SquatEngine());
    const standing = metrics(172, 168, 0.42);
    const bottom = metrics(94, 88, 0.66);
    const incomplete = metrics(150, 170, 0.42);
    sequence.hold(standing, 350);
    sequence.move(standing, bottom, 650);
    sequence.hold(bottom, 350);
    sequence.move(bottom, incomplete, 700);
    sequence.hold(incomplete, 1000);
    expect(sequence.completed).toHaveLength(0);
  });

  it("preserves bottom dwell observed while the descent gate is still confirming at 10 FPS", () => {
    const engine = new SquatEngine();
    let timestamp = 100;
    const completed: SquatRepEvaluation[] = [];
    const push = (knee: number, hip: number, height: number) => {
      const result = engine.updateMetrics(metrics(knee, hip, height), timestamp);
      if (result.completedRep) completed.push(result.completedRep);
      timestamp += 100;
    };
    for (let i = 0; i < 8; i += 1) push(172, 170, 0.42);
    // The bottom starts before the separate 120 ms descent gate finishes.
    for (const [knee, hip, height] of [
      [148, 157, 0.45], [138, 151, 0.49], [100, 112, 0.54],
      [90, 105, 0.55], [95, 109, 0.55], [112, 124, 0.54],
      [145, 160, 0.46], [160, 170, 0.42],
    ]) push(knee, hip, height);
    for (let i = 0; i < 8; i += 1) push(158, 170, 0.42);
    expect(completed).toHaveLength(1);
  });

  it("does not count while held at the bottom, then counts on a full return", () => {
    const engine = new SquatEngine();
    const sequence = new Sequence(engine);
    const standing = metrics(172, 168, 0.42);
    const bottom = metrics(94, 88, 0.66);
    sequence.hold(standing, 350);
    sequence.move(standing, bottom, 650);
    sequence.hold(bottom, 2500);
    expect(engine.updateMetrics(bottom, sequence.timestamp).repCount).toBe(0);
    sequence.move(bottom, standing, 700);
    sequence.hold(standing, 400);
    expect(engine.updateMetrics(standing, sequence.timestamp).repCount).toBe(1);
  });

  it("rejects an interrupted cycle after tracking is lost", () => {
    const engine = new SquatEngine();
    const sequence = new Sequence(engine);
    const standing = metrics(172, 168, 0.42);
    const bottom = metrics(94, 88, 0.66);
    sequence.hold(standing, 350);
    sequence.move(standing, bottom, 650);
    engine.updateMetrics(null, sequence.timestamp);
    engine.updateMetrics(null, sequence.timestamp + 600);
    sequence.timestamp += 650;
    sequence.move(bottom, standing, 700);
    sequence.hold(standing, 400);
    expect(engine.updateMetrics(standing, sequence.timestamp).repCount).toBe(0);
  });

  it("rejects an implausibly fast down-and-up movement", () => {
    const engine = new SquatEngine();
    const sequence = new Sequence(engine);
    const standing = metrics(172, 168, 0.42);
    const bottom = metrics(94, 88, 0.66);
    sequence.hold(standing, 100);
    sequence.move(standing, bottom, 100);
    sequence.hold(bottom, 50);
    sequence.move(bottom, standing, 100);
    sequence.hold(standing, 100);
    expect(engine.updateMetrics(standing, sequence.timestamp).repCount).toBe(0);
  });

  it("does not count threshold jitter caused by small camera or body movement", () => {
    const engine = new SquatEngine();
    let timestamp = 50;
    for (let index = 0; index < 80; index += 1) {
      const wobble = index % 2 === 0 ? -3 : 3;
      engine.updateMetrics(metrics(158 + wobble, 154 + wobble, 0.43 + wobble * 0.001), timestamp);
      timestamp += 50;
    }
    expect(engine.updateMetrics(metrics(172, 168, 0.42), timestamp).repCount).toBe(0);
  });
});
