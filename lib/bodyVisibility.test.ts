import { describe, expect, it } from "vitest";
import { evaluateBodyVisibility, POSE_INDEX } from "@/lib/bodyVisibility";
import type { PoseFrame, PoseLandmark } from "@/types/pose";

function landmark(x = 0.5, y = 0.5, visibility = 0.9): PoseLandmark {
  return { x, y, z: 0, visibility };
}

function fullBodyFrame(): PoseFrame {
  const landmarks = Array.from({ length: 33 }, () => landmark());
  landmarks[POSE_INDEX.nose] = landmark(0.5, 0.1);
  landmarks[POSE_INDEX.leftShoulder] = landmark(0.4, 0.25);
  landmarks[POSE_INDEX.rightShoulder] = landmark(0.6, 0.25);
  landmarks[POSE_INDEX.leftHip] = landmark(0.43, 0.5);
  landmarks[POSE_INDEX.rightHip] = landmark(0.57, 0.5);
  landmarks[POSE_INDEX.leftKnee] = landmark(0.43, 0.7);
  landmarks[POSE_INDEX.rightKnee] = landmark(0.57, 0.7);
  landmarks[POSE_INDEX.leftAnkle] = landmark(0.43, 0.9);
  landmarks[POSE_INDEX.rightAnkle] = landmark(0.57, 0.9);
  return { timestamp: 0, landmarks, worldLandmarks: [], inferenceMs: 8 };
}

describe("evaluateBodyVisibility", () => {
  it("returns no-body when no pose was detected", () => {
    expect(evaluateBodyVisibility(null)).toMatchObject({
      status: "no-body",
      message: "카메라 앞에 서주세요.",
    });
  });

  it("returns too-close when shoulder width fills most of the frame", () => {
    const frame = fullBodyFrame();
    frame.landmarks[POSE_INDEX.leftShoulder].x = 0.1;
    frame.landmarks[POSE_INDEX.rightShoulder].x = 0.8;
    expect(evaluateBodyVisibility(frame)).toMatchObject({
      status: "too-close",
      message: "조금 뒤로 이동하세요.",
    });
  });

  it("asks for feet when ankles are not visible", () => {
    const frame = fullBodyFrame();
    frame.landmarks[POSE_INDEX.leftAnkle].visibility = 0.1;
    frame.landmarks[POSE_INDEX.rightAnkle].visibility = 0.1;
    expect(evaluateBodyVisibility(frame)).toMatchObject({
      status: "body-part-missing",
      message: "발까지 화면에 나오도록 조정하세요.",
      missingParts: ["발"],
    });
  });

  it("fails closed when more than one person is detected", () => {
    const frame = fullBodyFrame();
    frame.poseCount = 2;
    expect(evaluateBodyVisibility(frame)).toMatchObject({
      status: "multiple-people",
      message: "한 명만 카메라 앞에 서주세요.",
    });
  });

  it("rejects a low-confidence full-body pose", () => {
    const frame = fullBodyFrame();
    for (const point of frame.landmarks) point.visibility = 0.6;
    expect(evaluateBodyVisibility(frame).status).toBe("body-part-missing");
  });

  it("returns ready for a confident full-body pose", () => {
    const result = evaluateBodyVisibility(fullBodyFrame());
    expect(result).toMatchObject({
      status: "ready",
      message: "준비되었습니다.",
    });
    expect(result.confidence).toBeCloseTo(0.9);
  });
});
