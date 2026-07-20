import Link from "next/link";
import { ListChecks } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/components/ui/button";
import PlanImplementacionDs44Client from "./PlanImplementacionDs44Client";
import { getDs44PlanImplementacionData } from "./actions";
import Ds44SectionNav from "../Ds44SectionNav";

export default async function PlanImplementacionDs44Page() {
  const data = await getDs44PlanImplementacionData();

  return (
    <main className="min-h-screen bg-slate-50/80">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <StandardPageHeader
        moduleLabel="DS44"
        title="Plan de implementacion DS44"
        description="Acciones priorizadas para cerrar brechas, asignar responsables y preparar evidencia fiscalizable."
        icon={ListChecks}
        iconWrapClassName="bg-slate-900"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="rounded-2xl font-semibold">
              <Link href="/dicaprev/ds44">Volver a DS44</Link>
            </Button>
            <Button asChild className="rounded-2xl font-semibold">
              <Link href="/dicaprev/ds44/diagnostico">Ver diagnostico</Link>
            </Button>
          </div>
        }
      />

      <Ds44SectionNav />

      <PlanImplementacionDs44Client data={data} />
      </div>
    </main>
  );
}
