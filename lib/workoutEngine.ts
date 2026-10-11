import type { ExerciseItem } from "@/types/exercise";
import type { Routine } from "@/types/routine";
import type { WorkoutEngineSnapshot, WorkoutEngineState } from "@/types/workout";

export class WorkoutEngine {
  private state: WorkoutEngineState = "READY";
  private exerciseIndex = 0;
  private currentSet = 1;
  private currentRep = 0;
  private restEndsAt: number | null = null;
  private exerciseEndsAt: number | null = null;
  private paused = false;
  private pausedAt: number | null = null;
  private endedEarly = false;
  private lastTimestamp = 0;

  constructor(readonly routine: Routine) {
    validateRoutine(routine);
  }

  start(timestamp = 0) {
    this.lastTimestamp = timestamp;
    if (this.state !== "READY") return this.snapshot(timestamp);
    this.state = "EXERCISE";
    this.startExerciseClock(timestamp);
    return this.snapshot(timestamp);
  }

  recordRep(timestamp = this.lastTimestamp) {
    this.lastTimestamp = timestamp;
    const exercise = this.currentExercise();
    if (this.state !== "EXERCISE" || this.paused || exercise.reps === undefined) return this.snapshot(timestamp);
    this.currentRep = Math.min(exercise.reps, this.currentRep + 1);
    if (this.currentRep >= exercise.reps) this.completeSet();
    return this.snapshot(timestamp);
  }

  tick(timestamp: number) {
    this.lastTimestamp = timestamp;
    if (this.paused) return this.snapshot(timestamp);

    if (this.state === "EXERCISE" && this.exerciseEndsAt !== null && timestamp >= this.exerciseEndsAt) {
      this.completeSet();
    } else if (this.state === "REST" && this.restEndsAt !== null && timestamp >= this.restEndsAt) {
      this.currentSet += 1;
      this.currentRep = 0;
      this.restEndsAt = null;
      this.state = "NEXT_SET";
    }
    return this.snapshot(timestamp);
  }

  advance(timestamp = this.lastTimestamp) {
    this.lastTimestamp = timestamp;
    if (this.paused) return this.snapshot(timestamp);

    if (this.state === "READY") return this.start(timestamp);
    if (this.state === "SET_COMPLETE") {
      const exercise = this.currentExercise();
      if (this.currentSet < exercise.sets) {
        this.state = "REST";
        this.restEndsAt = timestamp + exercise.restSeconds * 1000;
      } else if (this.exerciseIndex < this.routine.exercises.length - 1) {
        this.state = "NEXT_EXERCISE";
      } else {
        this.state = "WORKOUT_COMPLETE";
      }
    } else if (this.state === "NEXT_SET") {
      this.state = "EXERCISE";
      this.startExerciseClock(timestamp);
    } else if (this.state === "NEXT_EXERCISE") {
      this.exerciseIndex += 1;
      this.currentSet = 1;
      this.currentRep = 0;
      this.state = "EXERCISE";
      this.startExerciseClock(timestamp);
    }
    return this.snapshot(timestamp);
  }

  togglePause(timestamp = this.lastTimestamp) {
    this.lastTimestamp = timestamp;
    if (this.state === "READY" || this.state === "WORKOUT_COMPLETE") return this.snapshot(timestamp);
    if (!this.paused) {
      this.paused = true;
      this.pausedAt = timestamp;
    } else {
      const pausedDuration = timestamp - (this.pausedAt ?? timestamp);
      if (this.restEndsAt !== null) this.restEndsAt += pausedDuration;
      if (this.exerciseEndsAt !== null) this.exerciseEndsAt += pausedDuration;
      this.paused = false;
      this.pausedAt = null;
    }
    return this.snapshot(timestamp);
  }

  skip(timestamp = this.lastTimestamp) {
    this.lastTimestamp = timestamp;
    if (this.state === "WORKOUT_COMPLETE") return this.snapshot(timestamp);
    if (this.paused) this.resumeForNavigation(timestamp);

    if (this.state === "READY") return this.start(timestamp);
    if (this.state === "EXERCISE") {
      this.completeSet();
      return this.snapshot(timestamp);
    }
    if (this.state === "REST") {
      this.currentSet += 1;
      this.currentRep = 0;
      this.restEndsAt = null;
      this.state = "NEXT_SET";
      return this.snapshot(timestamp);
    }
    return this.advance(timestamp);
  }

  previous(timestamp = this.lastTimestamp) {
    this.lastTimestamp = timestamp;
    if (this.paused) this.resumeForNavigation(timestamp);
    if (this.currentSet > 1) {
      this.currentSet -= 1;
    } else if (this.exerciseIndex > 0) {
      this.exerciseIndex -= 1;
      this.currentSet = this.currentExercise().sets;
    }
    this.currentRep = 0;
    this.restEndsAt = null;
    this.state = "EXERCISE";
    this.endedEarly = false;
    this.startExerciseClock(timestamp);
    return this.snapshot(timestamp);
  }

  end(timestamp = this.lastTimestamp) {
    this.lastTimestamp = timestamp;
    this.paused = false;
    this.pausedAt = null;
    this.restEndsAt = null;
    this.exerciseEndsAt = null;
    this.endedEarly = this.state !== "WORKOUT_COMPLETE";
    this.state = "WORKOUT_COMPLETE";
    return this.snapshot(timestamp);
  }

  getSnapshot(timestamp = this.lastTimestamp) {
    return this.snapshot(timestamp);
  }

  private currentExercise(): ExerciseItem {
    return this.routine.exercises[this.exerciseIndex];
  }

  private completeSet() {
    this.exerciseEndsAt = null;
    this.state = "SET_COMPLETE";
  }

  private startExerciseClock(timestamp: number) {
    const exercise = this.currentExercise();
    this.exerciseEndsAt = exercise.duration === undefined ? null : timestamp + exercise.duration * 1000;
  }

  private resumeForNavigation(timestamp: number) {
    const pausedDuration = timestamp - (this.pausedAt ?? timestamp);
    if (this.restEndsAt !== null) this.restEndsAt += pausedDuration;
    if (this.exerciseEndsAt !== null) this.exerciseEndsAt += pausedDuration;
    this.paused = false;
    this.pausedAt = null;
  }

  private snapshot(timestamp: number): WorkoutEngineSnapshot {
    const exercise = this.currentExercise();
    const totalSets = this.routine.exercises.reduce((sum, item) => sum + item.sets, 0);
    const priorSets = this.routine.exercises.slice(0, this.exerciseIndex).reduce((sum, item) => sum + item.sets, 0);
    const setComplete = this.state === "SET_COMPLETE" || this.state === "REST" || this.state === "NEXT_EXERCISE" || this.state === "WORKOUT_COMPLETE";
    const completedSets = this.state === "WORKOUT_COMPLETE" && !this.endedEarly
      ? totalSets
      : Math.min(totalSets, priorSets + this.currentSet - 1 + (setComplete ? 1 : 0));
    const clockTimestamp = this.paused ? this.pausedAt ?? timestamp : timestamp;
    return {
      state: this.state,
      paused: this.paused,
      endedEarly: this.endedEarly,
      currentExerciseIndex: this.exerciseIndex,
      currentExercise: exercise,
      nextExercise: this.routine.exercises[this.exerciseIndex + 1] ?? null,
      currentSet: this.currentSet,
      currentRep: this.currentRep,
      targetReps: exercise.reps ?? null,
      exerciseRemainingSeconds: this.exerciseEndsAt === null ? null : Math.max(0, Math.ceil((this.exerciseEndsAt - clockTimestamp) / 1000)),
      restRemainingSeconds: this.restEndsAt === null ? 0 : Math.max(0, Math.ceil((this.restEndsAt - clockTimestamp) / 1000)),
      completedSets,
      totalSets,
    };
  }
}

function validateRoutine(routine: Routine) {
  if (!routine.id || routine.exercises.length === 0) throw new Error("A workout routine requires at least one exercise.");
  for (const exercise of routine.exercises) {
    const target = exercise.reps ?? exercise.duration;
    if (!exercise.exerciseId || exercise.sets < 1 || !target || target < 1 || exercise.restSeconds < 0) {
      throw new Error(`Invalid exercise prescription: ${exercise.exerciseId || "unknown"}`);
    }
  }
}
