"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exerciseCatalog } from "@/lib/exercises";
import { createLocalRoutineRepository, createRoutineId, estimateRoutineDuration } from "@/lib/routineStorage";
import type { ExerciseItem } from "@/types/exercise";
import type { Difficulty, Routine } from "@/types/routine";

type TargetType = "reps" | "duration";

interface ExerciseDraft {
  key: number;
  exerciseId: string;
  sets: number;
  targetType: TargetType;
  target: number;
  restSeconds: number;
}

const fieldClass = "min-h-12 w-full border border-[var(--ink)] bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--accent)]";
const initialExercise: ExerciseDraft = { key: 1, exerciseId: "squat", sets: 3, targetType: "reps", target: 10, restSeconds: 60 };

export function RoutineBuilder() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Beginner");
  const [exercises, setExercises] = useState<ExerciseDraft[]>([initialExercise]);
  const [error, setError] = useState("");
  const estimatedDuration = useMemo(() => estimateRoutineDuration(toExerciseItems(exercises)), [exercises]);

  function updateExercise(key: number, patch: Partial<ExerciseDraft>) {
    setExercises((current) => current.map((exercise) => exercise.key === key ? { ...exercise, ...patch } : exercise));
  }

  function addExercise() {
    setExercises((current) => [...current, { ...initialExercise, key: Math.max(...current.map((item) => item.key), 0) + 1 }]);
  }

  function moveExercise(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= exercises.length) return;
    setExercises((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  function save() {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    if (!cleanTitle || !cleanDescription) {
      setError("제목과 설명을 입력하세요.");
      return;
    }
    if (exercises.length === 0) {
      setError("운동을 하나 이상 추가하세요.");
      return;
    }

    const routine: Routine = {
      id: createRoutineId(cleanTitle),
      title: cleanTitle,
      description: cleanDescription,
      difficulty,
      estimatedDuration,
      focus: "직접 만든 루틴",
      exercises: toExerciseItems(exercises),
    };
    createLocalRoutineRepository().upsert(routine, "created");
    router.push(`/routines/${routine.id}`);
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,.75fr)_minmax(28rem,1.25fr)]">
      <section>
        <p className="section-label">루틴 정보</p>
        <div className="space-y-5">
          <Field label="제목"><input value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} maxLength={60} placeholder="퇴근 후 하체 운동" /></Field>
          <Field label="설명"><textarea value={description} onChange={(event) => setDescription(event.target.value)} className={`${fieldClass} min-h-28 resize-y py-3`} maxLength={180} placeholder="하체 운동으로 구성한 루틴입니다." /></Field>
          <Field label="난이도">
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)} className={fieldClass}>
              <option value="Beginner">초급</option><option value="Intermediate">중급</option><option value="Advanced">고급</option>
            </select>
          </Field>
          <div className="flex justify-between border-y border-[var(--line)] py-4 text-xs font-black uppercase tracking-[0.12em]"><span>예상 시간</span><span>{estimatedDuration}분</span></div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4"><p className="section-label mb-0">운동 · {exercises.length}</p><Button type="button" variant="outline" size="sm" onClick={addExercise}><Plus className="size-4" /> 운동 추가</Button></div>
        <div className="mt-4 border-t-2 border-[var(--ink)]">
          {exercises.map((exercise, index) => (
            <article key={exercise.key} className="border-b border-[var(--line)] py-6">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-bold text-[var(--muted)]">{String(index + 1).padStart(2, "0")}</span>
                <div className="flex">
                  <OrderButton label="위로" disabled={index === 0} onClick={() => moveExercise(index, -1)}><ArrowUp /></OrderButton>
                  <OrderButton label="아래로" disabled={index === exercises.length - 1} onClick={() => moveExercise(index, 1)}><ArrowDown /></OrderButton>
                  <OrderButton label="운동 삭제" disabled={exercises.length === 1} onClick={() => setExercises((current) => current.filter((item) => item.key !== exercise.key))}><Trash2 /></OrderButton>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="운동"><select value={exercise.exerciseId} onChange={(event) => updateExercise(exercise.key, { exerciseId: event.target.value })} className={fieldClass}>{Object.values(exerciseCatalog).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                <Field label="세트"><NumberField value={exercise.sets} min={1} max={10} onChange={(sets) => updateExercise(exercise.key, { sets })} /></Field>
                <Field label="목표"><div className="grid grid-cols-[7rem_1fr]"><select value={exercise.targetType} onChange={(event) => updateExercise(exercise.key, { targetType: event.target.value as TargetType })} className={`${fieldClass} border-r-0 px-2`}><option value="reps">횟수</option><option value="duration">초</option></select><NumberField value={exercise.target} min={1} max={300} onChange={(target) => updateExercise(exercise.key, { target })} /></div></Field>
                <Field label="휴식 · 초"><NumberField value={exercise.restSeconds} min={0} max={300} onChange={(restSeconds) => updateExercise(exercise.key, { restSeconds })} /></Field>
              </div>
            </article>
          ))}
        </div>
        {error && <p className="mt-4 border-l-4 border-red-600 pl-3 text-sm font-bold text-red-700" role="alert">{error}</p>}
        <Button type="button" variant="accent" size="lg" className="mt-7 w-full" onClick={save}>루틴 저장</Button>
      </section>
    </div>
  );
}

function toExerciseItems(exercises: ExerciseDraft[]): ExerciseItem[] {
  return exercises.map((exercise) => exercise.targetType === "reps"
    ? { exerciseId: exercise.exerciseId, sets: exercise.sets, reps: exercise.target, restSeconds: exercise.restSeconds }
    : { exerciseId: exercise.exerciseId, sets: exercise.sets, duration: exercise.target, restSeconds: exercise.restSeconds });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</span>{children}</label>;
}

function NumberField({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <input type="number" inputMode="numeric" value={value} min={min} max={max} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value) || min)))} className={fieldClass} />;
}

function OrderButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onClick} aria-label={label} title={label} className="min-h-10 w-10 border-l border-[var(--line)] px-0 [&_svg]:size-4">{children}</Button>;
}
