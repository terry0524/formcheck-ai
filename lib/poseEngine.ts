import type {
  Landmark,
  NormalizedLandmark,
  PoseLandmarker as MediaPipePoseLandmarker,
} from "@mediapipe/tasks-vision";
import type { PoseFrame, PoseLandmark } from "@/types/pose";

const WASM_ROOT = "/mediapipe/wasm";
const MODEL_PATH = "/models/pose_landmarker_lite.task";

function copyLandmarks(landmarks: NormalizedLandmark[] | Landmark[] | undefined): PoseLandmark[] {
  if (!landmarks) return [];
  return landmarks.map(({ x, y, z, visibility }) => ({
    x,
    y,
    z,
    visibility: visibility ?? 0,
  }));
}

function poseConfidence(landmarks: NormalizedLandmark[] | undefined) {
  const criticalIndices = [11, 12, 23, 24, 25, 26, 27, 28];
  return criticalIndices.reduce((sum, index) => sum + Math.max(0, landmarks?.[index]?.visibility ?? 0), 0) / criticalIndices.length;
}

export interface PoseEngine {
  readonly delegate: "GPU" | "CPU" | null;
  initialize(): Promise<void>;
  estimate(video: HTMLVideoElement, timestamp: number): PoseFrame | null;
  dispose(): void;
}

export class BrowserPoseEngine implements PoseEngine {
  private landmarker: MediaPipePoseLandmarker | null = null;
  private initializing: Promise<void> | null = null;
  private disposed = false;
  delegate: "GPU" | "CPU" | null = null;

  initialize(): Promise<void> {
    if (this.landmarker) return Promise.resolve();
    if (this.initializing) return this.initializing;
    this.initializing = this.createLandmarker();
    return this.initializing;
  }

  private async createLandmarker() {
    const modelAssetPath = new URL(MODEL_PATH, window.location.origin).href;
    const runtimePromise = import("@mediapipe/tasks-vision").then(async ({ FilesetResolver, PoseLandmarker }) => ({
      PoseLandmarker,
      vision: await FilesetResolver.forVisionTasks(WASM_ROOT),
    }));
    const modelBufferPromise = fetch(modelAssetPath, { cache: "force-cache" }).then(async (response) => {
      if (!response.ok) throw new Error(`Pose model request failed with status ${response.status}.`);
      return new Uint8Array(await response.arrayBuffer());
    });
    const [{ PoseLandmarker, vision }, modelAssetBuffer] = await Promise.all([runtimePromise, modelBufferPromise]);
    const options = {
      runningMode: "VIDEO" as const,
      // Detect a second pose so workout analysis can fail closed when another
      // person enters the frame. Only the primary pose is rendered/analyzed.
      numPoses: 2,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    };

    try {
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: { modelAssetBuffer: modelAssetBuffer.slice(), delegate: "GPU" },
      });
      this.delegate = "GPU";
    } catch (gpuError) {
      try {
        this.landmarker = await PoseLandmarker.createFromOptions(vision, {
          ...options,
          baseOptions: { modelAssetBuffer: modelAssetBuffer.slice(), delegate: "CPU" },
        });
        this.delegate = "CPU";
      } catch (cpuError) {
        throw new AggregateError(
          [gpuError, cpuError],
          "MediaPipe Pose Landmarker could not initialize with GPU or CPU.",
        );
      }
    }

    if (this.disposed) {
      this.landmarker.close();
      this.landmarker = null;
    }
  }

  estimate(video: HTMLVideoElement, timestamp: number): PoseFrame | null {
    if (!this.landmarker || this.disposed || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return null;
    }

    const startedAt = performance.now();
    const result = this.landmarker.detectForVideo(video, timestamp);
    const inferenceMs = performance.now() - startedAt;
    const poseCount = result.landmarks.length;
    const secondaryPoseConfidence = poseCount > 1 ? poseConfidence(result.landmarks[1]) : 0;
    const landmarks = copyLandmarks(result.landmarks[0]);
    const worldLandmarks = copyLandmarks(result.worldLandmarks[0]);
    result.close();

    if (landmarks.length === 0) return null;
    return { timestamp, landmarks, worldLandmarks, inferenceMs, poseCount, secondaryPoseConfidence };
  }

  dispose() {
    this.disposed = true;
    this.landmarker?.close();
    this.landmarker = null;
    this.initializing = null;
    this.delegate = null;
  }
}
