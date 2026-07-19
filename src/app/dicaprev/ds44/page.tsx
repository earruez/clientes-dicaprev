import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookCheck,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  ShieldCheck,
  Siren,
  Target,
} from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getHallazgos } from "@/app/dicaprev/cumplimiento/hallazgos/actions";
import { getObligacionesCumplimientoEmpresa } from "@/app/dicaprev/cumplimiento/obligaciones/actions";
import { getPlanTrabajoData } from "@/app/dicaprev/cumplimiento/plan-trabajo/actions";
import { getDs44DiagnosticoResumen } from "./diagnostico/actions";

type EstadoImplementacion = "Inicial" | "En implementacion" | "En control" | "Fiscalizable";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(date);
}

function normalizeDate(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getEstadoImplementacion(cumplimientoGlobal: number): EstadoImplementacion {
  if (cumplimientoGlobal < 25) return "Inicial";
  if (cumplimientoGlobal < 60) return "En implementacion";
  if (cumplimientoGlobal < 85) return "En control";
  return "Fiscalizable";
}

function getEstadoBadgeClass(estado: EstadoImplementacion): string {
  if (estado === "Fiscalizable") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (estado === "En control") return "bg-blue-100 text-blue-800 border-blue-200";
  if (estado === "En implementacion") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getPrioridadBadgeClass(prioridad: string): string {
  if (prioridad === "critica") return "bg-rose-100 text-rose-800 border-rose-200";
  if (prioridad === "alta") return "bg-orange-100 text-orange-800 border-orange-200";
  if (prioridad === "media") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getPrioridadLabel(prioridad: string): string {
  if (prioridad === "critica") return "Critica";
  if (prioridad === "alta") return "Alta";
  if (prioridad === "media") return "Media";
  return "Baja";
}

function getEstadoDiagnosticoClass(estado: string): string {
  if (estado === "controlado") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (estado === "con_brechas") return "bg-amber-100 text-amber-800 border-amber-200";
  if (estado === "en_evaluacion") return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getEstadoDiagnosticoLabel(estado: string): string {
  if (estado === "controlado") return "Controlado";
  if (estado === "con_brechas") return "Con brechas";
  if (estado === "en_evaluacion") return "En evaluacion";
  return "Sin diagnostico";
}

function isHallazgoAbierto(estado: string): boolean {
  return estado !== "cerrado" && estado !== "resuelto";
}

function sortByPrioridad(a: string, b: string): number {
  const weight: Record<string, number> = {
    critica: 4,
    alta: 3,
    media: 2,
    baja: 1,
  };
  return (weight[b] ?? 0) - (weight[a] ?? 0);
}

function getProximoPaso(args: {
  existeDiagnostico: boolean;
  brechasCriticas: number;
  accionesVencidas: number;
  estadoDiagnostico: string;
}): { titulo: string; detalle: string; href: string; cta: string } {
  if (!args.existeDiagnostico) {
    return {
      titulo: "Completar diagnostico inicial",
      detalle: "Levanta brechas prioritarias y define el plan base de implementacion.",
      href: "/dicaprev/ds44/diagnostico",
      cta: "Iniciar diagnostico",
    };
  }

  if (args.brechasCriticas > 0) {
    return {
      titulo: "Resolver brechas criticas",
      detalle: "Prioriza hallazgos de alta exposicion para reducir riesgo inmediato.",
      href: "/dicaprev/cumplimiento/hallazgos",
      cta: "Ir a hallazgos",
    };
  }

  if (args.accionesVencidas > 0) {
    return {
      titulo: "Revisar acciones vencidas",
      detalle: "Reprograma responsables y fechas para recuperar control operativo.",
      href: "/dicaprev/cumplimiento/plan-trabajo",
      cta: "Ver plan vencido",
    };
  }

  if (args.estadoDiagnostico === "controlado") {
    return {
      titulo: "Mantener seguimiento",
      detalle: "Sostener control documental y trazabilidad para fiscalizacion.",
      href: "/dicaprev/cumplimiento/evidencias",
      cta: "Revisar evidencias",
    };
  }

  return {
    titulo: "Continuar implementacion",
    detalle: "Consolida el cumplimiento pendiente y monitorea riesgos emergentes.",
    href: "/dicaprev/cumplimiento/obligaciones",
    cta: "Ver obligaciones",
  };
}

export default async function DS44Page() {
  const [obligacionesData, hallazgos, planTrabajo, diagnosticoResumen] = await Promise.all([
    getObligacionesCumplimientoEmpresa(),
    getHallazgos(),
    getPlanTrabajoData(),
    getDs44DiagnosticoResumen(),
  ]);

  const obligacionesAplicables = obligacionesData.obligaciones.filter((ob) => ob.aplica);
  const obligacionesCumplidas = obligacionesAplicables.filter((ob) => ob.estadoObligacion === "cumplida").length;
  const obligacionesConBrechas = obligacionesAplicables.filter((ob) => ob.estadoObligacion === "con_brechas").length;
  const obligacionesNoCumplidas = obligacionesAplicables.filter((ob) => ob.estadoObligacion === "no_cumplida").length;

  const cumplimientoGlobal = obligacionesAplicables.length
    ? Math.round(
        obligacionesAplicables.reduce((acc, ob) => acc + ob.cumplimientoGlobal, 0) /
          obligacionesAplicables.length,
      )
    : 0;

  const estadoImplementacion = getEstadoImplementacion(cumplimientoGlobal);

  const hallazgosAbiertos = hallazgos.filter((hallazgo) => isHallazgoAbierto(hallazgo.estado));
  const brechasCriticas = [...hallazgosAbiertos]
    .sort((a, b) => {
      const byPrioridad = sortByPrioridad(a.prioridad, b.prioridad);
      if (byPrioridad !== 0) return byPrioridad;
      return new Date(a.fechaCompromiso).getTime() - new Date(b.fechaCompromiso).getTime();
    })
    .slice(0, 5);

  const now = new Date();
  const in14Days = new Date(now);
  in14Days.setDate(in14Days.getDate() + 14);

  const accionesPendientes = planTrabajo.acciones.filter((accion) => accion.estado === "pendiente").length;
  const accionesEnProceso = planTrabajo.acciones.filter((accion) => accion.estado === "en_proceso").length;
  const accionesVencidas = planTrabajo.acciones.filter((accion) => {
    const fechaCompromiso = normalizeDate(accion.fechaCompromiso);
    if (!fechaCompromiso || accion.estado === "cerrada") return false;
    return fechaCompromiso < now;
  }).length;
  const accionesProximas = planTrabajo.acciones.filter((accion) => {
    const fechaCompromiso = normalizeDate(accion.fechaCompromiso);
    if (!fechaCompromiso || accion.estado === "cerrada") return false;
    return fechaCompromiso >= now && fechaCompromiso <= in14Days;
  }).length;

  const documentosEvaluables = obligacionesAplicables.filter((ob) => ob.requiereDocumento);
  const documentosVigentes = documentosEvaluables.filter((ob) => ob.estadoDocumental === "Vigente").length;
  const documentosPorVencer = documentosEvaluables.filter((ob) => ob.estadoDocumental === "Por vencer").length;
  const documentosPendientes = documentosEvaluables.filter((ob) => {
    return ob.estadoDocumental === "Pendiente de carga" || ob.estadoDocumental === "Vencido";
  }).length;

  const diagnosticoCta = diagnosticoResumen.existeDiagnostico ? "Ver diagnostico" : "Iniciar diagnostico";
  const proximoPaso = getProximoPaso({
    existeDiagnostico: diagnosticoResumen.existeDiagnostico,
    brechasCriticas: diagnosticoResumen.brechasCriticas,
    accionesVencidas,
    estadoDiagnostico: diagnosticoResumen.estado,
  });

  const riesgoMensaje =
    diagnosticoResumen.brechasCriticas + accionesVencidas + documentosPendientes > 0
      ? "Existen frentes criticos que requieren accion en el corto plazo."
      : "Sin alertas criticas activas; mantener seguimiento semanal para sostener el control.";

  return (
    <div className="space-y-6 px-4 pb-8 pt-5 sm:px-6">
      <StandardPageHeader
        moduleLabel="DS44"
        title="Implementacion DS44"
        description="Panel ejecutivo para saber que aplica, que falta y que resolver primero."
        icon={ShieldCheck}
        iconWrapClassName="bg-slate-900"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/dicaprev/ds44/diagnostico">
                {diagnosticoCta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dicaprev/cumplimiento/plan-trabajo">Ver plan de trabajo</Link>
            </Button>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5 border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <h2 className="text-lg font-semibold text-slate-900">Estado actual DS44</h2>
            <p className="text-sm text-slate-500">Resumen del nivel de implementacion y control vigente.</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline" className={getEstadoBadgeClass(estadoImplementacion)}>
                Estado: {estadoImplementacion}
              </Badge>
              <span className="text-sm font-medium text-slate-700">Cumplimiento global: {cumplimientoGlobal}%</span>
            </div>
            <Progress value={cumplimientoGlobal} className="h-2" />
            <p className="text-sm text-slate-600">
              {obligacionesCumplidas} de {obligacionesAplicables.length} obligaciones aplicables se encuentran cumplidas.
            </p>
          </CardContent>
        </Card>

        <Card className="xl:col-span-4 border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <h2 className="text-lg font-semibold text-slate-900">Proximo paso recomendado</h2>
            <p className="text-sm text-slate-500">Enfoque sugerido segun el estado actual.</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div>
              <p className="text-base font-semibold text-slate-900">{proximoPaso.titulo}</p>
              <p className="mt-1 text-sm text-slate-600">{proximoPaso.detalle}</p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link href={proximoPaso.href}>
                {proximoPaso.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="xl:col-span-3 border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Siren className="h-5 w-5 text-rose-500" />
              Riesgo inmediato
            </h2>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Brechas criticas</span>
                <span className="font-semibold text-rose-700">{diagnosticoResumen.brechasCriticas}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Acciones vencidas</span>
                <span className="font-semibold text-rose-700">{accionesVencidas}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Documentos pendientes</span>
                <span className="font-semibold text-amber-700">{documentosPendientes}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">{riesgoMensaje}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Obligaciones aplicables</p>
              <BookCheck className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-xl font-semibold text-slate-900">{obligacionesAplicables.length}</p>
            <p className="text-[11px] text-slate-500">Marco vigente</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Obligaciones cumplidas</p>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-xl font-semibold text-emerald-700">{obligacionesCumplidas}</p>
            <p className="text-[11px] text-slate-500">Controles implementados</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Brechas abiertas</p>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-xl font-semibold text-rose-700">{hallazgosAbiertos.length}</p>
            <p className="text-[11px] text-slate-500">Hallazgos activos</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Documentos pendientes</p>
              <FileCheck2 className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-xl font-semibold text-amber-700">{documentosPendientes}</p>
            <p className="text-[11px] text-slate-500">Carga o renovacion</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Acciones vencidas / proximas</p>
              <CalendarClock className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-xl font-semibold text-slate-900">
              {accionesVencidas} / {accionesProximas}
            </p>
            <p className="text-[11px] text-slate-500">Control de plazos</p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Frentes de trabajo DS44</h2>
            <p className="text-sm text-slate-500">Gestiona cada frente operativo desde una vista resumida y accionable.</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <ClipboardCheck className="h-4 w-4 text-slate-500" />
                  Diagnostico
                </h3>
                <Badge variant="outline" className={getEstadoDiagnosticoClass(diagnosticoResumen.estado)}>
                  {getEstadoDiagnosticoLabel(diagnosticoResumen.estado)}
                </Badge>
              </div>
              <p className="text-sm text-slate-600">Estado y brechas detectadas en el cuestionario inicial.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Ultimo score</p>
                  <p className="font-semibold text-slate-900">{diagnosticoResumen.scoreGlobal ?? "--"}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Brechas criticas/altas</p>
                  <p className="font-semibold text-slate-900">
                    {diagnosticoResumen.brechasCriticas}/{diagnosticoResumen.brechasAltas}
                  </p>
                </div>
              </div>
              <Button asChild size="sm" className="mt-4 w-full sm:w-auto">
                <Link href="/dicaprev/ds44/diagnostico">Continuar diagnostico</Link>
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <BookCheck className="h-4 w-4 text-slate-500" />
                <h3 className="text-base font-semibold text-slate-900">Obligaciones</h3>
              </div>
              <p className="text-sm text-slate-600">Seguimiento del marco aplicable y nivel de cumplimiento.</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Aplicables</p>
                  <p className="font-semibold text-slate-900">{obligacionesAplicables.length}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Cumplidas</p>
                  <p className="font-semibold text-emerald-700">{obligacionesCumplidas}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Pendientes</p>
                  <p className="font-semibold text-amber-700">{obligacionesConBrechas + obligacionesNoCumplidas}</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="mt-4 w-full sm:w-auto">
                <Link href="/dicaprev/cumplimiento/obligaciones">Ver obligaciones</Link>
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-slate-500" />
                <h3 className="text-base font-semibold text-slate-900">Plan de implementacion</h3>
              </div>
              <p className="text-sm text-slate-600">Acciones de cierre para mantener cumplimiento continuo.</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Pendientes</p>
                  <p className="font-semibold text-slate-900">{accionesPendientes}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">En proceso</p>
                  <p className="font-semibold text-blue-700">{accionesEnProceso}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Vencidas</p>
                  <p className="font-semibold text-rose-700">{accionesVencidas}</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="mt-4 w-full sm:w-auto">
                <Link href="/dicaprev/cumplimiento/plan-trabajo">Ver plan</Link>
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-slate-500" />
                <h3 className="text-base font-semibold text-slate-900">Evidencias</h3>
              </div>
              <p className="text-sm text-slate-600">Cobertura documental para auditorias e inspecciones.</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Vigentes</p>
                  <p className="font-semibold text-emerald-700">{documentosVigentes}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Por vencer</p>
                  <p className="font-semibold text-amber-700">{documentosPorVencer}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Pendientes</p>
                  <p className="font-semibold text-rose-700">{documentosPendientes}</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="mt-4 w-full sm:w-auto">
                <Link href="/dicaprev/cumplimiento/evidencias">Ver evidencias</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <h2 className="text-base font-semibold text-slate-900">Brechas criticas activas</h2>
            <p className="text-sm text-slate-500">Top 5 hallazgos para seguimiento inmediato.</p>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {brechasCriticas.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                Sin brechas criticas activas en este momento.
              </p>
            ) : (
              brechasCriticas.map((hallazgo) => (
                <div key={hallazgo.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{hallazgo.descripcion}</p>
                    <Badge variant="outline" className={getPrioridadBadgeClass(hallazgo.prioridad)}>
                      {getPrioridadLabel(hallazgo.prioridad)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Responsable: {hallazgo.responsableNombre ?? "Por asignar"} · Compromiso: {formatDate(hallazgo.fechaCompromiso)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <h2 className="text-base font-semibold text-slate-900">Accesos rapidos</h2>
            <p className="text-sm text-slate-500">Atajos a frentes secundarios de gestion.</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 pt-0 sm:grid-cols-3">
            {[
              { href: "/dicaprev/cumplimiento/hallazgos", label: "Hallazgos" },
              { href: "/dicaprev/cumplimiento/obligaciones", label: "Obligaciones" },
              { href: "/dicaprev/cumplimiento/plan-trabajo", label: "Plan" },
              { href: "/dicaprev/cumplimiento/evidencias", label: "Evidencias" },
              { href: "/dicaprev/documentacion", label: "Documentacion" },
              { href: "/dicaprev/capacitacion", label: "Capacitaciones" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Target className="h-4 w-4 text-slate-500" />
                Modulos proximos
              </h2>
              <p className="text-sm text-slate-500">Proxima evolucion funcional de DS44.</p>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 pt-0 sm:grid-cols-4">
            {[
              "MIPER",
              "PRRD",
              "Autoevaluacion legal",
              "Reporte ejecutivo",
            ].map((fase) => (
              <div
                key={fase}
                className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3"
              >
                <p className="text-sm font-medium text-slate-700">{fase}</p>
                <p className="mt-1 text-xs text-slate-500">Proximamente</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
