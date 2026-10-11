import type { BodyVisibilityStatus, PoseLandmark } from "@/types/pose";

export interface SquatReplayFrame {
  timestamp: number;
  landmarks: PoseLandmark[];
  worldLandmarks: PoseLandmark[];
  confidence: number;
  poseCount: number;
  visibility: BodyVisibilityStatus;
}

export interface SquatReplayFixture {
  schema: "formcheck-squat-landmarks-v1";
  createdAt: string;
  note: string;
  frames: SquatReplayFrame[];
}
