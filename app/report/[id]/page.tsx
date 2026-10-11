import { WorkoutReportScreen } from "@/components/report/workout-report-screen";

export const metadata = { title: "Workout Report" };

export default async function WorkoutReportPage({ params }: PageProps<"/report/[id]">) {
  const { id } = await params;
  return <WorkoutReportScreen reportId={safeDecode(id)} />;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
