import Link from "next/link";
import { ListChecks } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/components/ui/button";
import PlanImplementacionDs44Client from "./PlanImplementacionDs44Client";
import { getDs44PlanImplementacionData } from "./actions";

export default async function PlanImplementacionDs44Page() {
  const data = await getDs44PlanImplementacionData();

  return (
    <div className="space-y-6 px-4 pb-8 pt-5 sm:px-6">
      <StandardPageHeader
        moduleLabel="DS44"
        title="Plan de implementacion DS44"
        description="Acciones priorizadas para cerrar brechas, asignar responsables y preparar evidencia fiscalizable."
        icon={ListChecks}
        iconWrapClassName="bg-slate-900"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dicaprev/ds44">Volver a DS44</Link>
            </Button>
            <Button asChild>
              <Link href="/dicaprev/ds44/diagnostico">Ver diagnostico</Link>
            </Button>
          </div>
        }
      />

      <PlanImplementacionDs44Client data={data} />
    </div>
  );
}