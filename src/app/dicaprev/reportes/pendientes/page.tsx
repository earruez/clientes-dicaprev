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
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Cpu,
  Play,
  Search,
  X,
  ArrowRight,
  BadgeCheck,
  Eye,
} from "lucide-react";
import {
  CENTROS_MOCK,
  OBLIGACIONES_MOCK,
  HALLAZGOS_MOCK,
  EVIDENCIAS_MOCK,
} from "@/app/dicaprev/cumplimiento/mock-data";
import {
  evaluarObligaciones,
  generarHallazgosDesdeEvaluaciones,
  calcularTamañoEmpresa,
  type DocumentoEvaluable,
  type EntidadInput,
} from "@/lib/cumplimiento/cumplimiento-engine";
import { EMPRESA_MOCK } from "@/lib/empresa";
import { derivarAccionesDesdeHallazgos } from "@/app/dicaprev/cumplimiento/acciones";
import type {
  AccionCumplimiento,
  EstadoAccionCumplimiento,
  PrioridadHallazgo,
} from "@/app/dicaprev/cumplimiento/types";
import type { EstadoHallazgo } from "@/app/dicaprev/cumplimiento/types";
import { cn } from "@/lib/utils";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL");
};

// ─── Config visual ──────────────────────────────────────────────────────────────

const ESTADO_HALLAZGO_CFG: Record<
  EstadoHallazgo,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  abierto: {
    label: "Abierto",
    cls: "bg-red-50 text-red-700 border border-red-200",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  en_seguimiento: {
    label: "En seguimiento",
    cls: "bg-sky-50 text-sky-700 border border-sky-200",
    icon: <Eye className="h-3.5 w-3.5" />,
  },
  en_proceso: {
    label: "En proceso",
    cls: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: <Play className="h-3.5 w-3.5" />,
  },
  resuelto: {
    label: "Resuelto",
    cls: "bg-teal-50 text-teal-700 border border-teal-200",
    icon: <BadgeCheck className="h-3.5 w-3.5" />,
  },
  cerrado: {
    label: "Cerrado",
    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
};

const ESTADO_ACCION_CFG: Record<
  EstadoAccionCumplimiento,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  pendiente: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  en_proceso: {
    label: "En proceso",
    cls: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: <Play className="h-3.5 w-3.5" />,
  },
  cerrada: {
    label: "Cerrada",
    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
};

const PRIORIDAD_CFG: Record<PrioridadHallazgo, { label: string; cls: string }> =
  {
    critica: {
      label: "Crítica",
      cls: "bg-red-100 text-red-700 border border-red-300",
    },
    alta: {
      label: "Alta",
      cls: "bg-rose-100 text-rose-700 border border-rose-200",
    },
    media: {
      label: "Media",
      cls: "bg-amber-100 text-amber-700 border border-amber-200",
    },
    baja: {
      label: "Baja",
      cls: "bg-sky-100 text-sky-700 border border-sky-200",
    },
  };

// ─── Page ──────────────────────────────────────────────────────────────────────

type Tab = "hallazgos" | "acciones";

export default function PendientesPage() {
  const [tab, setTab] = useState<Tab>("hallazgos");
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState<
    PrioridadHallazgo | "todos"
  >("todos");
  const [filtroCentro, setFiltroCentro] = useState("todos");

  // ── Engine + derivar acciones ─────────────────────────────────────────────
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

  const acciones = useMemo<AccionCumplimiento[]>(() => {
    const evaluaciones = evaluarObligaciones(
      OBLIGACIONES_MOCK, docs, entidades, new Date(),
      calcularTamañoEmpresa(EMPRESA_MOCK.cantidadTrabajadores)
    );
    const hallazgosAuto = generarHallazgosDesdeEvaluaciones(evaluaciones);
    return derivarAccionesDesdeHallazgos(
      hallazgosAuto,
      HALLAZGOS_MOCK,
      CENTROS_MOCK,
      OBLIGACIONES_MOCK
    );
  }, [docs, entidades]);

  // ── Hallazgos pendientes (no cerrados) ────────────────────────────────────
  const hallazgosActivos = useMemo(
    () => HALLAZGOS_MOCK.filter((h) => h.estado !== "cerrado"),
    []
  );

  // ── Filtered ──────────────────────────────────────────────────────────────
  const filteredHallazgos = useMemo(() => {
    let list = hallazgosActivos;
    if (filtroEstado !== "todos") list = list.filter((h) => h.estado === filtroEstado);
    if (filtroPrioridad !== "todos") list = list.filter((h) => h.prioridad === filtroPrioridad);
    if (filtroCentro !== "todos") list = list.filter((h) => h.centroId === filtroCentro);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (h) =>
          h.descripcion.toLowerCase().includes(q) ||
          h.centroNombre.toLowerCase().includes(q) ||
          (h.obligacionNombre ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [hallazgosActivos, filtroEstado, filtroPrioridad, filtroCentro, search]);

  const filteredAcciones = useMemo(() => {
    let list = acciones.filter((a) => a.estado !== "cerrada");
    if (filtroEstado !== "todos") list = list.filter((a) => a.estado === filtroEstado);
    if (filtroPrioridad !== "todos") list = list.filter((a) => a.prioridad === filtroPrioridad);
    if (filtroCentro !== "todos") list = list.filter((a) => a.entidadId === filtroCentro);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.titulo.toLowerCase().includes(q) ||
          a.entidadNombre.toLowerCase().includes(q) ||
          (a.obligacionNombre ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [acciones, filtroEstado, filtroPrioridad, filtroCentro, search]);

  const hasFilters =
    filtroEstado !== "todos" ||
    filtroPrioridad !== "todos" ||
    filtroCentro !== "todos" ||
    search.trim() !== "";

  const accionesPendientes = acciones.filter((a) => a.estado !== "cerrada");

  return (
    <div className="min-h-screen bg-slate-50/80 py-10">
      <div className="mx-auto max-w-7xl space-y-8 px-4 lg:px-0">

        {/* ── Header ── */}
        <header>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Reporte de Pendientes
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 pl-[3.25rem]">
            Hallazgos activos y acciones del plan de trabajo sin cerrar.
          </p>
        </header>

        {/* ── KPIs ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Hallazgos abiertos",
              value: hallazgosActivos.filter((h) => h.estado === "abierto").length,
              sub: "Pendientes de acción",
              icon: <AlertTriangle className="h-5 w-5" />,
              cls: "from-red-50 to-red-100 text-red-700",
            },
            {
              label: "Hallazgos en proceso",
              value: hallazgosActivos.filter((h) => h.estado === "en_proceso").length,
              sub: "En ejecución",
              icon: <Play className="h-5 w-5" />,
              cls: "from-blue-50 to-blue-100 text-blue-700",
            },
            {
              label: "Acciones pendientes",
              value: accionesPendientes.filter((a) => a.estado === "pendiente").length,
              sub: "Plan de trabajo",
              icon: <Clock className="h-5 w-5" />,
              cls: "from-amber-50 to-amber-100 text-amber-700",
            },
            {
              label: "Acciones en proceso",
              value: accionesPendientes.filter((a) => a.estado === "en_proceso").length,
              sub: "En ejecución",
              icon: <Cpu className="h-5 w-5" />,
              cls: "from-indigo-50 to-indigo-100 text-indigo-700",
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

        {/* ── Tabs ── */}
        <div className="flex gap-2">
          {(["hallazgos", "acciones"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setFiltroEstado("todos"); }}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium border transition-colors",
                tab === t
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              )}
            >
              {t === "hallazgos" ? "Hallazgos activos" : "Acciones pendientes"}
            </button>
          ))}
        </div>

        {/* ── Filters ── */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar…"
                  className="pl-9 text-sm bg-slate-50 border-slate-200"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-36 text-sm">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  {tab === "hallazgos" ? (
                    <>
                      <SelectItem value="abierto">Abierto</SelectItem>
                      <SelectItem value="en_proceso">En proceso</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en_proceso">En proceso</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>

              <Select
                value={filtroPrioridad}
                onValueChange={(v) =>
                  setFiltroPrioridad(v as PrioridadHallazgo | "todos")
                }
              >
                <SelectTrigger className="w-36 text-sm">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las prioridades</SelectItem>
                  {(
                    Object.entries(PRIORIDAD_CFG) as [
                      PrioridadHallazgo,
                      { label: string }
                    ][]
                  ).map(([k, cfg]) => (
                    <SelectItem key={k} value={k}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroCentro} onValueChange={setFiltroCentro}>
                <SelectTrigger className="w-44 text-sm">
                  <SelectValue placeholder="Centro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los centros</SelectItem>
                  {CENTROS_MOCK.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 gap-1"
                  onClick={() => {
                    setFiltroEstado("todos");
                    setFiltroPrioridad("todos");
                    setFiltroCentro("todos");
                    setSearch("");
                  }}
                >
                  <X className="h-3.5 w-3.5" /> Limpiar
                </Button>
              )}
              <span className="ml-auto text-xs text-slate-400">
                {tab === "hallazgos"
                  ? `${filteredHallazgos.length} hallazgos`
                  : `${filteredAcciones.length} acciones`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Table ── */}
        <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
          {tab === "hallazgos" ? (
            filteredHallazgos.length === 0 ? (
              <CardContent className="py-20 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300 mb-3" />
                <p className="text-slate-500 text-sm font-medium">Sin hallazgos activos</p>
                <p className="text-xs text-slate-400 mt-1">¡Buena señal! No hay hallazgos abiertos con esos filtros.</p>
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      {["Hallazgo", "Centro", "Obligación", "Prioridad", "Compromiso", "Estado"].map(
                        (col) => (
                          <th
                            key={col}
                            className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                          >
                            {col}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHallazgos.map((h) => {
                      const estCfg = ESTADO_HALLAZGO_CFG[h.estado];
                      const priCfg = PRIORIDAD_CFG[h.prioridad];
                      return (
                        <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 max-w-[220px]">
                            <span className="font-medium text-slate-800 leading-snug line-clamp-2">
                              {h.descripcion}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              {h.centroNombre}
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-[180px]">
                            <span className="text-xs text-slate-500 line-clamp-2">
                              {h.obligacionNombre ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                                priCfg.cls
                              )}
                            >
                              {priCfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              {fmt(h.fechaCompromiso)}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                                estCfg.cls
                              )}
                            >
                              {estCfg.icon}
                              {estCfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : filteredAcciones.length === 0 ? (
            <CardContent className="py-20 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300 mb-3" />
              <p className="text-slate-500 text-sm font-medium">Sin acciones pendientes</p>
              <p className="text-xs text-slate-400 mt-1">¡Todo al día! No hay acciones abiertas con esos filtros.</p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {["Acción", "Entidad", "Obligación", "Prioridad", "Responsable", "Estado"].map(
                      (col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAcciones.map((a) => {
                    const estCfg = ESTADO_ACCION_CFG[a.estado];
                    const priCfg = PRIORIDAD_CFG[a.prioridad];
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 max-w-[220px]">
                          <div className="flex items-start gap-2">
                            {a.origenTipo === "automatico" && (
                              <span className="mt-0.5 inline-flex items-center gap-0.5 rounded-full bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 shrink-0">
                                <Cpu className="h-2.5 w-2.5" /> Auto
                              </span>
                            )}
                            <span className="font-medium text-slate-800 leading-snug line-clamp-2">
                              {a.titulo}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {a.entidadNombre}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[180px]">
                          <span className="text-xs text-slate-500 line-clamp-2">
                            {a.obligacionNombre ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                              priCfg.cls
                            )}
                          >
                            {priCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                          {a.responsable}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                              estCfg.cls
                            )}
                          >
                            {estCfg.icon}
                            {estCfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ── Explorar también ── */}
      <div className="mx-auto max-w-6xl space-y-8 px-4 lg:px-0 pb-10">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Explorar también</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/dicaprev/reportes/vencimientos" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
              Reporte de vencimientos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/dicaprev/reportes/cumplimiento-area" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
              Cumplimiento por área <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/dicaprev/cumplimiento/hallazgos" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
              Gestionar hallazgos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
