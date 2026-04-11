"use client";

import { useState, useMemo } from "react";
import { CalendarClock, UploadCloud } from "lucide-react";
import {
  TIPOS_DOCUMENTO,
  REGLAS_DOCUMENTALES,
  MOCK_DOCUMENTOS,
  CATEGORIA_CONFIG,
  getWorkerDocs,
} from "./types";
import { MOCK_WORKERS } from "../types";

type RangeFilter = "vencidos" | "30d" | "90d" | "todos";

interface VencimientoRow {
  workerNombre: string;
  workerApellido: string;
  workerId: string;
  area: string;
  docNombre: string;
  docCategoria: string;
  esCritico: boolean;
  fechaVencimiento: string;
  diasParaVencer: number;
}

const RANGE_OPTS: { id: RangeFilter; label: string; color: string }[] = [
  { id: "vencidos", label: "Vencidos",         color: "bg-red-600 text-white" },
  { id: "30d",      label: "Próximos 30 días", color: "bg-amber-500 text-white" },
  { id: "90d",      label: "Próximos 90 días", color: "bg-yellow-400 text-slate-900" },
  { id: "todos",    label: "Todos",             color: "bg-slate-900 text-white" },
];

export function VencimientosPanel() {
  const [range, setRange] = useState<RangeFilter>("todos");

  const allRows = useMemo<VencimientoRow[]>(() => {
    const result: VencimientoRow[] = [];
    for (const worker of MOCK_WORKERS) {
      const docs = getWorkerDocs(worker, REGLAS_DOCUMENTALES, TIPOS_DOCUMENTO, MOCK_DOCUMENTOS);
      for (const doc of docs) {
        if (!doc.tipo.requiereVencimiento || doc.diasParaVencer === undefined) continue;
        result.push({
          workerNombre:    worker.nombre,
          workerApellido:  worker.apellido,
          workerId:        worker.id,
          area:            worker.area,
          docNombre:       doc.tipo.nombre,
          docCategoria:    doc.tipo.categoria,
          esCritico:       doc.tipo.esCritico,
          fechaVencimiento: doc.fechaVencimiento ?? "",
          diasParaVencer:  doc.diasParaVencer,
        });
      }
    }
    return result.sort((a, b) => a.diasParaVencer - b.diasParaVencer);
  }, []);

  const filtered = useMemo(() => {
    switch (range) {
      case "vencidos": return allRows.filter((r) => r.diasParaVencer < 0);
      case "30d":      return allRows.filter((r) => r.diasParaVencer >= 0 && r.diasParaVencer <= 30);
      case "90d":      return allRows.filter((r) => r.diasParaVencer >= 0 && r.diasParaVencer <= 90);
      default:         return allRows;
    }
  }, [allRows, range]);

  const counts = useMemo(() => ({
    vencidos: allRows.filter((r) => r.diasParaVencer < 0).length,
    d30:      allRows.filter((r) => r.diasParaVencer >= 0 && r.diasParaVencer <= 30).length,
    d90:      allRows.filter((r) => r.diasParaVencer >= 0 && r.diasParaVencer <= 90).length,
    todos:    allRows.length,
  }), [allRows]);

  const urgencyLabel = (dias: number) => {
    if (dias < 0)   return { label: `Venció hace ${Math.abs(dias)} días`,  cls: "text-red-600 font-bold" };
    if (dias <= 30) return { label: `Vence en ${dias} días`,               cls: "text-amber-600 font-semibold" };
    return             { label: `Vence en ${dias} días`,                   cls: "text-slate-500" };
  };

  const urgencyRowCls = (dias: number) => {
    if (dias < 0)   return "border-l-4 border-l-red-400 bg-red-50";
    if (dias <= 30) return "border-l-4 border-l-amber-400 bg-amber-50";
    return "border-l-4 border-l-slate-200 bg-white";
  };

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Vencidos",         value: counts.vencidos, cls: "text-red-600" },
          { label: "Vencen en 30 días",value: counts.d30,      cls: "text-amber-600" },
          { label: "Vencen en 90 días",value: counts.d90,      cls: "text-yellow-600" },
          { label: "Total con vencimiento", value: counts.todos, cls: "text-slate-900" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className={`text-2xl font-bold ${cls}`}>{value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {RANGE_OPTS.map((opt) => {
          const count = opt.id === "vencidos" ? counts.vencidos : opt.id === "30d" ? counts.d30 : opt.id === "90d" ? counts.d90 : counts.todos;
          return (
            <button
              key={opt.id}
              onClick={() => setRange(opt.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                range === opt.id ? opt.color : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {opt.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${range === opt.id ? "bg-white/20 text-white" : "bg-white text-slate-600"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white py-16 shadow-sm ring-1 ring-slate-200">
            <CalendarClock className="h-10 w-10 text-slate-200" />
            <p className="text-sm font-medium text-slate-400">Sin vencimientos en este rango</p>
          </div>
        )}
        {filtered.map((row, idx) => {
          const catCfg = CATEGORIA_CONFIG[row.docCategoria as keyof typeof CATEGORIA_CONFIG];
          const urg    = urgencyLabel(row.diasParaVencer);
          return (
            <div
              key={`${row.workerId}-${row.docNombre}-${idx}`}
              className={`flex items-center gap-4 rounded-2xl px-5 py-3.5 shadow-sm ring-1 ring-slate-200 ${urgencyRowCls(row.diasParaVencer)}`}
            >
              {/* Worker avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xs font-bold text-white">
                {row.workerNombre[0]}{row.workerApellido[0]}
              </div>

              {/* Doc info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{row.docNombre}</p>
                  {row.esCritico && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-200">
                      Crítico
                    </span>
                  )}
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${catCfg?.bg ?? "bg-slate-50"} ${catCfg?.text ?? "text-slate-600"} ${catCfg?.ring ?? "ring-1 ring-slate-200"}`}>
                    {row.docCategoria}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {row.workerApellido}, {row.workerNombre} · {row.area}
                </p>
              </div>

              {/* Urgency + date */}
              <div className="shrink-0 text-right">
                <p className={`text-xs ${urg.cls}`}>{urg.label}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {new Date(row.fechaVencimiento).toLocaleDateString("es-CL")}
                </p>
              </div>

              {/* Action */}
              <button className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                <UploadCloud className="h-3.5 w-3.5" /> Renovar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
