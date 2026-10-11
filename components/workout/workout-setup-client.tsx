"use client";

import { SetupForm } from "@/components/workout/setup-form";

export function WorkoutSetupClient({ routineId, qaMode = false }: { routineId: string; qaMode?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl">
      <SetupForm routineId={routineId} qaMode={qaMode} />
      <p className="mt-5 text-center text-xs font-bold leading-relaxed text-[var(--muted)]">
        자세 분석은 내 기기에서 실행됩니다.<br />
        카메라 영상은 업로드하지 않습니다.
      </p>
    </div>
  );
}
