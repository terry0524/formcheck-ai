import { describe, expect, it } from "vitest";
import { createLocalRoutineRepository, createRoutineId, estimateRoutineDuration, loadRoutineEntries } from "@/lib/routineStorage";
import { routines } from "@/lib/routines";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("routine repository", () => {
  it("saves a demo routine once and preserves its kind", () => {
    const repository = createLocalRoutineRepository(new MemoryStorage());
    repository.upsert(routines[0], "saved");
    repository.upsert(routines[0], "saved");
    expect(repository.list()).toHaveLength(1);
    expect(repository.list()[0]).toMatchObject({ kind: "saved", routine: { id: routines[0].id } });
    expect(repository.find(routines[0].id)?.title).toBe(routines[0].title);
  });

  it("stores created routines and removes them by id", () => {
    const repository = createLocalRoutineRepository(new MemoryStorage());
    repository.upsert({ ...routines[0], id: "custom-leg-day", title: "My Leg Day" }, "created");
    expect(repository.list()[0].kind).toBe("created");
    repository.remove("custom-leg-day");
    expect(repository.list()).toEqual([]);
  });

  it("fails closed for corrupt storage", () => {
    const storage = new MemoryStorage();
    storage.setItem("formcheck.saved-routines", "not json");
    expect(loadRoutineEntries(storage)).toEqual([]);
  });

  it("creates stable ids and estimates rep/duration routines", () => {
    expect(createRoutineId("My Leg Day", 123)).toBe("custom-my-leg-day-3f");
    expect(estimateRoutineDuration([
      { exerciseId: "squat", sets: 2, reps: 10, restSeconds: 60 },
      { exerciseId: "plank", sets: 1, duration: 30, restSeconds: 30 },
    ])).toBe(3);
  });
});
