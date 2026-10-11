"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bookmark, Check, Clock, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { useResolvedRoutine } from "@/hooks/use-resolved-routine";
import { getExerciseName } from "@/lib/exercises";
import { createLocalRoutineRepository } from "@/lib/routineStorage";
import type { DemoRoutine, Routine } from "@/types/routine";

export function RoutineDetailClient({ routineId, initialRoutine }: { routineId: string; initialRoutine: Routine | null }) {
  const { routine, resolved } = useResolvedRoutine(routineId, initialRoutine);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setSaved(Boolean(createLocalRoutineRepository().find(routineId)));
    });
    return () => { cancelled = true; };
  }, [routineId]);

  if (!resolved) return <LoadingScreen />;
  if (!routine) return <MissingRoutine />;

  const demo = isDemoRoutine(routine) ? routine : null;
  function save() {
    if (!routine) return;
    createLocalRoutineRepository().upsert(routine, demo ? "saved" : "created");
    setSaved(true);
  }

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="page-shell py-8 sm:py-14">
        <Link href="/routines" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em]"><ArrowLeft className="size-4" /> 전체 루틴</Link>
        <header className="mt-10 grid gap-8 border-b-2 border-[var(--ink)] pb-10 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div><p className="eyebrow text-[var(--accent-strong)]">{routine.focus ?? "직접 만든 루틴"}</p><h1 className="mt-4 max-w-4xl text-5xl font-black uppercase tracking-[-0.07em] sm:text-8xl">{routine.title}</h1></div>
          <div>
            <p className="text-base font-bold leading-relaxed text-[var(--muted)]">{routine.description}</p>
            {demo && <p className="mt-4 text-xs font-black uppercase tracking-[0.1em]">예시 루틴 · 이 기기에 저장</p>}
            <div className="mt-6 flex gap-6 text-xs font-black uppercase tracking-[0.08em]"><span className="flex gap-2"><Clock className="size-4" />{routine.estimatedDuration}분</span><span className="flex gap-2"><Layers3 className="size-4" />{routine.exercises.length}종 운동</span></div>
          </div>
        </header>

        <section className="py-10">
          <p className="section-label">운동 순서</p>
          {routine.exercises.map((exercise, index) => (
            <div key={`${exercise.exerciseId}-${index}`} className="grid grid-cols-[3.5rem_1fr] gap-3 border-t border-[var(--line)] py-6 last:border-b sm:grid-cols-[6rem_1fr_auto] sm:items-center">
              <span className="font-mono text-2xl font-bold text-[var(--muted)]">{String(index + 1).padStart(2, "0")}</span>
              <div><h2 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl">{getExerciseName(exercise.exerciseId)}</h2><p className="mt-1 text-sm font-bold text-[var(--muted)]">휴식 {exercise.restSeconds}초</p></div>
              <p className="col-start-2 mt-2 text-lg font-black sm:col-auto sm:mt-0">{exercise.reps ?? exercise.duration} {exercise.reps === undefined ? "초" : "회"} × {exercise.sets}</p>
            </div>
          ))}
        </section>

        <div className="sticky bottom-0 grid gap-2 border-t border-[var(--ink)] bg-[var(--paper)] py-4 sm:grid-cols-[minmax(16rem,1fr)_auto]">
          <Button asChild variant="accent" size="lg"><Link href={`/workout/setup?routine=${routine.id}`}>루틴 시작 <ArrowRight /></Link></Button>
          {demo && <Button type="button" variant="outline" size="lg" onClick={save} disabled={saved}>{saved ? <Check /> : <Bookmark />}{saved ? "저장됨" : "루틴 저장"}</Button>}
        </div>
      </div>
    </main>
  );
}

function isDemoRoutine(routine: Routine): routine is DemoRoutine {
  return "origin" in routine && routine.origin === "demo";
}

function LoadingScreen() {
  return <main className="grid min-h-screen place-items-center"><p className="text-sm font-black uppercase tracking-[0.16em]">루틴을 불러오는 중</p></main>;
}

function MissingRoutine() {
  return <main className="grid min-h-screen place-items-center px-5 text-center"><div><p className="eyebrow text-[var(--muted)]">루틴을 찾을 수 없습니다</p><h1 className="mt-3 text-5xl font-black uppercase tracking-[-0.06em]">찾을 수 없습니다</h1><Button asChild className="mt-7"><Link href="/routines">루틴으로</Link></Button></div></main>;
}
