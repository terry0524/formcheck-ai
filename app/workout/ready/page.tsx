import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRoutine, routines } from "@/lib/routines";

export const metadata = { title: "Workout Ready" };

export default async function WorkoutReadyPage({ searchParams }: { searchParams: Promise<{ routine?: string }> }) {
  const { routine: id } = await searchParams;
  const routine = getRoutine(id ?? "") ?? routines[0];
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--ink)] p-5 text-white">
      <div className="w-full max-w-xl border border-white/20 p-7 text-center sm:p-12">
        <div className="mx-auto flex size-16 items-center justify-center bg-[var(--accent)] text-[var(--ink)]"><Check className="size-8" strokeWidth={3} /></div>
        <p className="eyebrow mt-8 text-[var(--accent)]">Setup complete</p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.06em] sm:text-6xl">Ready to train</h1>
        <p className="mx-auto mt-5 max-w-md font-bold leading-relaxed text-white/60">{routine.title} is configured and ready for its automated workout flow.</p>
        <Button asChild variant="accent" size="lg" className="mt-9 w-full"><Link href="/home"><ChevronLeft /> Return Home</Link></Button>
      </div>
    </main>
  );
}
