"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bookmark, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createLocalRoutineRepository } from "@/lib/routineStorage";
import { difficultyLabels, routineCategoryLabels, routineCategories, squatTwoSetTestRoutine } from "@/lib/routines";
import type { DemoRoutine, RoutineCategory, SavedRoutineEntry } from "@/types/routine";

type Filter = "All" | RoutineCategory;

export function RoutineLibrary({ demoRoutines }: { demoRoutines: DemoRoutine[] }) {
  const [entries, setEntries] = useState<SavedRoutineEntry[]>([]);
  const [filter, setFilter] = useState<Filter>("Featured");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setEntries(createLocalRoutineRepository().list());
    });
    return () => { cancelled = true; };
  }, []);

  const savedIds = useMemo(() => new Set(entries.map((entry) => entry.routine.id)), [entries]);
  const filtered = filter === "All" ? demoRoutines : demoRoutines.filter((routine) => routine.categories.includes(filter));

  function save(routine: DemoRoutine) {
    setEntries(createLocalRoutineRepository().upsert(routine, "saved"));
  }

  return (
    <>
      <section className="border-b-2 border-[var(--ink)] pb-10">
        <div className="flex items-end justify-between gap-4">
          <div><p className="eyebrow text-[var(--muted)]">내 운동 목록</p><h1 className="mt-3 text-5xl font-black uppercase tracking-[-0.065em] sm:text-8xl">내 루틴</h1></div>
          <Button asChild variant="accent" size="sm"><Link href="/routines/create"><Plus className="size-4" /> 만들기</Link></Button>
        </div>
        {entries.length === 0 ? (
          <div className="mt-8 flex min-h-32 flex-col items-start justify-center border-t border-[var(--line)]"><p className="text-xl font-black">저장한 루틴이 없습니다.</p><p className="mt-1 text-sm font-bold text-[var(--muted)]">직접 만들거나 아래 예시 루틴을 저장하세요.</p></div>
        ) : (
          <div className="mt-7 grid gap-x-7 md:grid-cols-2">{entries.map((entry) => <MyRoutineRow key={entry.routine.id} entry={entry} />)}</div>
        )}
      </section>

      <section className="grid gap-5 border-b-2 border-[var(--ink)] py-8 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="eyebrow text-[var(--accent-strong)]">대회 시연</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.05em]">{squatTwoSetTestRoutine.title}</h2>
          <p className="mt-2 text-sm font-bold text-[var(--muted)]">스쿼트 5회 × 2세트 · 휴식 5초</p>
        </div>
        <Button asChild variant="outline" size="lg"><Link href={`/routines/${squatTwoSetTestRoutine.id}`}>시연 루틴 열기 <ArrowUpRight /></Link></Button>
      </section>

      <section className="py-12 sm:py-16">
        <div className="flex flex-col gap-6 border-b-2 border-[var(--ink)] pb-7 md:flex-row md:items-end md:justify-between">
          <div><p className="eyebrow text-[var(--muted)]">예시 루틴</p><h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.06em] sm:text-6xl">둘러보기</h2></div>
          <p className="max-w-md text-sm font-bold leading-relaxed text-[var(--muted)]">기본 예시 루틴 10개입니다. 저장한 루틴은 이 기기에서만 사용할 수 있습니다.</p>
        </div>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 py-5 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Routine categories">
          {(["All", ...routineCategories] as Filter[]).map((category) => <Button key={category} type="button" variant={filter === category ? "default" : "outline"} size="sm" onClick={() => setFilter(category)} aria-pressed={filter === category}>{category === "All" ? "전체" : routineCategoryLabels[category]}</Button>)}
        </div>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{filtered.length}개 루틴</p>
        <div className="border-t border-[var(--line)]">{filtered.map((routine, index) => <DemoRoutineRow key={routine.id} routine={routine} index={index} saved={savedIds.has(routine.id)} onSave={() => save(routine)} />)}</div>
      </section>
    </>
  );
}

function MyRoutineRow({ entry }: { entry: SavedRoutineEntry }) {
  const routine = entry.routine;
  return (
    <Link href={`/routines/${routine.id}`} className="group flex min-h-28 items-center justify-between gap-4 border-t border-[var(--line)] py-5 last:border-b">
      <span><span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">{entry.kind === "created" ? "직접 만든 루틴" : "저장됨"}</span><span className="mt-1 block text-xl font-black tracking-[-0.04em]">{routine.title}</span><span className="mt-1 block text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">{routine.estimatedDuration}분 · {difficultyLabels[routine.difficulty]}</span></span>
      <ArrowUpRight className="size-5 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
    </Link>
  );
}

function DemoRoutineRow({ routine, index, saved, onSave }: { routine: DemoRoutine; index: number; saved: boolean; onSave: () => void }) {
  return (
    <article className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-[var(--line)] py-6 sm:grid-cols-[4rem_1fr_auto] sm:items-center">
      <span className="font-mono text-sm font-bold text-[var(--muted)]">{String(index + 1).padStart(2, "0")}</span>
      <Link href={`/routines/${routine.id}`} className="group min-w-0">
        <h3 className="text-xl font-black tracking-[-0.04em] group-hover:underline sm:text-2xl">{routine.title}</h3>
        <p className="mt-1 truncate text-xs font-bold text-[var(--muted)]">{routine.estimatedDuration}분 · {difficultyLabels[routine.difficulty]}</p>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--muted)]">예시 루틴 · {routine.categories.filter((category) => category !== "Featured").slice(0, 2).map((category) => routineCategoryLabels[category]).join(" / ")}</p>
      </Link>
      <Button type="button" variant={saved ? "ghost" : "outline"} size="sm" className="col-start-2 w-full sm:col-auto sm:w-28" onClick={onSave} disabled={saved}>{saved ? <Check className="size-4" /> : <Bookmark className="size-4" />}{saved ? "저장됨" : "저장"}</Button>
    </article>
  );
}
