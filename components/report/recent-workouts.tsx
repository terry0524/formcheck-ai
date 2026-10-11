"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Clock3 } from "lucide-react";
import { loadWorkoutReports } from "@/lib/reportStorage";
import type { WorkoutReportRecord } from "@/types/report";

export function RecentWorkouts() {
  const [reports, setReports] = useState<WorkoutReportRecord[]>([]);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setReports(loadWorkoutReports(5)); });
    return () => { cancelled = true; };
  }, []);

  if (reports.length === 0) return <div className="flex min-h-36 items-center justify-center gap-3 text-[var(--muted)]"><Clock3 className="size-5" /><p className="text-sm font-bold">운동을 완료하면 기록이 표시됩니다.</p></div>;
  return <div className="border-t border-[var(--ink)]">{reports.map((report) => <Link key={report.id} href={`/report/${encodeURIComponent(report.id)}`} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-[var(--line)] py-4"><div><p className="font-black uppercase">{report.routineTitle}</p><p className="mt-1 text-xs font-bold text-[var(--muted)]">{report.completionRate}% 완료 · {report.formScore === null ? "자세 미측정" : `자세 ${report.formScore}`}</p></div><ArrowRight className="size-4" /></Link>)}</div>;
}
