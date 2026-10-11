export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseFrame {
  timestamp: number;
  landmarks: PoseLandmark[];
  worldLandmarks: PoseLandmark[];
  inferenceMs: number;
  poseCount?: number;
  secondaryPoseConfidence?: number;
}

export type BodyVisibilityStatus =
  | "loading"
  | "no-body"
  | "multiple-people"
  | "too-close"
  | "body-part-missing"
  | "ready"
  | "error";

export interface BodyVisibilityResult {
  status: BodyVisibilityStatus;
  message: string;
  confidence: number;
  missingParts: string[];
}

export interface PoseRuntimeMetrics {
  fps: number;
  inferenceMs: number;
  delegate: "GPU" | "CPU" | null;
}

export interface CameraQaMetrics {
  sampledAt: number;
  cameraFps: number;
  poseFps: number;
  renderFps: number;
  inferenceMs: number;
  confidence: number;
  delegate: "GPU" | "CPU" | null;
  cameraWidth: number;
  cameraHeight: number;
  requestedFacingMode: "user" | "environment";
  actualFacingMode: string;
  streamState: "active" | "muted" | "ended" | "unavailable";
  viewportWidth: number;
  viewportHeight: number;
  orientation: "portrait" | "landscape";
  pageVisibility: DocumentVisibilityState;
}
