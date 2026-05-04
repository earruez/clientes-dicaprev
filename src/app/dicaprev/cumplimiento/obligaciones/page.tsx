"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Minus,
  Building2,
  CalendarDays,
  X,
  Cpu,
  FileText,
  Users,
} from "lucide-react";
import { OBLIGACIONES_MOCK, CENTROS_MOCK, HALLAZGOS_MOCK, EVIDENCIAS_MOCK } from "../mock-data";
import type { ObligacionCumplimiento, EstadoObligacion } from "../types";
import {
  evaluarObligaciones,
  toEstadoObligacion,
  calcularTamañoEmpresa,
  type DocumentoEvaluable,
  type EntidadInput,
  type EvaluacionCumplimiento,
  type TamanoEmpresa,
} from "@/lib/cumplimiento/cumplimiento-engine";
import { EMPRESA_MOCK } from "@/lib/empresa";
import { cn } from "@/lib/utils";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

// ---- helpers ----------------------------------------------------------------

const TAMANO_CFG: Record<TamanoEmpresa, { label: string; cls: string }> = {
  micro:   { label: "Micro",    cls: "bg-slate-100 text-slate-700 border border-slate-200" },
  pequena: { label: "Pequeña",  cls: "bg-amber-100 text-amber-700 border border-amber-200" },
  mediana: { label: "Mediana",  cls: "bg-blue-100 text-blue-700 border border-blue-200" },
  grande:  { label: "Grande",   cls: "bg-violet-100 text-violet-700 border border-violet-200" },
};

const ESTADO_OBLIGACION_CFG: Record<
  EstadoObligacion,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  cumplida: {
    label: "Cumplida",
    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  con_brechas: {
    label: "Con brechas",
    cls: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  no_cumplida: {
    label: "No cumplida",
    cls: "bg-rose-50 text-rose-700 border border-rose-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  no_aplica: {
    label: "No aplica",
    cls: "bg-slate-100 text-slate-500 border border-slate-200",
    icon: <Minus className="h-3.5 w-3.5" />,
  },
};

const globalBarColor = (pct: number) => {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-rose-500";
};

const formateaFecha = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL");
};

// ---- drawer -----------------------------------------------------------------

function ObligacionDrawer({
  obligacion,
  evalMap,
  onClose,
}: {
  obligacion: ObligacionCumplimiento;
  evalMap: Map<string, EvaluacionCumplimiento>;
  onClose: () => void;
}) {
  return (
    <>
      {/* overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* panel */}
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Detalle de obligación
            </p>
            <h2 className="mt-1 text-base font-semibold text-slate-900 leading-snug">
              {obligacion.nombre}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* global */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Cumplimiento global
            </p>
            <div className="flex items-center gap-3">
              <Progress value={obligacion.cumplimientoGlobal} className="flex-1 h-2" />
              <span className="text-sm font-semibold text-slate-800 w-10 text-right">
                {obligacion.cumplimientoGlobal}%
              </span>
            </div>
          </div>

          {/* meta */}
          <div className="space-y-2.5">
            {[
              { label: "Tipo", value: obligacion.tipo },
              { label: "Frecuencia", value: obligacion.frecuencia },
              { label: "Responsable", value: obligacion.responsable },
              { label: "Vencimiento", value: formateaFecha(obligacion.vencimiento) },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-slate-500">{row.label}</span>
                <span className="font-medium text-slate-800">{row.value}</span>
              </div>
            ))}
          </div>

          {/* descripción */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
              Descripción
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{obligacion.descripcion}</p>
          </div>

          {/* estado por centro */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Estado por centro de trabajo
            </p>
            <div className="space-y-2">
              {CENTROS_MOCK.map((c) => {
                const estado: EstadoObligacion =
                  obligacion.estadosPorCentro[c.id] ?? "no_aplica";
                const cfg = ESTADO_OBLIGACION_CFG[estado];
                const ev = evalMap.get(`${obligacion.id}:${c.id}`);
                const calculado = ev?.fuenteTipo === "documento";
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      {c.nombre}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {calculado && (
                        <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100" title={`Fuente: ${ev.fuenteId}`}>
                          <Cpu className="h-2.5 w-2.5" /> Auto
                        </span>
                      )}
                      {!calculado && ev?.fuenteTipo === "manual" && (
                        <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200" title="Sin documento real">
                          Sin datos
                        </span>
                      )}
                      <span
                        className={
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                          cfg.cls
                        }
                      >
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] text-slate-400 flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              Los estados marcados como <strong className="text-blue-600">Auto</strong> son calculados por el motor a partir de documentos reales.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

// ---- page -------------------------------------------------------------------

export default function ObligacionesPage() {
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | EstadoObligacion>("todos");
  const [selected, setSelected] = useState<ObligacionCumplimiento | null>(null);

  // ── Tamaño de empresa ───────────────────────────────────────────────────
  const tamanoEmpresa = calcularTamañoEmpresa(EMPRESA_MOCK.cantidadTrabajadores);
  /** Obligaciones que aplican para este tamaño de empresa */
  const obligacionesAplicables = useMemo(
    () => OBLIGACIONES_MOCK.filter(
      (o) => !o.tamañosAplica?.length || o.tamañosAplica.includes(tamanoEmpresa)
    ),
    [tamanoEmpresa]
  );
  const noAplicanPorTamano = OBLIGACIONES_MOCK.length - obligacionesAplicables.length;

  // ── Engine setup ──────────────────────────────────────────────────────────

  /** Convertir evidencias del mock a DocumentoEvaluable via sus hallazgos */
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

  const evaluaciones = useMemo<EvaluacionCumplimiento[]>(
    () => evaluarObligaciones(obligacionesAplicables, docs, entidades, new Date(), tamanoEmpresa),
    [docs, entidades, obligacionesAplicables, tamanoEmpresa]
  );

  /** Lookup: "obligacionId:centroId" → evaluacion */
  const evalMap = useMemo(() => {
    const m = new Map<string, EvaluacionCumplimiento>();
    evaluaciones.forEach((e) => m.set(`${e.obligacionId}:${e.entidadId}`, e));
    return m;
  }, [evaluaciones]);

  /**
   * Obligaciones enriquecidas: solo sobreescribimos `estadosPorCentro`
   * donde el motor encontró un documento real (fuenteTipo === "documento").
   * Donde no hay evidencia real, conservamos el estado del mock.
   */
  const obligacionesVivas = useMemo<ObligacionCumplimiento[]>(() => {
    return obligacionesAplicables.map((ob) => {
      const estadosActualizados = { ...ob.estadosPorCentro };
      let cambios = 0;

      CENTROS_MOCK.forEach((c) => {
        const ev = evalMap.get(`${ob.id}:${c.id}`);
        if (ev?.fuenteTipo === "documento") {
          estadosActualizados[c.id] = toEstadoObligacion(ev.estado);
          cambios++;
        }
      });

      if (cambios === 0) return ob;

      const totales = Object.values(estadosActualizados).filter(
        (e) => e !== "no_aplica"
      ).length;
      const cumplidas = Object.values(estadosActualizados).filter(
        (e) => e === "cumplida"
      ).length;
      return {
        ...ob,
        estadosPorCentro: estadosActualizados,
        cumplimientoGlobal:
          totales > 0
            ? Math.round((cumplidas / totales) * 100)
            : ob.cumplimientoGlobal,
      };
    });
  }, [evalMap, obligacionesAplicables]);

  const cumplidas = obligacionesVivas.filter((o) => o.cumplimientoGlobal >= 80).length;
  const conBrechas = obligacionesVivas.filter(
    (o) => o.cumplimientoGlobal >= 50 && o.cumplimientoGlobal < 80
  ).length;
  const noCumplidas = obligacionesVivas.filter((o) => o.cumplimientoGlobal < 50).length;
  const promedioGlobal = Math.round(
    obligacionesVivas.reduce((s, o) => s + o.cumplimientoGlobal, 0) / obligacionesVivas.length
  );

  const filtradas = obligacionesVivas.filter((o) => {
    const txt = search.toLowerCase();
    const coincideTexto =
      txt.length === 0 ||
      o.nombre.toLowerCase().includes(txt) ||
      o.tipo.toLowerCase().includes(txt) ||
      o.responsable.toLowerCase().includes(txt);

    const coincideEstado =
      filtroEstado === "todos" ||
      (filtroEstado === "cumplida" && o.cumplimientoGlobal >= 80) ||
      (filtroEstado === "con_brechas" &&
        o.cumplimientoGlobal >= 50 &&
        o.cumplimientoGlobal < 80) ||
      (filtroEstado === "no_cumplida" && o.cumplimientoGlobal < 50);

    return coincideTexto && coincideEstado;
  });

  return (
    <div className="min-h-screen bg-slate-50/80 py-10">
      <div className="mx-auto max-w-6xl space-y-8 px-4 lg:px-0">
        <StandardPageHeader
          moduleLabel="Cumplimiento DS44"
          title="Obligaciones DS44"
          description="Revisa el estado de cada obligación DS44 y qué centros presentan brechas pendientes de subsanar."
          icon={FileText}
        />

        {/* ---- dotación context chip ---- */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <Users className="h-4 w-4 shrink-0 text-slate-400" />
          <span>
            Dotación:{" "}
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
              {noAplicanPorTamano} obligación{noAplicanPorTamano !== 1 ? "es" : ""} no aplican a este tamaño y fueron excluidas
            </span>
          )}
        </div>

        {/* ---- KPIs ---- */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Cumplimiento global",
              value: `${promedioGlobal}%`,
              sub: "Promedio sobre todas las obligaciones",
              cls: "from-emerald-50 to-emerald-100 text-emerald-700",
            },
            {
              label: "Cumplidas ≥ 80%",
              value: cumplidas,
              sub: "Obligaciones en nivel aceptable",
              cls: "from-emerald-50 to-emerald-100 text-emerald-700",
            },
            {
              label: "Con brechas 50–79%",
              value: conBrechas,
              sub: "Requieren acciones correctivas",
              cls: "from-amber-50 to-amber-100 text-amber-700",
            },
            {
              label: "No cumplidas < 50%",
              value: noCumplidas,
              sub: "Situación crítica — acción inmediata",
              cls: "from-rose-50 to-rose-100 text-rose-700",
            },
          ].map((kpi) => (
            <Card
              key={kpi.label}
              className={`border-none shadow-sm bg-gradient-to-br ${kpi.cls}`}
            >
              <CardContent className="pt-5 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide">
                  {kpi.label}
                </p>
                <p className="mt-1 text-3xl font-semibold">{kpi.value}</p>
                <p className="mt-1 text-[11px] opacity-80">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ---- filtros ---- */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar obligación, tipo o responsable…"
                className="pl-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={filtroEstado}
              onValueChange={(v) => setFiltroEstado(v as typeof filtroEstado)}
            >
              <SelectTrigger className="w-full sm:w-48 text-sm">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="cumplida">Cumplida (≥ 80%)</SelectItem>
                <SelectItem value="con_brechas">Con brechas (50–79%)</SelectItem>
                <SelectItem value="no_cumplida">No cumplida (&lt; 50%)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* ---- tabla ---- */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <th className="py-3 text-left pl-2">Obligación</th>
                    <th className="py-3 text-left">Tipo</th>
                    <th className="py-3 text-left">Responsable</th>
                    <th className="py-3 text-left">Vencimiento</th>
                    <th className="py-3 text-left w-36">Cumplimiento</th>
                    <th className="py-3 text-right pr-2">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((ob) => (
                    <tr
                      key={ob.id}
                      className="border-b last:border-0 hover:bg-slate-50/60 transition-colors cursor-pointer"
                      onClick={() => setSelected(ob)}
                    >
                      <td className="py-3 pl-2 font-medium text-slate-900 max-w-xs">
                        {ob.nombre}
                      </td>
                      <td className="py-3 text-slate-500 text-xs">{ob.tipo}</td>
                      <td className="py-3 text-slate-600">{ob.responsable}</td>
                      <td className="py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 text-slate-400" />
                          {formateaFecha(ob.vencimiento)}
                        </span>
                      </td>
                      <td className="py-3 w-36">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${globalBarColor(ob.cumplimientoGlobal)}`}
                              style={{ width: `${ob.cumplimientoGlobal}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 w-8 text-right">
                            {ob.cumplimientoGlobal}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(ob);
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {filtradas.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-16 text-center"
                      >
                        <FileText className="mx-auto h-9 w-9 text-slate-200 mb-3" />
                        <p className="text-sm font-medium text-slate-500">Sin obligaciones que coincidan</p>
                        <p className="text-xs text-slate-400 mt-1">Ajusta los filtros para ver otras obligaciones DS44.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ---- estado por centro (resumen visual) ---- */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Estado por centro de trabajo
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CENTROS_MOCK.map((c) => {
              const estados = obligacionesVivas.map(
                (o) => o.estadosPorCentro[c.id] ?? "no_aplica"
              );
              const cumplidas = estados.filter((e) => e === "cumplida").length;
              const total = estados.filter((e) => e !== "no_aplica").length;
              const pct = total > 0 ? Math.round((cumplidas / total) * 100) : 0;
              return (
                <Card key={c.id} className="border border-slate-200 bg-white shadow-sm">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      <p className="text-sm font-medium text-slate-800 leading-snug">
                        {c.nombre}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Progress value={pct} className="flex-1 h-1.5" />
                      <span className="text-xs font-semibold text-slate-700 w-8 text-right">
                        {pct}%
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap mt-3">
                      {(["cumplida", "con_brechas", "no_cumplida"] as EstadoObligacion[]).map(
                        (est) => {
                          const count = estados.filter((e) => e === est).length;
                          if (count === 0) return null;
                          const cfg = ESTADO_OBLIGACION_CFG[est];
                          return (
                            <span
                              key={est}
                              className={
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium " +
                                cfg.cls
                              }
                            >
                              {count} {cfg.label.toLowerCase()}
                            </span>
                          );
                        }
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* drawer */}
      {selected && (
        <ObligacionDrawer obligacion={selected} evalMap={evalMap} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
