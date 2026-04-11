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
  CheckCircle2,
  Clock,
  Cpu,
  Building2,
  User,
  CalendarDays,
  Search,
  ChevronRight,
  X,
  FileText,
  ClipboardList,
  Play,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import {
  OBLIGACIONES_MOCK,
  CENTROS_MOCK,
  HALLAZGOS_MOCK,
  EVIDENCIAS_MOCK,
} from "../mock-data";
import { cn } from "@/lib/utils";
import {
  evaluarObligaciones,
  generarHallazgosDesdeEvaluaciones,
  calcularTamañoEmpresa,
  type DocumentoEvaluable,
  type EntidadInput,
  type EvaluacionCumplimiento,
} from "@/lib/cumplimiento/cumplimiento-engine";
import {
  type AccionCumplimiento,
  type EstadoAccionCumplimiento,
  type PrioridadHallazgo,
} from "../types";
import { derivarAccionesDesdeHallazgos, hallazgosEstructurales } from "../acciones";
import { EMPRESA_MOCK } from "@/lib/empresa";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL");
};

const ESTADO_CFG: Record<
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

const PRIORIDAD_CFG: Record<PrioridadHallazgo, { label: string; cls: string }> = {
  critica: { label: "Crítica", cls: "bg-red-100 text-red-700 border border-red-300" },
  alta:    { label: "Alta",    cls: "bg-rose-100 text-rose-700 border border-rose-200" },
  media:   { label: "Media",   cls: "bg-amber-100 text-amber-700 border border-amber-200" },
  baja:    { label: "Baja",    cls: "bg-sky-100 text-sky-700 border border-sky-200" },
};

// ─── Drawer ───────────────────────────────────────────────────────────────────

function AccionDrawer({
  accion,
  onClose,
  onEstadoChange,
}: {
  accion: AccionCumplimiento;
  onClose: () => void;
  onEstadoChange: (id: string, estado: EstadoAccionCumplimiento) => void;
}) {
  const estCfg = ESTADO_CFG[accion.estado];
  const priCfg = PRIORIDAD_CFG[accion.prioridad];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Acción del plan de trabajo
            </p>
            <h2 className="text-base font-semibold text-slate-900 leading-snug">
              {accion.titulo}
            </h2>
            <div className="flex flex-wrap gap-2 mt-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  estCfg.cls
                )}
              >
                {estCfg.icon}
                {estCfg.label}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                  priCfg.cls
                )}
              >
                {priCfg.label}
              </span>
              {accion.origenTipo === "automatico" && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                  <Cpu className="h-3 w-3" /> Auto
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm">
          {accion.descripcion && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-slate-700 leading-relaxed">
              {accion.descripcion}
            </div>
          )}

          {/* meta rows */}
          <div className="space-y-2.5">
            {[
              {
                icon: <Building2 className="h-4 w-4 text-slate-400" />,
                label: "Entidad",
                value: accion.entidadNombre,
              },
              ...(accion.obligacionNombre
                ? [
                    {
                      icon: <FileText className="h-4 w-4 text-slate-400" />,
                      label: "Obligación DS44",
                      value: accion.obligacionNombre,
                    },
                  ]
                : []),
              {
                icon: <User className="h-4 w-4 text-slate-400" />,
                label: "Responsable",
                value: accion.responsable,
              },
              {
                icon: <CalendarDays className="h-4 w-4 text-slate-400" />,
                label: "Fecha compromiso",
                value: fmt(accion.fechaCompromiso),
              },
              {
                icon: <CalendarDays className="h-4 w-4 text-slate-400" />,
                label: "Generada el",
                value: fmt(accion.generadaEl),
              },
              ...(accion.evidenciaIds?.length
                ? [
                    {
                      icon: <FileText className="h-4 w-4 text-slate-400" />,
                      label: "Evidencias",
                      value: accion.evidenciaIds.join(", "),
                    },
                  ]
                : []),
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">{row.icon}</span>
                <span className="text-slate-500 w-36 shrink-0">{row.label}</span>
                <span className="font-medium text-slate-800">{row.value}</span>
              </div>
            ))}
          </div>

          {/* estado change */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Cambiar estado
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "pendiente",
                  "en_proceso",
                  "cerrada",
                ] as EstadoAccionCumplimiento[]
              )
                .filter((e) => e !== accion.estado)
                .map((e) => {
                  const cfg = ESTADO_CFG[e];
                  return (
                    <button
                      key={e}
                      onClick={() => {
                        onEstadoChange(accion.id, e);
                        onClose();
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-opacity hover:opacity-75",
                        cfg.cls
                      )}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="border-t px-6 py-4 flex items-center justify-between gap-3">
          {accion.origenTipo === "automatico" ? (
            <div className="flex items-center gap-1.5 text-xs text-blue-600">
              <Cpu className="h-3.5 w-3.5 shrink-0" />
              Generado por el motor de cumplimiento
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ClipboardList className="h-3.5 w-3.5 shrink-0" />
              Originado en hallazgo manual
            </div>
          )}
          <Button variant="outline" size="sm" onClick={onClose} className="shrink-0">
            Cerrar
          </Button>
        </div>
      </aside>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanTrabajoPage() {
  // ── Engine setup ──────────────────────────────────────────────────────────

  const docs = useMemo<DocumentoEvaluable[]>(() => {
    return EVIDENCIAS_MOCK.flatMap((ev) => {
      const hallazgo = HALLAZGOS_MOCK.find((h) => h.id === ev.hallazgoId);
      if (!hallazgo?.obligacionId) return [];
      const ob = OBLIGACIONES_MOCK.find((o) => o.id === hallazgo.obligacionId);
      return [
        {
          id: ev.id,
          nombre: ev.nombre,
          tipo: String(ev.tipoDocumento),
          entidadId: hallazgo.centroId,
          entidadTipo: "centro" as const,
          obligacionId: hallazgo.obligacionId,
          fechaVencimiento: ob?.vencimiento,
        },
      ];
    });
  }, []);

  const entidades = useMemo<EntidadInput[]>(
    () => CENTROS_MOCK.map((c) => ({ id: c.id, tipo: "centro" as const })),
    []
  );

  const tamanoEmpresa = calcularTamañoEmpresa(EMPRESA_MOCK.cantidadTrabajadores);

  const evaluaciones = useMemo(
    () => evaluarObligaciones(OBLIGACIONES_MOCK, docs, entidades, new Date(), tamanoEmpresa),
    [docs, entidades]
  );

  // ── Acciones derivadas del motor + hallazgos estructurales + manuales ──────

  const accionesBase = useMemo<AccionCumplimiento[]>(() => {
    const hallazgosAuto = generarHallazgosDesdeEvaluaciones(evaluaciones);
    const hallazgosEstruc = hallazgosEstructurales(
      EMPRESA_MOCK.cantidadTrabajadores,
      EMPRESA_MOCK.sst,
      EMPRESA_MOCK.nombre
    );
    return derivarAccionesDesdeHallazgos(
      [...hallazgosAuto, ...hallazgosEstruc],
      HALLAZGOS_MOCK,
      CENTROS_MOCK,
      OBLIGACIONES_MOCK
    );
  }, [evaluaciones]);

  // ── State ──────────────────────────────────────────────────────────────────

  const [acciones, setAcciones] = useState<AccionCumplimiento[]>(accionesBase);
  const [selected, setSelected] = useState<AccionCumplimiento | null>(null);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoAccionCumplimiento | "todos">(
    "todos"
  );
  const [filtroPrioridad, setFiltroPrioridad] = useState<
    PrioridadHallazgo | "todos"
  >("todos");
  const [filtroCentro, setFiltroCentro] = useState("todos");

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEstadoChange = (id: string, estado: EstadoAccionCumplimiento) => {
    setAcciones((prev) =>
      prev.map((a) => (a.id === id ? { ...a, estado } : a))
    );
    setSelected((prev) => (prev?.id === id ? { ...prev, estado } : prev));
  };

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const totalAuto = acciones.filter(
    (a) => a.origenTipo === "automatico"
  ).length;
  const totalPendientes = acciones.filter(
    (a) => a.estado === "pendiente"
  ).length;
  const totalEnProceso = acciones.filter(
    (a) => a.estado === "en_proceso"
  ).length;
  const totalCerradas = acciones.filter(
    (a) => a.estado === "cerrada"
  ).length;

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = useMemo<AccionCumplimiento[]>(() => {
    let list = acciones;
    if (filtroEstado !== "todos")
      list = list.filter((a) => a.estado === filtroEstado);
    if (filtroPrioridad !== "todos")
      list = list.filter((a) => a.prioridad === filtroPrioridad);
    if (filtroCentro !== "todos")
      list = list.filter((a) => a.entidadId === filtroCentro);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.titulo.toLowerCase().includes(q) ||
          (a.obligacionNombre ?? "").toLowerCase().includes(q) ||
          a.entidadNombre.toLowerCase().includes(q) ||
          a.responsable.toLowerCase().includes(q)
      );
    }
    return list;
  }, [acciones, filtroEstado, filtroPrioridad, filtroCentro, search]);

  const hasFilters =
    filtroEstado !== "todos" ||
    filtroPrioridad !== "todos" ||
    filtroCentro !== "todos" ||
    search.trim() !== "";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50/80 py-10">
      <div className="mx-auto max-w-7xl space-y-8 px-4 lg:px-0">

        {/* ── header ── */}
        <header>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Plan de trabajo DS44
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 pl-[3.25rem]">
            Acciones derivadas automáticamente del motor de cumplimiento y hallazgos activos.
          </p>
        </header>

        {/* ── motor badge ── */}
        <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Cpu className="h-4 w-4 shrink-0 text-blue-600" />
          <span>
            Cálculo automático activo —{" "}
            <strong>{totalAuto}</strong>{" "}
            {totalAuto === 1 ? "acción generada" : "acciones generadas"} automáticamente · {acciones.length - totalAuto} de hallazgos manuales.
          </span>
        </div>

        {/* ── Banner acciones críticas ── */}
        {(() => {
          const criticas = acciones.filter(
            (a) => a.prioridad === "critica" && a.estado !== "cerrada"
          );
          return criticas.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>
                <strong>{criticas.length}</strong> acción{criticas.length !== 1 ? "es" : ""} crítica{criticas.length !== 1 ? "s" : ""} pendiente{criticas.length !== 1 ? "s" : ""} — requieren atención inmediata.
              </span>
              <button
                onClick={() => {
                  setFiltroPrioridad("critica");
                  setFiltroEstado("pendiente");
                }}
                className="ml-auto shrink-0 inline-flex items-center gap-1 rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                Ver solo críticas <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : null;
        })()}

        {/* ── KPIs ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total acciones",
              value: acciones.length,
              sub: `${totalAuto} motor · ${acciones.length - totalAuto} manuales`,
              icon: <ClipboardList className="h-5 w-5" />,
              cls: "from-indigo-50 to-indigo-100 text-indigo-700",
            },
            {
              label: "Pendientes",
              value: totalPendientes,
              sub: "Por iniciar",
              icon: <Clock className="h-5 w-5" />,
              cls: "from-amber-50 to-amber-100 text-amber-700",
            },
            {
              label: "En proceso",
              value: totalEnProceso,
              sub: "En ejecución",
              icon: <Play className="h-5 w-5" />,
              cls: "from-blue-50 to-blue-100 text-blue-700",
            },
            {
              label: "Cerradas",
              value: totalCerradas,
              sub: "Acción completada",
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
                  placeholder="Buscar acciones…"
                  className="pl-9 text-sm bg-slate-50 border-slate-200"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select
                value={filtroEstado}
                onValueChange={(v) =>
                  setFiltroEstado(v as EstadoAccionCumplimiento | "todos")
                }
              >
                <SelectTrigger className="w-36 text-sm">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  {(
                    Object.entries(ESTADO_CFG) as [
                      EstadoAccionCumplimiento,
                      { label: string }
                    ][]
                  ).map(([k, cfg]) => (
                    <SelectItem key={k} value={k}>
                      {cfg.label}
                    </SelectItem>
                  ))}
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
                {filtered.length}{" "}
                {filtered.length === 1 ? "acción" : "acciones"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Table ── */}
        <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <CardContent className="py-20 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300 mb-3" />
              <p className="text-slate-500 text-sm font-medium">Sin acciones que coincidan</p>
              <p className="text-xs text-slate-400 mt-1">Ajusta los filtros para ver otras acciones del plan de trabajo.</p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {[
                      "Título",
                      "Origen (obligación)",
                      "Entidad",
                      "Prioridad",
                      "Responsable",
                      "F. compromiso",
                      "Estado",
                      "",
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((accion) => {
                    const estCfg = ESTADO_CFG[accion.estado];
                    const priCfg = PRIORIDAD_CFG[accion.prioridad];
                    return (
                      <tr
                        key={accion.id}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                        onClick={() => setSelected(accion)}
                      >
                        {/* título */}
                        <td className="px-4 py-3 max-w-xs">
                          <div className="flex items-start gap-2">
                            {accion.origenTipo === "automatico" && (
                              <span className="mt-0.5 inline-flex items-center gap-0.5 rounded-full bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 shrink-0">
                                <Cpu className="h-2.5 w-2.5" /> Auto
                              </span>
                            )}
                            <span className="font-medium text-slate-800 leading-snug line-clamp-2">
                              {accion.titulo}
                            </span>
                          </div>
                        </td>

                        {/* origen */}
                        <td className="px-4 py-3 max-w-[160px]">
                          <span className="text-xs text-slate-500 line-clamp-2 leading-snug">
                            {accion.obligacionNombre || "—"}
                          </span>
                        </td>

                        {/* entidad */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {accion.entidadNombre}
                          </div>
                        </td>

                        {/* prioridad */}
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

                        {/* responsable */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="max-w-[130px] truncate">
                              {accion.responsable}
                            </span>
                          </div>
                        </td>

                        {/* fecha */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {fmt(accion.fechaCompromiso)}
                          </div>
                        </td>

                        {/* estado */}
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

                        {/* chevron */}
                        <td className="px-4 py-3">
                          <ChevronRight className="h-4 w-4 text-slate-300" />
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

      {/* ── Drawer ── */}
      {selected && (
        <AccionDrawer
          accion={selected}
          onClose={() => setSelected(null)}
          onEstadoChange={handleEstadoChange}
        />
      )}
    </div>
  );
}
