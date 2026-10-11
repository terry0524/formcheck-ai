"use client";

import { useEffect, useState } from "react";
import { createLocalRoutineRepository } from "@/lib/routineStorage";
import type { Routine } from "@/types/routine";

export function useResolvedRoutine(routineId: string, initialRoutine: Routine | null) {
  const [routine, setRoutine] = useState<Routine | null>(initialRoutine);
  const [resolved, setResolved] = useState(initialRoutine !== null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!initialRoutine) setRoutine(createLocalRoutineRepository().find(routineId));
      setResolved(true);
    });
    return () => { cancelled = true; };
  }, [initialRoutine, routineId]);

  return { routine, resolved };
}
