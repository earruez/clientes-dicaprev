"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Tag, FileText } from "lucide-react";
import {
  PLANTILLAS_DOCUMENTALES,
  TIPOS_DOCUMENTO,
  CATEGORIA_CONFIG,
} from "./types";

export function PlantillasPanel() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["pl-01"]));

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalDocs = new Set(
    PLANTILLAS_DOCUMENTALES.flatMap((p) => p.tiposDocumentoIds)
  ).size;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {PLANTILLAS_DOCUMENTALES.length} plantillas activas ·{" "}
          <span className="font-semibold text-slate-800">{totalDocs} tipos de documento</span> cubiertos
        </p>
        <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
          <Plus className="h-3.5 w-3.5" /> Nueva plantilla
        </button>
      </div>

      {/* Plantilla cards */}
      <div className="space-y-3">
        {PLANTILLAS_DOCUMENTALES.map((plantilla) => {
          const isOpen = expanded.has(plantilla.id);
          const tipos = TIPOS_DOCUMENTO.filter((t) =>
            plantilla.tiposDocumentoIds.includes(t.id)
          );

          return (
            <div
              key={plantilla.id}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
            >
              {/* Card header */}
              <button
                onClick={() => toggle(plantilla.id)}
                className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{plantilla.nombre}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{plantilla.descripcion}</p>

                    {/* AplicaA chips */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {plantilla.aplicaA.map((label) => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                        >
                          <Tag className="h-2.5 w-2.5" /> {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 pt-1">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {tipos.length} docs
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded doc list */}
              {isOpen && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                    Tipos de documento incluidos
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {tipos.map((tipo) => {
                      const cfg = CATEGORIA_CONFIG[tipo.categoria];
                      return (
                        <div
                          key={tipo.id}
                          className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                        >
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                            {tipo.categoria}
                          </span>
                          <p className="truncate text-xs font-medium text-slate-800">{tipo.nombre}</p>
                          {tipo.esCritico && (
                            <span className="ml-auto shrink-0 text-[10px] font-bold text-red-500">●</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
