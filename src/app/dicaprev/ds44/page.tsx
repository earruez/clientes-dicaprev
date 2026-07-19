import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Target,
} from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getObligacionesCumplimientoEmpresa } from "@/app/dicaprev/cumplimiento/obligaciones/actions";
import { getPlanTrabajoData } from "@/app/dicaprev/cumplimiento/plan-trabajo/actions";
import { getDs44DiagnosticoResumen } from "./diagnostico/actions";

type EstadoImplementacion = "Inicial" | "En implementacion" | "En control" | "Fiscalizable";
type EstadoPaso = "pendiente" | "en_proceso" | "con_brechas" | "ok";

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

function getEstadoPasoClass(estado: EstadoPaso): string {
  if (estado === "ok") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (estado === "con_brechas") return "bg-rose-100 text-rose-700 border-rose-200";
  if (estado === "en_proceso") return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getEstadoPasoLabel(estado: EstadoPaso): string {
  if (estado === "ok") return "OK";
  if (estado === "con_brechas") return "Con brechas";
  if (estado === "en_proceso") return "En proceso";
  return "Pendiente";
}

function getRiesgoInmediato(args: {
  brechasCriticas: number;
  accionesVencidas: number;
  documentosPendientes: number;
}): string {
  const score = args.brechasCriticas * 3 + args.accionesVencidas * 2 + args.documentosPendientes;
  if (score >= 6) return "Alto";
  if (score >= 2) return "Medio";
  return "Bajo";
}

function getProximoPaso(args: {
  existeDiagnostico: boolean;
  brechasCriticas: number;
  accionesVencidas: number;
  estadoDiagnostico: string;
}): { titulo: string; detalle: string; href: string; cta: string } {
  if (!args.existeDiagnostico) {
    return {
      titulo: "Completa el diagnostico inicial DS44",
      detalle: "Sin diagnostico no es posible priorizar brechas ni ordenar el plan de implementacion.",
      href: "/dicaprev/ds44/diagnostico",
      cta: "Comenzar diagnostico",
    };
  }

  if (args.brechasCriticas > 0) {
    return {
      titulo: "Resuelve brechas criticas primero",
      detalle: "Atender estos hallazgos reduce el mayor riesgo operativo y documental del modulo.",
      href: "/dicaprev/cumplimiento/hallazgos",
      cta: "Ir a brechas criticas",
    };
  }

  if (args.accionesVencidas > 0) {
    return {
      titulo: "Regulariza acciones vencidas",
      detalle: "Actualiza responsables y fechas para recuperar avance del plan de implementacion.",
      href: "/dicaprev/cumplimiento/plan-trabajo",
      cta: "Ver acciones vencidas",
    };
  }

  if (args.estadoDiagnostico === "controlado") {
    return {
      titulo: "Manten seguimiento y evidencia",
      detalle: "La prioridad ahora es sostener controles y evidencia fiscalizable al dia.",
      href: "/dicaprev/cumplimiento/evidencias",
      cta: "Revisar evidencias",
    };
  }

  return {
    titulo: "Continua implementacion",
    detalle: "Consolida pendientes para llevar el modulo a estado de control.",
    href: "/dicaprev/cumplimiento/obligaciones",
    cta: "Ver obligaciones",
  };
}

export default async function DS44Page() {
  const [obligacionesData, planTrabajo, diagnosticoResumen] = await Promise.all([
    getObligacionesCumplimientoEmpresa(),
    getPlanTrabajoData(),
    getDs44DiagnosticoResumen(),
  ]);

  const obligacionesAplicables = obligacionesData.obligaciones.filter((ob) => ob.aplica);
  const obligacionesConBrechas = obligacionesAplicables.filter((ob) => ob.estadoObligacion === "con_brechas").length;
  const obligacionesNoCumplidas = obligacionesAplicables.filter((ob) => ob.estadoObligacion === "no_cumplida").length;

  const cumplimientoGlobal = obligacionesAplicables.length
    ? Math.round(
        obligacionesAplicables.reduce((acc, ob) => acc + ob.cumplimientoGlobal, 0) /
          obligacionesAplicables.length,
      )
    : 0;

  const estadoImplementacion = getEstadoImplementacion(cumplimientoGlobal);

  const now = new Date();
  const accionesPendientes = planTrabajo.acciones.filter((accion) => accion.estado === "pendiente").length;
  const accionesEnProceso = planTrabajo.acciones.filter((accion) => accion.estado === "en_proceso").length;
  const accionesVencidas = planTrabajo.acciones.filter((accion) => {
    const fechaCompromiso = normalizeDate(accion.fechaCompromiso);
    if (!fechaCompromiso || accion.estado === "cerrada") return false;
    return fechaCompromiso < now;
  }).length;

  const documentosEvaluables = obligacionesAplicables.filter((ob) => ob.requiereDocumento);
  const documentosPorVencer = documentosEvaluables.filter((ob) => ob.estadoDocumental === "Por vencer").length;
  const documentosPendientes = documentosEvaluables.filter((ob) => {
    return ob.estadoDocumental === "Pendiente de carga" || ob.estadoDocumental === "Vencido";
  }).length;

  const proximoPaso = getProximoPaso({
    existeDiagnostico: diagnosticoResumen.existeDiagnostico,
    brechasCriticas: diagnosticoResumen.brechasCriticas,
    accionesVencidas,
    estadoDiagnostico: diagnosticoResumen.estado,
  });

  const accionPrincipalHeader = diagnosticoResumen.existeDiagnostico
    ? "Continuar implementacion"
    : "Comenzar diagnostico";

  const riesgoInmediato = getRiesgoInmediato({
    brechasCriticas: diagnosticoResumen.brechasCriticas,
    accionesVencidas,
    documentosPendientes,
  });

  const pasos: Array<{
    numero: string;
    titulo: string;
    descripcion: string;
    href: string;
    cta: string;
    estado: EstadoPaso;
  }> = [
    {
      numero: "1",
      titulo: "Diagnostico inicial",
      descripcion: "Evalua los bloques minimos DS44 y genera brechas priorizadas.",
      href: "/dicaprev/ds44/diagnostico",
      cta: "Abrir diagnostico",
      estado: !diagnosticoResumen.existeDiagnostico
        ? "pendiente"
        : diagnosticoResumen.brechasCriticas + diagnosticoResumen.brechasAltas > 0
          ? "con_brechas"
          : diagnosticoResumen.estado === "controlado"
            ? "ok"
            : "en_proceso",
    },
    {
      numero: "2",
      titulo: "Obligaciones aplicables",
      descripcion: "Revisa que exige DS44 segun el estado actual de la empresa.",
      href: "/dicaprev/cumplimiento/obligaciones",
      cta: "Ver obligaciones",
      estado:
        obligacionesAplicables.length === 0
          ? "pendiente"
          : obligacionesConBrechas + obligacionesNoCumplidas > 0
            ? "con_brechas"
            : "ok",
    },
    {
      numero: "3",
      titulo: "Plan de implementacion",
      descripcion: "Ordena acciones, responsables y fechas de cierre.",
      href: "/dicaprev/cumplimiento/plan-trabajo",
      cta: "Ver plan",
      estado:
        accionesVencidas > 0
          ? "con_brechas"
          : accionesPendientes + accionesEnProceso > 0
            ? "en_proceso"
            : "ok",
    },
    {
      numero: "4",
      titulo: "Evidencias fiscalizables",
      descripcion: "Centraliza documentos y respaldos para fiscalizacion.",
      href: "/dicaprev/cumplimiento/evidencias",
      cta: "Ver evidencias",
      estado:
        documentosEvaluables.length === 0
          ? "pendiente"
          : documentosPendientes > 0
            ? "con_brechas"
            : documentosPorVencer > 0
              ? "en_proceso"
              : "ok",
    },
  ];

  const bloqueos: string[] = [];
  if (!diagnosticoResumen.existeDiagnostico) {
    bloqueos.push("Aun no existe diagnostico DS44. Este es el primer paso para calcular brechas reales.");
  }
  if (diagnosticoResumen.brechasCriticas > 0) {
    bloqueos.push("Hay brechas criticas que deben resolverse antes de considerar el modulo controlado.");
  }
  if (documentosPendientes > 0) {
    bloqueos.push("Hay documentos pendientes que afectan la evidencia fiscalizable.");
  }
  if (bloqueos.length === 0) {
    bloqueos.push("Sin bloqueos criticos visibles. Mantener seguimiento periodico.");
  }

  return (
    <div className="space-y-6 px-4 pb-8 pt-5 sm:px-6">
      <StandardPageHeader
        moduleLabel="DS44"
        title="Implementacion DS44"
        description="Guia paso a paso para diagnosticar, priorizar brechas y dejar evidencia fiscalizable."
        icon={ShieldCheck}
        iconWrapClassName="bg-slate-900"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/dicaprev/ds44/diagnostico">
                {accionPrincipalHeader}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dicaprev/cumplimiento/plan-trabajo">Ver plan de trabajo</Link>
            </Button>
          </div>
        }
      />

      <section>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="grid gap-5 p-5 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
            <div className="space-y-4">
              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                Paso recomendado
              </Badge>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{proximoPaso.titulo}</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">{proximoPaso.detalle}</p>
              </div>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={proximoPaso.href}>
                  {proximoPaso.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-semibold text-slate-900">Estado actual</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Estado DS44</span>
                  <Badge variant="outline" className={getEstadoBadgeClass(estadoImplementacion)}>
                    {estadoImplementacion}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Cumplimiento global</span>
                  <span className="font-semibold text-slate-900">{cumplimientoGlobal}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Riesgo inmediato</span>
                  <span className="font-semibold text-slate-900">{riesgoInmediato}</span>
                </div>
              </div>
              <Progress value={cumplimientoGlobal} className="mt-4 h-2" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Flujo de implementacion DS44</h2>
            <p className="text-sm text-slate-500">Completa los pasos en orden para avanzar de diagnostico a evidencia fiscalizable.</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
            {pasos.map((paso) => (
              <div key={paso.numero} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {paso.numero}
                  </div>
                  <Badge variant="outline" className={getEstadoPasoClass(paso.estado)}>
                    {getEstadoPasoLabel(paso.estado)}
                  </Badge>
                </div>
                <h3 className="text-base font-semibold text-slate-900">{paso.titulo}</h3>
                <p className="mt-1 text-sm text-slate-600">{paso.descripcion}</p>
                <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                  <Link href={paso.href}>{paso.cta}</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Cumplimiento global</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{cumplimientoGlobal}%</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Brechas criticas</p>
            <p className="mt-1 text-xl font-semibold text-rose-700">{diagnosticoResumen.brechasCriticas}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Documentos pendientes</p>
            <p className="mt-1 text-xl font-semibold text-amber-700">{documentosPendientes}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Acciones vencidas</p>
            <p className="mt-1 text-xl font-semibold text-rose-700">{accionesVencidas}</p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Bloqueos actuales
            </h2>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {bloqueos.slice(0, 3).map((bloqueo, idx) => (
              <div
                key={`${bloqueo}-${idx}`}
                className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-700"
              >
                {bloqueo}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Target className="h-4 w-4 text-slate-500" />
              Modulos proximos
            </h2>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 pt-0 sm:grid-cols-4">
            {["MIPER", "PRRD", "Autoevaluacion legal", "Reporte ejecutivo"].map((fase) => (
              <div key={fase} className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-700">{fase}</p>
                <p className="mt-1 text-xs text-slate-500">Proximamente</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <h2 className="text-base font-semibold text-slate-900">Accesos rapidos</h2>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 pt-0 sm:grid-cols-3">
            {[
              { href: "/dicaprev/ds44/diagnostico", label: "Diagnostico" },
              { href: "/dicaprev/cumplimiento/obligaciones", label: "Obligaciones" },
              { href: "/dicaprev/cumplimiento/plan-trabajo", label: "Plan" },
              { href: "/dicaprev/cumplimiento/evidencias", label: "Evidencias" },
              { href: "/dicaprev/cumplimiento/hallazgos", label: "Hallazgos" },
              { href: "/dicaprev/documentacion", label: "Documentacion" },
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
    </div>
  );
}
