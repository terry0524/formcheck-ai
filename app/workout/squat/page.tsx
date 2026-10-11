import { RoutineWorkoutResolver } from "@/components/workout/routine-workout-resolver";
import { getRoutine, routines } from "@/lib/routines";
import type { FeedbackMode, VoiceFrequency } from "@/types/workout";

export const metadata = { title: "운동" };

function feedbackMode(value: string | undefined): FeedbackMode {
  return value === "screen" || value === "voice" ? value : "hybrid";
}

function voiceFrequency(value: string | undefined): VoiceFrequency {
  return value === "normal" || value === "detailed" ? value : "minimal";
}

export default async function SquatWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ routine?: string; mode?: string; frequency?: string; debug?: string }>;
}) {
  const params = await searchParams;
  const routineId = params.routine ?? routines[0].id;

  return (
    <RoutineWorkoutResolver
      routineId={routineId}
      initialRoutine={getRoutine(routineId) ?? null}
      feedbackMode={feedbackMode(params.mode)}
      voiceFrequency={voiceFrequency(params.frequency)}
      qaMode={params.debug === "true" || params.debug === "1"}
    />
  );
}
