import type { BodyVisibilityResult, PoseFrame, PoseLandmark } from "@/types/pose";

export const POSE_INDEX = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

const VISIBILITY_THRESHOLD = 0.55;
const REQUIRED_GROUPS = [
  { label: "머리", indices: [POSE_INDEX.nose] },
  { label: "어깨", indices: [POSE_INDEX.leftShoulder, POSE_INDEX.rightShoulder] },
  { label: "골반", indices: [POSE_INDEX.leftHip, POSE_INDEX.rightHip] },
  { label: "무릎", indices: [POSE_INDEX.leftKnee, POSE_INDEX.rightKnee] },
  { label: "발", indices: [POSE_INDEX.leftAnkle, POSE_INDEX.rightAnkle] },
] as const;

function isVisible(landmark: PoseLandmark | undefined) {
  return Boolean(
    landmark &&
      landmark.visibility >= VISIBILITY_THRESHOLD &&
      landmark.x >= 0 &&
      landmark.x <= 1 &&
      landmark.y >= 0 &&
      landmark.y <= 1,
  );
}

function averageVisibility(landmarks: PoseLandmark[]) {
  const required = REQUIRED_GROUPS.flatMap((group) => group.indices).map((index) => landmarks[index]);
  return required.reduce((sum, landmark) => sum + Math.max(0, landmark?.visibility ?? 0), 0) / required.length;
}

export function evaluateBodyVisibility(frame: PoseFrame | null): BodyVisibilityResult {
  if (!frame || frame.landmarks.length < 29) {
    return { status: "no-body", message: "카메라 앞에 서주세요.", confidence: 0, missingParts: [] };
  }

  if ((frame.poseCount ?? 1) > 1 && (frame.secondaryPoseConfidence ?? 1) >= 0.65) {
    return {
      status: "multiple-people",
      message: "한 명만 카메라 앞에 서주세요.",
      confidence: averageVisibility(frame.landmarks),
      missingParts: [],
    };
  }

  const { landmarks } = frame;
  const torsoIndices = [POSE_INDEX.leftShoulder, POSE_INDEX.rightShoulder, POSE_INDEX.leftHip, POSE_INDEX.rightHip];
  const visibleTorsoCount = torsoIndices.filter((index) => isVisible(landmarks[index])).length;
  const confidence = averageVisibility(landmarks);

  if (visibleTorsoCount < 2 || confidence < 0.18) {
    return { status: "no-body", message: "카메라 앞에 서주세요.", confidence, missingParts: [] };
  }

  const leftShoulder = landmarks[POSE_INDEX.leftShoulder];
  const rightShoulder = landmarks[POSE_INDEX.rightShoulder];
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
  const visibleCore = torsoIndices.map((index) => landmarks[index]).filter(isVisible);
  const coreMinX = Math.min(...visibleCore.map(({ x }) => x));
  const coreMaxX = Math.max(...visibleCore.map(({ x }) => x));

  if (shoulderWidth > 0.62 || coreMinX < 0.025 || coreMaxX > 0.975) {
    return { status: "too-close", message: "조금 뒤로 이동하세요.", confidence, missingParts: [] };
  }

  const missingParts = REQUIRED_GROUPS.filter((group) =>
    group.indices.some((index) => !isVisible(landmarks[index])),
  ).map((group) => group.label);

  if (missingParts.length > 0 || confidence < 0.62) {
    const lowerBodyMissing = missingParts.some((part) => part === "무릎" || part === "발");
    return {
      status: "body-part-missing",
      message: lowerBodyMissing ? "발까지 화면에 나오도록 조정하세요." : "전신이 화면에 나오도록 조정하세요.",
      confidence,
      missingParts,
    };
  }

  return { status: "ready", message: "준비되었습니다.", confidence, missingParts: [] };
}
