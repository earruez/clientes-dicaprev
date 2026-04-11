"use client";

import { useState } from "react";
import { Plus, Clock, ShieldAlert, FileText } from "lucide-react";
import {
  type TipoDocumento,
  type DocCategoria,
  TIPOS_DOCUMENTO,
  CATEGORIA_CONFIG,
} from "./types";

const CATEGORIAS: DocCategoria[] = ["Contratación", "SST", "Capacitación", "Médico", "Técnico"];

const colTh = "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400";

export function TiposDocPanel() {
  const [tipos] = useState<TipoDocumento[]>(TIPOS_DOCUMENTO);
  const [activeCategoria, setActiveCategoria] = useState<DocCategoria | "">("");

  const filtered = activeCategoria
    ? tipos.filter((t) => t.categoria === activeCategoria)
    : tipos;

  const critCount = filtered.filter((t) => t.esCritico).length;
  const conVencCount = filtered.filter((t) => t.requiereVencimiento).length;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveCategoria("")}
            className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition ${
              activeCategoria === ""
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            Todos ({tipos.length})
          </button>
          {CATEGORIAS.map((cat) => {
            const cfg = CATEGORIA_CONFIG[cat];
            const count = tipos.filter((t) => t.categoria === cat).length;
            const isActive = activeCategoria === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategoria(cat)}
                className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition ring-1 ${
                  isActive
                    ? `${cfg.bg} ${cfg.text} ${cfg.ring}`
                    : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {cat}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? cfg.bg : "bg-slate-100 text-slate-600"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
          <Plus className="h-3.5 w-3.5" /> Nuevo tipo
        </button>
      </div>

      {/* Mini stats */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 ring-1 ring-red-200">
          <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
          <span className="text-xs font-semibold text-red-700">{critCount} críticos</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200">
          <Clock className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-xs font-semibold text-amber-700">{conVencCount} con vencimiento</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              <th className={colTh}>Nombre</th>
              <th className={colTh}>Categoría</th>
              <th className={colTh}>Vencimiento</th>
              <th className={colTh}>Criticidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((tipo) => {
              const cfg = CATEGORIA_CONFIG[tipo.categoria];
              return (
                <tr
                  key={tipo.id}
                  className="group cursor-default transition-colors hover:bg-slate-50/60"
                >
                  {/* Nombre */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-slate-900">{tipo.nombre}</p>
                        <p className="text-[11px] text-slate-400">{tipo.descripcion}</p>
                      </div>
                    </div>
                  </td>

                  {/* Categoría */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
                      {tipo.categoria}
                    </span>
                  </td>

                  {/* Vencimiento */}
                  <td className="px-4 py-3">
                    {tipo.requiereVencimiento ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-amber-700">
                        <Clock className="h-3.5 w-3.5" />
                        {tipo.vencimientoMeses} meses
                      </span>
                    ) : (
                      <span className="text-[12px] text-slate-400">Sin vencimiento</span>
                    )}
                  </td>

                  {/* Criticidad */}
                  <td className="px-4 py-3">
                    {tipo.esCritico ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                        <ShieldAlert className="h-3 w-3" /> Crítico
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
