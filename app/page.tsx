import Link from "next/link";
import { ArrowDown, ArrowRight, ScanLine, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";

const steps = [
  {
    number: "01",
    title: "루틴을 고르세요",
    body: "오늘 할 운동과 세트, 횟수, 휴식을 고르세요.",
  },
  {
    number: "02",
    title: "휴대폰을 내려놓으세요",
    body: "안내 방식을 고르고 시작을 누른 뒤, 전신이 보이는 위치로 이동하세요.",
  },
  {
    number: "03",
    title: "운동에 집중하세요",
    body: "지원 운동의 횟수와 자세를 확인하고, 세트와 휴식을 자동으로 안내합니다.",
  },
] as const;

const posePipeline = [
  "카메라",
  "신체 관절 추적",
  "동작 단계",
  "자세 분석",
  "교정 안내",
] as const;

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="bg-[var(--ink)] text-white">
        <SiteHeader inverse />
        <section className="grid-noise relative min-h-[calc(100svh-4.5rem)] overflow-hidden">
          <div className="page-shell relative z-10 flex min-h-[calc(100svh-4.5rem)] flex-col justify-between py-8 sm:py-10">
            <div className="flex items-center justify-between">
              <p className="eyebrow text-white/55">손대지 않고 이어가는 운동</p>
              <ScanLine className="size-7 text-[var(--accent)]" aria-hidden="true" />
            </div>

            <div className="py-6">
              <h1 className="display landing-headline max-w-6xl !leading-[1.2]">
                <span className="block">루틴을 고르세요.</span>
                <span className="block">휴대폰을 내려놓으세요.</span>
                <span className="block text-[var(--accent)]">운동에 집중하세요.</span>
              </h1>
            </div>

            <div className="grid gap-8 border-t border-white/20 pt-7 lg:grid-cols-[1fr_auto] lg:items-end">
              <p className="max-w-xl text-lg font-bold leading-relaxed text-white/70 sm:text-xl">
                FormCheck가 횟수를 세고 자세를 확인하며 세트와 휴식을 안내합니다.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild variant="accent" size="lg">
                  <Link href="/routines">루틴 고르기 <ArrowRight /></Link>
                </Button>
                <Button asChild size="lg" className="border-white bg-transparent hover:border-[var(--accent)]">
                  <Link href="#how-it-works">사용 방법</Link>
                </Button>
              </div>
            </div>
          </div>
          <ArrowDown className="absolute -bottom-12 right-[5%] size-72 text-white/[0.04] sm:size-96" strokeWidth={1} aria-hidden="true" />
        </section>
      </div>

      <section className="border-b border-[var(--ink)]">
        <div className="page-shell grid gap-10 py-20 sm:py-28 lg:grid-cols-[0.55fr_1fr] lg:gap-20">
          <p className="eyebrow text-[var(--muted)]">혼자 운동할 때의 어려움</p>
          <div>
            <h2 className="text-4xl font-black uppercase leading-[1.2] tracking-[-0.055em] sm:text-6xl">
              루틴 앱은 할 운동을 알려줍니다.
              <span className="mt-3 block">FormCheck는 실제 자세를 봅니다.</span>
            </h2>
            <div className="mt-10 grid gap-6 border-t border-[var(--line)] pt-6 text-lg font-semibold leading-relaxed text-[var(--muted)] sm:grid-cols-2">
              <p>운동 중 거울을 계속 보기 어렵고, 촬영 영상은 운동이 끝난 뒤에야 확인할 수 있습니다.</p>
              <p>운동 중 안내를 받아 다음 동작에서 자세를 조정하세요.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-b border-[var(--ink)]">
        <div className="page-shell py-20 sm:py-28">
          <div className="grid gap-6 border-b border-[var(--ink)] pb-8 lg:grid-cols-[0.55fr_1fr] lg:items-end">
            <p className="eyebrow text-[var(--muted)]">사용 방법</p>
            <h2 className="text-4xl font-black uppercase tracking-[-0.055em] sm:text-6xl">세 단계면 준비 끝.</h2>
          </div>
          <ol>
            {steps.map((step) => (
              <li key={step.number} className="grid gap-5 border-b border-[var(--line)] py-8 sm:grid-cols-[5rem_0.8fr_1fr] sm:items-start sm:gap-8">
                <span className="text-3xl font-black tabular-nums text-[var(--muted)]">{step.number}</span>
                <h3 className="text-2xl font-black uppercase tracking-[-0.04em] sm:text-3xl">{step.title}</h3>
                <p className="max-w-xl text-base font-semibold leading-relaxed text-[var(--muted)] sm:text-lg">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[var(--ink)] text-white">
        <div className="page-shell py-20 sm:py-28">
          <div className="grid gap-8 lg:grid-cols-[0.55fr_1fr]">
            <p className="eyebrow text-white/50">자세 분석 과정</p>
            <div>
              <h2 className="max-w-4xl text-4xl font-black uppercase leading-[1.2] tracking-[-0.055em] sm:text-6xl">
                카메라 속 동작을 짧은 안내로.
              </h2>
              <p className="mt-7 max-w-2xl text-lg font-semibold leading-relaxed text-white/65">
                기기에서 AI가 신체 관절을 추적합니다. 운동별 규칙으로 동작 단계와 횟수를 판단하고, 측정 가능한 자세만 평가합니다.
              </p>
            </div>
          </div>

          <ol className="mt-14 grid border-l border-t border-white/20 sm:grid-cols-5">
            {posePipeline.map((stage, index) => (
              <li key={stage} className="min-h-36 border-b border-r border-white/20 p-5">
                <span className="eyebrow text-[var(--accent)]">0{index + 1}</span>
                <p className="mt-9 text-lg font-black uppercase tracking-[-0.03em]">{stage}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 grid gap-6 border border-white/20 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
            <ShieldCheck className="size-9 text-[var(--accent)]" aria-hidden="true" />
            <div>
              <p className="text-xl font-black uppercase">자세 분석은 내 기기에서 실행됩니다.</p>
              <p className="mt-1 font-semibold text-white/60">카메라 영상은 업로드하지 않습니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--ink)]">
        <div className="page-shell grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.55fr_1fr]">
          <p className="eyebrow text-[var(--muted)]">이용 시 참고</p>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-[-0.05em] sm:text-5xl">운동 자세 안내이지, 의료 진단이 아닙니다.</h2>
            <p className="mt-6 max-w-3xl text-lg font-semibold leading-relaxed text-[var(--muted)]">
              지원 운동에서 카메라로 확인할 수 있는 움직임을 평가합니다. 의료 진단이나 부상 예측을 하지 않으며, 전문가의 지도를 대체하지 않습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[var(--accent)]">
        <div className="page-shell flex flex-col gap-8 py-16 sm:flex-row sm:items-end sm:justify-between sm:py-20">
          <div>
            <p className="eyebrow">내 운동을 시작하세요</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-black uppercase leading-[1.2] tracking-[-0.055em] sm:text-6xl">루틴을 고르세요. 나머지는 안내할게요.</h2>
          </div>
          <Button asChild size="lg" className="shrink-0 text-white hover:bg-[var(--accent)] hover:text-[var(--ink)]">
            <Link href="/routines">루틴 둘러보기 <ArrowRight /></Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
