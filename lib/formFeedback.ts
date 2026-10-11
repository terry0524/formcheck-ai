import type {
  FormFeedbackCue,
  RepScoreBreakdown,
  SquatAnalysis,
  SquatFormIssue,
  SquatFormIssueCode,
  SquatRepEvaluation,
  SquatRepSummary,
} from "@/types/exercise";
import { SQUAT_CONFIG, SQUAT_SCORE_WEIGHTS } from "@/lib/exercises/squatConfig";

export const SQUAT_QUALITY_RULES = SQUAT_CONFIG.quality;

const ISSUE_COPY: Record<SquatFormIssueCode, string> = {
  shallow: "조금 더 내려가세요.",
  "trunk-lean": "상체를 조금 더 세워보세요.",
  "knee-alignment": "무릎 정렬을 확인하세요.",
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function scoreSquatRep(rep: number, summary: SquatRepSummary, completedAt: number): SquatRepEvaluation {
  const depth = 100 - clamp(
    Math.max(0, summary.minKneeAngle - SQUAT_QUALITY_RULES.optimalKneeAngle) * SQUAT_QUALITY_RULES.depthKneeLossPerDegree
      + Math.max(0, SQUAT_QUALITY_RULES.optimalHipDrop - summary.maxHipDrop) * SQUAT_QUALITY_RULES.depthHipDropLossPerUnit,
    0,
    100,
  );
  const trunk = 100 - clamp(
    Math.max(0, summary.maxTrunkAngle - SQUAT_QUALITY_RULES.trunkScoreStartAngle) * SQUAT_QUALITY_RULES.trunkLossPerDegree,
    0,
    100,
  );
  const alignment = summary.kneeAlignmentMeasured && summary.maxKneeAlignmentDeviation !== null
    ? 100 - clamp(
      Math.max(0, summary.maxKneeAlignmentDeviation - SQUAT_QUALITY_RULES.alignmentScoreStart) * SQUAT_QUALITY_RULES.alignmentLossPerUnit,
      0,
      100,
    )
    : null;

  const weighted = [
    { score: depth, weight: SQUAT_SCORE_WEIGHTS.depth },
    { score: trunk, weight: SQUAT_SCORE_WEIGHTS.trunk },
    ...(alignment === null ? [] : [{ score: alignment, weight: SQUAT_SCORE_WEIGHTS.alignment }]),
  ];
  const availableWeight = weighted.reduce((sum, metric) => sum + metric.weight, 0);
  const score = Math.round(weighted.reduce((sum, metric) => sum + metric.score * metric.weight, 0) / availableWeight);

  const issues: SquatFormIssue[] = [];
  if (summary.minKneeAngle > SQUAT_QUALITY_RULES.shallowKneeAngle || summary.maxHipDrop < SQUAT_QUALITY_RULES.shallowMinimumHipDrop) {
    issues.push({ code: "shallow", message: ISSUE_COPY.shallow });
  }
  if (summary.maxTrunkAngle > SQUAT_QUALITY_RULES.trunkIssueAngle) {
    issues.push({ code: "trunk-lean", message: ISSUE_COPY["trunk-lean"] });
  }
  if (
    summary.kneeAlignmentMeasured
    && summary.maxKneeAlignmentDeviation !== null
    && summary.maxKneeAlignmentDeviation > SQUAT_QUALITY_RULES.alignmentIssue
  ) {
    issues.push({ code: "knee-alignment", message: ISSUE_COPY["knee-alignment"] });
  }

  const penalties: RepScoreBreakdown = {
    depth: Math.round((100 - depth) * SQUAT_SCORE_WEIGHTS.depth / availableWeight),
    trunkLean: Math.round((100 - trunk) * SQUAT_SCORE_WEIGHTS.trunk / availableWeight),
    kneeAlignment: alignment === null ? 0 : Math.round((100 - alignment) * SQUAT_SCORE_WEIGHTS.alignment / availableWeight),
  };

  return {
    rep,
    score,
    label: issues.length === 0 && score >= SQUAT_QUALITY_RULES.goodScore ? "GOOD" : "NEEDS IMPROVEMENT",
    issues,
    summary,
    categoryScores: { depth: Math.round(depth), trunk: Math.round(trunk), alignment: alignment === null ? null : Math.round(alignment) },
    availableWeight,
    penalties,
    completedAt,
  };
}

export class SquatFormCoach {
  private pending = new Map<SquatFormIssueCode, number>();
  private lastCueAt = new Map<SquatFormIssueCode, number>();

  update(analysis: SquatAnalysis, timestamp: number): FormFeedbackCue | null {
    if (analysis.rejectedReason === "shallow") return this.emit("shallow", timestamp);
    const metrics = analysis.metrics;
    if (!analysis.tracking || !metrics) {
      this.pending.clear();
      return null;
    }

    const depthCue = this.sustained(
      "shallow",
      analysis.phase === "BOTTOM" && (metrics.kneeAngle > SQUAT_QUALITY_RULES.shallowKneeAngle || metrics.hipDrop < SQUAT_QUALITY_RULES.shallowMinimumHipDrop),
      timestamp,
      SQUAT_QUALITY_RULES.shallowFeedbackSustainMs,
    );
    if (depthCue) return depthCue;

    const trunkCue = this.sustained(
      "trunk-lean",
      analysis.phase !== "STANDING" && metrics.trunkAngle > SQUAT_QUALITY_RULES.trunkIssueAngle + SQUAT_QUALITY_RULES.trunkFeedbackMargin,
      timestamp,
      SQUAT_QUALITY_RULES.feedbackSustainMs,
    );
    if (trunkCue) return trunkCue;

    return this.sustained(
      "knee-alignment",
      analysis.phase !== "STANDING"
        && metrics.kneeAlignmentReliable
        && metrics.kneeAlignmentDeviation !== null
        && metrics.kneeAlignmentDeviation > SQUAT_QUALITY_RULES.alignmentIssue + SQUAT_QUALITY_RULES.alignmentFeedbackMargin,
      timestamp,
      SQUAT_QUALITY_RULES.feedbackSustainMs,
    );
  }

  reset() {
    this.pending.clear();
    this.lastCueAt.clear();
  }

  private sustained(code: SquatFormIssueCode, condition: boolean, timestamp: number, duration: number) {
    if (!condition) {
      this.pending.delete(code);
      return null;
    }
    const since = this.pending.get(code);
    if (since === undefined) {
      this.pending.set(code, timestamp);
      return null;
    }
    if (timestamp - since < duration) return null;
    this.pending.delete(code);
    return this.emit(code, timestamp);
  }

  private emit(code: SquatFormIssueCode, timestamp: number): FormFeedbackCue | null {
    const lastCueAt = this.lastCueAt.get(code) ?? -Infinity;
    if (timestamp - lastCueAt < SQUAT_QUALITY_RULES.feedbackCooldownMs) return null;
    this.lastCueAt.set(code, timestamp);
    return { code, message: ISSUE_COPY[code], emittedAt: timestamp };
  }
}
