import type { ExerciseItem } from "./exercise";

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type RoutineCategory = "Featured" | "Beginner" | "Home Workout" | "Lower Body" | "Upper Body" | "No Equipment" | "Quick Workout";

export interface Routine {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  estimatedDuration: number;
  focus?: string;
  exercises: ExerciseItem[];
}

export interface DemoRoutine extends Routine {
  categories: RoutineCategory[];
  origin: "demo";
}

export type SavedRoutineKind = "created" | "saved";

export interface SavedRoutineEntry {
  kind: SavedRoutineKind;
  savedAt: string;
  routine: Routine;
}
