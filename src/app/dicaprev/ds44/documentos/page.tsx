import { Files } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import Ds44SectionNav from "../Ds44SectionNav";
import { getDs44DocumentosData } from "./actions";
import Ds44DocumentosClient from "./Ds44DocumentosClient";

export default async function Ds44DocumentosPage() {
  try {
    const data = await getDs44DocumentosData();
    return <main className="min-h-screen bg-slate-50/80"><div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"><StandardPageHeader moduleLabel="DS44" title="Documentos DS44" description="Genera documentos base del sistema de gestión SST y deja trazabilidad para fiscalización." icon={Files} iconWrapClassName="bg-slate-900" /><Ds44SectionNav /><Ds44DocumentosClient data={data} /></div></main>;
  } catch {
    return <main className="min-h-screen bg-slate-50/80"><div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"><StandardPageHeader moduleLabel="DS44" title="Documentos DS44" description="Genera documentos base del sistema de gestión SST y deja trazabilidad para fiscalización." icon={Files} iconWrapClassName="bg-slate-900" /><Ds44SectionNav /><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">No fue posible cargar los documentos DS44. Verifica los permisos y la disponibilidad del registro documental.</div></div></main>;
  }
}
