"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  derivarHistorialCapacitaciones,
  getCatalogo,
  subscribe,
  CATEGORIA_CFG,
  type HistorialEntry,
} from "@/lib/capacitacion/capacitacion-store";
import { MOCK_WORKERS } from "@/components/trabajadores-v2/types";
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
  XCircle,
  AlertTriangle,
  Award,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL");
}

function VigenciaBadge({ entry }: { entry: HistorialEntry }) {
  if (!entry.vigenciaHasta) return <span className="text-xs text-slate-400">Sin vigencia</span>;
  const dias = Math.ceil((new Date(entry.vigenciaHasta).getTime() - Date.now()) / 86400000);
  if (!entry.vigente) return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
      <XCircle className="h-3 w-3" /> Vencida
    </span>
  );
  if (dias <= 30) return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
      <AlertTriangle className="h-3 w-3" /> Vence en {dias}d
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
      <CheckCircle2 className="h-3 w-3" /> Vigente hasta {fmt(entry.vigenciaHasta)}
    </span>
  );
}

export default function TabHistorial() {
  const [historial, setHistorial] = useState(() => derivarHistorialCapacitaciones());
  const [catalogo] = useState(() => getCatalogo());
  const [search, setSearch] = useState("");
  const [filtroVigencia, setFiltroVigencia] = useState<"todos" | "vigente" | "vencida">("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos");
  const [filtroCapacitacion, setFiltroCapacitacion] = useState<string>("todos");
  const [filtroCargo, setFiltroCargo] = useState<string>("todos");

  useEffect(() => subscribe(() => setHistorial(derivarHistorialCapacitaciones())), []);

  const cargos = useMemo(() => {
    const set = new Set(MOCK_WORKERS.map((w) => w.cargo));
    return Array.from(set).sort();
  }, []);

  const filtered = useMemo(() => {
    return historial.filter((e) => {
      if (filtroVigencia === "vigente" && !e.vigente) return false;
      if (filtroVigencia === "vencida" && e.vigente) return false;
      if (filtroCapacitacion !== "todos" && e.capacitacionId !== filtroCapacitacion) return false;
      if (filtroCategoria !== "todos" && e.categoria !== filtroCategoria) return false;
      if (filtroCargo !== "todos") {
        const w = MOCK_WORKERS.find((x) => x.id === e.trabajadorId);
        if (!w || w.cargo !== filtroCargo) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!e.trabajadorNombre.toLowerCase().includes(q) && !e.capacitacionNombre.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [historial, search, filtroVigencia, filtroCapacitacion, filtroCategoria, filtroCargo]);

  const kpis = useMemo(() => ({
    total: historial.length,
    vigentes: historial.filter((e) => e.vigente).length,
    vencidas: historial.filter((e) => !e.vigente).length,
    aprobadas: historial.filter((e) => e.aprobado === true).length,
  }), [historial]);

  return (
    <div className="space-y-5">
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
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-[170px] h-9 rounded-xl border-slate-200 text-sm bg-white">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las categorías</SelectItem>
            {(Object.keys(CATEGORIA_CFG) as (keyof typeof CATEGORIA_CFG)[]).map((k) => (
              <SelectItem key={k} value={k}>{CATEGORIA_CFG[k].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroCapacitacion} onValueChange={setFiltroCapacitacion}>
          <SelectTrigger className="w-[200px] h-9 rounded-xl border-slate-200 text-sm bg-white">
            <SelectValue placeholder="Capacitación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {catalogo.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
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
        <div className="grid grid-cols-[1fr_160px_100px_110px_170px] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
          <span>Trabajador / Capacitación</span>
          <span>Categoría</span>
          <span>Nota</span>
          <span>Realizada</span>
          <span>Vigencia</span>
        </div>
        {filtered.length === 0 ? (
          <div className="py-14 text-center">
            <History className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Sin registros de historial para los filtros aplicados.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((e) => {
              const catCfg = CATEGORIA_CFG[e.categoria as keyof typeof CATEGORIA_CFG];
              const worker = MOCK_WORKERS.find((w) => w.id === e.trabajadorId);
              return (
                <div key={e.asignacionId} className="grid grid-cols-[1fr_160px_100px_110px_170px] gap-3 px-5 py-3.5 items-center hover:bg-slate-50/60">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{e.trabajadorNombre}</p>
                    <p className="text-xs text-slate-400 truncate">{e.capacitacionNombre}</p>
                    {worker && <p className="text-[11px] text-slate-300 truncate">{worker.cargo}</p>}
                  </div>
                  <div>
                    {catCfg && (
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border", catCfg.cls)}>
                        {catCfg.label}
                      </span>
                    )}
                  </div>
                  <div>
                    {e.nota !== undefined ? (
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-sm font-semibold", e.nota >= 4 ? "text-emerald-600" : "text-rose-600")}>
                          {e.nota.toFixed(1)}
                        </span>
                        {e.aprobado && <Award className="h-3.5 w-3.5 text-amber-500" />}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {fmt(e.fechaRealizacion)}
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
