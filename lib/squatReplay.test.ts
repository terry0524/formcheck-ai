import { describe, expect, it } from "vitest";
import { captureSquatReplayFrame, createSquatReplayFixture, replaySquatFixture } from "@/lib/squatReplay";
import type { PoseFrame, PoseLandmark } from "@/types/pose";

function standingFrame(timestamp: number): PoseFrame {
  const landmarks: PoseLandmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.95 }));
  const points = [
    [11, 0.4, 0.2], [12, 0.6, 0.2],
    [23, 0.42, 0.42], [24, 0.58, 0.42],
    [25, 0.42, 0.66], [26, 0.58, 0.66],
    [27, 0.42, 0.9], [28, 0.58, 0.9],
  ] as const;
  for (const [index, x, y] of points) landmarks[index] = { x, y, z: 0, visibility: 0.95 };
  return { timestamp, landmarks, worldLandmarks: landmarks.map((point) => ({ ...point })), inferenceMs: 8, poseCount: 1 };
}

describe("squat landmark replay", () => {
  it("captures only landmark time-series when the caller opts in", () => {
    const frame = standingFrame(1250);
    const replayFrame = captureSquatReplayFrame(frame, 0.93, "ready", 1000);
    frame.landmarks[11].x = 0;
    const fixture = createSquatReplayFixture([replayFrame], "2026-09-15T00:00:00.000Z");
    expect(fixture.frames[0]).toMatchObject({ timestamp: 250, confidence: 0.93, poseCount: 1, visibility: "ready" });
    expect(fixture.frames[0].landmarks[11].x).toBe(0.4);
    expect(Object.keys(fixture)).toEqual(["schema", "createdAt", "note", "frames"]);
    expect(Object.keys(fixture.frames[0])).toEqual(["timestamp", "landmarks", "worldLandmarks", "confidence", "poseCount", "visibility"]);
  });

  it("replays ready frames and suspends analysis for non-ready visibility", () => {
    const ready = captureSquatReplayFrame(standingFrame(1000), 0.95, "ready", 1000);
    const missing = captureSquatReplayFrame(null, 0, "no-body", 1000, 1600);
    const results = replaySquatFixture(createSquatReplayFixture([ready, missing]));
    expect(missing).toMatchObject({ timestamp: 600, landmarks: [], worldLandmarks: [], poseCount: 0, visibility: "no-body" });
    expect(results[0].tracking).toBe(true);
    expect(results[1].tracking).toBe(false);
    expect(results[1].completedRep).toBeNull();
  });
});
