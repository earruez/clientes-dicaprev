import Link from "next/link";
import { AlertTriangle, BookCheck, CalendarClock, ClipboardList, FileCheck2, Gauge, ShieldCheck, Sparkles, Target } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getHallazgos } from "@/app/dicaprev/cumplimiento/hallazgos/actions";
import { getObligacionesCumplimientoEmpresa } from "@/app/dicaprev/cumplimiento/obligaciones/actions";
import { getPlanTrabajoData } from "@/app/dicaprev/cumplimiento/plan-trabajo/actions";

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

function getObligacionBadgeClass(estado: string): string {
  if (estado === "cumplida") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (estado === "con_brechas") return "bg-amber-100 text-amber-800 border-amber-200";
  if (estado === "no_cumplida") return "bg-rose-100 text-rose-800 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getObligacionEstadoLabel(estado: string): string {
  if (estado === "cumplida") return "Cumplida";
  if (estado === "con_brechas") return "Con brechas";
  if (estado === "no_cumplida") return "No cumplida";
  return "No aplica";
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

export default async function DS44Page() {
  const [obligacionesData, hallazgos, planTrabajo] = await Promise.all([
    getObligacionesCumplimientoEmpresa(),
    getHallazgos(),
    getPlanTrabajoData(),
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

  return (
    <div className="space-y-6 px-4 pb-8 pt-5 sm:px-6">
      <StandardPageHeader
        moduleLabel="DS44"
        title="Implementacion DS44"
        description="Diagnostico, obligaciones, brechas, evidencias y plan de implementacion para fiscalizacion y mejora continua."
        icon={ShieldCheck}
        iconWrapClassName="bg-slate-900"
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cumplimiento DS44 global</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{cumplimientoGlobal}%</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Obligaciones aplicables</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{obligacionesAplicables.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Obligaciones cumplidas</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">{obligacionesCumplidas}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Brechas abiertas</p>
            <p className="mt-2 text-2xl font-semibold text-rose-700">{hallazgosAbiertos.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Documentos pendientes</p>
            <p className="mt-2 text-2xl font-semibold text-amber-700">{documentosPendientes}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Acciones vencidas / proximas</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {accionesVencidas} / {accionesProximas}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Gauge className="h-5 w-5 text-slate-600" />
              Estado de implementacion
            </h2>
            <p className="text-sm text-slate-500">
              Visibilidad ejecutiva del avance DS44 y posicion actual para fiscalizacion.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Avance global</span>
                <span className="font-medium text-slate-900">{cumplimientoGlobal}%</span>
              </div>
              <Progress value={cumplimientoGlobal} className="h-2" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={getEstadoBadgeClass(estadoImplementacion)}>
                Estado: {estadoImplementacion}
              </Badge>
              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                Brechas estructurales: {obligacionesConBrechas + obligacionesNoCumplidas}
              </Badge>
            </div>

            <p className="text-sm leading-relaxed text-slate-600">
              Este modulo consolida el estado de cumplimiento DS44 para priorizar decisiones, ordenar evidencia
              fiscalizable y acelerar el cierre de brechas criticas con trazabilidad operativa en NextPrev.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Sparkles className="h-5 w-5 text-slate-600" />
              Accesos rapidos
            </h2>
            <p className="text-sm text-slate-500">Continua trabajando desde los frentes operativos principales.</p>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/dicaprev/cumplimiento/obligaciones">Obligaciones</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/dicaprev/cumplimiento/hallazgos">Hallazgos</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/dicaprev/cumplimiento/evidencias">Evidencias</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/dicaprev/cumplimiento/plan-trabajo">Plan de trabajo</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/dicaprev/documentacion">Documentacion</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <BookCheck className="h-5 w-5 text-slate-600" />
                Obligaciones aplicables
              </h2>
              <p className="text-sm text-slate-500">Estado resumido de obligaciones DS44 aplicables a la empresa.</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/dicaprev/cumplimiento/obligaciones">Ver obligaciones</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {obligacionesAplicables.slice(0, 6).map((obligacion) => (
              <div key={obligacion.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{obligacion.nombre}</p>
                  <Badge variant="outline" className={getObligacionBadgeClass(obligacion.estadoObligacion)}>
                    {getObligacionEstadoLabel(obligacion.estadoObligacion)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">Responsable sugerido: {obligacion.responsable}</p>
              </div>
            ))}
            {obligacionesAplicables.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                No hay obligaciones aplicables para mostrar.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <AlertTriangle className="h-5 w-5 text-slate-600" />
                Brechas criticas
              </h2>
              <p className="text-sm text-slate-500">Top 5 incumplimientos que requieren foco inmediato.</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/dicaprev/cumplimiento/hallazgos">Ver hallazgos</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {brechasCriticas.map((hallazgo) => (
              <div key={hallazgo.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{hallazgo.descripcion}</p>
                  <Badge variant="outline" className={getPrioridadBadgeClass(hallazgo.prioridad)}>
                    Prioridad {getPrioridadLabel(hallazgo.prioridad)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Responsable: {hallazgo.responsableNombre ?? "Por asignar"}
                </p>
                <p className="text-xs text-slate-500">Fecha compromiso: {formatDate(hallazgo.fechaCompromiso)}</p>
              </div>
            ))}
            {brechasCriticas.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                No hay brechas criticas abiertas.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <ClipboardList className="h-5 w-5 text-slate-600" />
                Plan de implementacion
              </h2>
              <p className="text-sm text-slate-500">
                Acciones derivadas del estado actual para cerrar brechas y sostener cumplimiento.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/dicaprev/cumplimiento/plan-trabajo">Ver plan de trabajo</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pendientes</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{accionesPendientes}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">En proceso</p>
              <p className="mt-1 text-xl font-semibold text-blue-700">{accionesEnProceso}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Vencidas</p>
              <p className="mt-1 text-xl font-semibold text-rose-700">{accionesVencidas}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <FileCheck2 className="h-5 w-5 text-slate-600" />
                Evidencias para fiscalizacion
              </h2>
              <p className="text-sm text-slate-500">
                Estado documental para respaldar cumplimiento frente a auditorias e inspecciones.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/dicaprev/cumplimiento/evidencias">Ver evidencias</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/dicaprev/documentacion">Documentacion</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Documentos vigentes</p>
              <p className="mt-1 text-xl font-semibold text-emerald-700">{documentosVigentes}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Por vencer</p>
              <p className="mt-1 text-xl font-semibold text-amber-700">{documentosPorVencer}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pendientes</p>
              <p className="mt-1 text-xl font-semibold text-rose-700">{documentosPendientes}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Target className="h-5 w-5 text-slate-600" />
              Proximas fases del modulo
            </h2>
            <p className="text-sm text-slate-500">Evolucion funcional planificada para la siguiente etapa comercial.</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              "Diagnostico DS44",
              "MIPER",
              "PRRD",
              "Autoevaluacion legal",
              "Reporte ejecutivo",
            ].map((fase) => (
              <div
                key={fase}
                className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 opacity-80"
              >
                <p className="text-sm font-medium text-slate-700">{fase}</p>
                <p className="mt-1 text-xs text-slate-500">Proximamente</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-slate-200 bg-slate-50/60">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-slate-700">
              ¿Que exige DS44, que esta cumplido y que debe resolverse primero? Este panel concentra la respuesta y
              conecta cada frente operativo para gestionar cumplimiento real y evidencia verificable.
            </p>
            <Button asChild>
              <Link href="/dicaprev/cumplimiento/obligaciones">
                Continuar implementacion
                <CalendarClock className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
