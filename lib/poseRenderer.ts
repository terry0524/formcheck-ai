import { POSE_INDEX } from "@/lib/bodyVisibility";
import type { BodyVisibilityResult, PoseFrame, PoseLandmark } from "@/types/pose";

const FULL_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
];

const CORE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [POSE_INDEX.leftShoulder, POSE_INDEX.rightShoulder],
  [POSE_INDEX.leftShoulder, POSE_INDEX.leftHip],
  [POSE_INDEX.rightShoulder, POSE_INDEX.rightHip],
  [POSE_INDEX.leftHip, POSE_INDEX.rightHip],
  [POSE_INDEX.leftHip, POSE_INDEX.leftKnee],
  [POSE_INDEX.rightHip, POSE_INDEX.rightKnee],
  [POSE_INDEX.leftKnee, POSE_INDEX.leftAnkle],
  [POSE_INDEX.rightKnee, POSE_INDEX.rightAnkle],
];

const CORE_POINTS = new Set<number>([
  POSE_INDEX.leftShoulder,
  POSE_INDEX.rightShoulder,
  POSE_INDEX.leftHip,
  POSE_INDEX.rightHip,
  POSE_INDEX.leftKnee,
  POSE_INDEX.rightKnee,
  POSE_INDEX.leftAnkle,
  POSE_INDEX.rightAnkle,
]);

export interface CoverTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth: number;
  mirrored: boolean;
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const targetWidth = Math.round(width * pixelRatio);
  const targetHeight = Math.round(height * pixelRatio);

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  const context = canvas.getContext("2d");
  context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return { context, width, height };
}

export function getCoverTransform(sourceWidth: number, sourceHeight: number, width: number, height: number, mirrored: boolean): CoverTransform {
  sourceWidth ||= width;
  sourceHeight ||= height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  return {
    x: (width - renderedWidth) / 2,
    y: (height - renderedHeight) / 2,
    width: renderedWidth,
    height: renderedHeight,
    viewportWidth: width,
    mirrored,
  };
}

export function mapPosePoint(landmark: PoseLandmark, transform: CoverTransform) {
  const rawX = transform.x + landmark.x * transform.width;
  return {
    x: transform.mirrored ? transform.viewportWidth - rawX : rawX,
    y: transform.y + landmark.y * transform.height,
  };
}

export function clearPoseOverlay(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  context?.clearRect(0, 0, canvas.width, canvas.height);
}

export function renderPoseOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  frame: PoseFrame | null,
  visibility: BodyVisibilityResult,
  debug: boolean,
  mirrored: boolean,
) {
  const { context, width, height } = resizeCanvas(canvas);
  if (!context) return;
  context.clearRect(0, 0, width, height);
  if (!frame) return;

  const transform = getCoverTransform(video.videoWidth, video.videoHeight, width, height, mirrored);
  const landmarks = frame.landmarks;
  const connections = debug ? FULL_CONNECTIONS : CORE_CONNECTIONS;
  const ready = visibility.status === "ready";
  const stroke = ready ? "rgba(200, 255, 46, 0.78)" : "rgba(255, 255, 255, 0.58)";

  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = debug ? 1.5 : 2.5;
  context.strokeStyle = stroke;
  for (const [fromIndex, toIndex] of connections) {
    const from = landmarks[fromIndex];
    const to = landmarks[toIndex];
    if (!from || !to || from.visibility < 0.45 || to.visibility < 0.45) continue;
    const start = mapPosePoint(from, transform);
    const end = mapPosePoint(to, transform);
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }

  landmarks.forEach((landmark, index) => {
    if (landmark.visibility < 0.45 || (!debug && !CORE_POINTS.has(index))) return;
    const position = mapPosePoint(landmark, transform);
    context.beginPath();
    context.arc(position.x, position.y, debug ? 3 : 5, 0, Math.PI * 2);
    context.fillStyle = ready ? "#c8ff2e" : "rgba(255, 255, 255, 0.9)";
    context.fill();

    if (debug) {
      context.font = "10px Arial, sans-serif";
      context.fillStyle = "#ffffff";
      context.fillText(`${index} ${landmark.visibility.toFixed(2)}`, position.x + 5, position.y - 5);
    }
  });
}
