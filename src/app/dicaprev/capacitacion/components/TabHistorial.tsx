"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCapacitacionHistorial,
  type CapacitacionHistorialEvento,
} from "@/actions/capacitaciones";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  History,
  CheckCircle2,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL");
}

function VigenciaBadge({ entry }: { entry: CapacitacionHistorialEvento }) {
  if (!entry.vigenciaHasta) return <span className="text-xs text-slate-400">Sin vigencia</span>;
  const dias = Math.ceil((new Date(entry.vigenciaHasta).getTime() - Date.now()) / 86400000);
  if (dias < 0) return <span className="text-xs text-rose-600">Vencida</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
      <CheckCircle2 className="h-3 w-3" /> Vigente hasta {fmt(entry.vigenciaHasta)}
    </span>
  );
}

const ESTADO_HISTORIAL_CFG: Record<string, { label: string; cls: string }> = {
  vigente: { label: "Vigente", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  vencido: { label: "Vencido", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  aprobado: { label: "Aprobado", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  reprobado: { label: "Reprobado", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  pendiente: { label: "Pendiente", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  completado: { label: "Completado", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  cancelado: { label: "Cancelado", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

function formatTipoEvento(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function TabHistorial() {
  const [historial, setHistorial] = useState<CapacitacionHistorialEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtroVigencia, setFiltroVigencia] = useState<"todos" | "vigente" | "vencida">("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroCapacitacion, setFiltroCapacitacion] = useState<string>("todos");
  const [filtroCargo, setFiltroCargo] = useState<string>("todos");

  const cargarHistorial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCapacitacionHistorial();
      setHistorial(data);
    } catch {
      setError("No se pudo cargar el historial de capacitaciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const cargos = useMemo(() => {
    const set = new Set(historial.map((h) => h.trabajadorCargo).filter(Boolean));
    return Array.from(set).sort();
  }, [historial]);

  const capacitaciones = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of historial) {
      map.set(item.capacitacionId, item.capacitacionNombre);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [historial]);

  const estados = useMemo(() => {
    const set = new Set(historial.map((h) => h.estado).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [historial]);

  const filtered = useMemo(() => {
    return historial.filter((e) => {
      const vigente = e.vigenciaHasta ? new Date(e.vigenciaHasta).getTime() >= Date.now() : false;
      if (filtroVigencia === "vigente" && !vigente) return false;
      if (filtroVigencia === "vencida" && vigente) return false;
      if (filtroCapacitacion !== "todos" && e.capacitacionId !== filtroCapacitacion) return false;
      if (filtroEstado !== "todos" && e.estado !== filtroEstado) return false;
      if (filtroCargo !== "todos" && e.trabajadorCargo !== filtroCargo) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.trabajadorNombre.toLowerCase().includes(q) &&
          !e.capacitacionNombre.toLowerCase().includes(q) &&
          !e.trabajadorRut.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [historial, search, filtroVigencia, filtroCapacitacion, filtroEstado, filtroCargo]);

  const kpis = useMemo(() => ({
    total: historial.length,
    vigentes: historial.filter((e) => e.estado === "vigente" || e.estado === "aprobado").length,
    vencidas: historial.filter((e) => e.estado === "vencido" || e.estado === "reprobado").length,
    aprobadas: historial.filter((e) => e.estado === "aprobado").length,
  }), [historial]);

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total registros", value: kpis.total, cls: "text-slate-700" },
          { label: "Vigentes", value: kpis.vigentes, cls: "text-emerald-600" },
          { label: "Vencidas", value: kpis.vencidas, cls: "text-rose-600" },
          { label: "Aprobadas", value: kpis.aprobadas, cls: "text-blue-600" },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-[11px] text-slate-400 uppercase font-medium">{k.label}</p>
            <p className={cn("text-2xl font-semibold mt-0.5", k.cls)}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Buscar trabajador o capacitación…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-xl border-slate-200 bg-slate-50 text-sm"
          />
        </div>
        <Select value={filtroVigencia} onValueChange={(v) => setFiltroVigencia(v as typeof filtroVigencia)}>
          <SelectTrigger className="w-[150px] h-9 rounded-xl border-slate-200 text-sm bg-white">
            <SelectValue placeholder="Vigencia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="vigente">Vigentes</SelectItem>
            <SelectItem value="vencida">Vencidas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[170px] h-9 rounded-xl border-slate-200 text-sm bg-white">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {estados.map((estado) => (
              <SelectItem key={estado} value={estado}>{estado}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroCapacitacion} onValueChange={setFiltroCapacitacion}>
          <SelectTrigger className="w-[200px] h-9 rounded-xl border-slate-200 text-sm bg-white">
            <SelectValue placeholder="Capacitación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {capacitaciones.map(([id, nombre]) => (
              <SelectItem key={id} value={id}>{nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroCargo} onValueChange={setFiltroCargo}>
          <SelectTrigger className="w-[170px] h-9 rounded-xl border-slate-200 text-sm bg-white">
            <SelectValue placeholder="Cargo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los cargos</SelectItem>
            {cargos.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_180px_140px_120px_170px] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
          <span>Trabajador / Capacitación</span>
          <span>Evento</span>
          <span>Estado</span>
          <span>Fecha</span>
          <span>Vigencia</span>
        </div>
        {loading ? (
          <div className="py-14 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Cargando historial...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <History className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Sin registros de historial para los filtros aplicados.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((e) => {
              const estadoCfg = e.estado ? ESTADO_HISTORIAL_CFG[e.estado] : null;
              return (
                <div key={e.id} className="grid grid-cols-[1fr_180px_140px_120px_170px] gap-3 px-5 py-3.5 items-center hover:bg-slate-50/60">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{e.trabajadorNombre}</p>
                    <p className="text-xs text-slate-400 truncate">{e.capacitacionNombre}</p>
                    {e.trabajadorCargo && <p className="text-[11px] text-slate-300 truncate">{e.trabajadorCargo}</p>}
                  </div>
                  <div>
                    <span className="text-xs text-slate-600">{formatTipoEvento(e.tipoEvento)}</span>
                  </div>
                  <div>
                    {estadoCfg ? (
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border", estadoCfg.cls)}>
                        {estadoCfg.label}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {fmt(e.fechaEvento)}
                    </span>
                  </span>
                  <div>
                    <VigenciaBadge entry={e} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
