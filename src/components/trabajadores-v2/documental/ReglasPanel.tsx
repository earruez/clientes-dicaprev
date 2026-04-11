"use client";

import { useState } from "react";
import { Plus, Tag, FileText, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { REGLAS_DOCUMENTALES, TIPOS_DOCUMENTO, type ReglaDocumental } from "./types";

export function ReglasPanel() {
  const [reglas, setReglas] = useState<ReglaDocumental[]>(REGLAS_DOCUMENTALES);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleActiva = (id: string) =>
    setReglas((prev) =>
      prev.map((r) => (r.id === id ? { ...r, activa: !r.activa } : r))
    );

  const activas = reglas.filter((r) => r.activa).length;

  const condicionTags = (cond: ReglaDocumental["condicion"]) => {
    const tags: { label: string; value: string }[] = [];
    if (!cond.area && !cond.cargo && !cond.tipoContrato && !cond.centroTrabajo)
      return [{ label: "Aplica a", value: "Todos los trabajadores" }];
    if (cond.area)          tags.push({ label: "Área",     value: cond.area });
    if (cond.cargo)         tags.push({ label: "Cargo",    value: cond.cargo });
    if (cond.tipoContrato)  tags.push({ label: "Contrato", value: cond.tipoContrato });
    if (cond.centroTrabajo) tags.push({ label: "Centro",   value: cond.centroTrabajo });
    return tags;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 px-3 py-1.5 ring-1 ring-emerald-200">
            <p className="text-xs font-semibold text-emerald-700">
              {activas} reglas activas
            </p>
          </div>
          {reglas.length - activas > 0 && (
            <div className="rounded-xl bg-slate-100 px-3 py-1.5 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-slate-500">
                {reglas.length - activas} inactivas
              </p>
            </div>
          )}
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
          <Plus className="h-3.5 w-3.5" /> Nueva regla
        </button>
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {reglas.map((regla) => {
          const isOpen = expanded.has(regla.id);
          const tags = condicionTags(regla.condicion);
          const docCount = regla.tiposDocumentoIds.length;

          return (
            <div
              key={regla.id}
              className={`overflow-hidden rounded-2xl shadow-sm ring-1 transition-all ${
                regla.activa ? "bg-white ring-slate-200" : "bg-slate-50 ring-slate-200 opacity-60"
              }`}
            >
              <div className="flex items-start gap-4 px-5 py-4">
                {/* Toggle */}
                <button
                  onClick={() => toggleActiva(regla.id)}
                  title={regla.activa ? "Desactivar regla" : "Activar regla"}
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${
                    regla.activa
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-slate-200 text-slate-400 hover:bg-slate-300"
                  }`}
                >
                  {regla.activa ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-bold ${regla.activa ? "text-slate-900" : "text-slate-500"}`}>
                        {regla.nombre}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{regla.descripcion}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                      {docCount} doc{docCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Condition tags */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span
                        key={t.label}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-200"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {t.label}: <span className="font-bold">{t.value}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => toggle(regla.id)}
                  className="mt-0.5 shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
                >
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Expanded doc list */}
              {isOpen && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                    Documentos asignados por esta regla
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {regla.tiposDocumentoIds.map((tid) => {
                      const tipo = TIPOS_DOCUMENTO.find((t) => t.id === tid);
                      if (!tipo) return null;
                      return (
                        <span
                          key={tid}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          <FileText className="h-3 w-3 text-slate-400" />
                          {tipo.nombre}
                        </span>
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
