import { Files } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { getDs44DocumentosData } from "./actions";
import Ds44DocumentosClient from "./Ds44DocumentosClient";

export default async function Ds44DocumentosPage() {
  try {
    const data = await getDs44DocumentosData();
    return <div className="space-y-6 px-4 pb-8 pt-5 sm:px-6"><StandardPageHeader moduleLabel="DS44" title="Documentos DS44" description="Genera documentos base del sistema de gestión SST y deja trazabilidad para fiscalización." icon={Files} iconWrapClassName="bg-slate-900" /><Ds44DocumentosClient data={data} /></div>;
  } catch {
    return <div className="space-y-6 px-4 pb-8 pt-5 sm:px-6"><StandardPageHeader moduleLabel="DS44" title="Documentos DS44" description="Genera documentos base del sistema de gestión SST y deja trazabilidad para fiscalización." icon={Files} iconWrapClassName="bg-slate-900" /><div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">No fue posible cargar los documentos DS44. Verifica los permisos y la disponibilidad del registro documental.</div></div>;
  }
}
