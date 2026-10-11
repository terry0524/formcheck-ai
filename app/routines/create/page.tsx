import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RoutineBuilder } from "@/components/routine/routine-builder";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "루틴 만들기" };

export default function CreateRoutinePage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="page-shell py-8 sm:py-14">
        <Link href="/routines" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em]"><ArrowLeft className="size-4" /> 루틴</Link>
        <header className="mt-9 border-b-2 border-[var(--ink)] pb-8"><p className="eyebrow text-[var(--accent-strong)]">내 운동을 구성하세요</p><h1 className="mt-3 text-5xl font-black uppercase tracking-[-0.065em] sm:text-8xl">루틴<br />만들기</h1></header>
        <div className="py-10"><RoutineBuilder /></div>
      </div>
    </main>
  );
}
