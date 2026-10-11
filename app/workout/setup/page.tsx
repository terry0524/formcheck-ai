import { WorkoutSetupScreen } from "@/components/workout/workout-setup-screen";
import { getRoutine, routines } from "@/lib/routines";

export const metadata = { title: "Workout Setup" };

export default async function WorkoutSetupPage({ searchParams }: { searchParams: Promise<{ routine?: string; debug?: string }> }) {
  const { routine: routineParam, debug } = await searchParams;
  const routineId = routineParam ?? routines[0].id;
  return <WorkoutSetupScreen routineId={routineId} initialRoutine={getRoutine(routineId) ?? null} qaMode={debug === "true" || debug === "1"} />;
}
