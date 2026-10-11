import { SquatEngine } from "@/lib/exerciseEngine";
import type { BodyVisibilityStatus, PoseFrame } from "@/types/pose";
import type { SquatReplayFixture, SquatReplayFrame } from "@/types/squatReplay";

export const SQUAT_REPLAY_SCHEMA = "formcheck-squat-landmarks-v1" as const;

export function captureSquatReplayFrame(
  frame: PoseFrame | null,
  confidence: number,
  visibility: BodyVisibilityStatus,
  sessionStartedAt: number,
  sampledAt = frame?.timestamp ?? sessionStartedAt,
): SquatReplayFrame {
  return {
    timestamp: Math.max(0, Math.round(sampledAt - sessionStartedAt)),
    landmarks: frame?.landmarks.map((point) => ({ ...point })) ?? [],
    worldLandmarks: frame?.worldLandmarks.map((point) => ({ ...point })) ?? [],
    confidence,
    poseCount: frame?.poseCount ?? 0,
    visibility,
  };
}

export function createSquatReplayFixture(frames: SquatReplayFrame[], createdAt = new Date().toISOString()): SquatReplayFixture {
  return {
    schema: SQUAT_REPLAY_SCHEMA,
    createdAt,
    note: "Pose landmark coordinates only. No camera frames, images, audio, or account identifiers are included.",
    frames,
  };
}

export function replaySquatFixture(fixture: SquatReplayFixture) {
  const engine = new SquatEngine();
  return fixture.frames.map((sample) => engine.update(sample.visibility === "ready" && sample.poseCount === 1 ? {
    timestamp: sample.timestamp,
    landmarks: sample.landmarks,
    worldLandmarks: sample.worldLandmarks,
    inferenceMs: 0,
    poseCount: sample.poseCount,
  } : null, sample.timestamp));
}
