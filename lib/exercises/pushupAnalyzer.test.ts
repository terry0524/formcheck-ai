import { describe, expect, it } from "vitest";
import { PushupAnalyzer, type PushupMetrics } from "@/lib/exercises/pushupAnalyzer";

const sample = (elbowAngle: number, bodyAngle = 174): PushupMetrics => ({ elbowAngle, bodyAngle, confidence: 0.95, side: "left", depthReliable: true, alignmentReliable: true });

function drive(engine: PushupAnalyzer, from: number, to: number, start: number, duration: number, bodyAngle = 174) {
  for (let elapsed = 0; elapsed <= duration; elapsed += 50) engine.detectMetrics(sample(from + (to - from) * elapsed / duration, bodyAngle), start + elapsed);
  return start + duration + 50;
}

function hold(engine: PushupAnalyzer, angle: number, start: number, duration: number, bodyAngle = 174) {
  for (let elapsed = 0; elapsed <= duration; elapsed += 50) engine.detectMetrics(sample(angle, bodyAngle), start + elapsed);
  return start + duration + 50;
}

describe("PushupAnalyzer", () => {
  it("counts only a complete up-down-up sequence", () => {
    const engine = new PushupAnalyzer();
    let time = hold(engine, 170, 0, 250);
    time = drive(engine, 170, 82, time, 600);
    time = hold(engine, 82, time, 250);
    time = drive(engine, 82, 170, time, 650);
    hold(engine, 170, time, 300);
    expect(engine.countRep()).toMatchObject({ rep: 1, evaluation: { label: "GOOD" } });
    expect(engine.countRep()).toBeNull();
  });

  it("counts a valid but shallow rep and reports depth", () => {
    const engine = new PushupAnalyzer();
    let time = hold(engine, 170, 0, 250);
    time = drive(engine, 170, 105, time, 600);
    time = hold(engine, 105, time, 300);
    time = drive(engine, 105, 170, time, 650);
    hold(engine, 170, time, 300);
    expect(engine.countRep()?.evaluation.issues.map((issue) => issue.code)).toContain("shallow");
  });

  it("does not count a partial descent", () => {
    const engine = new PushupAnalyzer();
    let time = hold(engine, 170, 0, 250);
    time = drive(engine, 170, 130, time, 400);
    time = drive(engine, 130, 170, time, 400);
    hold(engine, 170, time, 250);
    expect(engine.countRep()).toBeNull();
  });

  it("abandons a rep after pose tracking is lost", () => {
    const engine = new PushupAnalyzer();
    let time = hold(engine, 170, 0, 250);
    time = drive(engine, 170, 82, time, 600);
    engine.detectMetrics(null, time);
    engine.detectMetrics(null, time + 550);
    time = drive(engine, 82, 170, time + 600, 650);
    hold(engine, 170, time, 300);
    expect(engine.countRep()).toBeNull();
  });
});
