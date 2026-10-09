import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import { faltaMigracionContratistas } from "@/lib/contratistas/requisitos";
import { Database, ShieldCheck } from "lucide-react";
import SolicitudesContratistasClient from "./SolicitudesContratistasClient";

export default async function SolicitudesContratistasPage() {
  const { empresaId } = await requirePermission("canReadDocumentacion");
  try {
    await prisma.contratistaSolicitud.count({ where: { empresaId } });
  } catch (error) {
    if (!faltaMigracionContratistas(error)) throw error;
    return <main className="flex min-h-[75vh] items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-9">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Database className="h-7 w-7"/></span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">NextPrev · Contratistas</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Sección lista para activar</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">La nueva gestión documental de contratistas ya está incorporada al sistema. Falta activar su estructura de datos en este entorno. Las demás funcionalidades de NextPrev siguen disponibles.</p>
        <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600"><ShieldCheck className="h-4 w-4 text-emerald-600"/>Ningún expediente existente fue modificado.</div>
      </section>
    </main>;
  }
  return <SolicitudesContratistasClient />;
}
