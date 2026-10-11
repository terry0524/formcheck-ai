import { RoutineDetailClient } from "@/components/routine/routine-detail-client";
import { getRoutine, routines } from "@/lib/routines";

export function generateStaticParams() { return routines.map(({ id }) => ({ slug: id })); }

export default async function RoutineDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <RoutineDetailClient routineId={slug} initialRoutine={getRoutine(slug) ?? null} />;
}
