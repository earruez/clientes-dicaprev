"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Cpu,
  FileText,
  TrendingUp,
  ArrowRight,
  ClipboardList,
  Users,
} from "lucide-react";
import { OBLIGACIONES_MOCK, CENTROS_MOCK, HALLAZGOS_MOCK, EVIDENCIAS_MOCK } from "../mock-data";
import { cn } from "@/lib/utils";
import {
  evaluarObligaciones,
  calcularResultadosPorEntidad,
  porcentajeGlobal,
  toEstadoObligacion,
  calcularTamañoEmpresa,
  type DocumentoEvaluable,
  type EntidadInput,
  type ResultadoEntidad,
  type TamanoEmpresa,
} from "@/lib/cumplimiento/cumplimiento-engine";
import { EMPRESA_MOCK } from "@/lib/empresa";
import { EstructurasObligatoriasCard } from "@/components/company";

// ─── helpers ─────────────────────────────────────────────────────────────────

const TAMANO_CFG: Record<TamanoEmpresa, { label: string; cls: string }> = {
  micro:   { label: "Micro",    cls: "bg-slate-100 text-slate-700 border border-slate-200" },
  pequena: { label: "Pequeña",  cls: "bg-amber-100 text-amber-700 border border-amber-200" },
  mediana: { label: "Mediana",  cls: "bg-blue-100 text-blue-700 border border-blue-200" },
  grande:  { label: "Grande",   cls: "bg-violet-100 text-violet-700 border border-violet-200" },
};

const barColor = (pct: number) => {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-rose-500";
};

const textColor = (pct: number) => {
  if (pct >= 80) return "text-emerald-700";
  if (pct >= 50) return "text-amber-700";
  return "text-rose-700";
};

function ResultadoCard({ resultado, nombre }: { resultado: ResultadoEntidad; nombre: string }) {
  const pct = resultado.porcentajeCumplimiento;
  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
          <p className="text-sm font-semibold text-slate-800 leading-snug">{nombre}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className={cn("h-2 rounded-full transition-all", barColor(pct))} style={{ width: `${pct}%` }} />
          </div>
          <span className={cn("text-sm font-bold w-10 text-right", textColor(pct))}>{pct}%</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {resultado.cumplidas > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="h-3 w-3" /> {resultado.cumplidas} cumplida{resultado.cumplidas !== 1 ? "s" : ""}
            </span>
          )}
          {resultado.vencidas > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
              <AlertTriangle className="h-3 w-3" /> {resultado.vencidas} vencida{resultado.vencidas !== 1 ? "s" : ""}
            </span>
          )}
          {resultado.pendientes > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-100">
              <XCircle className="h-3 w-3" /> {resultado.pendientes} pendiente{resultado.pendientes !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-400">
          {resultado.totalObligaciones} obligaciones evaluadas
        </p>
      </CardContent>
    </Card>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function CumplimientoResumenPage() {

  // ── Tamaño de empresa ────────────────────────────────────────────────────
  const tamanoEmpresa = calcularTamañoEmpresa(EMPRESA_MOCK.cantidadTrabajadores);
  const noAplicanPorTamano = OBLIGACIONES_MOCK.filter(
    (o) => o.tamañosAplica?.length && !o.tamañosAplica.includes(tamanoEmpresa)
  ).length;

  /** Documentos reales derivados de evidencias → hallazgos → obligaciones */
  const docs = useMemo<DocumentoEvaluable[]>(() => {
    return EVIDENCIAS_MOCK.flatMap((ev) => {
      const hallazgo = HALLAZGOS_MOCK.find((h) => h.id === ev.hallazgoId);
      if (!hallazgo?.obligacionId) return [];
      const ob = OBLIGACIONES_MOCK.find((o) => o.id === hallazgo.obligacionId);
      return [{
        id: ev.id,
        nombre: ev.nombre,
        tipo: String(ev.tipoDocumento),
        entidadId: hallazgo.centroId,
        entidadTipo: "centro" as const,
        obligacionId: hallazgo.obligacionId,
        fechaVencimiento: ob?.vencimiento,
      }];
    });
  }, []);

  const entidades = useMemo<EntidadInput[]>(
    () => CENTROS_MOCK.map((c) => ({ id: c.id, tipo: "centro" as const })),
    []
  );

  const evaluaciones = useMemo(
    () => evaluarObligaciones(OBLIGACIONES_MOCK, docs, entidades, new Date(), tamanoEmpresa),
    [docs, entidades, tamanoEmpresa]
  );

  const resultadosPorEntidad = useMemo<ResultadoEntidad[]>(
    () => calcularResultadosPorEntidad(evaluaciones, entidades),
    [evaluaciones, entidades]
  );

  const globalPct = useMemo(() => porcentajeGlobal(evaluaciones), [evaluaciones]);

  /** Breakdown de evaluaciones globales */
  const totalCumplidas = evaluaciones.filter((e) => e.estado === "cumplido").length;
  const totalVencidas  = evaluaciones.filter((e) => e.estado === "vencido").length;
  const totalPendientes = evaluaciones.filter((e) => e.estado === "pendiente").length;
  const totalDocs = evaluaciones.filter((e) => e.fuenteTipo === "documento").length;

  /** Porcentaje global considerando estados del mock donde no hubo evidencia real */
  const promedioMock = Math.round(
    OBLIGACIONES_MOCK.reduce((s, o) => s + o.cumplimientoGlobal, 0) / OBLIGACIONES_MOCK.length
  );

  return (
    <div className="min-h-screen bg-slate-50/80 py-10">
      <div className="mx-auto max-w-6xl space-y-8 px-4 lg:px-0">

        {/* ── header ── */}
        <header>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Resumen de cumplimiento
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 pl-[3.25rem]">
            Estado consolidado del cumplimiento normativo DS44 por centro de trabajo. Los porcentajes se calculan en tiempo real desde el motor de documentos.
          </p>
        </header>

        {/* ── motor badge ── */}
        <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Cpu className="h-4 w-4 shrink-0 text-blue-600" />
          <span>
            Cálculo automático activo —{" "}
            <strong>{evaluaciones.length}</strong> evaluaciones procesadas,{" "}
            <strong>{totalDocs}</strong> basadas en documentos reales.
          </span>
        </div>

        {/* ── dotación context chip ── */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <Users className="h-4 w-4 shrink-0 text-slate-400" />
          <span>
            Dotación considerada:{" "}
            <strong>{EMPRESA_MOCK.cantidadTrabajadores} trabajadores</strong>
          </span>
          <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
            TAMANO_CFG[tamanoEmpresa].cls
          )}>
            Empresa {TAMANO_CFG[tamanoEmpresa].label}
          </span>
          {noAplicanPorTamano > 0 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
              {noAplicanPorTamano} obligación{noAplicanPorTamano !== 1 ? "es" : ""} no aplican a este tamaño
            </span>
          )}
        </div>

        {/* ── estructuras obligatorias ── */}
        <EstructurasObligatoriasCard
          cantidadTrabajadores={EMPRESA_MOCK.cantidadTrabajadores}
        />

        {/* ── KPIs globales ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Cumplimiento global",
              value: `${globalPct}%`,
              sub: "Calculado desde documentos reales",
              icon: <Cpu className="h-5 w-5" />,
              cls: "from-blue-50 to-blue-100 text-blue-700",
            },
            {
              label: "Cumplidas",
              value: totalCumplidas,
              sub: `de ${evaluaciones.length} evaluaciones`,
              icon: <CheckCircle2 className="h-5 w-5" />,
              cls: "from-emerald-50 to-emerald-100 text-emerald-700",
            },
            {
              label: "Vencidas",
              value: totalVencidas,
              sub: "Documento existe pero vencido",
              icon: <AlertTriangle className="h-5 w-5" />,
              cls: "from-amber-50 to-amber-100 text-amber-700",
            },
            {
              label: "Sin evidencia",
              value: totalPendientes,
              sub: "Sin documento real asociado",
              icon: <XCircle className="h-5 w-5" />,
              cls: "from-rose-50 to-rose-100 text-rose-700",
            },
          ].map((kpi) => (
            <Card key={kpi.label} className={`border-none shadow-sm bg-gradient-to-br ${kpi.cls}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">{kpi.icon}
                  <p className="text-[11px] font-semibold uppercase tracking-wide">{kpi.label}</p>
                </div>
                <p className="text-3xl font-semibold">{kpi.value}</p>
                <p className="mt-1 text-[11px] opacity-80">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── barra global ── */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-700">Cumplimiento DS44 global</p>
              <span className={cn("text-xl font-bold", textColor(globalPct))}>{globalPct}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div className={cn("h-3 rounded-full transition-all", barColor(globalPct))} style={{ width: `${globalPct}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> Calculado por motor (solo docs reales)</span>
              <span>Promedio manual previo: {promedioMock}%</span>
            </div>
          </CardContent>
        </Card>

        {/* ── por entidad ── */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Resultado por centro de trabajo
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {resultadosPorEntidad.map((r) => {
              const centro = CENTROS_MOCK.find((c) => c.id === r.entidadId);
              return (
                <ResultadoCard
                  key={r.entidadId}
                  resultado={r}
                  nombre={centro?.nombre ?? r.entidadId}
                />
              );
            })}
          </div>
        </div>

        {/* ── tabla detallada ── */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Detalle de evaluaciones ({evaluaciones.length})
          </h2>
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      <th className="py-3 text-left pl-2">Obligación</th>
                      <th className="py-3 text-left">Centro</th>
                      <th className="py-3 text-left">Estado</th>
                      <th className="py-3 text-left">Fuente</th>
                      <th className="py-3 text-left">Documento</th>
                      <th className="py-3 text-left">Vencimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluaciones.map((ev, i) => {
                      const centro = CENTROS_MOCK.find((c) => c.id === ev.entidadId);
                      const esDoc = ev.fuenteTipo === "documento";
                      const estadoCls =
                        ev.estado === "cumplido"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : ev.estado === "vencido"
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : "bg-rose-50 text-rose-600 border-rose-100";
                      return (
                        <tr key={i} className="border-b last:border-0 hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 pl-2 text-slate-800 font-medium max-w-xs">
                            <span className="line-clamp-1">{ev.obligacionNombre}</span>
                          </td>
                          <td className="py-2.5 text-slate-500 text-xs">{centro?.nombre ?? ev.entidadId}</td>
                          <td className="py-2.5">
                            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border", estadoCls)}>
                              {ev.estado === "cumplido" && <CheckCircle2 className="h-3 w-3" />}
                              {ev.estado === "vencido"  && <AlertTriangle className="h-3 w-3" />}
                              {ev.estado === "pendiente" && <XCircle className="h-3 w-3" />}
                              {ev.estado === "cumplido" ? "Cumplido"
                                : ev.estado === "vencido" ? "Vencido"
                                : "Pendiente"}
                            </span>
                          </td>
                          <td className="py-2.5">
                            {esDoc ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                <Cpu className="h-2.5 w-2.5" /> Documento
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200">
                                Sin datos
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-xs text-slate-500">
                            {ev.fuenteId ? (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3 text-slate-400 shrink-0" />
                                {ev.fuenteId}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-2.5 text-xs text-slate-500">
                            {ev.fechaVencimiento ?? <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Próximos pasos ── */}
        {(() => {
          const criticos = HALLAZGOS_MOCK.filter(
            (h) => h.prioridad === "critica" && h.estado !== "cerrado"
          ).length;
          return (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Próximos pasos
              </p>
              <div className="flex flex-wrap gap-2">
                {criticos > 0 && (
                  <Link
                    href="/dicaprev/cumplimiento/hallazgos"
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors shadow-sm"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Revisar {criticos} hallazgo{criticos !== 1 ? "s" : ""} crítico{criticos !== 1 ? "s" : ""}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
                <Link
                  href="/dicaprev/cumplimiento/plan-trabajo"
                  className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Ir al plan de trabajo
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {totalPendientes > 0 && (
                  <Link
                    href="/dicaprev/cumplimiento/evidencias"
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors shadow-sm"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Subir {totalPendientes} documento{totalPendientes !== 1 ? "s" : ""} faltante{totalPendientes !== 1 ? "s" : ""}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
