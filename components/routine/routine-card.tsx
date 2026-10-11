import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Routine } from "@/types/routine";

export function RoutineCard({ routine, index }: { routine: Routine; index: number }) {
  return (
    <Link href={`/routines/${routine.id}`} className="group grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 border-t border-[var(--line)] py-5 last:border-b sm:grid-cols-[5rem_1fr_auto] sm:py-6">
      <span className="font-mono text-sm font-bold text-[var(--muted)]">0{index + 1}</span>
      <span>
        <span className="block text-lg font-black tracking-[-0.035em] sm:text-2xl">{routine.title}</span>
        <span className="mt-1 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{routine.estimatedDuration} min · {routine.difficulty}</span>
      </span>
      <span className="flex size-11 items-center justify-center border border-[var(--line)] transition-colors group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)]">
        <ArrowUpRight className="size-5" />
      </span>
    </Link>
  );
}
