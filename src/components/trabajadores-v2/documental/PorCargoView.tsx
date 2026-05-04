"use client";

import { useState, useMemo } from "react";
import { Briefcase, ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";
import type { Worker } from "../types";
import type { DocTrabajadorView } from "./types";

interface RowSummary {
  total: number; cargados: number; pendientes: number;
  vencidos: number; rechazados: number; enRevision: number; pct: number;
}

interface RowData {
  worker: Worker;
  docs: DocTrabajadorView[];
  summary: RowSummary;
}

type KpiColor = "slate" | "emerald" | "amber" | "red" | "rose" | "blue";

const KPI_BG: Record<KpiColor, string> = {
  slate:   "bg-slate-100 text-slate-600",
  emerald: "bg-emerald-50 text-emerald-700",
  amber:   "bg-amber-50 text-amber-700",
  red:     "bg-red-50 text-red-700",
  rose:    "bg-rose-50 text-rose-700",
  blue:    "bg-blue-50 text-blue-700",
};

function KpiPill({ label, value, color }: { label: string; value: number; color: KpiColor }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${KPI_BG[color]}`}>{value}</span>
      <span className="text-[9px] uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  );
}

function WorkerRow({ worker, docs, summary }: RowData) {
  const initials = `${worker.nombre[0]}${worker.apellido[0]}`;
  const hasDS44  = docs.some((d) => d.tipo.esCritico && d.estado !== "completo" && d.estado !== "no_aplica");
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xs font-bold text-white">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold text-slate-900">{worker.apellido}, {worker.nombre}</p>
          {hasDS44 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-200">
              <ShieldAlert className="h-2.5 w-2.5" /> DS44
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-slate-400">{worker.area} · {worker.centroTrabajo}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {summary.vencidos   > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-200">{summary.vencidos} venc.</span>}
        {summary.rechazados > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200">{summary.rechazados} rech.</span>}
        {summary.pendientes > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">{summary.pendientes} pend.</span>}
        <span className={`min-w-[2.5rem] text-right text-xs font-bold ${summary.pct >= 80 ? "text-emerald-600" : summary.pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
          {summary.pct}%
        </span>
      </div>
    </div>
  );
}

export function PorCargoView({ rows }: { rows: RowData[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<string, RowData[]>();
    for (const row of rows) {
      const k = row.worker.cargo;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(row);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  function toggle(k: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(k)) {
        n.delete(k);
      } else {
        n.add(k);
      }
      return n;
    });
  }

  if (groups.length === 0) {
    return (
      <p className="rounded-2xl bg-white px-5 py-10 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-200">
        No hay trabajadores que coincidan con los filtros seleccionados.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(([cargo, groupRows]) => {
        const total      = groupRows.reduce((s, r) => s + r.summary.total,      0);
        const cargados   = groupRows.reduce((s, r) => s + r.summary.cargados,   0);
        const pendientes = groupRows.reduce((s, r) => s + r.summary.pendientes, 0);
        const vencidos   = groupRows.reduce((s, r) => s + r.summary.vencidos,   0);
        const rechazados = groupRows.reduce((s, r) => s + r.summary.rechazados, 0);
        const enRevision = groupRows.reduce((s, r) => s + r.summary.enRevision, 0);
        const pct        = total > 0 ? Math.round((cargados / total) * 100) : 0;
        const hasDS44    = groupRows.some((r) => r.docs.some((d) => d.tipo.esCritico && d.estado !== "completo" && d.estado !== "no_aplica"));
        const isOpen     = expanded.has(cargo);

        return (
          <div key={cargo} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <button
              onClick={() => toggle(cargo)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900">
                <Briefcase className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{cargo}</p>
                  {hasDS44 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-200">
                      <ShieldAlert className="h-3 w-3" /> DS44 crítico
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">{groupRows.length} trabajador{groupRows.length !== 1 ? "es" : ""}</p>
              </div>
              <div className="hidden items-end gap-4 sm:flex">
                <KpiPill label="Req."  value={total}      color="slate" />
                <KpiPill label="OK"    value={cargados}   color="emerald" />
                {pendientes > 0 && <KpiPill label="Pend." value={pendientes} color="amber" />}
                {vencidos   > 0 && <KpiPill label="Venc." value={vencidos}   color="red" />}
                {rechazados > 0 && <KpiPill label="Rech." value={rechazados} color="rose" />}
                {enRevision > 0 && <KpiPill label="Rev."  value={enRevision} color="blue" />}
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`w-8 text-right text-xs font-bold ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {pct}%
                </span>
              </div>
              {isOpen
                ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
            </button>
            {isOpen && (
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {groupRows.map((row) => <WorkerRow key={row.worker.id} {...row} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
