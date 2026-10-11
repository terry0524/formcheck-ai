import { POSE_INDEX } from "@/lib/bodyVisibility";
import { FeedbackGate } from "@/lib/exercises/feedbackGate";
import { angleBetween, clamp, minVisibility, smooth } from "@/lib/exercises/poseMath";
import type { ExerciseAnalyzer, ExerciseDetection, ExerciseFeedback, ExerciseFormEvaluation, ExerciseRepEvent, ExerciseSide } from "@/types/exerciseAnalyzer";
import type { PoseFrame } from "@/types/pose";

export type PushupState = "UP" | "DESCENDING" | "DOWN" | "ASCENDING";

export interface PushupMetrics {
  elbowAngle: number;
  bodyAngle: number;
  confidence: number;
  side: Exclude<ExerciseSide, null>;
  depthReliable: boolean;
  alignmentReliable: boolean;
}

export class PushupAnalyzer implements ExerciseAnalyzer {
  readonly exerciseId = "push-up";
  readonly supportsReps = true;
  private state: PushupState = "UP";
  private repCount = 0;
  private smoothed: PushupMetrics | null = null;
  private previousElbow = 180;
  private previousTimestamp = 0;
  private trackingLostAt: number | null = null;
  private candidate: { name: string; since: number } | null = null;
  private repStartedAt = 0;
  private lastRepAt = -Infinity;
  private minElbow = 180;
  private minBodyAngle = 180;
  private pendingRep: ExerciseRepEvent | null = null;
  private pendingFeedback: ExerciseFeedback | null = null;
  private evaluation: ExerciseFormEvaluation | null = null;
  private feedback = new FeedbackGate();

  detectState(frame: PoseFrame | null, timestamp: number) {
    return this.detectMetrics(frame ? extractPushupMetrics(frame) : null, timestamp);
  }

  detectMetrics(metrics: PushupMetrics | null, timestamp: number): ExerciseDetection {
    if (!metrics || metrics.confidence < 0.6 || !metrics.depthReliable) {
      this.candidate = null;
      if (this.trackingLostAt === null) this.trackingLostAt = timestamp;
      if (timestamp - this.trackingLostAt >= 500) {
        this.abort();
        this.smoothed = null;
        this.previousElbow = 180;
        this.previousTimestamp = 0;
      }
      return this.detection(false, null);
    }
    this.trackingLostAt = null;
    const dt = this.previousTimestamp ? Math.max(16, Math.min(250, timestamp - this.previousTimestamp)) : 50;
    this.smoothed = this.smoothed ? {
      ...metrics,
      elbowAngle: smooth(this.smoothed.elbowAngle, metrics.elbowAngle),
      bodyAngle: smooth(this.smoothed.bodyAngle, metrics.bodyAngle),
      confidence: smooth(this.smoothed.confidence, metrics.confidence),
    } : metrics;
    const current = this.smoothed;
    const elbowVelocity = (current.elbowAngle - this.previousElbow) * 1000 / dt;
    this.previousElbow = current.elbowAngle;
    this.previousTimestamp = timestamp;

    if (this.state !== "UP") {
      this.minElbow = Math.min(this.minElbow, current.elbowAngle);
      if (current.alignmentReliable) this.minBodyAngle = Math.min(this.minBodyAngle, current.bodyAngle);
    }

    const alignmentCue = this.feedback.sustained("body-alignment", "머리부터 발끝까지 일직선을 유지하세요.", current.alignmentReliable && current.bodyAngle < 155, timestamp, 400);
    if (alignmentCue) this.pendingFeedback = alignmentCue;

    if (this.state === "UP") {
      if (this.sustained("descending", current.elbowAngle < 145 && elbowVelocity < -5, timestamp, 100)) {
        this.enter("DESCENDING");
        this.repStartedAt = timestamp;
        this.minElbow = current.elbowAngle;
        this.minBodyAngle = current.alignmentReliable ? current.bodyAngle : 180;
      }
    } else if (this.state === "DESCENDING") {
      if (this.sustained("down", current.elbowAngle <= 112, timestamp, 150)) this.enter("DOWN");
      else if (this.sustained("abort", current.elbowAngle >= 158, timestamp, 150)) this.abort();
    } else if (this.state === "DOWN") {
      if (this.sustained("ascending", current.elbowAngle >= 122 && elbowVelocity > 5, timestamp, 100)) this.enter("ASCENDING");
    } else {
      if (current.elbowAngle <= 110) this.enter("DOWN");
      else if (this.sustained("complete", current.elbowAngle >= 158 && elbowVelocity > -3, timestamp, 180)) this.complete(timestamp, current.side);
    }
    return this.detection(true, current);
  }

  countRep() { const event = this.pendingRep; this.pendingRep = null; return event; }
  evaluateForm() { return this.evaluation; }
  getFeedback() { const cue = this.pendingFeedback; this.pendingFeedback = null; return cue; }

  reset() {
    this.state = "UP"; this.repCount = 0; this.smoothed = null; this.previousElbow = 180; this.previousTimestamp = 0; this.trackingLostAt = null;
    this.candidate = null; this.repStartedAt = 0; this.lastRepAt = -Infinity; this.minElbow = 180; this.minBodyAngle = 180;
    this.pendingRep = null; this.pendingFeedback = null; this.evaluation = null; this.feedback.reset();
  }

  private complete(timestamp: number, side: Exclude<ExerciseSide, null>) {
    if (timestamp - this.repStartedAt >= 600 && timestamp - this.lastRepAt >= 650) {
      this.repCount += 1;
      this.lastRepAt = timestamp;
      const issues = [];
      if (this.minElbow > 95) issues.push({ code: "shallow", message: "조금 더 내려가세요." });
      if (this.minBodyAngle < 160) issues.push({ code: "body-alignment", message: "머리부터 발끝까지 일직선을 유지하세요." });
      const score = clamp(100 - Math.round(clamp((this.minElbow - 90) * 1.2, 0, 30)) - Math.round(clamp((165 - this.minBodyAngle) * 1.2, 0, 25)), 0, 100);
      this.evaluation = { score, label: issues.length === 0 && score >= 80 ? "GOOD" : "NEEDS IMPROVEMENT", issues, side };
      this.pendingRep = { rep: this.repCount, evaluation: this.evaluation };
      if (issues[0]) this.pendingFeedback = this.feedback.emit(issues[0].code, issues[0].message, timestamp);
    }
    this.state = "UP";
    this.candidate = null;
  }

  private sustained(name: string, condition: boolean, timestamp: number, duration: number) {
    if (!condition) { if (this.candidate?.name === name) this.candidate = null; return false; }
    if (this.candidate?.name !== name) { this.candidate = { name, since: timestamp }; return false; }
    return timestamp - this.candidate.since >= duration;
  }
  private enter(state: PushupState) { this.state = state; this.candidate = null; }
  private abort() { this.state = "UP"; this.candidate = null; }
  private detection(tracking: boolean, metrics: PushupMetrics | null): ExerciseDetection {
    return { state: this.state, tracking, side: metrics?.side ?? null, metrics: { elbowAngle: metrics?.elbowAngle ?? null, bodyAngle: metrics?.bodyAngle ?? null, confidence: metrics?.confidence ?? null, alignmentReliable: metrics?.alignmentReliable ?? false } };
  }
}

export function extractPushupMetrics(frame: PoseFrame): PushupMetrics | null {
  const image = frame.landmarks;
  const angles = frame.worldLandmarks.length >= 29 ? frame.worldLandmarks : image;
  const candidates = (["left", "right"] as const).map((side) => {
    const indices = side === "left"
      ? [POSE_INDEX.leftShoulder, POSE_INDEX.leftElbow, POSE_INDEX.leftWrist, POSE_INDEX.leftHip, POSE_INDEX.leftAnkle]
      : [POSE_INDEX.rightShoulder, POSE_INDEX.rightElbow, POSE_INDEX.rightWrist, POSE_INDEX.rightHip, POSE_INDEX.rightAnkle];
    const points = indices.map((index) => image[index]);
    const anglePoints = indices.map((index) => angles[index]);
    const confidence = minVisibility(points);
    const elbowAngle = anglePoints.every(Boolean) ? angleBetween(anglePoints[0], anglePoints[1], anglePoints[2]) : null;
    const bodyAngle = anglePoints.every(Boolean) ? angleBetween(anglePoints[0], anglePoints[3], anglePoints[4]) : null;
    if (elbowAngle === null || bodyAngle === null) return null;
    const bodySpan = Math.hypot(points[0].x - points[4].x, points[0].y - points[4].y);
    return { side, elbowAngle, bodyAngle, confidence, bodySpan };
  }).filter((value): value is NonNullable<typeof value> => value !== null).sort((a, b) => b.confidence - a.confidence);
  const best = candidates[0];
  if (!best) return null;
  const shoulderWidth = Math.abs((image[POSE_INDEX.leftShoulder]?.x ?? 0) - (image[POSE_INDEX.rightShoulder]?.x ?? 0));
  const hipWidth = Math.abs((image[POSE_INDEX.leftHip]?.x ?? 0) - (image[POSE_INDEX.rightHip]?.x ?? 0));
  return { elbowAngle: best.elbowAngle, bodyAngle: best.bodyAngle, confidence: best.confidence, side: best.side, depthReliable: best.confidence >= 0.6, alignmentReliable: best.confidence >= 0.65 && best.bodySpan > 0.25 && Math.max(shoulderWidth, hipWidth) / best.bodySpan < 0.55 };
}
