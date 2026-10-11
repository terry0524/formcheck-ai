import type { WorkoutReportRecord } from "@/types/report";

const REPORTS_KEY = "formcheck.workout-reports.v1";
const MAX_REPORTS = 20;

export function saveWorkoutReport(report: WorkoutReportRecord) {
  try {
    const reports = loadWorkoutReports().filter((item) => item.id !== report.id);
    localStorage.setItem(REPORTS_KEY, JSON.stringify([report, ...reports].slice(0, MAX_REPORTS)));
    return true;
  } catch {
    return false;
  }
}

export function loadWorkoutReport(id: string) {
  return loadWorkoutReports().find((report) => report.id === id) ?? null;
}

export function loadWorkoutReports(limit = MAX_REPORTS): WorkoutReportRecord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(REPORTS_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isWorkoutReport).sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt)).slice(0, Math.max(0, limit));
  } catch {
    return [];
  }
}

function isWorkoutReport(value: unknown): value is WorkoutReportRecord {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<WorkoutReportRecord>;
  return report.version === 1
    && typeof report.id === "string"
    && typeof report.routineId === "string"
    && typeof report.routineTitle === "string"
    && typeof report.startedAt === "string"
    && typeof report.completedAt === "string"
    && isNumber(report.durationSeconds)
    && typeof report.endedEarly === "boolean"
    && isNumber(report.completedSets)
    && isNumber(report.totalSets)
    && isNumber(report.completionRate)
    && isNumber(report.exerciseCount)
    && isNumber(report.totalReps)
    && isNumber(report.totalTimedSeconds)
    && isNullableNumber(report.formScore)
    && Array.isArray(report.exercises) && report.exercises.every((exercise) => {
      if (!exercise || typeof exercise !== "object") return false;
      const item = exercise as WorkoutReportRecord["exercises"][number];
      return typeof item.exerciseId === "string" && typeof item.name === "string"
        && isNumber(item.prescribedSets) && isNumber(item.completedSets) && isNumber(item.reps)
        && isNumber(item.durationSeconds) && isNullableNumber(item.formScore)
        && Array.isArray(item.sets) && item.sets.every((set) => set && typeof set === "object"
          && isNumber(set.set) && typeof set.completed === "boolean" && isNumber(set.reps)
          && isNumber(set.durationSeconds) && isNullableNumber(set.formScore) && isNumber(set.sampleCount)
          && Array.isArray(set.issues) && set.issues.every((issue) => issue && typeof issue.code === "string" && typeof issue.message === "string" && isNumber(issue.count)));
    })
    && Array.isArray(report.observations) && report.observations.every((observation) => observation && typeof observation.exerciseId === "string" && typeof observation.message === "string" && typeof observation.evidence === "string");
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isNumber(value);
}
