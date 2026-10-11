import type { ExerciseFormEvaluation } from "@/types/exerciseAnalyzer";

export interface CapturedRepEvaluation extends ExerciseFormEvaluation {
  exerciseId: string;
  exerciseIndex: number;
  set: number;
  rep: number;
}

export interface CapturedTimedEvaluation extends ExerciseFormEvaluation {
  exerciseId: string;
  exerciseIndex: number;
  set: number;
  capturedAt: number;
}

export interface WorkoutIssueSummary {
  code: string;
  message: string;
  count: number;
}

export interface WorkoutSetResult {
  set: number;
  completed: boolean;
  reps: number;
  durationSeconds: number;
  formScore: number | null;
  sampleCount: number;
  issues: WorkoutIssueSummary[];
}

export interface WorkoutExerciseResult {
  exerciseId: string;
  name: string;
  prescribedSets: number;
  completedSets: number;
  reps: number;
  durationSeconds: number;
  formScore: number | null;
  sets: WorkoutSetResult[];
}

export interface WorkoutObservation {
  exerciseId: string;
  message: string;
  evidence: string;
}

export interface WorkoutReportRecord {
  version: 1;
  id: string;
  routineId: string;
  routineTitle: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  endedEarly: boolean;
  completedSets: number;
  totalSets: number;
  completionRate: number;
  exerciseCount: number;
  totalReps: number;
  totalTimedSeconds: number;
  formScore: number | null;
  exercises: WorkoutExerciseResult[];
  observations: WorkoutObservation[];
}
