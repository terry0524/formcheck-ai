"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Clock3 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { loadWorkoutReport, loadWorkoutReports } from "@/lib/reportStorage";
import { getExerciseName } from "@/lib/exercises";
import { SQUAT_SCORE_WEIGHTS } from "@/lib/exercises/squatConfig";
import type { WorkoutExerciseResult, WorkoutReportRecord } from "@/types/report";

export function WorkoutReportScreen({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<WorkoutReportRecord | null>();
  const [recent, setRecent] = useState<WorkoutReportRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setReport(loadWorkoutReport(reportId));
      setRecent(loadWorkoutReports(5));
    });
    return () => { cancelled = true; };
  }, [reportId]);

  if (report === undefined) {
    return <main className="grid min-h-screen place-items-center bg-[var(--paper)]"><p className="eyebrow text-[var(--muted)]">결과를 불러오는 중</p></main>;
  }
  if (!report) {
    return <main className="grid min-h-screen place-items-center bg-[var(--paper)] px-5 text-center"><div><p className="eyebrow text-[var(--muted)]">결과를 찾을 수 없습니다</p><h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.06em]">저장된 운동 기록이 없습니다</h1><p className="mx-auto mt-4 max-w-md font-bold text-[var(--muted)]">이 기기에 해당 운동 기록이 없습니다.</p><Button asChild className="mt-7"><Link href="/home">홈으로</Link></Button></div></main>;
  }
  const includesSquat = report.exercises.some((exercise) => exercise.exerciseId === "squat");

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <SiteHeader />
      <section className="bg-[var(--ink)] text-white">
        <div className="page-shell py-10 sm:py-16">
          <p className="eyebrow text-[var(--accent)]">{report.endedEarly ? "운동 종료" : "운동 완료"}</p>
          <h1 className="mt-4 max-w-4xl text-[clamp(3.5rem,12vw,8.5rem)] font-black uppercase leading-[1.2] tracking-[-0.075em]">{report.routineTitle}</h1>
          <div className="mt-10 grid grid-cols-3 border-y border-white/25">
            <SummaryMetric value={formatDuration(report.durationSeconds)} label="운동 시간" />
            <SummaryMetric value={String(report.exerciseCount)} label="운동 종류" />
            <SummaryMetric value={String(report.totalReps)} label="완료 횟수" />
          </div>
          <div className="mt-12 flex items-end justify-between gap-5 border-b border-white/25 pb-7">
            <div><p className="eyebrow text-white/50">자세 점수</p><p className="mt-2 text-[clamp(5rem,26vw,13rem)] font-black leading-[0.78] tracking-[-0.09em]">{report.formScore ?? "—"}</p></div>
            <p className="max-w-48 pb-1 text-right text-xs font-bold uppercase tracking-[0.12em] text-white/50">{report.formScore === null ? "자세 측정 데이터 부족" : "측정된 운동 점수의 평균"}</p>
          </div>
        </div>
      </section>

      <div className="page-shell py-12 sm:py-16">
        <SectionHeading index="01" title="운동별 결과" />
        <div className="mt-5 border-t-2 border-[var(--ink)]">
          {report.exercises.length === 0 ? <EmptyMeasuredData /> : report.exercises.map((exercise) => <ExerciseRow key={exercise.exerciseId} exercise={exercise} />)}
        </div>

        {includesSquat && (
          <section className="mt-8 border-y border-[var(--line)] py-5" aria-label="Squat score formula">
            <p className="eyebrow text-[var(--muted)]">스쿼트 점수 계산</p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center sm:max-w-xl">
              <ScoreWeight label="깊이" value={SQUAT_SCORE_WEIGHTS.depth} />
              <ScoreWeight label="상체" value={SQUAT_SCORE_WEIGHTS.trunk} />
              <ScoreWeight label="정렬" value={SQUAT_SCORE_WEIGHTS.alignment} />
            </div>
            <p className="mt-4 max-w-2xl text-xs font-bold leading-relaxed text-[var(--muted)]">측정 가능한 항목만 계산합니다. 카메라 각도로 무릎 정렬을 평가할 수 없으면 정렬 항목의 25% 가중치는 계산에서 제외합니다.</p>
          </section>
        )}

        <section className="mt-16">
          <SectionHeading index="02" title="세트별 결과" />
          {report.exercises.length === 0 ? <EmptyMeasuredData /> : <div className="mt-5 space-y-10">{report.exercises.map((exercise) => <SetAnalysis key={exercise.exerciseId} exercise={exercise} />)}</div>}
        </section>

        {report.observations.length > 0 && (
          <section className="mt-16 border-l-4 border-[var(--accent-strong)] bg-[var(--ink)] p-6 text-white sm:p-8">
            <p className="eyebrow text-[var(--accent)]">측정 기반 변화</p>
            <div className="mt-5 space-y-6">{report.observations.map((observation) => <div key={`${observation.exerciseId}-${observation.message}`}><p className="text-xl font-black sm:text-3xl">{observation.message}</p><p className="mt-2 text-sm font-bold text-white/50">근거 · {observation.evidence}</p></div>)}</div>
          </section>
        )}

        <section className="mt-16">
          <SectionHeading index="03" title="최근 변화" />
          <p className="mt-3 max-w-xl text-sm font-bold text-[var(--muted)]">이 기기의 최근 운동 5회입니다. 자세가 측정된 경우에만 점수가 표시됩니다.</p>
          <div className="mt-5 border-t-2 border-[var(--ink)]">{recent.map((item) => <ProgressRow key={item.id} report={item} current={item.id === report.id} />)}</div>
        </section>

        <div className="mt-16 grid gap-3 border-t border-[var(--line)] pt-7 sm:grid-cols-2">
          <Button asChild size="lg"><Link href={`/workout/setup?routine=${encodeURIComponent(report.routineId)}`}>같은 루틴 다시 하기 <ArrowRight /></Link></Button>
          <Button asChild variant="outline" size="lg"><Link href="/home">홈으로</Link></Button>
        </div>
      </div>
    </main>
  );
}

function SummaryMetric({ value, label }: { value: string; label: string }) {
  return <div className="border-r border-white/25 py-5 text-center last:border-r-0 sm:py-7"><p className="text-xl font-black tracking-[-0.04em] sm:text-4xl">{value}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[0.15em] text-white/45 sm:text-xs">{label}</p></div>;
}

function ScoreWeight({ value, label }: { value: number; label: string }) {
  return <div className="border-l-2 border-[var(--ink)] px-3 text-left"><p className="text-2xl font-black">{value}%</p><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p></div>;
}

function SectionHeading({ index, title }: { index: string; title: string }) {
  return <div className="flex items-end gap-4"><span className="eyebrow text-[var(--muted)]">{index}</span><h2 className="text-3xl font-black uppercase tracking-[-0.055em] sm:text-5xl">{title}</h2></div>;
}

function ExerciseRow({ exercise }: { exercise: WorkoutExerciseResult }) {
  const amount = exercise.reps > 0 ? `${exercise.reps}회` : `${exercise.durationSeconds}초`;
  return <div className="grid grid-cols-[1fr_auto] items-center gap-5 border-b border-[var(--line)] py-5 sm:grid-cols-[1fr_10rem_8rem]"><div><p className="text-2xl font-black uppercase tracking-[-0.04em]">{getExerciseName(exercise.exerciseId)}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{exercise.completedSets} / {exercise.prescribedSets}세트</p></div><p className="hidden text-right text-base font-black sm:block">{amount}</p><div className="text-right"><p className="text-3xl font-black">{exercise.formScore ?? "—"}</p><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">{exercise.formScore === null ? "미측정" : "자세"}</p><p className="mt-1 text-xs font-black sm:hidden">{amount}</p></div></div>;
}

function SetAnalysis({ exercise }: { exercise: WorkoutExerciseResult }) {
  return <section><h3 className="text-xl font-black uppercase tracking-[-0.03em]">{getExerciseName(exercise.exerciseId)}</h3><div className="mt-3 border-t border-[var(--ink)]">{exercise.sets.map((set) => <div key={set.set} className="grid grid-cols-[5rem_1fr_auto] items-center gap-3 border-b border-[var(--line)] py-3"><p className="text-sm font-black uppercase">세트 {set.set}</p><p className="text-xs font-bold text-[var(--muted)]">{set.completed ? <span className="inline-flex items-center gap-1"><Check className="size-3.5" />완료</span> : "미완료"} · {set.reps > 0 ? `${set.reps}회` : set.durationSeconds > 0 ? `${set.durationSeconds}초` : "완료한 동작 없음"}</p><p className="text-xl font-black">{set.formScore ?? "—"}</p></div>)}</div></section>;
}

function ProgressRow({ report, current }: { report: WorkoutReportRecord; current: boolean }) {
  return <Link href={`/report/${encodeURIComponent(report.id)}`} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-[var(--line)] py-4 transition-colors hover:bg-white/60 sm:grid-cols-[1fr_7rem_7rem_7rem]"><div><p className="font-black uppercase tracking-[-0.02em]">{report.routineTitle}{current && <span className="ml-2 text-[9px] uppercase tracking-[0.12em] text-[var(--accent-strong)]">현재</span>}</p><p className="mt-1 text-xs font-bold text-[var(--muted)]">{formatDate(report.completedAt)}</p></div><MetricCell value={report.formScore === null ? "—" : String(report.formScore)} label="자세" /><MetricCell value={formatDuration(report.durationSeconds)} label="시간" className="hidden sm:block" /><MetricCell value={`${report.completionRate}%`} label="완료" className="hidden sm:block" /></Link>;
}

function MetricCell({ value, label, className = "" }: { value: string; label: string; className?: string }) {
  return <div className={`text-right ${className}`}><p className="font-black">{value}</p><p className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p></div>;
}

function EmptyMeasuredData() {
  return <div className="flex min-h-32 items-center gap-3 border-b border-[var(--line)] text-[var(--muted)]"><Clock3 className="size-5" /><p className="text-sm font-bold">완료된 측정 데이터가 없습니다.</p></div>;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}초`;
  return `${Math.round(seconds / 60)}분`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "날짜 없음" : new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
