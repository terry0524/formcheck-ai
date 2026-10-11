import { describe, expect, it } from "vitest";
import { WorkoutEngine } from "@/lib/workoutEngine";
import { squatTwoSetTestRoutine } from "@/lib/routines";
import type { Routine } from "@/types/routine";

describe("WorkoutEngine", () => {
  it("runs Squat 5 reps × 2 sets through the complete automatic flow", () => {
    const engine = new WorkoutEngine(squatTwoSetTestRoutine);
    expect(engine.getSnapshot()).toMatchObject({ state: "READY", currentSet: 1, currentRep: 0 });
    expect(engine.start(0).state).toBe("EXERCISE");

    for (let rep = 1; rep <= 4; rep += 1) {
      expect(engine.recordRep(rep * 1000)).toMatchObject({ state: "EXERCISE", currentSet: 1, currentRep: rep });
    }
    expect(engine.recordRep(5000)).toMatchObject({ state: "SET_COMPLETE", currentSet: 1, currentRep: 5 });
    expect(engine.advance(6000)).toMatchObject({ state: "REST", restRemainingSeconds: 5 });
    expect(engine.tick(10999)).toMatchObject({ state: "REST", restRemainingSeconds: 1 });
    expect(engine.tick(11000)).toMatchObject({ state: "NEXT_SET", currentSet: 2, currentRep: 0 });
    expect(engine.advance(14000)).toMatchObject({ state: "EXERCISE", currentSet: 2, currentRep: 0 });

    for (let rep = 1; rep <= 5; rep += 1) engine.recordRep(14000 + rep * 1000);
    expect(engine.getSnapshot()).toMatchObject({ state: "SET_COMPLETE", currentSet: 2, currentRep: 5 });
    expect(engine.advance(20000)).toMatchObject({
      state: "WORKOUT_COMPLETE",
      endedEarly: false,
      completedSets: 2,
      totalSets: 2,
    });
  });

  it("freezes and resumes a rest deadline without drift", () => {
    const engine = new WorkoutEngine(squatTwoSetTestRoutine);
    engine.start(0);
    for (let rep = 0; rep < 5; rep += 1) engine.recordRep(1000 + rep);
    engine.advance(2000);
    expect(engine.togglePause(4000)).toMatchObject({ paused: true, restRemainingSeconds: 3 });
    expect(engine.tick(20000)).toMatchObject({ state: "REST", restRemainingSeconds: 3 });
    expect(engine.togglePause(20000)).toMatchObject({ paused: false, restRemainingSeconds: 3 });
    expect(engine.tick(22999).state).toBe("REST");
    expect(engine.tick(23000).state).toBe("NEXT_SET");
  });

  it("supports duration exercises and next-exercise transitions", () => {
    const routine: Routine = {
      id: "timed",
      title: "Timed",
      description: "Timed engine test",
      difficulty: "Beginner",
      estimatedDuration: 1,
      exercises: [
        { exerciseId: "plank", sets: 1, duration: 3, restSeconds: 0 },
        { exerciseId: "squat", sets: 1, reps: 1, restSeconds: 0 },
      ],
    };
    const engine = new WorkoutEngine(routine);
    expect(engine.start(0).exerciseRemainingSeconds).toBe(3);
    expect(engine.tick(3000).state).toBe("SET_COMPLETE");
    expect(engine.advance(3000).state).toBe("NEXT_EXERCISE");
    expect(engine.advance(6000)).toMatchObject({ state: "EXERCISE", currentExerciseIndex: 1, currentRep: 0 });
    expect(engine.recordRep(7000).state).toBe("SET_COMPLETE");
    expect(engine.advance(7000)).toMatchObject({ state: "WORKOUT_COMPLETE", endedEarly: false });
  });

  it("offers skip, previous, pause, and early end controls", () => {
    const engine = new WorkoutEngine(squatTwoSetTestRoutine);
    engine.start(0);
    expect(engine.togglePause(100).paused).toBe(true);
    expect(engine.recordRep(200).currentRep).toBe(0);
    expect(engine.skip(300).state).toBe("SET_COMPLETE");
    expect(engine.advance(300).state).toBe("REST");
    expect(engine.skip(400).state).toBe("NEXT_SET");
    expect(engine.advance(400).currentSet).toBe(2);
    expect(engine.previous(500)).toMatchObject({ state: "EXERCISE", currentSet: 1, currentRep: 0 });
    expect(engine.end(600)).toMatchObject({ state: "WORKOUT_COMPLETE", endedEarly: true });
  });
});
