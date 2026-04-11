"use client";

import { Search, X, SlidersHorizontal, AlertTriangle, Clock } from "lucide-react";
import { type FilterConfig, AREAS, ESTADOS, CONTRATOS, CENTROS } from "./types";

interface WorkersFiltersProps {
  filters: FilterConfig;
  onChange: (f: FilterConfig) => void;
  totalCount: number;
  filteredCount: number;
}

const selectCls =
  "h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer";

export function WorkersFilters({
  filters,
  onChange,
  totalCount,
  filteredCount,
}: WorkersFiltersProps) {
  const set = <K extends keyof FilterConfig>(key: K, val: FilterConfig[K]) =>
    onChange({ ...filters, [key]: val });

  const hasActive =
    !!filters.search ||
    !!filters.area ||
    !!filters.estado ||
    !!filters.tipoContrato ||
    !!filters.centroTrabajo ||
    filters.soloDs44 ||
    filters.conPendientes;

  const clear = () =>
    onChange({
      search: "",
      area: "",
      estado: "",
      tipoContrato: "",
      centroTrabajo: "",
      soloDs44: false,
      conPendientes: false,
    });

  return (
    <div className="sticky top-0 z-30 -mx-4 bg-slate-50/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="space-y-2.5">
        {/* ── Row 1: search + dropdowns ── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, RUT o cargo…"
              value={filters.search}
              onChange={(e) => set("search", e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-8 text-xs text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {filters.search && (
              <button
                onClick={() => set("search", "")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <select value={filters.area}          onChange={(e) => set("area", e.target.value)}          className={selectCls}>
            <option value="">Todas las áreas</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <select value={filters.estado}        onChange={(e) => set("estado", e.target.value)}        className={selectCls}>
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>

          <select value={filters.tipoContrato}  onChange={(e) => set("tipoContrato", e.target.value)}  className={selectCls}>
            <option value="">Todos los contratos</option>
            {CONTRATOS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={filters.centroTrabajo} onChange={(e) => set("centroTrabajo", e.target.value)} className={selectCls}>
            <option value="">Todos los centros</option>
            {CENTROS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {hasActive && (
            <button
              onClick={clear}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <X className="h-3 w-3" /> Limpiar
            </button>
          )}
        </div>

        {/* ── Row 2: toggles + summary ── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* DS44 crítico toggle */}
          <button
            onClick={() => set("soloDs44", !filters.soloDs44)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition ${
              filters.soloDs44
                ? "bg-red-600 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            Solo DS44 críticos
          </button>

          {/* Con pendientes toggle */}
          <button
            onClick={() => set("conPendientes", !filters.conPendientes)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition ${
              filters.conPendientes
                ? "bg-amber-500 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
            }`}
          >
            <Clock className="h-3 w-3" />
            Con pendientes
          </button>

          {/* Result summary */}
          {hasActive && (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-500">
              <SlidersHorizontal className="h-3 w-3" />
              <span className="font-semibold text-slate-800">{filteredCount}</span>
              {" de "}
              <span className="font-semibold text-slate-800">{totalCount}</span>
              {" trabajadores"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
