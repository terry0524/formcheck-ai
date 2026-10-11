import { describe, expect, it } from "vitest";
import { FeedbackGate } from "@/lib/exercises/feedbackGate";

describe("FeedbackGate", () => {
  it("requires sustained evidence and suppresses repeated feedback during cooldown", () => {
    const gate = new FeedbackGate();
    expect(gate.sustained("depth", "조금 더 내려가세요.", true, 0, 350, 7000)).toBeNull();
    expect(gate.sustained("depth", "조금 더 내려가세요.", true, 349, 350, 7000)).toBeNull();
    expect(gate.sustained("depth", "조금 더 내려가세요.", true, 350, 350, 7000)).toMatchObject({ code: "depth" });
    expect(gate.sustained("depth", "조금 더 내려가세요.", true, 700, 350, 7000)).toBeNull();
    expect(gate.sustained("depth", "조금 더 내려가세요.", true, 1050, 350, 7000)).toBeNull();
    expect(gate.sustained("depth", "조금 더 내려가세요.", false, 2000, 350, 7000)).toBeNull();
    expect(gate.sustained("depth", "조금 더 내려가세요.", true, 7350, 350, 7000)).toBeNull();
    expect(gate.sustained("depth", "조금 더 내려가세요.", true, 7700, 350, 7000)).toMatchObject({ code: "depth" });
  });
});
