import type { ExerciseItem } from "@/types/exercise";
import type { Routine, SavedRoutineEntry, SavedRoutineKind } from "@/types/routine";

const STORAGE_KEY = "formcheck.saved-routines";
const SCHEMA_VERSION = 1;

interface StoredRoutineLibrary {
  version: typeof SCHEMA_VERSION;
  items: SavedRoutineEntry[];
}

export interface RoutineRepository {
  list(): SavedRoutineEntry[];
  find(id: string): Routine | null;
  upsert(routine: Routine, kind: SavedRoutineKind): SavedRoutineEntry[];
  remove(id: string): SavedRoutineEntry[];
}

export function createLocalRoutineRepository(storage = getBrowserStorage()): RoutineRepository {
  return {
    list: () => loadRoutineEntries(storage),
    find: (id) => loadRoutineEntries(storage).find((entry) => entry.routine.id === id)?.routine ?? null,
    upsert: (routine, kind) => saveRoutine(routine, kind, storage),
    remove: (id) => removeRoutine(id, storage),
  };
}

export function loadRoutineEntries(storage = getBrowserStorage()): SavedRoutineEntry[] {
  if (!storage) return [];
  const value = storage.getItem(STORAGE_KEY);
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(isRoutine).map((routine) => ({ kind: "saved" as const, savedAt: new Date(0).toISOString(), routine }));
    }
    if (!isRecord(parsed) || parsed.version !== SCHEMA_VERSION || !Array.isArray(parsed.items)) return [];
    return parsed.items.filter(isSavedRoutineEntry);
  } catch {
    return [];
  }
}

export function loadRoutines(storage = getBrowserStorage()): Routine[] {
  return loadRoutineEntries(storage).map((entry) => entry.routine);
}

export function saveRoutine(routine: Routine, kind: SavedRoutineKind, storage = getBrowserStorage()): SavedRoutineEntry[] {
  if (!storage || !isRoutine(routine)) return [];
  const current = loadRoutineEntries(storage).filter((entry) => entry.routine.id !== routine.id);
  const next = [{ routine, kind, savedAt: new Date().toISOString() }, ...current];
  persist(next, storage);
  return next;
}

export function saveRoutines(routines: Routine[], storage = getBrowserStorage()) {
  if (!storage) return;
  const now = new Date().toISOString();
  persist(routines.filter(isRoutine).map((routine) => ({ routine, kind: "saved", savedAt: now })), storage);
}

export function removeRoutine(id: string, storage = getBrowserStorage()): SavedRoutineEntry[] {
  if (!storage) return [];
  const next = loadRoutineEntries(storage).filter((entry) => entry.routine.id !== id);
  persist(next, storage);
  return next;
}

export function createRoutineId(title: string, timestamp = Date.now()) {
  const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "routine";
  return `custom-${slug}-${timestamp.toString(36)}`;
}

export function estimateRoutineDuration(exercises: ExerciseItem[]) {
  const totalSeconds = exercises.reduce((total, exercise) => {
    const activeSeconds = exercise.duration ?? exercise.reps * 4;
    return total + activeSeconds * exercise.sets + exercise.restSeconds * Math.max(0, exercise.sets - 1);
  }, 0);
  return Math.max(1, Math.ceil(totalSeconds / 60));
}

function persist(items: SavedRoutineEntry[], storage: Storage) {
  const value: StoredRoutineLibrary = { version: SCHEMA_VERSION, items };
  storage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function getBrowserStorage() {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function isSavedRoutineEntry(value: unknown): value is SavedRoutineEntry {
  return isRecord(value)
    && (value.kind === "created" || value.kind === "saved")
    && typeof value.savedAt === "string"
    && isRoutine(value.routine);
}

function isRoutine(value: unknown): value is Routine {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.title === "string"
    && typeof value.description === "string"
    && (value.difficulty === "Beginner" || value.difficulty === "Intermediate" || value.difficulty === "Advanced")
    && typeof value.estimatedDuration === "number"
    && Array.isArray(value.exercises)
    && value.exercises.length > 0
    && value.exercises.every(isExerciseItem);
}

function isExerciseItem(value: unknown) {
  if (!isRecord(value) || typeof value.exerciseId !== "string" || !isPositiveInteger(value.sets) || !isNonNegativeInteger(value.restSeconds)) return false;
  const hasReps = isPositiveInteger(value.reps) && value.duration === undefined;
  const hasDuration = isPositiveInteger(value.duration) && value.reps === undefined;
  return hasReps || hasDuration;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
