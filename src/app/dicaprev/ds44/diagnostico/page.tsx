import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DiagnosticoDs44Client from "./DiagnosticoDs44Client";
import { getDs44DiagnosticoData } from "./actions";

function getHeaderEstadoLabel(args: { updatedAt: string | null; estado: string }): string {
  if (!args.updatedAt) return "Sin guardar";
  if (args.estado === "completado") return "Completado";
  return "En evaluacion";
}

export default async function DiagnosticoDs44Page() {
  const data = await getDs44DiagnosticoData();

  return (
    <div className="space-y-6 px-4 pb-8 pt-5 sm:px-6">
      <StandardPageHeader
        moduleLabel="DS44"
        title="Diagnostico inicial DS44"
        description="Evalua el estado actual de implementacion, detecta brechas y prioriza acciones."
        icon={ClipboardCheck}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
              {getHeaderEstadoLabel({ updatedAt: data.updatedAt, estado: data.estado })}
            </Badge>
            <Button asChild variant="outline">
              <Link href="/dicaprev/ds44">Volver al dashboard DS44</Link>
            </Button>
          </div>
        }
      />

      <DiagnosticoDs44Client initialData={data} />
    </div>
  );
}
