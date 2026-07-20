import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { FileCheck2 } from "lucide-react";
import { getDs44EvidenciasData } from "./actions";
import Ds44EvidenciasClient from "./Ds44EvidenciasClient";
import Ds44SectionNav from "../Ds44SectionNav";

export default async function Ds44EvidenciasPage() {
  try {
    const data = await getDs44EvidenciasData();
    return (
      <main className="min-h-screen bg-slate-50/80"><div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <StandardPageHeader moduleLabel="DS44" title="Evidencias fiscalizables DS44" description="Registra y valida evidencias asociadas a las acciones del plan de implementación DS44." icon={FileCheck2} iconWrapClassName="bg-slate-900" />
        <Ds44SectionNav />
        <Ds44EvidenciasClient data={data} />
      </div></main>
    );
  } catch {
    return (
      <main className="min-h-screen bg-slate-50/80"><div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <StandardPageHeader moduleLabel="DS44" title="Evidencias fiscalizables DS44" description="Registra y valida evidencias asociadas a las acciones del plan de implementación DS44." icon={FileCheck2} iconWrapClassName="bg-slate-900" />
        <Ds44SectionNav />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">No fue posible cargar las evidencias DS44. Verifica que exista un diagnóstico y un plan de implementación.</div>
      </div></main>
    );
  }
}
