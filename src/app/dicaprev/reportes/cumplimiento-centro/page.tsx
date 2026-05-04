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
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Search,
  X,
  ArrowRight,
} from "lucide-react";
import {
  CENTROS_MOCK,
  OBLIGACIONES_MOCK,
  HALLAZGOS_MOCK,
  EVIDENCIAS_MOCK,
} from "@/app/dicaprev/cumplimiento/mock-data";
import {
  evaluarObligaciones,
  calcularResultadosPorEntidad,
  porcentajeGlobal,
  calcularTamañoEmpresa,
  type DocumentoEvaluable,
  type EntidadInput,
  type ResultadoEntidad,
  type EstadoCumplimiento,
} from "@/lib/cumplimiento/cumplimiento-engine";
import { EMPRESA_MOCK } from "@/lib/empresa";
import { cn } from "@/lib/utils";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

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

export default function CumplimientoCentroPage() {
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

  const resultados = useMemo<ResultadoEntidad[]>(
    () => calcularResultadosPorEntidad(evaluaciones, entidades),
    [evaluaciones, entidades]
  );

  const globalPct = useMemo(() => porcentajeGlobal(evaluaciones), [evaluaciones]);

  // ── State ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filtroUmbral, setFiltroUmbral] = useState<"todos" | "critico" | "medio" | "bueno">("todos");
  const [expandido, setExpandido] = useState<string | null>(null);

  // ── Filtered ──────────────────────────────────────────────────────────────
  const filteredResultados = useMemo(() => {
    let list = resultados;
    if (filtroUmbral !== "todos") {
      list = list.filter((r) => {
        const pct = r.porcentajeCumplimiento;
        if (filtroUmbral === "critico") return pct < 50;
        if (filtroUmbral === "medio") return pct >= 50 && pct < 80;
        return pct >= 80;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const centroNombre = (id: string) =>
        CENTROS_MOCK.find((c) => c.id === id)?.nombre ?? id;
      list = list.filter((r) => centroNombre(r.entidadId).toLowerCase().includes(q));
    }
    return list;
  }, [resultados, filtroUmbral, search]);

  const hasFilters = filtroUmbral !== "todos" || search.trim() !== "";

  const totalCriticos = resultados.filter((r) => r.porcentajeCumplimiento < 50).length;
  const totalMedios    = resultados.filter((r) => r.porcentajeCumplimiento >= 50 && r.porcentajeCumplimiento < 80).length;
  const totalBuenos    = resultados.filter((r) => r.porcentajeCumplimiento >= 80).length;

  return (
    <div className="min-h-screen bg-slate-50/80 py-10">
      <div className="mx-auto max-w-7xl space-y-8 px-4 lg:px-0">

        <StandardPageHeader
          moduleLabel="Reportes"
          title="Cumplimiento por Centro"
          description="Nivel de cumplimiento DS44 evaluado automáticamente para cada centro de trabajo."
          icon={Building2}
        />

        {/* ── Global indicator ── */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-indigo-700">
                Cumplimiento global — todos los centros
              </p>
              <span className={cn("text-2xl font-bold", pctTextColor(globalPct))}>
                {globalPct}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-indigo-200 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", pctColor(globalPct))}
                style={{ width: `${globalPct}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-indigo-600 opacity-80">
              {evaluaciones.filter((e) => e.estado === "cumplido").length} de{" "}
              {evaluaciones.length} obligaciones cumplidas
            </p>
          </CardContent>
        </Card>

        {/* ── KPIs ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "En riesgo",
              value: totalCriticos,
              sub: "< 50% cumplimiento",
              icon: <AlertTriangle className="h-5 w-5" />,
              cls: "from-red-50 to-red-100 text-red-700",
            },
            {
              label: "Medio",
              value: totalMedios,
              sub: "50–79% cumplimiento",
              icon: <Clock className="h-5 w-5" />,
              cls: "from-amber-50 to-amber-100 text-amber-700",
            },
            {
              label: "Buen nivel",
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
                  placeholder="Buscar centro…"
                  className="pl-9 text-sm bg-slate-50 border-slate-200"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select
                value={filtroUmbral}
                onValueChange={(v) => setFiltroUmbral(v as typeof filtroUmbral)}
              >
                <SelectTrigger className="w-40 text-sm">
                  <SelectValue placeholder="Nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los niveles</SelectItem>
                  <SelectItem value="critico">En riesgo (&lt;50%)</SelectItem>
                  <SelectItem value="medio">Medio (50–79%)</SelectItem>
                  <SelectItem value="bueno">Buen nivel (≥80%)</SelectItem>
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
                {filteredResultados.length} centros
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Centro Cards ── */}
        <div className="space-y-3">
          {filteredResultados.map((r) => {
            const centro = CENTROS_MOCK.find((c) => c.id === r.entidadId);
            const pct = r.porcentajeCumplimiento;
            const isOpen = expandido === r.entidadId;

            return (
              <Card
                key={r.entidadId}
                className="border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                {/* Row header */}
                <button
                  className="w-full text-left"
                  onClick={() => setExpandido(isOpen ? null : r.entidadId)}
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 shrink-0">
                      <Building2 className="h-4 w-4 text-slate-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">
                        {centro?.nombre ?? r.entidadId}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="flex-1 max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", pctColor(pct))}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span
                          className={cn("text-xs font-semibold", pctTextColor(pct))}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>

                    {/* mini KPIs */}
                    <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                      <span className="text-emerald-600 font-medium">
                        {r.cumplidas} cumplidas
                      </span>
                      <span className="text-red-500 font-medium">
                        {r.vencidas} vencidas
                      </span>
                      <span className="text-amber-600 font-medium">
                        {r.pendientes} pendientes
                      </span>
                    </div>

                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3">
                      Detalle por obligación
                    </p>
                    <div className="space-y-2">
                      {r.evaluaciones.map((ev) => {
                        const estCfg = ESTADO_CFG[ev.estado];
                        return (
                          <div
                            key={ev.obligacionId}
                            className="flex items-center justify-between gap-3 rounded-lg bg-white border border-slate-100 px-3 py-2"
                          >
                            <span className="text-xs text-slate-700 flex-1 min-w-0 line-clamp-1">
                              {ev.obligacionNombre}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
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
            <Link href="/dicaprev/reportes/cumplimiento-area" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
              Cumplimiento por área <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/dicaprev/reportes/pendientes" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
              Pendientes por resolver <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/dicaprev/cumplimiento/obligaciones" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
              Ver obligaciones DS44 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
