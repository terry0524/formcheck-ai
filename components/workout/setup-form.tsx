"use client";

import { useState } from "react";
import Link from "next/link";
import { Volume2, Monitor, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { speakCoachCue } from "@/lib/voiceCoach";
import type { FeedbackMode, VoiceFrequency } from "@/types/workout";

const modes = [
  { value: "hybrid", title: "음성 + 화면", note: "화면에 표시하고 중요한 안내만 말합니다", icon: AudioLines },
  { value: "screen", title: "화면만", note: "소리 없이 화면으로 확인합니다", icon: Monitor },
  { value: "voice", title: "음성 중심", note: "음성으로 안내하고 화면은 간단히 표시합니다", icon: Volume2 },
] as const;

const frequencies = [
  { value: "minimal", title: "최소", note: "시작·교정·휴식·다음 운동" },
  { value: "normal", title: "보통", note: "최소 안내에 중간 횟수를 추가" },
  { value: "detailed", title: "자세히", note: "매 횟수와 동작 단계를 안내" },
] as const;

export function SetupForm({ routineId, qaMode = false }: { routineId: string; qaMode?: boolean }) {
  const [mode, setMode] = useState<FeedbackMode>("hybrid");
  const [frequency, setFrequency] = useState<VoiceFrequency>("minimal");

  return (
    <div className="space-y-10">
      <section>
        <h2 className="section-label">안내 방식</h2>
        <RadioGroup value={mode} onValueChange={(value) => setMode(value as FeedbackMode)} aria-label="안내 방식">
          {modes.map((item) => {
            const Icon = item.icon;
            return (
              <label key={item.value} className={`grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 border p-4 transition-colors ${mode === item.value ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white"}`}>
                <Icon className="size-5" />
                <span><span className="block font-black">{item.title}</span><span className={`mt-0.5 block text-xs ${mode === item.value ? "text-white/60" : "text-[var(--muted)]"}`}>{item.note}</span></span>
                <RadioGroupItem value={item.value} aria-label={item.title} className={mode === item.value ? "border-white bg-[var(--ink)] [&_svg]:fill-[var(--accent)] [&_svg]:text-[var(--accent)]" : ""} />
              </label>
            );
          })}
        </RadioGroup>
      </section>

      <section className={mode === "screen" ? "opacity-40" : ""}>
        <h2 className="section-label">음성 빈도</h2>
        <RadioGroup value={frequency} onValueChange={(value) => setFrequency(value as VoiceFrequency)} disabled={mode === "screen"} aria-label="음성 빈도">
          {frequencies.map((item) => (
            <label key={item.value} className="flex cursor-pointer items-center gap-4 border-t border-[var(--line)] py-4 last:border-b">
              <RadioGroupItem value={item.value} aria-label={item.title} />
              <span><span className="block font-black">{item.title}</span><span className="text-xs text-[var(--muted)]">{item.note}</span></span>
            </label>
          ))}
        </RadioGroup>
      </section>

      <div>
        <Button asChild variant="accent" size="lg" className="w-full">
          <Link
            href={`/workout/squat?routine=${routineId}&mode=${mode}&frequency=${frequency}${qaMode ? "&debug=true" : ""}`}
            onClick={() => {
              // Start speech in this tap, not in the later automatic countdown.
              // Next's client navigation preserves the same browser document.
              if (mode !== "screen") speakCoachCue("휴대폰을 내려놓고 전신 위치로 이동하세요.");
            }}
          >카메라 켜고 준비하기</Link>
        </Button>
        <p className="mt-3 text-center text-xs font-bold text-[var(--muted)]" aria-live="polite">
          다음 화면에서 카메라 권한을 허용하고 전신 위치로 이동하세요. 전신이 보이면 3초 후 자동 시작합니다.
        </p>
      </div>
    </div>
  );
}
