import { describe, expect, it } from "vitest";
import { PlankAnalyzer, type PlankMetrics } from "@/lib/exercises/plankAnalyzer";

const sample = (bodyAngle = 174, hipOffset = 0.02, alignmentReliable = true): PlankMetrics => ({ bodyAngle, hipOffset, confidence: 0.95, side: "left", alignmentReliable });

describe("PlankAnalyzer", () => {
  it("evaluates an aligned hold without producing reps", () => {
    const engine = new PlankAnalyzer();
    expect(engine.detectMetrics(sample(), 0).state).toBe("HOLDING");
    expect(engine.evaluateForm()).toMatchObject({ label: "GOOD", side: "left" });
    expect(engine.countRep()).toBeNull();
  });

  it("requires sustained misalignment before feedback and applies cooldown", () => {
    const engine = new PlankAnalyzer();
    engine.detectMetrics(sample(145, 0.14), 0);
    engine.detectMetrics(sample(145, 0.14), 400);
    expect(engine.getFeedback()).toBeNull();
    engine.detectMetrics(sample(145, 0.14), 550);
    expect(engine.getFeedback()?.code).toBe("body-alignment");
    engine.detectMetrics(sample(145, 0.14), 1100);
    expect(engine.getFeedback()).toBeNull();
  });

  it("omits alignment judgment for an unsupported camera angle", () => {
    const engine = new PlankAnalyzer();
    expect(engine.detectMetrics(sample(130, 0.2, false), 0).state).toBe("ANGLE_UNSUPPORTED");
    expect(engine.evaluateForm()).toBeNull();
    expect(engine.getFeedback()).toBeNull();
  });
});
