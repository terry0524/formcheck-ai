interface ExerciseItemBase {
  exerciseId: string;
  sets: number;
  restSeconds: number;
}

export type ExerciseItem = ExerciseItemBase & (
  | { reps: number; duration?: never }
  | { reps?: never; duration: number }
);

export interface ExerciseDefinition {
  id: string;
  name: string;
}

export type SquatPhase = "STANDING" | "DESCENDING" | "BOTTOM" | "ASCENDING";

export interface SquatMetrics {
  leftKneeAngle: number | null;
  rightKneeAngle: number | null;
  kneeAngle: number;
  leftHipAngle: number | null;
  rightHipAngle: number | null;
  hipAngle: number;
  trunkAngle: number;
  hipHeight: number;
  hipDrop: number;
  kneePosition: number;
  kneeAlignmentDeviation: number | null;
  kneeAlignmentReliable: boolean;
  confidence: number;
}

export type SquatFormIssueCode = "shallow" | "trunk-lean" | "knee-alignment";
export type RepQualityLabel = "GOOD" | "NEEDS IMPROVEMENT";

export interface SquatFormIssue {
  code: SquatFormIssueCode;
  message: string;
}

export interface SquatRepSummary {
  minKneeAngle: number;
  minHipAngle: number;
  maxHipDrop: number;
  maxTrunkAngle: number;
  maxKneeAlignmentDeviation: number | null;
  kneeAlignmentMeasured: boolean;
}

export interface RepScoreBreakdown {
  depth: number;
  trunkLean: number;
  kneeAlignment: number;
}

export interface SquatCategoryScores {
  depth: number;
  trunk: number;
  alignment: number | null;
}

export interface SquatRepEvaluation {
  rep: number;
  score: number;
  label: RepQualityLabel;
  issues: SquatFormIssue[];
  summary: SquatRepSummary;
  categoryScores: SquatCategoryScores;
  availableWeight: number;
  penalties: RepScoreBreakdown;
  completedAt: number;
}

export interface FormFeedbackCue extends SquatFormIssue {
  emittedAt: number;
}

export interface SquatAnalysis {
  repCount: number;
  phase: SquatPhase;
  metrics: SquatMetrics | null;
  tracking: boolean;
  repCompleted: boolean;
  completedRep: SquatRepEvaluation | null;
  rejectedReason: "shallow" | null;
}
