import { POSE_INDEX } from "@/lib/bodyVisibility";
import { FeedbackGate } from "@/lib/exercises/feedbackGate";
import { angleBetween, clamp, midpoint, minVisibility, smooth } from "@/lib/exercises/poseMath";
import type { ExerciseAnalyzer, ExerciseDetection, ExerciseFeedback, ExerciseFormEvaluation, ExerciseRepEvent, ExerciseSide } from "@/types/exerciseAnalyzer";
import type { PoseFrame } from "@/types/pose";

export type LungeState = "STANDING" | "DESCENDING" | "BOTTOM" | "ASCENDING";

export interface LungeMetrics {
  leftKneeAngle: number;
  rightKneeAngle: number;
  trunkAngle: number;
  confidence: number;
  activeSide: ExerciseSide;
  alignmentReliable: boolean;
}

export class LungeAnalyzer implements ExerciseAnalyzer {
  readonly exerciseId = "lunge";
  readonly supportsReps = true;
  private state: LungeState = "STANDING";
  private repCount = 0;
  private smoothed: LungeMetrics | null = null;
  private activeSide: ExerciseSide = null;
  private previousAngle = 180;
  private previousTimestamp = 0;
  private trackingLostAt: number | null = null;
  private candidate: { name: string; since: number } | null = null;
  private repStartedAt = 0;
  private lastRepAt = -Infinity;
  private minKneeAngle = 180;
  private maxTrunkAngle = 0;
  private pendingRep: ExerciseRepEvent | null = null;
  private pendingFeedback: ExerciseFeedback | null = null;
  private evaluation: ExerciseFormEvaluation | null = null;
  private feedback = new FeedbackGate();

  detectState(frame: PoseFrame | null, timestamp: number) {
    return this.detectMetrics(frame ? extractLungeMetrics(frame) : null, timestamp);
  }

  detectMetrics(metrics: LungeMetrics | null, timestamp: number): ExerciseDetection {
    if (!metrics || metrics.confidence < 0.6) {
      this.candidate = null;
      if (this.trackingLostAt === null) this.trackingLostAt = timestamp;
      if (timestamp - this.trackingLostAt >= 500) {
        this.abort();
        this.smoothed = null;
        this.previousAngle = 180;
        this.previousTimestamp = 0;
      }
      return this.detection(false, null);
    }
    this.trackingLostAt = null;
    this.smoothed = this.smoothed ? {
      ...metrics,
      leftKneeAngle: smooth(this.smoothed.leftKneeAngle, metrics.leftKneeAngle),
      rightKneeAngle: smooth(this.smoothed.rightKneeAngle, metrics.rightKneeAngle),
      trunkAngle: smooth(this.smoothed.trunkAngle, metrics.trunkAngle),
      confidence: smooth(this.smoothed.confidence, metrics.confidence),
    } : metrics;
    const current = this.smoothed;
    const side = this.activeSide ?? current.activeSide;
    const activeAngle = side === "left" ? current.leftKneeAngle : side === "right" ? current.rightKneeAngle : Math.min(current.leftKneeAngle, current.rightKneeAngle);
    const dt = this.previousTimestamp ? Math.max(16, Math.min(250, timestamp - this.previousTimestamp)) : 50;
    const velocity = (activeAngle - this.previousAngle) * 1000 / dt;
    this.previousAngle = activeAngle;
    this.previousTimestamp = timestamp;

    if (this.state !== "STANDING") {
      this.minKneeAngle = Math.min(this.minKneeAngle, activeAngle);
      if (current.alignmentReliable) this.maxTrunkAngle = Math.max(this.maxTrunkAngle, current.trunkAngle);
    }
    const alignmentCue = this.feedback.sustained("alignment", "상체 중심을 유지하세요.", current.alignmentReliable && this.state !== "STANDING" && current.trunkAngle > 35, timestamp, 400);
    if (alignmentCue) this.pendingFeedback = alignmentCue;

    if (this.state === "STANDING") {
      const descending = current.activeSide !== null && activeAngle < 150 && velocity < -4;
      if (this.sustained("descending", descending, timestamp, 120)) {
        this.activeSide = current.activeSide;
        this.state = "DESCENDING";
        this.repStartedAt = timestamp;
        this.minKneeAngle = activeAngle;
        this.maxTrunkAngle = current.alignmentReliable ? current.trunkAngle : 0;
        this.candidate = null;
      }
    } else if (this.state === "DESCENDING") {
      if (this.sustained("bottom", activeAngle <= 118, timestamp, 160)) this.enter("BOTTOM");
      else if (this.sustained("abort", current.leftKneeAngle >= 158 && current.rightKneeAngle >= 158, timestamp, 180)) this.abort();
    } else if (this.state === "BOTTOM") {
      if (this.sustained("ascending", activeAngle >= 125 && velocity > 5, timestamp, 120)) this.enter("ASCENDING");
    } else {
      if (activeAngle <= 115) this.enter("BOTTOM");
      else if (this.sustained("complete", current.leftKneeAngle >= 158 && current.rightKneeAngle >= 158, timestamp, 200)) this.complete(timestamp);
    }
    return this.detection(true, current);
  }

  countRep() { const event = this.pendingRep; this.pendingRep = null; return event; }
  evaluateForm() { return this.evaluation; }
  getFeedback() { const cue = this.pendingFeedback; this.pendingFeedback = null; return cue; }

  reset() {
    this.state = "STANDING"; this.repCount = 0; this.smoothed = null; this.activeSide = null; this.previousAngle = 180; this.previousTimestamp = 0; this.trackingLostAt = null;
    this.candidate = null; this.repStartedAt = 0; this.lastRepAt = -Infinity; this.minKneeAngle = 180; this.maxTrunkAngle = 0;
    this.pendingRep = null; this.pendingFeedback = null; this.evaluation = null; this.feedback.reset();
  }

  private complete(timestamp: number) {
    if (this.activeSide && timestamp - this.repStartedAt >= 700 && timestamp - this.lastRepAt >= 700) {
      this.repCount += 1;
      this.lastRepAt = timestamp;
      const issues = [];
      if (this.minKneeAngle > 105) issues.push({ code: "shallow", message: "조금 더 깊게 내려가세요." });
      if (this.maxTrunkAngle > 32) issues.push({ code: "alignment", message: "상체 중심을 유지하세요." });
      const score = clamp(100 - Math.round(clamp((this.minKneeAngle - 95) * 1.1, 0, 30)) - Math.round(clamp((this.maxTrunkAngle - 25) * 1.2, 0, 25)), 0, 100);
      this.evaluation = { score, label: issues.length === 0 && score >= 80 ? "GOOD" : "NEEDS IMPROVEMENT", issues, side: this.activeSide };
      this.pendingRep = { rep: this.repCount, evaluation: this.evaluation };
      if (issues[0]) this.pendingFeedback = this.feedback.emit(issues[0].code, issues[0].message, timestamp);
    }
    this.abort();
  }

  private sustained(name: string, condition: boolean, timestamp: number, duration: number) {
    if (!condition) { if (this.candidate?.name === name) this.candidate = null; return false; }
    if (this.candidate?.name !== name) { this.candidate = { name, since: timestamp }; return false; }
    return timestamp - this.candidate.since >= duration;
  }
  private enter(state: LungeState) { this.state = state; this.candidate = null; }
  private abort() { this.state = "STANDING"; this.activeSide = null; this.candidate = null; }
  private detection(tracking: boolean, metrics: LungeMetrics | null): ExerciseDetection {
    return { state: this.state, tracking, side: this.activeSide ?? metrics?.activeSide ?? null, metrics: { leftKneeAngle: metrics?.leftKneeAngle ?? null, rightKneeAngle: metrics?.rightKneeAngle ?? null, trunkAngle: metrics?.trunkAngle ?? null, confidence: metrics?.confidence ?? null, alignmentReliable: metrics?.alignmentReliable ?? false } };
  }
}

export function extractLungeMetrics(frame: PoseFrame): LungeMetrics | null {
  const image = frame.landmarks;
  const angles = frame.worldLandmarks.length >= 29 ? frame.worldLandmarks : image;
  const required = [POSE_INDEX.leftShoulder, POSE_INDEX.rightShoulder, POSE_INDEX.leftHip, POSE_INDEX.rightHip, POSE_INDEX.leftKnee, POSE_INDEX.rightKnee, POSE_INDEX.leftAnkle, POSE_INDEX.rightAnkle];
  const confidence = minVisibility(required.map((index) => image[index]));
  if (confidence <= 0 || required.some((index) => !angles[index])) return null;
  const leftKneeAngle = angleBetween(angles[POSE_INDEX.leftHip], angles[POSE_INDEX.leftKnee], angles[POSE_INDEX.leftAnkle]);
  const rightKneeAngle = angleBetween(angles[POSE_INDEX.rightHip], angles[POSE_INDEX.rightKnee], angles[POSE_INDEX.rightAnkle]);
  if (leftKneeAngle === null || rightKneeAngle === null) return null;
  const shoulder = midpoint(image[POSE_INDEX.leftShoulder], image[POSE_INDEX.rightShoulder]);
  const hip = midpoint(image[POSE_INDEX.leftHip], image[POSE_INDEX.rightHip]);
  const trunkLength = Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y);
  const trunkAngle = trunkLength < 1e-6 ? 0 : Math.acos(clamp((hip.y - shoulder.y) / trunkLength, -1, 1)) * 180 / Math.PI;
  const difference = Math.abs(leftKneeAngle - rightKneeAngle);
  const activeSide: ExerciseSide = difference < 10 ? null : leftKneeAngle < rightKneeAngle ? "left" : "right";
  const bodyHeight = Math.abs(Math.max(image[POSE_INDEX.leftAnkle].y, image[POSE_INDEX.rightAnkle].y) - shoulder.y);
  const shoulderWidth = Math.abs(image[POSE_INDEX.leftShoulder].x - image[POSE_INDEX.rightShoulder].x);
  return { leftKneeAngle, rightKneeAngle, trunkAngle, confidence, activeSide, alignmentReliable: confidence >= 0.65 && bodyHeight > 0.3 && shoulderWidth / bodyHeight < 0.45 };
}
