import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { FileCheck2 } from "lucide-react";
import { getDs44EvidenciasData } from "./actions";
import Ds44EvidenciasClient from "./Ds44EvidenciasClient";

export default async function Ds44EvidenciasPage() {
  try {
    const data = await getDs44EvidenciasData();
    return (
      <div className="space-y-6 px-4 pb-8 pt-5 sm:px-6">
        <StandardPageHeader moduleLabel="DS44" title="Evidencias fiscalizables DS44" description="Registra y valida evidencias asociadas a las acciones del plan de implementación DS44." icon={FileCheck2} iconWrapClassName="bg-slate-900" />
        <Ds44EvidenciasClient data={data} />
      </div>
    );
  } catch {
    return (
      <div className="space-y-6 px-4 pb-8 pt-5 sm:px-6">
        <StandardPageHeader moduleLabel="DS44" title="Evidencias fiscalizables DS44" description="Registra y valida evidencias asociadas a las acciones del plan de implementación DS44." icon={FileCheck2} iconWrapClassName="bg-slate-900" />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">No fue posible cargar las evidencias DS44. Verifica que exista un diagnóstico y un plan de implementación.</div>
      </div>
    );
  }
}
