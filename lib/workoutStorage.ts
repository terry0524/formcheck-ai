import type { SquatWorkoutRecord } from "@/types/workout";

const SQUAT_SESSION_KEY = "formcheck.latest-squat-session";

export function saveSquatWorkout(record: SquatWorkoutRecord) {
  try {
    localStorage.setItem(SQUAT_SESSION_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function loadLatestSquatWorkout(): SquatWorkoutRecord | null {
  try {
    const value = localStorage.getItem(SQUAT_SESSION_KEY);
    return value ? JSON.parse(value) as SquatWorkoutRecord : null;
  } catch {
    return null;
  }
}
