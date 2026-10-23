import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, CalendarDays, ShieldCheck, Users } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { getEmpresaKpisActual } from "@/app/dicaprev/empresa/informacion-general/actions";
import { getCurrentAppContext } from "@/server/context";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Indicadores SST | NextPrev" };

const tasas = [
  { titulo: "Tasa de accidentabilidad", nota: "Requiere accidentes del trabajo confirmados y dotación promedio del período." },
  { titulo: "Tasa de siniestralidad", nota: "Requiere antecedentes consolidados de incapacidades y días perdidos, según el indicador aplicable." },
  { titulo: "Índice de frecuencia", nota: "Requiere accidentes computables y horas-hombre trabajadas verificadas." },
  { titulo: "Índice de gravedad", nota: "Requiere días perdidos computables y horas-hombre trabajadas verificadas." },
];

export default async function IndicadoresSSTPage() {
  const [context, resumen] = await Promise.all([getCurrentAppContext(), getEmpresaKpisActual()]);
  const fechaDesde = new Date();
  fechaDesde.setFullYear(fechaDesde.getFullYear() - 1);
  const investigaciones = await prisma.accidenteInvestigacion.count({
    where: { empresaId: context.empresaId, fechaAccidente: { gte: fechaDesde } },
  });
  const fechaReferencia = fechaDesde.toLocaleDateString("es-CL", { timeZone: "America/Santiago" });

  return (
    <main className="space-y-6 px-4 py-6 sm:px-6">
      <StandardPageHeader
        moduleLabel="Módulo Empresa"
        title="Indicadores SST"
        description="Registros comprobables de la empresa y estado de disponibilidad de indicadores."
        icon={<ShieldCheck className="h-6 w-6" />}
        iconWrapClassName="bg-emerald-800"
      />
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div><strong>Las tasas SST todavía no se pueden calcular de manera confiable.</strong>
            <p className="mt-1">NextPrev aún no dispone de todas las fuentes necesarias para cada fórmula. No se muestran porcentajes de demostración ni se interpreta la ausencia de registros como tasa cero.</p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Users className="h-6 w-6 text-blue-700" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Trabajadores activos</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{resumen.totalTrabajadores}</p>
          <p className="mt-2 text-sm text-slate-500">Dotación registrada actualmente; no equivale a dotación promedio del período.</p>
          <Link href="/dicaprev/trabajadores" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-800">Ver trabajadores <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Activity className="h-6 w-6 text-orange-700" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Investigaciones de accidentes e incidentes registradas</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{investigaciones}</p>
          <p className="mt-2 text-sm text-slate-500">Registros desde {fechaReferencia}. No representa el número certificado de accidentes ni una tasa.</p>
          <Link href="/dicaprev/accidentes" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-800">Ver investigaciones <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><CalendarDays className="h-5 w-5" /> Indicadores pendientes de integración</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {tasas.map((tasa) => (
            <div key={tasa.titulo} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tasa.titulo}</p>
              <p className="mt-2 text-xl font-semibold text-slate-800">Sin cálculo disponible</p>
              <p className="mt-2 text-sm text-slate-600">{tasa.nota}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500">Los registros se consultan para la empresa activa. La configuración de indicadores requerirá sus fuentes, período de referencia y metodología documentada.</p>
    </main>
  );
}
