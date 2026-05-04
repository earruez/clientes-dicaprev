"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";
import type { Worker } from "../types";
import type { DocTrabajadorView } from "./types";

interface RowData {
  worker: Worker;
  docs: DocTrabajadorView[];
  summary: { total: number; cargados: number; pendientes: number; vencidos: number; rechazados: number; enRevision: number; pct: number };
}

type Bucket = "vencidos" | "proximos30" | "proximos90";

const BUCKET_CFG: Record<Bucket, {
  label: string; subtitle: string;
  headerCls: string; countCls: string; dateCls: string;
}> = {
  vencidos: {
    label: "Vencidos",
    subtitle: "Requieren renovación inmediata",
    headerCls: "bg-red-50 ring-red-200",
    countCls:  "bg-red-100 text-red-700",
    dateCls:   "text-red-600",
  },
  proximos30: {
    label: "Próximos 30 días",
    subtitle: "Vencen dentro del mes",
    headerCls: "bg-amber-50 ring-amber-200",
    countCls:  "bg-amber-100 text-amber-700",
    dateCls:   "text-amber-600",
  },
  proximos90: {
    label: "Próximos 90 días",
    subtitle: "Requieren seguimiento",
    headerCls: "bg-slate-50 ring-slate-200",
    countCls:  "bg-slate-200 text-slate-700",
    dateCls:   "text-slate-500",
  },
};

interface VencEntry {
  worker: Worker;
  doc: DocTrabajadorView;
}

export function PorVencimientosView({ rows }: { rows: RowData[] }) {
  const [expanded, setExpanded] = useState<Set<Bucket>>(new Set(["vencidos", "proximos30"]));

  const buckets = useMemo(() => {
    const result: Record<Bucket, VencEntry[]> = { vencidos: [], proximos30: [], proximos90: [] };
    for (const { worker, docs } of rows) {
      for (const doc of docs) {
        if (!doc.tipo.requiereVencimiento || doc.diasParaVencer === undefined) continue;
        if (doc.diasParaVencer < 0)       result.vencidos.push({ worker, doc });
        else if (doc.diasParaVencer <= 30) result.proximos30.push({ worker, doc });
        else if (doc.diasParaVencer <= 90) result.proximos90.push({ worker, doc });
      }
    }
    result.vencidos.sort((a, b)   => (a.doc.diasParaVencer ?? 0) - (b.doc.diasParaVencer ?? 0));
    result.proximos30.sort((a, b) => (a.doc.diasParaVencer ?? 0) - (b.doc.diasParaVencer ?? 0));
    result.proximos90.sort((a, b) => (a.doc.diasParaVencer ?? 0) - (b.doc.diasParaVencer ?? 0));
    return result;
  }, [rows]);

  function toggle(bucket: Bucket) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(bucket)) {
        n.delete(bucket);
      } else {
        n.add(bucket);
      }
      return n;
    });
  }

  return (
    <div className="space-y-3">
      {(["vencidos", "proximos30", "proximos90"] as Bucket[]).map((bucket) => {
        const cfg     = BUCKET_CFG[bucket];
        const entries = buckets[bucket];
        const isOpen  = expanded.has(bucket);

        return (
          <div key={bucket} className="overflow-hidden rounded-2xl shadow-sm ring-1">
            <button
              onClick={() => toggle(bucket)}
              className={`flex w-full items-center gap-3 px-5 py-4 text-left transition hover:opacity-90 ring-1 ${cfg.headerCls}`}
            >
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${cfg.countCls}`}>
                {entries.length}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">{cfg.label}</p>
                <p className="text-[11px] text-slate-500">{cfg.subtitle}</p>
              </div>
              {isOpen
                ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
            </button>

            {isOpen && entries.length === 0 && (
              <p className="bg-white px-5 py-4 text-sm text-slate-400">Sin documentos en este rango.</p>
            )}

            {isOpen && entries.length > 0 && (
              <div className="divide-y divide-slate-100 bg-white">
                {entries.map(({ worker, doc }) => {
                  const initials = `${worker.nombre[0]}${worker.apellido[0]}`;
                  const days     = doc.diasParaVencer ?? 0;
                  const absD     = Math.abs(days);
                  const dayLabel =
                    days < 0
                      ? `Venció hace ${absD} día${absD !== 1 ? "s" : ""}`
                      : days === 0
                        ? "Vence hoy"
                        : `Vence en ${days} día${days !== 1 ? "s" : ""}`;

                  return (
                    <div key={`${worker.id}-${doc.tipo.id}`} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xs font-bold text-white">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-semibold text-slate-900">{worker.apellido}, {worker.nombre}</p>
                          {doc.tipo.esCritico && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-200">
                              <ShieldAlert className="h-2.5 w-2.5" /> DS44
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-slate-500">{doc.tipo.nombre} · {worker.cargo}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-xs font-bold ${cfg.dateCls}`}>{dayLabel}</p>
                        {doc.fechaVencimiento && (
                          <p className="text-[11px] text-slate-400">{doc.fechaVencimiento}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
