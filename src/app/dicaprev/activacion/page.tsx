import Link from "next/link";
import { CheckCircle2, ChevronRight, Rocket, Sparkles } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getEstadoActivacionEmpresa, type EstadoActivacionPaso } from "@/actions/empresa/resumen";

function badgeTone(estado: EstadoActivacionPaso) {
  if (estado === "completo") return "bg-emerald-100 text-emerald-700";
  if (estado === "recomendado") return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
}

function badgeLabel(estado: EstadoActivacionPaso) {
  if (estado === "completo") return "Completo";
  if (estado === "recomendado") return "Recomendado";
  return "Pendiente";
}

export default async function ActivacionPage() {
  const activacion = await getEstadoActivacionEmpresa();

  return (
    <div className="space-y-6 p-6">
      <StandardPageHeader
        moduleLabel="Onboarding"
        title="Puesta en marcha"
        description="Checklist guiado para dejar la empresa operativa en NextPrev sin depender de datos mock ni pasos manuales difusos."
        icon={<Rocket className="h-6 w-6" />}
        iconWrapClassName="bg-slate-900"
        actions={
          <Link
            href="/dicaprev/dashboard"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            Volver al dashboard
          </Link>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_35%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Progreso general</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-5xl font-semibold tracking-tight text-slate-900">{activacion.porcentajeActivacion}%</p>
              <p className="mt-2 text-sm text-slate-500">Activación calculada con datos reales de empresa, estructura, documental y operación inicial.</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
          <Progress value={activacion.porcentajeActivacion} className="mt-5 h-2" />

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Completados</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-700">{activacion.pasosCompletados.length}</p>
              <p className="mt-1 text-sm text-emerald-700">Pasos ya resueltos</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600">Pendientes</p>
              <p className="mt-2 text-3xl font-semibold text-amber-700">{activacion.pasosPendientes.length}</p>
              <p className="mt-1 text-sm text-amber-700">Acciones para cerrar la puesta en marcha</p>
            </div>
          </div>

          {activacion.siguienteAccionRecomendada ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Siguiente acción recomendada</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{activacion.siguienteAccionRecomendada.titulo}</p>
              <p className="mt-1 text-sm text-slate-500">{activacion.siguienteAccionRecomendada.resumen}</p>
              <Link
                href={activacion.siguienteAccionRecomendada.href}
                className="mt-4 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                {activacion.siguienteAccionRecomendada.accionLabel}
              </Link>
            </div>
          ) : null}
        </Card>

        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Checklist completo</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Pasos de activación</h2>
            </div>
            <Link href="/dicaprev/cumplimiento" className="text-sm font-medium text-slate-500 hover:text-slate-900">
              Revisar cumplimiento
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {activacion.pasos.map((paso) => (
              <div key={paso.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-slate-900">{paso.titulo}</p>
                      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold", badgeTone(paso.estado))}>
                        {badgeLabel(paso.estado)}
                      </span>
                      {paso.esOpcional ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          Opcional
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{paso.descripcion}</p>
                    <p className="mt-2 text-sm font-medium text-slate-700">{paso.resumen}</p>
                  </div>
                  <Link
                    href={paso.href}
                    className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                  >
                    {paso.accionLabel}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Datos reales conectados</p>
              <p className="text-xs text-slate-500">Empresa, centros, estructura, dotación, vehículos, documental y acreditaciones.</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Acceso directo a operación</p>
          <p className="mt-1 text-xs text-slate-500">Cada paso lleva al módulo correcto para completar la carga sin formularios extra.</p>
        </Card>
        <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Sin persistencia inventada</p>
          <p className="mt-1 text-xs text-slate-500">El plan de trabajo queda marcado como recomendado porque hoy no tiene fuente server-side confiable.</p>
        </Card>
      </div>
    </div>
  );
}