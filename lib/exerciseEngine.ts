import { POSE_INDEX } from "@/lib/bodyVisibility";
import { scoreSquatRep } from "@/lib/formFeedback";
import { SQUAT_CONFIG } from "@/lib/exercises/squatConfig";
import type { PoseFrame, PoseLandmark } from "@/types/pose";
import type { SquatAnalysis, SquatMetrics, SquatPhase, SquatRepEvaluation, SquatRepSummary } from "@/types/exercise";

interface SideMetrics {
  kneeAngle: number;
  hipAngle: number;
  confidence: number;
  hipHeight: number;
  kneePosition: number;
}

interface SmoothedMetrics {
  kneeAngle: number;
  hipAngle: number;
  trunkAngle: number;
  hipHeight: number;
  kneePosition: number;
  kneeAlignmentDeviation: number | null;
  kneeAlignmentReliable: boolean;
  confidence: number;
}

function angleBetween(a: PoseLandmark, vertex: PoseLandmark, c: PoseLandmark) {
  const ab = { x: a.x - vertex.x, y: a.y - vertex.y, z: a.z - vertex.z };
  const cb = { x: c.x - vertex.x, y: c.y - vertex.y, z: c.z - vertex.z };
  const denominator = Math.hypot(ab.x, ab.y, ab.z) * Math.hypot(cb.x, cb.y, cb.z);
  if (denominator < 1e-6) return null;
  const cosine = Math.max(-1, Math.min(1, (ab.x * cb.x + ab.y * cb.y + ab.z * cb.z) / denominator));
  return Math.acos(cosine) * 180 / Math.PI;
}

function midpoint(a: PoseLandmark, b: PoseLandmark): PoseLandmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: (a.visibility + b.visibility) / 2,
  };
}

function sideMetrics(
  image: PoseLandmark[],
  angleLandmarks: PoseLandmark[],
  indices: readonly [number, number, number, number],
): SideMetrics | null {
  const imagePoints = indices.map((index) => image[index]);
  const anglePoints = indices.map((index) => angleLandmarks[index]);
  if (imagePoints.some((point) => !point) || anglePoints.some((point) => !point)) return null;

  const [shoulder, hip, knee, ankle] = imagePoints;
  const [angleShoulder, angleHip, angleKnee, angleAnkle] = anglePoints;
  const confidence = Math.min(...imagePoints.map((point) => point.visibility));
  if (confidence < SQUAT_CONFIG.geometry.minimumLandmarkVisibility) return null;
  const kneeAngle = angleBetween(angleHip, angleKnee, angleAnkle);
  const hipAngle = angleBetween(angleShoulder, angleHip, angleKnee);
  if (kneeAngle === null || hipAngle === null) return null;

  const bodyScale = Math.max(SQUAT_CONFIG.geometry.minimumBodyScale, Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y));
  return {
    kneeAngle,
    hipAngle,
    confidence,
    hipHeight: hip.y,
    kneePosition: Math.abs(knee.x - ankle.x) / bodyScale,
  };
}

function weightedAverage(values: Array<{ value: number; weight: number }>) {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  return values.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}

export function extractSquatMetrics(frame: PoseFrame): Omit<SquatMetrics, "hipDrop"> | null {
  if (frame.landmarks.length < 29) return null;
  const image = frame.landmarks;
  const angleLandmarks = frame.worldLandmarks.length >= 29 ? frame.worldLandmarks : image;
  const left = sideMetrics(image, angleLandmarks, [POSE_INDEX.leftShoulder, POSE_INDEX.leftHip, POSE_INDEX.leftKnee, POSE_INDEX.leftAnkle]);
  const right = sideMetrics(image, angleLandmarks, [POSE_INDEX.rightShoulder, POSE_INDEX.rightHip, POSE_INDEX.rightKnee, POSE_INDEX.rightAnkle]);
  const validSides = [left, right].filter((side): side is SideMetrics => side !== null);
  if (validSides.length === 0) return null;

  const leftShoulder = image[POSE_INDEX.leftShoulder];
  const rightShoulder = image[POSE_INDEX.rightShoulder];
  const leftHip = image[POSE_INDEX.leftHip];
  const rightHip = image[POSE_INDEX.rightHip];
  const leftKnee = image[POSE_INDEX.leftKnee];
  const rightKnee = image[POSE_INDEX.rightKnee];
  const leftAnkle = image[POSE_INDEX.leftAnkle];
  const rightAnkle = image[POSE_INDEX.rightAnkle];
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) return null;
  const shoulderMid = midpoint(leftShoulder, rightShoulder);
  const hipMid = midpoint(leftHip, rightHip);
  const ankleMid = midpoint(leftAnkle, rightAnkle);
  const trunkDx = shoulderMid.x - hipMid.x;
  const trunkDy = shoulderMid.y - hipMid.y;
  const trunkLength = Math.hypot(trunkDx, trunkDy);
  const trunkAngle = trunkLength > 1e-6
    ? Math.acos(Math.max(-1, Math.min(1, -trunkDy / trunkLength))) * 180 / Math.PI
    : 0;
  const weighted = (key: keyof Pick<SideMetrics, "kneeAngle" | "hipAngle" | "hipHeight" | "kneePosition">) =>
    weightedAverage(validSides.map((side) => ({ value: side[key], weight: side.confidence ** 2 })));
  const bodyHeight = Math.abs(ankleMid.y - shoulderMid.y);
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
  const hipWidth = Math.abs(leftHip.x - rightHip.x);
  const kneeWidth = Math.abs(leftKnee.x - rightKnee.x);
  const ankleWidth = Math.abs(leftAnkle.x - rightAnkle.x);
  const frontalPoints = [leftShoulder, rightShoulder, leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle];
  const alignment = SQUAT_CONFIG.geometry.alignment;
  const kneeAlignmentReliable = bodyHeight > alignment.minimumBodyHeight
    && Math.min(...frontalPoints.map((point) => point.visibility)) >= alignment.minimumLandmarkVisibility
    && shoulderWidth / bodyHeight >= alignment.minimumShoulderWidthRatio
    && hipWidth / bodyHeight >= alignment.minimumHipWidthRatio;
  const kneeAlignmentDeviation = kneeAlignmentReliable
    ? Math.max(0, alignment.expectedKneeWidthRatio - kneeWidth / Math.max(alignment.minimumReferenceWidth, hipWidth, ankleWidth))
    : null;

  return {
    leftKneeAngle: left?.kneeAngle ?? null,
    rightKneeAngle: right?.kneeAngle ?? null,
    kneeAngle: weighted("kneeAngle"),
    leftHipAngle: left?.hipAngle ?? null,
    rightHipAngle: right?.hipAngle ?? null,
    hipAngle: weighted("hipAngle"),
    trunkAngle,
    hipHeight: weighted("hipHeight"),
    kneePosition: weighted("kneePosition"),
    kneeAlignmentDeviation,
    kneeAlignmentReliable,
    confidence: Math.max(...validSides.map((side) => side.confidence)),
  };
}

function smooth(previous: number, next: number, alpha: number) {
  return previous + alpha * (next - previous);
}

export class SquatEngine {
  private phase: SquatPhase = "STANDING";
  private repCount = 0;
  private smoothed: SmoothedMetrics | null = null;
  private standingHipHeight: number | null = null;
  private previousTimestamp = 0;
  private previousKneeAngle = 180;
  private previousHipHeight = 0;
  private phaseEnteredAt = 0;
  private candidate: { name: string; since: number } | null = null;
  private bottomSince: number | null = null;
  private repStartedAt = 0;
  private lastRepAt = -Infinity;
  private trackingLostAt: number | null = null;
  private repSummary: SquatRepSummary | null = null;

  update(frame: PoseFrame | null, timestamp: number): SquatAnalysis {
    const metrics = frame ? extractSquatMetrics(frame) : null;
    return this.updateMetrics(metrics, timestamp);
  }

  updateMetrics(metrics: Omit<SquatMetrics, "hipDrop"> | null, timestamp: number): SquatAnalysis {
    if (!metrics || metrics.confidence < SQUAT_CONFIG.tracking.minimumConfidence) {
      this.bottomSince = null;
      if (this.trackingLostAt === null) this.trackingLostAt = timestamp;
      if (timestamp - this.trackingLostAt >= SQUAT_CONFIG.tracking.resetAfterLossMs && this.smoothed) {
        this.rejectCycle(timestamp);
        this.smoothed = null;
        this.standingHipHeight = null;
        this.previousTimestamp = 0;
      }
      return this.snapshot(null, false, false, null, null);
    }
    this.trackingLostAt = null;

    const dt = this.previousTimestamp > 0
      ? Math.min(SQUAT_CONFIG.smoothing.maximumDeltaMs, Math.max(SQUAT_CONFIG.smoothing.minimumDeltaMs, timestamp - this.previousTimestamp))
      : SQUAT_CONFIG.smoothing.initialDeltaMs;
    const alpha = 1 - Math.exp(-dt / SQUAT_CONFIG.smoothing.timeConstantMs);
    if (!this.smoothed) {
      this.smoothed = {
        kneeAngle: metrics.kneeAngle,
        hipAngle: metrics.hipAngle,
        trunkAngle: metrics.trunkAngle,
        hipHeight: metrics.hipHeight,
        kneePosition: metrics.kneePosition,
        kneeAlignmentDeviation: metrics.kneeAlignmentDeviation,
        kneeAlignmentReliable: metrics.kneeAlignmentReliable,
        confidence: metrics.confidence,
      };
      this.previousKneeAngle = metrics.kneeAngle;
      this.previousHipHeight = metrics.hipHeight;
      this.previousTimestamp = timestamp;
      this.phaseEnteredAt = timestamp;
    } else {
      this.smoothed = {
        kneeAngle: smooth(this.smoothed.kneeAngle, metrics.kneeAngle, alpha),
        hipAngle: smooth(this.smoothed.hipAngle, metrics.hipAngle, alpha),
        trunkAngle: smooth(this.smoothed.trunkAngle, metrics.trunkAngle, alpha),
        hipHeight: smooth(this.smoothed.hipHeight, metrics.hipHeight, alpha),
        kneePosition: smooth(this.smoothed.kneePosition, metrics.kneePosition, alpha),
        kneeAlignmentDeviation: metrics.kneeAlignmentReliable && metrics.kneeAlignmentDeviation !== null
          ? smooth(this.smoothed.kneeAlignmentDeviation ?? metrics.kneeAlignmentDeviation, metrics.kneeAlignmentDeviation, alpha)
          : null,
        kneeAlignmentReliable: metrics.kneeAlignmentReliable,
        confidence: smooth(this.smoothed.confidence, metrics.confidence, alpha),
      };
    }

    const current = this.smoothed;
    const kneeVelocity = (current.kneeAngle - this.previousKneeAngle) * 1000 / dt;
    const hipVelocity = (current.hipHeight - this.previousHipHeight) * 1000 / dt;
    this.previousKneeAngle = current.kneeAngle;
    this.previousHipHeight = current.hipHeight;
    this.previousTimestamp = timestamp;

    const standingShape = current.kneeAngle >= SQUAT_CONFIG.state.standing.minimumKneeAngle
      && current.hipAngle >= SQUAT_CONFIG.state.standing.minimumHipAngle;
    if (this.phase === "STANDING" && standingShape) {
      this.standingHipHeight = this.standingHipHeight === null
        ? current.hipHeight
        : smooth(this.standingHipHeight, current.hipHeight, SQUAT_CONFIG.smoothing.standingBaselineAlpha);
    }
    const hipDrop = this.standingHipHeight === null ? 0 : current.hipHeight - this.standingHipHeight;
    const outputMetrics: SquatMetrics = { ...metrics, ...current, hipDrop };
    let repCompleted = false;
    let completedRep: SquatRepEvaluation | null = null;
    let rejectedReason: "shallow" | null = null;
    if (this.repSummary) this.recordRep(outputMetrics);

    const bottom = SQUAT_CONFIG.state.bottom;
    const atBottom = current.kneeAngle <= bottom.maximumKneeAngle
      && current.hipAngle <= bottom.maximumHipAngle && hipDrop >= bottom.minimumHipDrop;
    // Descent confirmation and bottom evidence can overlap. Keep their clocks
    // independent so entering DESCENDING does not discard already observed dwell.
    if ((this.phase === "STANDING" || this.phase === "DESCENDING") && atBottom) {
      this.bottomSince ??= timestamp;
    } else {
      this.bottomSince = null;
    }

    if (this.phase === "STANDING") {
      const rule = SQUAT_CONFIG.state.descending;
      const descending = current.kneeAngle < rule.maximumKneeAngle && current.hipAngle < rule.maximumHipAngle
        && hipDrop > rule.minimumHipDrop && kneeVelocity < rule.maximumKneeVelocity;
      if (this.sustained("descending", descending, timestamp, rule.sustainMs)) {
        this.enterPhase("DESCENDING", timestamp);
        this.repStartedAt = timestamp;
        this.repSummary = this.createRepSummary(outputMetrics);
      }
    } else if (this.phase === "DESCENDING") {
      const returnedStanding = standingShape && hipDrop <= SQUAT_CONFIG.state.incomplete.maximumHipDrop;
      if (atBottom && this.bottomSince !== null && timestamp - this.bottomSince >= bottom.sustainMs) {
        this.enterPhase("BOTTOM", timestamp);
      } else if (this.sustained("incomplete", returnedStanding, timestamp, SQUAT_CONFIG.state.incomplete.sustainMs)
        || timestamp - this.phaseEnteredAt > SQUAT_CONFIG.state.maximumActivePhaseMs) {
        if (returnedStanding) rejectedReason = "shallow";
        this.rejectCycle(timestamp);
      }
    } else if (this.phase === "BOTTOM") {
      const rule = SQUAT_CONFIG.state.ascending;
      const ascending = current.kneeAngle >= rule.minimumKneeAngle && kneeVelocity > rule.minimumKneeVelocity && hipVelocity < rule.maximumHipVelocity;
      if (this.sustained("ascending", ascending, timestamp, rule.sustainMs)) {
        this.enterPhase("ASCENDING", timestamp);
      }
    } else if (this.phase === "ASCENDING") {
      const bottom = SQUAT_CONFIG.state.bottom;
      const completion = SQUAT_CONFIG.state.completion;
      const returnedBottom = current.kneeAngle <= bottom.maximumKneeAngle && current.hipAngle <= bottom.maximumHipAngle && hipDrop >= bottom.minimumHipDrop;
      // Direction was already established in BOTTOM -> ASCENDING. Requiring
      // positive/near-zero velocity throughout the finish dwell rejects small
      // pose-estimation wobble even while the user remains upright.
      const fullyStanding = current.kneeAngle >= completion.minimumKneeAngle
        && current.hipAngle >= SQUAT_CONFIG.state.standing.minimumHipAngle
        && hipDrop <= completion.maximumHipDrop;
      if (returnedBottom) {
        this.enterPhase("BOTTOM", timestamp);
      } else if (this.sustained("complete", fullyStanding, timestamp, completion.sustainMs)) {
        const validDuration = timestamp - this.repStartedAt >= SQUAT_CONFIG.state.minimumRepMs;
        const debounced = timestamp - this.lastRepAt >= SQUAT_CONFIG.state.repDebounceMs;
        if (validDuration && debounced) {
          this.repCount += 1;
          this.lastRepAt = timestamp;
          repCompleted = true;
          if (this.repSummary) completedRep = scoreSquatRep(this.repCount, this.repSummary, timestamp);
        }
        this.enterPhase("STANDING", timestamp);
        this.repSummary = null;
      } else if (timestamp - this.phaseEnteredAt > SQUAT_CONFIG.state.maximumActivePhaseMs) {
        this.rejectCycle(timestamp);
      }
    }

    return this.snapshot(outputMetrics, true, repCompleted, completedRep, rejectedReason);
  }

  reset() {
    this.phase = "STANDING";
    this.repCount = 0;
    this.smoothed = null;
    this.standingHipHeight = null;
    this.previousTimestamp = 0;
    this.previousKneeAngle = 180;
    this.previousHipHeight = 0;
    this.phaseEnteredAt = 0;
    this.candidate = null;
    this.bottomSince = null;
    this.repStartedAt = 0;
    this.lastRepAt = -Infinity;
    this.trackingLostAt = null;
    this.repSummary = null;
  }

  private sustained(name: string, condition: boolean, timestamp: number, duration: number) {
    if (!condition) {
      if (this.candidate?.name === name) this.candidate = null;
      return false;
    }
    if (this.candidate?.name !== name) {
      this.candidate = { name, since: timestamp };
      return false;
    }
    return timestamp - this.candidate.since >= duration;
  }

  private enterPhase(phase: SquatPhase, timestamp: number) {
    this.phase = phase;
    this.phaseEnteredAt = timestamp;
    this.candidate = null;
    if (phase === "STANDING") this.bottomSince = null;
  }

  private rejectCycle(timestamp: number) {
    this.enterPhase("STANDING", timestamp);
    this.repStartedAt = 0;
    this.repSummary = null;
  }

  private createRepSummary(metrics: SquatMetrics): SquatRepSummary {
    return {
      minKneeAngle: metrics.kneeAngle,
      minHipAngle: metrics.hipAngle,
      maxHipDrop: metrics.hipDrop,
      maxTrunkAngle: metrics.trunkAngle,
      maxKneeAlignmentDeviation: metrics.kneeAlignmentReliable ? metrics.kneeAlignmentDeviation : null,
      kneeAlignmentMeasured: metrics.kneeAlignmentReliable,
    };
  }

  private recordRep(metrics: SquatMetrics) {
    if (!this.repSummary) return;
    this.repSummary.minKneeAngle = Math.min(this.repSummary.minKneeAngle, metrics.kneeAngle);
    this.repSummary.minHipAngle = Math.min(this.repSummary.minHipAngle, metrics.hipAngle);
    this.repSummary.maxHipDrop = Math.max(this.repSummary.maxHipDrop, metrics.hipDrop);
    this.repSummary.maxTrunkAngle = Math.max(this.repSummary.maxTrunkAngle, metrics.trunkAngle);
    if (metrics.kneeAlignmentReliable && metrics.kneeAlignmentDeviation !== null) {
      this.repSummary.kneeAlignmentMeasured = true;
      this.repSummary.maxKneeAlignmentDeviation = Math.max(
        this.repSummary.maxKneeAlignmentDeviation ?? 0,
        metrics.kneeAlignmentDeviation,
      );
    }
  }

  private snapshot(
    metrics: SquatMetrics | null,
    tracking: boolean,
    repCompleted: boolean,
    completedRep: SquatRepEvaluation | null,
    rejectedReason: "shallow" | null,
  ): SquatAnalysis {
    return { repCount: this.repCount, phase: this.phase, metrics, tracking, repCompleted, completedRep, rejectedReason };
  }
}
