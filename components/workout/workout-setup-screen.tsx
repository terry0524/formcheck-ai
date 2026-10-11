"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkoutSetupClient } from "@/components/workout/workout-setup-client";
import { useResolvedRoutine } from "@/hooks/use-resolved-routine";
import { difficultyLabels } from "@/lib/routines";
import type { Routine } from "@/types/routine";

export function WorkoutSetupScreen({ routineId, initialRoutine, qaMode = false }: { routineId: string; initialRoutine: Routine | null; qaMode?: boolean }) {
  const { routine, resolved } = useResolvedRoutine(routineId, initialRoutine);
  if (!resolved) return <main className="grid min-h-screen place-items-center"><p className="text-sm font-black uppercase tracking-[0.16em]">루틴을 불러오는 중</p></main>;
  if (!routine) return <main className="grid min-h-screen place-items-center px-5 text-center"><div><h1 className="text-4xl font-black uppercase">루틴을 찾을 수 없습니다</h1><Button asChild className="mt-6"><Link href="/routines">루틴으로</Link></Button></div></main>;

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <header className="flex h-18 items-center border-b border-[var(--line)] px-5 sm:px-8">
        <Link href={`/routines/${routine.id}`} className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em]"><ArrowLeft className="size-4" /> 뒤로</Link>
        <span className="mx-auto pr-14 text-sm font-black uppercase tracking-[-0.03em]">운동 준비</span>
      </header>
      <div className="page-shell py-8 sm:py-12">
        <div className="mb-8"><p className="eyebrow text-[var(--accent-strong)]">{routine.estimatedDuration}분 · {difficultyLabels[routine.difficulty]}</p><h1 className="mt-2 text-3xl font-black uppercase tracking-[-0.05em] sm:text-5xl">{routine.title}</h1></div>
        <WorkoutSetupClient routineId={routine.id} qaMode={qaMode} />
      </div>
    </main>
  );
}
