import type { PoseFrame } from "@/types/pose";

export type ExerciseSide = "left" | "right" | null;
export type ExerciseQualityLabel = "GOOD" | "NEEDS IMPROVEMENT";
export type AnalyzerMetricValue = number | string | boolean | null;

export interface ExerciseDetection {
  state: string;
  tracking: boolean;
  side: ExerciseSide;
  metrics: Record<string, AnalyzerMetricValue>;
}

export interface ExerciseFormIssue {
  code: string;
  message: string;
}

export interface ExerciseFormEvaluation {
  score: number;
  label: ExerciseQualityLabel;
  issues: ExerciseFormIssue[];
  side: ExerciseSide;
  scoreBreakdown?: Record<string, number | null>;
}

export interface ExerciseRepEvent {
  rep: number;
  evaluation: ExerciseFormEvaluation;
  rawEvaluation?: unknown;
}

export interface ExerciseFeedback extends ExerciseFormIssue {
  emittedAt: number;
}

export interface ExerciseAnalyzer {
  readonly exerciseId: string;
  readonly supportsReps: boolean;
  detectState(frame: PoseFrame | null, timestamp: number): ExerciseDetection;
  countRep(): ExerciseRepEvent | null;
  evaluateForm(): ExerciseFormEvaluation | null;
  getFeedback(): ExerciseFeedback | null;
  reset(): void;
}
