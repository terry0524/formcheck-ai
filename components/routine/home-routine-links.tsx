"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { createLocalRoutineRepository } from "@/lib/routineStorage";

export function HomeRoutineLinks() {
  const [savedCount, setSavedCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setSavedCount(createLocalRoutineRepository().list().length);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="mt-14 grid gap-4 md:grid-cols-2">
      <Link href="/routines" className="group flex min-h-40 flex-col justify-between border-t-2 border-[var(--ink)] py-5">
        <div className="flex justify-between"><span className="eyebrow">내 루틴</span><Plus /></div>
        <span className="text-2xl font-black tracking-[-0.04em] group-hover:underline">{savedCount} saved {savedCount === 1 ? "routine" : "routines"}</span>
      </Link>
      <Link href="/routines" className="group flex min-h-40 flex-col justify-between border-t-2 border-[var(--ink)] py-5">
        <div className="flex justify-between"><span className="eyebrow">루틴 둘러보기</span><Search /></div>
        <span className="text-2xl font-black tracking-[-0.04em] group-hover:underline">다음 운동을 찾아보세요</span>
      </Link>
    </section>
  );
}
