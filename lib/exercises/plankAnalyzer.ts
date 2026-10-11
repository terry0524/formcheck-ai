import { POSE_INDEX } from "@/lib/bodyVisibility";
import { FeedbackGate } from "@/lib/exercises/feedbackGate";
import { angleBetween, clamp, minVisibility } from "@/lib/exercises/poseMath";
import type { ExerciseAnalyzer, ExerciseDetection, ExerciseFeedback, ExerciseFormEvaluation, ExerciseSide } from "@/types/exerciseAnalyzer";
import type { PoseFrame } from "@/types/pose";

export type PlankState = "SEARCHING" | "ANGLE_UNSUPPORTED" | "HOLDING" | "CHECK_ALIGNMENT";

export interface PlankMetrics {
  bodyAngle: number;
  hipOffset: number;
  confidence: number;
  side: Exclude<ExerciseSide, null>;
  alignmentReliable: boolean;
}

export class PlankAnalyzer implements ExerciseAnalyzer {
  readonly exerciseId = "plank";
  readonly supportsReps = false;
  private state: PlankState = "SEARCHING";
  private detectionValue: ExerciseDetection = { state: "SEARCHING", tracking: false, side: null, metrics: {} };
  private evaluation: ExerciseFormEvaluation | null = null;
  private pendingFeedback: ExerciseFeedback | null = null;
  private feedback = new FeedbackGate();

  detectState(frame: PoseFrame | null, timestamp: number) {
    return this.detectMetrics(frame ? extractPlankMetrics(frame) : null, timestamp);
  }

  detectMetrics(metrics: PlankMetrics | null, timestamp: number): ExerciseDetection {
    if (!metrics || metrics.confidence < 0.6) {
      this.state = "SEARCHING";
      this.evaluation = null;
      return this.setDetection(false, null);
    }
    if (!metrics.alignmentReliable) {
      this.state = "ANGLE_UNSUPPORTED";
      this.evaluation = null;
      return this.setDetection(true, metrics);
    }

    const aligned = metrics.bodyAngle >= 160 && Math.abs(metrics.hipOffset) <= 0.09;
    this.state = aligned ? "HOLDING" : "CHECK_ALIGNMENT";
    const issues = [];
    if (!aligned) issues.push({ code: "body-alignment", message: alignmentMessage(metrics.hipOffset) });
    const score = clamp(100 - Math.round(clamp((165 - metrics.bodyAngle) * 1.4, 0, 30)) - Math.round(clamp((Math.abs(metrics.hipOffset) - 0.05) * 180, 0, 25)), 0, 100);
    this.evaluation = { score, label: issues.length === 0 && score >= 80 ? "GOOD" : "NEEDS IMPROVEMENT", issues, side: metrics.side };
    const cue = this.feedback.sustained("body-alignment", alignmentMessage(metrics.hipOffset), !aligned, timestamp, 500);
    if (cue) this.pendingFeedback = cue;
    return this.setDetection(true, metrics);
  }

  countRep() { return null; }
  evaluateForm() { return this.evaluation; }
  getFeedback() { const cue = this.pendingFeedback; this.pendingFeedback = null; return cue; }
  reset() { this.state = "SEARCHING"; this.detectionValue = { state: "SEARCHING", tracking: false, side: null, metrics: {} }; this.evaluation = null; this.pendingFeedback = null; this.feedback.reset(); }

  private setDetection(tracking: boolean, metrics: PlankMetrics | null) {
    this.detectionValue = { state: this.state, tracking, side: metrics?.side ?? null, metrics: { bodyAngle: metrics?.bodyAngle ?? null, hipOffset: metrics?.hipOffset ?? null, confidence: metrics?.confidence ?? null, alignmentReliable: metrics?.alignmentReliable ?? false } };
    return this.detectionValue;
  }
}

export function extractPlankMetrics(frame: PoseFrame): PlankMetrics | null {
  const image = frame.landmarks;
  const angles = frame.worldLandmarks.length >= 29 ? frame.worldLandmarks : image;
  const candidates = (["left", "right"] as const).map((side) => {
    const shoulderIndex = side === "left" ? POSE_INDEX.leftShoulder : POSE_INDEX.rightShoulder;
    const hipIndex = side === "left" ? POSE_INDEX.leftHip : POSE_INDEX.rightHip;
    const ankleIndex = side === "left" ? POSE_INDEX.leftAnkle : POSE_INDEX.rightAnkle;
    const points = [image[shoulderIndex], image[hipIndex], image[ankleIndex]];
    const confidence = minVisibility(points);
    if (confidence <= 0 || !angles[shoulderIndex] || !angles[hipIndex] || !angles[ankleIndex]) return null;
    const bodyAngle = angleBetween(angles[shoulderIndex], angles[hipIndex], angles[ankleIndex]);
    if (bodyAngle === null) return null;
    const shoulder = image[shoulderIndex];
    const hip = image[hipIndex];
    const ankle = image[ankleIndex];
    const bodyLength = Math.hypot(ankle.x - shoulder.x, ankle.y - shoulder.y);
    const projection = bodyLength < 1e-6 ? 0.5 : ((hip.x - shoulder.x) * (ankle.x - shoulder.x) + (hip.y - shoulder.y) * (ankle.y - shoulder.y)) / (bodyLength ** 2);
    const expectedY = shoulder.y + projection * (ankle.y - shoulder.y);
    const hipOffset = bodyLength < 1e-6 ? 0 : (hip.y - expectedY) / bodyLength;
    return { side, bodyAngle, hipOffset, confidence, bodyLength };
  }).filter((value): value is NonNullable<typeof value> => value !== null).sort((a, b) => b.confidence - a.confidence);
  const best = candidates[0];
  if (!best) return null;
  const shoulderWidth = Math.abs((image[POSE_INDEX.leftShoulder]?.x ?? 0) - (image[POSE_INDEX.rightShoulder]?.x ?? 0));
  const hipWidth = Math.abs((image[POSE_INDEX.leftHip]?.x ?? 0) - (image[POSE_INDEX.rightHip]?.x ?? 0));
  const horizontalEnough = Math.abs((image[best.side === "left" ? POSE_INDEX.leftAnkle : POSE_INDEX.rightAnkle]?.x ?? 0) - (image[best.side === "left" ? POSE_INDEX.leftShoulder : POSE_INDEX.rightShoulder]?.x ?? 0)) > 0.22;
  const alignmentReliable = best.confidence >= 0.65 && best.bodyLength > 0.28 && horizontalEnough && Math.max(shoulderWidth, hipWidth) / best.bodyLength < 0.5;
  return { bodyAngle: best.bodyAngle, hipOffset: best.hipOffset, confidence: best.confidence, side: best.side, alignmentReliable };
}

function alignmentMessage(hipOffset: number) {
  if (hipOffset > 0.09) return "엉덩이를 들어 몸을 일직선으로 맞추세요.";
  if (hipOffset < -0.09) return "엉덩이를 조금 낮춰 일직선을 만드세요.";
  return "머리부터 발끝까지 일직선을 유지하세요.";
}
