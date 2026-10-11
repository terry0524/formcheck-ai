import Link from "next/link";
import { Menu } from "lucide-react";

export function SiteHeader({ inverse = false }: { inverse?: boolean }) {
  return (
    <header className={`relative z-20 flex h-18 items-center justify-between border-b px-5 sm:px-8 ${inverse ? "border-white/20 text-white" : "border-[var(--line)] text-[var(--ink)]"}`}>
      <Link href="/" className="text-xl font-black tracking-[-0.06em]" aria-label="FormCheck landing page">
        FORMCHECK<span className="text-[var(--accent-strong)]">.</span>
      </Link>
      <nav className="hidden items-center gap-8 text-xs font-black uppercase tracking-[0.14em] md:flex" aria-label="Main navigation">
        <Link href="/home">홈</Link>
        <Link href="/routines">루틴</Link>
        <Link href="/workout/setup">시작</Link>
      </nav>
      <Link href="/home" className="flex size-10 items-center justify-center md:hidden" aria-label="Open home">
        <Menu className="size-6" strokeWidth={2.5} />
      </Link>
    </header>
  );
}
