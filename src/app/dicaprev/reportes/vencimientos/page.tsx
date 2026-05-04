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
  Clock,
  FileText,
  Search,
  X,
  ArrowRight,
} from "lucide-react";
import {
  CENTROS_MOCK,
  OBLIGACIONES_MOCK,
  EVIDENCIAS_MOCK,
} from "@/app/dicaprev/cumplimiento/mock-data";
import { cn } from "@/lib/utils";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

// ─── Types ─────────────────────────────────────────────────────────────────────

type EstadoVencimiento = "vencido" | "por_vencer" | "vigente";

interface ItemVencimiento {
  id: string;
  nombre: string;
  tipo: "obligacion" | "evidencia";
  entidadNombre: string;
  responsable: string;
  fechaVencimiento: string;
  estado: EstadoVencimiento;
  diasRestantes: number | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL");
};

function clasificarVencimiento(
  fechaIso: string | undefined,
  hoy: Date
): { estado: EstadoVencimiento; dias: number | null } {
  if (!fechaIso) return { estado: "vigente", dias: null };
  const fecha = new Date(fechaIso + "T00:00:00");
  if (Number.isNaN(fecha.getTime())) return { estado: "vigente", dias: null };
  const hoyNorm = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const diff = Math.floor(
    (fecha.getTime() - hoyNorm.getTime()) / 86_400_000
  );
  if (diff < 0) return { estado: "vencido", dias: diff };
  if (diff <= 30) return { estado: "por_vencer", dias: diff };
  return { estado: "vigente", dias: diff };
}

// ─── Config visual ──────────────────────────────────────────────────────────────

const ESTADO_CFG: Record<
  EstadoVencimiento,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  vencido: {
    label: "Vencido",
    cls: "bg-red-50 text-red-700 border border-red-200",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  por_vencer: {
    label: "Por vencer",
    cls: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  vigente: {
    label: "Vigente",
    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function VencimientosPage() {
  const hoy = useMemo(() => new Date(), []);

  // Build items from obligations (with expiry) and evidencias
  const items = useMemo<ItemVencimiento[]>(() => {
    const result: ItemVencimiento[] = [];

    // Obligaciones con vencimiento
    for (const ob of OBLIGACIONES_MOCK) {
      if (!ob.vencimiento) continue;
      const { estado, dias } = clasificarVencimiento(ob.vencimiento, hoy);
      // One row per centro
      for (const [centroId, estadoCentro] of Object.entries(ob.estadosPorCentro)) {
        if (estadoCentro === "no_aplica") continue;
        const centro = CENTROS_MOCK.find((c) => c.id === centroId);
        result.push({
          id: `${ob.id}-${centroId}`,
          nombre: ob.nombre,
          tipo: "obligacion",
          entidadNombre: centro?.nombre ?? centroId,
          responsable: ob.responsable,
          fechaVencimiento: ob.vencimiento,
          estado,
          diasRestantes: dias,
        });
      }
    }

    // Evidencias con fecha
    for (const ev of EVIDENCIAS_MOCK) {
      const { estado, dias } = clasificarVencimiento(ev.fecha, hoy);
      result.push({
        id: ev.id,
        nombre: ev.nombre,
        tipo: "evidencia",
        entidadNombre: ev.centroNombre,
        responsable: ev.usuario,
        fechaVencimiento: ev.fecha,
        estado,
        diasRestantes: dias,
      });
    }

    // Sort: vencidos first, then por_vencer, then vigente; within each by date asc
    const order: EstadoVencimiento[] = ["vencido", "por_vencer", "vigente"];
    return result.sort((a, b) => {
      const oa = order.indexOf(a.estado);
      const ob2 = order.indexOf(b.estado);
      if (oa !== ob2) return oa - ob2;
      return a.fechaVencimiento.localeCompare(b.fechaVencimiento);
    });
  }, [hoy]);

  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoVencimiento | "todos">("todos");
  const [filtroTipo, setFiltroTipo] = useState<"obligacion" | "evidencia" | "todos">("todos");
  const [filtroCentro, setFiltroCentro] = useState("todos");

  const filtered = useMemo(() => {
    let list = items;
    if (filtroEstado !== "todos") list = list.filter((i) => i.estado === filtroEstado);
    if (filtroTipo !== "todos") list = list.filter((i) => i.tipo === filtroTipo);
    if (filtroCentro !== "todos") list = list.filter((i) => i.entidadNombre === filtroCentro);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.nombre.toLowerCase().includes(q) ||
          i.entidadNombre.toLowerCase().includes(q) ||
          i.responsable.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filtroEstado, filtroTipo, filtroCentro, search]);

  const hasFilters =
    filtroEstado !== "todos" ||
    filtroTipo !== "todos" ||
    filtroCentro !== "todos" ||
    search.trim() !== "";

  const totalVencidos = items.filter((i) => i.estado === "vencido").length;
  const totalPorVencer = items.filter((i) => i.estado === "por_vencer").length;
  const totalVigentes = items.filter((i) => i.estado === "vigente").length;
  const centrosUnicos = [...new Set(items.map((i) => i.entidadNombre))].sort();

  return (
    <div className="min-h-screen bg-slate-50/80 py-10">
      <div className="mx-auto max-w-7xl space-y-8 px-4 lg:px-0">

        <StandardPageHeader
          moduleLabel="Reportes"
          title="Reporte de Vencimientos"
          description="Obligaciones DS44 y evidencias cercanas a vencer o ya vencidas."
          icon={CalendarDays}
        />

        {/* ── KPIs ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Vencidos",
              value: totalVencidos,
              sub: "Requieren acción inmediata",
              icon: <AlertTriangle className="h-5 w-5" />,
              cls: "from-red-50 to-red-100 text-red-700",
            },
            {
              label: "Por vencer",
              value: totalPorVencer,
              sub: "Próximos 30 días",
              icon: <Clock className="h-5 w-5" />,
              cls: "from-amber-50 to-amber-100 text-amber-700",
            },
            {
              label: "Vigentes",
              value: totalVigentes,
              sub: "Al día",
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
                  placeholder="Buscar por nombre, centro, responsable…"
                  className="pl-9 text-sm bg-slate-50 border-slate-200"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select
                value={filtroEstado}
                onValueChange={(v) => setFiltroEstado(v as EstadoVencimiento | "todos")}
              >
                <SelectTrigger className="w-36 text-sm">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="por_vencer">Por vencer</SelectItem>
                  <SelectItem value="vigente">Vigente</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filtroTipo}
                onValueChange={(v) =>
                  setFiltroTipo(v as "obligacion" | "evidencia" | "todos")
                }
              >
                <SelectTrigger className="w-36 text-sm">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="obligacion">Obligación</SelectItem>
                  <SelectItem value="evidencia">Evidencia</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroCentro} onValueChange={setFiltroCentro}>
                <SelectTrigger className="w-44 text-sm">
                  <SelectValue placeholder="Centro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los centros</SelectItem>
                  {centrosUnicos.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
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
                    setFiltroTipo("todos");
                    setFiltroCentro("todos");
                    setSearch("");
                  }}
                >
                  <X className="h-3.5 w-3.5" /> Limpiar
                </Button>
              )}
              <span className="ml-auto text-xs text-slate-400">
                {filtered.length} {filtered.length === 1 ? "ítem" : "ítems"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Table ── */}
        <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <CardContent className="py-20 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300 mb-3" />
              <p className="text-slate-500 text-sm font-medium">Sin ítems por vencer</p>
              <p className="text-xs text-slate-400 mt-1">Ajusta el rango de fechas o los filtros para ver otros resultados.</p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {[
                      "Ítem",
                      "Tipo",
                      "Centro / Entidad",
                      "Responsable",
                      "Vence el",
                      "Días restantes",
                      "Estado",
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
                  {filtered.map((item) => {
                    const estCfg = ESTADO_CFG[item.estado];
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* Ítem */}
                        <td className="px-4 py-3 max-w-[240px]">
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                            <span className="font-medium text-slate-800 leading-snug line-clamp-2">
                              {item.nombre}
                            </span>
                          </div>
                        </td>

                        {/* Tipo */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              item.tipo === "obligacion"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : "bg-sky-50 text-sky-700 border border-sky-200"
                            )}
                          >
                            {item.tipo === "obligacion" ? "Obligación" : "Evidencia"}
                          </span>
                        </td>

                        {/* Centro */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {item.entidadNombre}
                          </div>
                        </td>

                        {/* Responsable */}
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                          {item.responsable}
                        </td>

                        {/* Fecha */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {fmt(item.fechaVencimiento)}
                          </div>
                        </td>

                        {/* Días */}
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold">
                          {item.diasRestantes === null ? (
                            <span className="text-slate-300">—</span>
                          ) : item.diasRestantes < 0 ? (
                            <span className="text-red-600">
                              {Math.abs(item.diasRestantes)}d vencido
                            </span>
                          ) : item.diasRestantes === 0 ? (
                            <span className="text-amber-600">Hoy</span>
                          ) : (
                            <span
                              className={
                                item.diasRestantes <= 30
                                  ? "text-amber-600"
                                  : "text-slate-600"
                              }
                            >
                              {item.diasRestantes}d
                            </span>
                          )}
                        </td>

                        {/* Estado */}
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
            <Link href="/dicaprev/reportes/pendientes" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
              Pendientes por resolver <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/dicaprev/reportes/cumplimiento-centro" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
              Cumplimiento por centro <ArrowRight className="h-3.5 w-3.5" />
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
