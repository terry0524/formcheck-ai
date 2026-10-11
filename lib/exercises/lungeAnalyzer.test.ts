import { describe, expect, it } from "vitest";
import { LungeAnalyzer, type LungeMetrics } from "@/lib/exercises/lungeAnalyzer";

const sample = (leftKneeAngle: number, rightKneeAngle = 170, trunkAngle = 12): LungeMetrics => ({ leftKneeAngle, rightKneeAngle, trunkAngle, confidence: 0.95, activeSide: leftKneeAngle + 10 < rightKneeAngle ? "left" : null, alignmentReliable: true });

function move(engine: LungeAnalyzer, from: number, to: number, start: number, duration: number, trunk = 12) {
  for (let elapsed = 0; elapsed <= duration; elapsed += 50) engine.detectMetrics(sample(from + (to - from) * elapsed / duration, 170, trunk), start + elapsed);
  return start + duration + 50;
}

function hold(engine: LungeAnalyzer, angle: number, start: number, duration: number, trunk = 12) {
  for (let elapsed = 0; elapsed <= duration; elapsed += 50) engine.detectMetrics(sample(angle, 170, trunk), start + elapsed);
  return start + duration + 50;
}

describe("LungeAnalyzer", () => {
  it("counts a complete left lunge and preserves the side", () => {
    const engine = new LungeAnalyzer();
    let time = hold(engine, 170, 0, 250);
    time = move(engine, 170, 90, time, 650);
    time = hold(engine, 90, time, 250);
    time = move(engine, 90, 170, time, 700);
    hold(engine, 170, time, 300);
    expect(engine.countRep()).toMatchObject({ rep: 1, evaluation: { label: "GOOD", side: "left" } });
  });

  it("distinguishes a complete right lunge", () => {
    const engine = new LungeAnalyzer();
    const rightSample = (rightKneeAngle: number): LungeMetrics => ({ leftKneeAngle: 170, rightKneeAngle, trunkAngle: 12, confidence: 0.95, activeSide: rightKneeAngle + 10 < 170 ? "right" : null, alignmentReliable: true });
    let time = 0;
    for (; time <= 250; time += 50) engine.detectMetrics(rightSample(170), time);
    for (let elapsed = 0; elapsed <= 650; elapsed += 50) engine.detectMetrics(rightSample(170 - 80 * elapsed / 650), time + elapsed);
    time += 700;
    for (let elapsed = 0; elapsed <= 250; elapsed += 50) engine.detectMetrics(rightSample(90), time + elapsed);
    time += 300;
    for (let elapsed = 0; elapsed <= 700; elapsed += 50) engine.detectMetrics(rightSample(90 + 80 * elapsed / 700), time + elapsed);
    time += 750;
    for (let elapsed = 0; elapsed <= 300; elapsed += 50) engine.detectMetrics(rightSample(170), time + elapsed);
    expect(engine.countRep()).toMatchObject({ rep: 1, evaluation: { side: "right" } });
  });

  it("rejects an ambiguous stance where left/right cannot be distinguished", () => {
    const engine = new LungeAnalyzer();
    for (let time = 0; time <= 1500; time += 50) engine.detectMetrics({ ...sample(110, 116), activeSide: null }, time);
    expect(engine.countRep()).toBeNull();
  });

  it("reports shallow depth and large trunk lean on a counted rep", () => {
    const engine = new LungeAnalyzer();
    let time = hold(engine, 170, 0, 250, 38);
    time = move(engine, 170, 110, time, 650, 38);
    time = hold(engine, 110, time, 300, 38);
    time = move(engine, 110, 170, time, 700, 38);
    hold(engine, 170, time, 300, 38);
    expect(engine.countRep()?.evaluation.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["shallow", "alignment"]));
  });

  it("abandons a rep after pose tracking is lost", () => {
    const engine = new LungeAnalyzer();
    let time = hold(engine, 170, 0, 250);
    time = move(engine, 170, 90, time, 650);
    engine.detectMetrics(null, time);
    engine.detectMetrics(null, time + 550);
    time = move(engine, 90, 170, time + 600, 700);
    hold(engine, 170, time, 300);
    expect(engine.countRep()).toBeNull();
  });
});
