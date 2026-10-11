import { SiteHeader } from "@/components/site-header";
import { RoutineLibrary } from "@/components/routine/routine-library";
import { routines } from "@/lib/routines";

export const metadata = { title: "루틴" };

export default function RoutinesPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="page-shell py-10 sm:py-16"><RoutineLibrary demoRoutines={routines} /></div>
    </main>
  );
}
