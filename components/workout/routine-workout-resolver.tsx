"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RoutineWorkout } from "@/components/workout/squat-workout";
import { useResolvedRoutine } from "@/hooks/use-resolved-routine";
import type { Routine } from "@/types/routine";
import type { FeedbackMode, VoiceFrequency } from "@/types/workout";

export function RoutineWorkoutResolver({ routineId, initialRoutine, feedbackMode, voiceFrequency, qaMode = false }: { routineId: string; initialRoutine: Routine | null; feedbackMode: FeedbackMode; voiceFrequency: VoiceFrequency; qaMode?: boolean }) {
  const { routine, resolved } = useResolvedRoutine(routineId, initialRoutine);
  if (!resolved) return <main className="grid min-h-screen place-items-center bg-[var(--ink)] text-white"><p className="text-sm font-black uppercase tracking-[0.16em]">운동을 준비하는 중</p></main>;
  if (!routine) return <main className="grid min-h-screen place-items-center bg-[var(--ink)] px-5 text-center text-white"><div><h1 className="text-4xl font-black uppercase">루틴을 찾을 수 없습니다</h1><Button asChild variant="accent" className="mt-6"><Link href="/routines">루틴으로</Link></Button></div></main>;
  return <RoutineWorkout routine={routine} feedbackMode={feedbackMode} voiceFrequency={voiceFrequency} qaMode={qaMode} />;
}
