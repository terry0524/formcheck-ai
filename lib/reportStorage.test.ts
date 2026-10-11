import { afterEach, describe, expect, it, vi } from "vitest";
import { loadWorkoutReport, loadWorkoutReports, saveWorkoutReport } from "@/lib/reportStorage";
import type { WorkoutReportRecord } from "@/types/report";

const report = (id: string, completedAt: string): WorkoutReportRecord => ({
  version: 1,
  id,
  routineId: "routine",
  routineTitle: "Routine",
  startedAt: "2026-09-14T00:00:00.000Z",
  completedAt,
  durationSeconds: 60,
  endedEarly: false,
  completedSets: 1,
  totalSets: 1,
  completionRate: 100,
  exerciseCount: 1,
  totalReps: 5,
  totalTimedSeconds: 0,
  formScore: 90,
  exercises: [],
  observations: [],
});

afterEach(() => vi.unstubAllGlobals());

describe("workout report storage", () => {
  it("stores, sorts, replaces, and retrieves reports", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      setItem: (key: string, value: string) => values.set(key, value),
      getItem: (key: string) => values.get(key) ?? null,
    });
    expect(saveWorkoutReport(report("old", "2026-09-14T00:01:00.000Z"))).toBe(true);
    expect(saveWorkoutReport(report("new", "2026-09-14T00:02:00.000Z"))).toBe(true);
    expect(saveWorkoutReport({ ...report("old", "2026-09-14T00:03:00.000Z"), formScore: 88 })).toBe(true);
    expect(loadWorkoutReports().map((item) => item.id)).toEqual(["old", "new"]);
    expect(loadWorkoutReport("old")?.formScore).toBe(88);
  });

  it("fails closed for corrupt or invalid data", () => {
    vi.stubGlobal("localStorage", { setItem: vi.fn(), getItem: () => JSON.stringify([{ id: "not-a-report" }]) });
    expect(loadWorkoutReports()).toEqual([]);
  });

  it("rejects reports with invalid nested exercise data", () => {
    vi.stubGlobal("localStorage", { setItem: vi.fn(), getItem: () => JSON.stringify([{ ...report("broken", "2026-09-14T00:01:00.000Z"), exercises: [{ exerciseId: "squat" }] }]) });
    expect(loadWorkoutReports()).toEqual([]);
  });
});
