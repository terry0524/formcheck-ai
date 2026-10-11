import { LungeAnalyzer } from "@/lib/exercises/lungeAnalyzer";
import { PlankAnalyzer } from "@/lib/exercises/plankAnalyzer";
import { PushupAnalyzer } from "@/lib/exercises/pushupAnalyzer";
import { SquatAnalyzer } from "@/lib/exercises/squatAnalyzer";
import type { ExerciseAnalyzer } from "@/types/exerciseAnalyzer";

type AnalyzerFactory = () => ExerciseAnalyzer;

const analyzerFactories: Record<string, AnalyzerFactory> = {
  squat: () => new SquatAnalyzer(),
  "push-up": () => new PushupAnalyzer(),
  lunge: () => new LungeAnalyzer(),
  "reverse-lunge": () => new LungeAnalyzer(),
  plank: () => new PlankAnalyzer(),
};

export function createExerciseAnalyzer(exerciseId: string) {
  return analyzerFactories[exerciseId]?.() ?? null;
}

export function hasExerciseAnalyzer(exerciseId: string) {
  return exerciseId in analyzerFactories;
}
