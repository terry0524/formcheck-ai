import { getExerciseName } from "@/lib/exercises";
import type { CapturedRepEvaluation, CapturedTimedEvaluation, WorkoutExerciseResult, WorkoutIssueSummary, WorkoutObservation, WorkoutReportRecord, WorkoutSetResult } from "@/types/report";
import type { Routine } from "@/types/routine";
import type { WorkoutEngineSnapshot } from "@/types/workout";

interface BuildWorkoutReportInput {
  id: string;
  routine: Routine;
  startedAt: string;
  completedAt: string;
  snapshot: WorkoutEngineSnapshot;
  completedSetKeys: Iterable<string>;
  reps: CapturedRepEvaluation[];
  timedSamples: CapturedTimedEvaluation[];
}

export function workoutSetKey(exerciseIndex: number, set: number) {
  return `${exerciseIndex}:${set}`;
}

export function buildWorkoutReport(input: BuildWorkoutReportInput): WorkoutReportRecord {
  const completedSetKeys = new Set(input.completedSetKeys);
  const exercises = input.routine.exercises.map<WorkoutExerciseResult>((prescription, exerciseIndex) => {
    const sets = Array.from({ length: prescription.sets }, (_, setIndex) => {
      const set = setIndex + 1;
      const repEvaluations = input.reps.filter((item) => item.exerciseIndex === exerciseIndex && item.set === set);
      const timedEvaluations = input.timedSamples.filter((item) => item.exerciseIndex === exerciseIndex && item.set === set);
      const evaluations = prescription.reps === undefined ? timedEvaluations : repEvaluations;
      const completed = completedSetKeys.has(workoutSetKey(exerciseIndex, set));
      return {
        set,
        completed,
        reps: repEvaluations.length,
        durationSeconds: prescription.duration !== undefined && completed ? prescription.duration : 0,
        formScore: average(evaluations.map((item) => item.score)),
        sampleCount: evaluations.length,
        issues: summarizeIssues(evaluations.flatMap((item) => item.issues)),
      } satisfies WorkoutSetResult;
    });
    return {
      exerciseId: prescription.exerciseId,
      name: getExerciseName(prescription.exerciseId),
      prescribedSets: prescription.sets,
      completedSets: sets.filter((set) => set.completed).length,
      reps: sets.reduce((sum, set) => sum + set.reps, 0),
      durationSeconds: sets.reduce((sum, set) => sum + set.durationSeconds, 0),
      formScore: average(sets.flatMap((set) => set.formScore === null ? [] : [set.formScore])),
      sets,
    };
  });

  const activeExercises = exercises.filter((exercise) => exercise.completedSets > 0 || exercise.reps > 0 || exercise.sets.some((set) => set.sampleCount > 0));
  const completedSets = Math.min(input.snapshot.totalSets, completedSetKeys.size);
  const startedAtMs = Date.parse(input.startedAt);
  const completedAtMs = Date.parse(input.completedAt);
  return {
    version: 1,
    id: input.id,
    routineId: input.routine.id,
    routineTitle: input.routine.title,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    durationSeconds: Number.isFinite(startedAtMs) && Number.isFinite(completedAtMs) ? Math.max(0, Math.round((completedAtMs - startedAtMs) / 1000)) : 0,
    endedEarly: input.snapshot.endedEarly,
    completedSets,
    totalSets: input.snapshot.totalSets,
    completionRate: input.snapshot.totalSets === 0 ? 0 : Math.round(completedSets / input.snapshot.totalSets * 100),
    exerciseCount: activeExercises.length,
    totalReps: exercises.reduce((sum, exercise) => sum + exercise.reps, 0),
    totalTimedSeconds: exercises.reduce((sum, exercise) => sum + exercise.durationSeconds, 0),
    formScore: average(activeExercises.flatMap((exercise) => exercise.formScore === null ? [] : [exercise.formScore])),
    exercises: activeExercises,
    observations: buildObservations(activeExercises),
  };
}

function summarizeIssues(issues: Array<{ code: string; message: string }>): WorkoutIssueSummary[] {
  const summary = new Map<string, WorkoutIssueSummary>();
  for (const issue of issues) {
    const previous = summary.get(issue.code);
    summary.set(issue.code, previous ? { ...previous, count: previous.count + 1 } : { ...issue, count: 1 });
  }
  return [...summary.values()].sort((a, b) => b.count - a.count);
}

function buildObservations(exercises: WorkoutExerciseResult[]): WorkoutObservation[] {
  const observations: WorkoutObservation[] = [];
  for (const exercise of exercises) {
    const measuredSets = exercise.sets.filter((set) => set.formScore !== null);
    if (measuredSets.length < 2) continue;
    const first = measuredSets[0];
    const last = measuredSets.at(-1)!;
    const firstShallow = first.issues.find((issue) => issue.code === "shallow")?.count ?? 0;
    const lastShallow = last.issues.find((issue) => issue.code === "shallow")?.count ?? 0;
    const firstRate = first.reps > 0 ? firstShallow / first.reps : 0;
    const lastRate = last.reps > 0 ? lastShallow / last.reps : 0;
    if (exercise.exerciseId === "squat" && first.reps >= 2 && last.reps >= 2 && lastRate - firstRate >= 0.25) {
      observations.push({
        exerciseId: exercise.exerciseId,
        message: "Squat depth decreased in the later set.",
        evidence: `Shallow reps increased from ${firstShallow}/${first.reps} to ${lastShallow}/${last.reps}.`,
      });
      continue;
    }
    const scoreDrop = (first.formScore ?? 0) - (last.formScore ?? 0);
    if (scoreDrop >= 8) {
      observations.push({
        exerciseId: exercise.exerciseId,
        message: `${exercise.name} form score decreased in the later set.`,
        evidence: `Set ${first.set}: ${first.formScore} · Set ${last.set}: ${last.formScore}`,
      });
    }
  }
  return observations;
}

function average(values: number[]) {
  return values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
