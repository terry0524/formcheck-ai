import type { SquatRepEvaluation } from "@/types/exercise";
import type { ExerciseItem } from "@/types/exercise";

export type FeedbackMode = "hybrid" | "screen" | "voice";
export type VoiceFrequency = "minimal" | "normal" | "detailed";
export type WorkoutEngineState =
  | "READY"
  | "EXERCISE"
  | "SET_COMPLETE"
  | "REST"
  | "NEXT_SET"
  | "NEXT_EXERCISE"
  | "WORKOUT_COMPLETE";

export interface WorkoutSession {
  routineId: string;
  currentExerciseIndex: number;
  currentSet: number;
  state: WorkoutEngineState;
  feedbackMode: FeedbackMode;
  voiceFrequency: VoiceFrequency;
}

export interface WorkoutEngineSnapshot {
  state: WorkoutEngineState;
  paused: boolean;
  endedEarly: boolean;
  currentExerciseIndex: number;
  currentExercise: ExerciseItem;
  nextExercise: ExerciseItem | null;
  currentSet: number;
  currentRep: number;
  targetReps: number | null;
  exerciseRemainingSeconds: number | null;
  restRemainingSeconds: number;
  completedSets: number;
  totalSets: number;
}

export interface SquatWorkoutRecord {
  id: string;
  exercise: "squat";
  targetReps: number;
  feedbackMode: FeedbackMode;
  voiceFrequency: VoiceFrequency;
  startedAt: string;
  updatedAt: string;
  reps: SquatRepEvaluation[];
}
