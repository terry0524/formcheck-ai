import { describe, expect, it } from "vitest";
import { buildWorkoutReport, workoutSetKey } from "@/lib/reportEngine";
import type { CapturedRepEvaluation } from "@/types/report";
import type { Routine } from "@/types/routine";
import type { WorkoutEngineSnapshot } from "@/types/workout";

const routine: Routine = {
  id: "report-test",
  title: "Report Test",
  description: "Measured report test",
  difficulty: "Beginner",
  estimatedDuration: 10,
  exercises: [
    { exerciseId: "squat", sets: 2, reps: 2, restSeconds: 0 },
    { exerciseId: "plank", sets: 1, duration: 30, restSeconds: 0 },
  ],
};

const snapshot: WorkoutEngineSnapshot = {
  state: "WORKOUT_COMPLETE",
  paused: false,
  endedEarly: false,
  currentExerciseIndex: 1,
  currentExercise: routine.exercises[1],
  nextExercise: null,
  currentSet: 1,
  currentRep: 0,
  targetReps: null,
  exerciseRemainingSeconds: null,
  restRemainingSeconds: 0,
  completedSets: 3,
  totalSets: 3,
};

const rep = (set: number, repNumber: number, score: number, shallow = false): CapturedRepEvaluation => ({
  exerciseId: "squat",
  exerciseIndex: 0,
  set,
  rep: repNumber,
  score,
  label: shallow ? "NEEDS IMPROVEMENT" : "GOOD",
  issues: shallow ? [{ code: "shallow", message: "조금 더 내려가세요." }] : [],
  side: null,
});

describe("buildWorkoutReport", () => {
  it("summarizes only measured workout data", () => {
    const report = buildWorkoutReport({
      id: "session-1",
      routine,
      startedAt: "2026-09-14T00:00:00.000Z",
      completedAt: "2026-09-14T00:05:00.000Z",
      snapshot,
      completedSetKeys: [workoutSetKey(0, 1), workoutSetKey(0, 2), workoutSetKey(1, 1)],
      reps: [rep(1, 1, 94), rep(1, 2, 90), rep(2, 1, 72, true), rep(2, 2, 70, true)],
      timedSamples: [
        { exerciseId: "plank", exerciseIndex: 1, set: 1, capturedAt: 1, score: 90, label: "GOOD", issues: [], side: "left" },
        { exerciseId: "plank", exerciseIndex: 1, set: 1, capturedAt: 2, score: 94, label: "GOOD", issues: [], side: "left" },
      ],
    });

    expect(report).toMatchObject({ durationSeconds: 300, exerciseCount: 2, totalReps: 4, totalTimedSeconds: 30, completionRate: 100, formScore: 87 });
    expect(report.exercises[0]).toMatchObject({ reps: 4, formScore: 82, completedSets: 2 });
    expect(report.exercises[1]).toMatchObject({ durationSeconds: 30, formScore: 92 });
    expect(report.observations).toEqual([expect.objectContaining({ exerciseId: "squat", message: "Squat depth decreased in the later set." })]);
  });

  it("does not invent a score or observation without measurements", () => {
    const report = buildWorkoutReport({
      id: "session-2",
      routine,
      startedAt: "2026-09-14T00:00:00.000Z",
      completedAt: "2026-09-14T00:00:10.000Z",
      snapshot: { ...snapshot, endedEarly: true, completedSets: 3 },
      completedSetKeys: [],
      reps: [],
      timedSamples: [],
    });
    expect(report.formScore).toBeNull();
    expect(report.completionRate).toBe(0);
    expect(report.exerciseCount).toBe(0);
    expect(report.exercises).toEqual([]);
    expect(report.observations).toEqual([]);
  });
});
