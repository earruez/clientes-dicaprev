"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  Search,
  X,
  ArrowRight,
} from "lucide-react";
import {
  OBLIGACIONES_MOCK,
  CENTROS_MOCK,
  HALLAZGOS_MOCK,
  EVIDENCIAS_MOCK,
} from "@/app/dicaprev/cumplimiento/mock-data";
import {
  evaluarObligaciones,
  calcularTamañoEmpresa,
  type DocumentoEvaluable,
  type EntidadInput,
  type EvaluacionCumplimiento,
  type EstadoCumplimiento,
} from "@/lib/cumplimiento/cumplimiento-engine";
import { EMPRESA_MOCK } from "@/lib/empresa";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ResultadoArea {
  area: string;
  obligaciones: string[];
  evaluaciones: EvaluacionCumplimiento[];
  cumplidas: number;
  vencidas: number;
  pendientes: number;
  porcentaje: number;
}

// ─── Config visual ──────────────────────────────────────────────────────────────

const ESTADO_CFG: Record<
  EstadoCumplimiento,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  cumplido: {
    label: "Cumplido",
    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  vencido: {
    label: "Vencido",
    cls: "bg-red-50 text-red-700 border border-red-200",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  pendiente: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
};

function pctColor(pct: number) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}
function pctTextColor(pct: number) {
  if (pct >= 80) return "text-emerald-700";
  if (pct >= 50) return "text-amber-700";
  return "text-red-700";
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CumplimientoAreaPage() {
  // ── Engine ────────────────────────────────────────────────────────────────
  const docs = useMemo<DocumentoEvaluable[]>(() =>
    EVIDENCIAS_MOCK.flatMap((ev) => {
      const h = HALLAZGOS_MOCK.find((h) => h.id === ev.hallazgoId);
      if (!h?.obligacionId) return [];
      const ob = OBLIGACIONES_MOCK.find((o) => o.id === h.obligacionId);
      return [
        {
          id: ev.id,
          nombre: ev.nombre,
          tipo: String(ev.tipoDocumento),
          entidadId: h.centroId,
          entidadTipo: "centro" as const,
          obligacionId: h.obligacionId,
          fechaVencimiento: ob?.vencimiento,
        },
      ];
    }),
  []);

  const entidades = useMemo<EntidadInput[]>(
    () => CENTROS_MOCK.map((c) => ({ id: c.id, tipo: "centro" as const })),
    []
  );

  const evaluaciones = useMemo(
    () => evaluarObligaciones(
      OBLIGACIONES_MOCK, docs, entidades, new Date(),
      calcularTamañoEmpresa(EMPRESA_MOCK.cantidadTrabajadores)
    ),
    [docs, entidades]
  );

  // ── Group by area (obligacion.tipo) ────────────────────────────────────────
  // Each obligacion.tipo acts as an "area" of DS44 compliance.
  const resultadosPorArea = useMemo<ResultadoArea[]>(() => {
    // Get unique areas
    const areas = [...new Set(OBLIGACIONES_MOCK.map((o) => o.tipo))].sort();

    return areas.map((area) => {
      const obsDeArea = OBLIGACIONES_MOCK.filter((o) => o.tipo === area);
      const obIds = new Set(obsDeArea.map((o) => o.id));

      // Evaluaciones que corresponden a estas obligaciones
      const evsDeArea = evaluaciones.filter((e) => obIds.has(e.obligacionId));

      const cumplidas = evsDeArea.filter((e) => e.estado === "cumplido").length;
      const vencidas = evsDeArea.filter((e) => e.estado === "vencido").length;
      const pendientes = evsDeArea.filter((e) => e.estado === "pendiente").length;
      const total = evsDeArea.length;
      const porcentaje = total === 0 ? 0 : Math.round((cumplidas / total) * 100);

      return {
        area,
        obligaciones: obsDeArea.map((o) => o.nombre),
        evaluaciones: evsDeArea,
        cumplidas,
        vencidas,
        pendientes,
        porcentaje,
      };
    });
  }, [evaluaciones]);

  // ── State ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filtroUmbral, setFiltroUmbral] = useState<"todos" | "critico" | "medio" | "bueno">("todos");
  const [expandido, setExpandido] = useState<string | null>(null);

  const filteredAreas = useMemo(() => {
    let list = resultadosPorArea;
    if (filtroUmbral !== "todos") {
      list = list.filter((r) => {
        const pct = r.porcentaje;
        if (filtroUmbral === "critico") return pct < 50;
        if (filtroUmbral === "medio") return pct >= 50 && pct < 80;
        return pct >= 80;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.area.toLowerCase().includes(q) ||
          r.obligaciones.some((o) => o.toLowerCase().includes(q))
      );
    }
    return list;
  }, [resultadosPorArea, filtroUmbral, search]);

  const hasFilters = filtroUmbral !== "todos" || search.trim() !== "";
  const totalCriticos = resultadosPorArea.filter((r) => r.porcentaje < 50).length;
  const totalMedios    = resultadosPorArea.filter((r) => r.porcentaje >= 50 && r.porcentaje < 80).length;
  const totalBuenos    = resultadosPorArea.filter((r) => r.porcentaje >= 80).length;

  return (
    <div className="min-h-screen bg-slate-50/80 py-10">
      <div className="mx-auto max-w-7xl space-y-8 px-4 lg:px-0">

        {/* ── Header ── */}
        <header>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Cumplimiento por Área
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 pl-[3.25rem]">
            Nivel de cumplimiento DS44 agrupado por tipo de obligación / área de gestión.
          </p>
        </header>

        {/* ── KPIs ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Áreas en riesgo",
              value: totalCriticos,
              sub: "< 50% cumplimiento",
              icon: <AlertTriangle className="h-5 w-5" />,
              cls: "from-red-50 to-red-100 text-red-700",
            },
            {
              label: "Áreas en desarrollo",
              value: totalMedios,
              sub: "50–79% cumplimiento",
              icon: <Clock className="h-5 w-5" />,
              cls: "from-amber-50 to-amber-100 text-amber-700",
            },
            {
              label: "Áreas bien gestionadas",
              value: totalBuenos,
              sub: "≥ 80% cumplimiento",
              icon: <CheckCircle2 className="h-5 w-5" />,
              cls: "from-emerald-50 to-emerald-100 text-emerald-700",
            },
          ].map((kpi) => (
            <Card
              key={kpi.label}
              className={`border-none shadow-sm bg-gradient-to-br ${kpi.cls}`}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  {kpi.icon}
                  <p className="text-[11px] font-semibold uppercase tracking-wide">
                    {kpi.label}
                  </p>
                </div>
                <p className="text-3xl font-semibold">{kpi.value}</p>
                <p className="mt-1 text-[11px] opacity-80">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Filters ── */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar área u obligación…"
                  className="pl-9 text-sm bg-slate-50 border-slate-200"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select
                value={filtroUmbral}
                onValueChange={(v) => setFiltroUmbral(v as typeof filtroUmbral)}
              >
                <SelectTrigger className="w-44 text-sm">
                  <SelectValue placeholder="Nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los niveles</SelectItem>
                  <SelectItem value="critico">En riesgo (&lt;50%)</SelectItem>
                  <SelectItem value="medio">En desarrollo (50–79%)</SelectItem>
                  <SelectItem value="bueno">Bien gestionado (≥80%)</SelectItem>
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 gap-1"
                  onClick={() => { setFiltroUmbral("todos"); setSearch(""); }}
                >
                  <X className="h-3.5 w-3.5" /> Limpiar
                </Button>
              )}
              <span className="ml-auto text-xs text-slate-400">
                {filteredAreas.length} áreas
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Area Cards ── */}
        <div className="space-y-3">
          {filteredAreas.map((r) => {
            const isOpen = expandido === r.area;

            return (
              <Card
                key={r.area}
                className="border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                <button
                  className="w-full text-left"
                  onClick={() => setExpandido(isOpen ? null : r.area)}
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 shrink-0">
                      <Layers className="h-4 w-4 text-violet-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">
                        {r.area}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {r.obligaciones.length}{" "}
                        {r.obligaciones.length === 1 ? "obligación" : "obligaciones"}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", pctColor(r.porcentaje))}
                            style={{ width: `${r.porcentaje}%` }}
                          />
                        </div>
                        <span
                          className={cn("text-xs font-semibold", pctTextColor(r.porcentaje))}
                        >
                          {r.porcentaje}%
                        </span>
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-4 text-xs">
                      <span className="text-emerald-600 font-medium">
                        {r.cumplidas} ✓
                      </span>
                      <span className="text-red-500 font-medium">
                        {r.vencidas} ✗
                      </span>
                      <span className="text-amber-600 font-medium">
                        {r.pendientes} ⏳
                      </span>
                    </div>

                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-4">
                    {/* Group evaluations by obligacion */}
                    {r.obligaciones.map((obNombre) => {
                      const evsOb = r.evaluaciones.filter(
                        (e) => e.obligacionNombre === obNombre
                      );
                      return (
                        <div key={obNombre} className="mb-4 last:mb-0">
                          <p className="text-[11px] font-semibold text-slate-600 mb-2 line-clamp-1">
                            {obNombre}
                          </p>
                          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {evsOb.map((ev) => {
                              const estCfg = ESTADO_CFG[ev.estado];
                              const centro = CENTROS_MOCK.find(
                                (c) => c.id === ev.entidadId
                              );
                              return (
                                <div
                                  key={`${ev.obligacionId}-${ev.entidadId}`}
                                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2"
                                >
                                  <span className="text-xs text-slate-600 truncate flex-1">
                                    {centro?.nombre ?? ev.entidadId}
                                  </span>
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0",
                                      estCfg.cls
                                    )}
                                  >
                                    {estCfg.icon}
                                    {estCfg.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Explorar también ── */}
      <div className="mx-auto max-w-6xl space-y-8 px-4 lg:px-0 pb-10">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Explorar también</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/dicaprev/reportes/cumplimiento-centro" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
              Cumplimiento por centro <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/dicaprev/reportes/vencimientos" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
              Reporte de vencimientos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/dicaprev/cumplimiento/resumen" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
              Ver resumen de cumplimiento <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
