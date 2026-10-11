import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RecentWorkouts } from "@/components/report/recent-workouts";
import { HomeRoutineLinks } from "@/components/routine/home-routine-links";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Home" };

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="page-shell py-10 sm:py-16">
        <p className="eyebrow text-[var(--muted)]">루틴을 고르고, 휴대폰을 내려놓고, 운동하세요.</p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.06em] sm:text-7xl">오늘의<br />운동</h1>

        <section className="mt-10 grid min-h-72 border border-[var(--ink)] bg-[var(--ink)] text-white md:grid-cols-[1fr_18rem]">
          <div className="flex flex-col justify-between p-6 sm:p-9">
            <p className="eyebrow text-[var(--accent)]">내 루틴을 따라 운동하세요</p>
            <div className="mt-16">
              <h2 className="text-3xl font-black tracking-[-0.05em] sm:text-5xl">초급 하체 루틴</h2>
              <p className="mt-3 font-bold text-white/55">20분 · 3 exercises · No equipment</p>
            </div>
          </div>
          <div className="flex items-end bg-[var(--accent)] p-5 text-[var(--ink)] sm:p-7">
            <Button asChild size="lg" className="w-full"><Link href="/workout/setup?routine=beginner-lower-body">운동 시작 <ArrowRight /></Link></Button>
          </div>
        </section>

        <HomeRoutineLinks />

        <section className="mt-14">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-3">
            <h2 className="text-2xl font-black uppercase tracking-[-0.04em]">최근 운동</h2>
            <span className="eyebrow text-[var(--muted)]">이 기기의 기록</span>
          </div>
          <RecentWorkouts />
        </section>
      </div>
    </main>
  );
}
