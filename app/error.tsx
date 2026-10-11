"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--paper)] px-5 text-center">
      <div className="max-w-md">
        <p className="eyebrow text-[var(--accent-strong)]">FormCheck recovery</p>
        <h1 className="mt-4 text-5xl font-black uppercase leading-[0.9] tracking-[-0.06em]">Something stopped</h1>
        <p className="mt-5 text-sm font-bold leading-relaxed text-[var(--muted)]">Your camera feed was not uploaded. Try the screen again, or return home and restart the workout setup.</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Button type="button" size="lg" onClick={reset}><RotateCcw className="size-4" /> Try again</Button>
          <Button asChild variant="outline" size="lg"><Link href="/home">Back home</Link></Button>
        </div>
      </div>
    </main>
  );
}
