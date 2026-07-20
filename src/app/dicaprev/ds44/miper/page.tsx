import { ShieldAlert } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import Ds44SectionNav from "../Ds44SectionNav";
import { getDs44MiperListadoData } from "./actions";
import MiperListadoClient from "./MiperListadoClient";

export default async function Ds44MiperPage() {
  const data = await getDs44MiperListadoData();

  return (
    <main className="min-h-screen bg-slate-50/80">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <StandardPageHeader
          moduleLabel="DS44"
          title="MIPER / Matriz de riesgos"
          description="Identifica peligros, evalúa riesgos y mantiene medidas de control trazables por centro, área y cargo."
          icon={ShieldAlert}
          iconWrapClassName="bg-slate-900"
        />
        <Ds44SectionNav />
        <MiperListadoClient data={data} />
      </div>
    </main>
  );
}
