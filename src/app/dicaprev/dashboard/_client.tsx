import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Car,
  ClipboardList,
  FileCheck2,
  Rocket,
  ShieldAlert,
  Users,
  ArrowRight,
} from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { DashboardEjecutivoResponse } from "./actions";

interface DashboardClientProps {
  resumenInicial: DashboardEjecutivoResponse;
}

export default function DashboardClient({ resumenInicial }: DashboardClientProps) {
  const resumen = resumenInicial;
  const activacion = resumen.activacion;
  const actualizacion = new Date(resumen.actualizadoEl).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const kpis = [
    {
      label: "Cumplimiento general",
      value:
        resumen.kpis.cumplimientoGeneral === null ? "—" : `${resumen.kpis.cumplimientoGeneral}%`,
      detail: "Estado consolidado de cumplimiento",
      icon: <Activity className="h-5 w-5" />,
      tone: "from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200",
    },
    {
      label: "Trabajadores activos",
      value: resumen.kpis.trabajadoresActivos,
      detail: `${resumen.kpis.totalTrabajadores} registrados`,
      icon: <Users className="h-5 w-5" />,
      tone: "from-blue-50 to-blue-100 text-blue-700 border-blue-200",
    },
    {
      label: "Vehículos",
      value: resumen.kpis.totalVehiculos,
      detail: "Flota y equipos en sistema",
      icon: <Car className="h-5 w-5" />,
      tone: "from-orange-50 to-orange-100 text-orange-700 border-orange-200",
    },
    {
      label: "Acreditaciones activas",
      value: resumen.kpis.acreditacionesActivas,
      detail: `${resumen.acreditaciones.enPreparacion} en preparación`,
      icon: <FileCheck2 className="h-5 w-5" />,
      tone: "from-violet-50 to-violet-100 text-violet-700 border-violet-200",
    },
    {
      label: "Documentos pendientes",
      value: resumen.kpis.documentosPendientes,
      detail: "Empresa, trabajadores y vehículos",
      icon: <ClipboardList className="h-5 w-5" />,
      tone: "from-amber-50 to-amber-100 text-amber-700 border-amber-200",
    },
    {
      label: "Documentos vencidos",
      value: resumen.kpis.documentosVencidos,
      detail: "Requieren regularización",
      icon: <AlertTriangle className="h-5 w-5" />,
      tone: "from-rose-50 to-rose-100 text-rose-700 border-rose-200",
    },
  ];

  return (
    <div className="space-y-6">
      <StandardPageHeader
        moduleLabel="Módulo Inicio"
        title="Panel ejecutivo"
        description="Vista general del estado preventivo de la empresa con indicadores reales conectados a Prisma."
        icon={<Activity className="h-6 w-6" />}
        iconWrapClassName="bg-slate-900"
        actions={
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Actualizado</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-700">{actualizacion}</p>
          </div>
        }
      />

      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_38%),linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-6 text-white xl:border-b-0 xl:border-r">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-200">Puesta en marcha de NextPrev</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Checklist de activación inicial</h2>
                <p className="mt-2 max-w-xl text-sm text-slate-300">
                  Ruta guiada para dejar la empresa operativa con estructura, documentación y primera operación cargada.
                </p>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sky-100">
                <Rocket className="h-7 w-7" />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">Activación general</p>
                  <p className="mt-2 text-4xl font-semibold">{activacion.porcentajeActivacion}%</p>
                </div>
                <div className="text-right text-sm text-slate-300">
                  <p>{activacion.pasosCompletados.length} pasos completos</p>
                  <p>{activacion.pasosPendientes.length} por resolver</p>
                </div>
              </div>
              <Progress value={activacion.porcentajeActivacion} className="mt-4 h-2 bg-white/15" />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/dicaprev/activacion"
                className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
              >
                Ver checklist completo
              </Link>
              <Link
                href={activacion.siguienteAccionRecomendada?.href ?? "/dicaprev/cumplimiento"}
                className="inline-flex items-center rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                {activacion.siguienteAccionRecomendada?.accionLabel ?? "Revisar cumplimiento"}
              </Link>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Pasos sugeridos</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">Lo próximo para operar</h3>
              </div>
              <Link href="/dicaprev/activacion" className="text-sm font-medium text-slate-500 hover:text-slate-900">
                Abrir ruta completa
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {activacion.pasos.map((paso) => (
                <div key={paso.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{paso.titulo}</p>
                        <EstadoPasoBadge estado={paso.estado} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{paso.descripcion}</p>
                      <p className="mt-2 text-xs font-medium text-slate-600">{paso.resumen}</p>
                    </div>
                    <Link
                      href={paso.href}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                    >
                      {paso.accionLabel}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className={cn(
              "rounded-2xl border bg-gradient-to-br p-5 shadow-sm",
              kpi.tone,
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">{kpi.label}</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight">{kpi.value}</p>
                <p className="mt-1 text-sm opacity-80">{kpi.detail}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
                {kpi.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Panorama preventivo</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">{resumen.empresa.nombre}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Seguimiento ejecutivo de documentación, acreditaciones y cumplimiento operativo.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900 px-4 py-3 text-right text-white shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">Cumplimiento general</p>
              <p className="mt-1 text-3xl font-semibold">
                {resumen.kpis.cumplimientoGeneral === null ? "—" : `${resumen.kpis.cumplimientoGeneral}%`}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MiniStat
              label="Empresa"
              value={`${resumen.documentos.empresa.completos}/${resumen.documentos.empresa.total}`}
              detail={`${resumen.documentos.empresa.pendientes} pendientes · ${resumen.documentos.empresa.vencidos} vencidos`}
            />
            <MiniStat
              label="Trabajadores"
              value={`${resumen.documentos.trabajadores.completos}/${resumen.documentos.trabajadores.total}`}
              detail={`${resumen.documentos.trabajadores.pendientes} pendientes · ${resumen.documentos.trabajadores.vencidos} vencidos`}
            />
            <MiniStat
              label="Vehículos"
              value={`${resumen.documentos.vehiculos.completos}/${resumen.documentos.vehiculos.total}`}
              detail={`${resumen.documentos.vehiculos.pendientes} pendientes · ${resumen.documentos.vehiculos.vencidos} vencidos`}
            />
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Acciones rápidas</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Operación diaria</h2>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <QuickAccessCard title="Control documental" description="Trabajadores" href="/dicaprev/trabajadores/control-documental" icon={<Users className="h-4 w-4" />} />
            <QuickAccessCard title="Vehículos" description="Flota y expedientes" href="/dicaprev/empresa/vehiculos" icon={<Car className="h-4 w-4" />} />
            <QuickAccessCard title="Acreditaciones" description="Solicitudes y expedientes" href="/dicaprev/acreditaciones" icon={<FileCheck2 className="h-4 w-4" />} />
            <QuickAccessCard title="Cumplimiento" description="Obligaciones y hallazgos" href="/dicaprev/cumplimiento" icon={<ShieldAlert className="h-4 w-4" />} />
            <QuickAccessCard title="Documentación empresa" description="Legales y corporativos" href="/dicaprev/documentacion" icon={<Building2 className="h-4 w-4" />} />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-5 md:grid-cols-3">
          <EstadoDocumentalCard
            title="Estado documental empresa"
            icon={<Building2 className="h-4 w-4" />}
            resumen={resumen.documentos.empresa}
            tone="blue"
          />
          <EstadoDocumentalCard
            title="Estado documental trabajadores"
            icon={<Users className="h-4 w-4" />}
            resumen={resumen.documentos.trabajadores}
            tone="violet"
          />
          <EstadoDocumentalCard
            title="Estado documental vehículos"
            icon={<Car className="h-4 w-4" />}
            resumen={resumen.documentos.vehiculos}
            tone="orange"
          />
        </div>

        <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Acreditaciones</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Estado operativo</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <MiniStat label="Activas" value={resumen.acreditaciones.activas} detail="En curso o listas para gestionar" />
            <MiniStat label="En preparación" value={resumen.acreditaciones.enPreparacion} detail="Expedientes en armado" />
            <MiniStat label="Con faltantes" value={resumen.acreditaciones.conFaltantes} detail="Documentación pendiente" />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Acreditaciones recientes</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Últimos expedientes</h2>
            </div>
            <Link href="/dicaprev/acreditaciones" className="text-sm font-medium text-slate-500 hover:text-slate-900">
              Ver módulo
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {resumen.acreditaciones.recientes.map((item) => (
              <Link
                key={item.id}
                href={`/dicaprev/acreditaciones/${item.id}`}
                className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition-colors hover:border-slate-300 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.mandante}</p>
                    <p className="truncate text-xs text-slate-500">{item.proyecto}</p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white">
                    {item.estado}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Avance</span>
                    <span>{item.progreso}%</span>
                  </div>
                  <Progress value={item.progreso} className="h-2" />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{item.faltantes} faltante{item.faltantes !== 1 ? "s" : ""}</span>
                  <span>{new Date(item.updatedAt).toLocaleDateString("es-CL")}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Riesgos y hallazgos</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Seguimiento abierto</h2>
            </div>
            <Link href="/dicaprev/cumplimiento/hallazgos" className="text-sm font-medium text-slate-500 hover:text-slate-900">
              Ver hallazgos
            </Link>
          </div>

          {resumen.hallazgos ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <MiniStat label="Abiertos" value={resumen.hallazgos.abiertos} detail="Pendientes de cierre" />
                <MiniStat label="Críticos" value={resumen.hallazgos.criticos} detail="Priorización inmediata" />
              </div>
              <div className="mt-4 space-y-3">
                {resumen.hallazgos.recientes.length > 0 ? (
                  resumen.hallazgos.recientes.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.descripcion}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.centroNombre}</p>
                        </div>
                        <span className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium",
                          item.prioridad === "Crítica" ? "bg-rose-100 text-rose-700" : item.prioridad === "Alta" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                        )}>
                          {item.prioridad}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>{item.estado}</span>
                        <span>Compromiso {new Date(item.fechaCompromiso).toLocaleDateString("es-CL")}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Sin hallazgos abiertos registrados.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Sin integración de hallazgos disponible.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function EstadoPasoBadge({ estado }: { estado: DashboardEjecutivoResponse["activacion"]["pasos"][number]["estado"] }) {
  if (estado === "completo") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> Completo
      </span>
    );
  }

  if (estado === "recomendado") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
        Recomendado
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      Pendiente
    </span>
  );
}

function MiniStat({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function QuickAccessCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function EstadoDocumentalCard({
  title,
  icon,
  resumen,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  resumen: DashboardEjecutivoResponse["documentos"]["empresa"];
  tone: "blue" | "violet" | "orange";
}) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
  } as const;

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", toneMap[tone])}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{resumen.total} documentos evaluados</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Cobertura</span>
          <span>{resumen.porcentaje}%</span>
        </div>
        <Progress value={resumen.porcentaje} className="h-2" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-emerald-50 px-3 py-2">
          <p className="text-lg font-semibold text-emerald-700">{resumen.completos}</p>
          <p className="text-[11px] text-emerald-600">Completos</p>
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-2">
          <p className="text-lg font-semibold text-amber-700">{resumen.pendientes}</p>
          <p className="text-[11px] text-amber-600">Pendientes</p>
        </div>
        <div className="rounded-xl bg-rose-50 px-3 py-2">
          <p className="text-lg font-semibold text-rose-700">{resumen.vencidos}</p>
          <p className="text-[11px] text-rose-600">Vencidos</p>
        </div>
      </div>
    </Card>
  );
}
