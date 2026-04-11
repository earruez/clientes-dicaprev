"use client";

import { CheckCircle2, XCircle, AlertTriangle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getReglasEmpresaByCount,
  ESTRUCTURA_LABELS,
  type ReglasEmpresa,
} from "@/lib/empresa/reglas-empresa";
import {
  calcularTamañoEmpresa,
  type TamanoEmpresa,
} from "@/lib/cumplimiento/cumplimiento-engine";

// ─── Props ────────────────────────────────────────────────────────────────────

interface EstructurasObligatoriasCardProps {
  cantidadTrabajadores: number;
  /**
   * Estado actual de estructuras en la empresa (para marcar si ya existe).
   * Las claves coinciden con ReglasEmpresa (sin "tamano").
   */
  estadoActual?: Partial<Record<keyof Omit<ReglasEmpresa, "tamano">, boolean>>;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TAMANO_LABEL: Record<TamanoEmpresa, string> = {
  micro:   "Micro",
  pequena: "Pequeña",
  mediana: "Mediana",
  grande:  "Grande",
};

const TAMANO_CLS: Record<TamanoEmpresa, string> = {
  micro:   "bg-slate-100 text-slate-700",
  pequena: "bg-amber-100 text-amber-700",
  mediana: "bg-blue-100 text-blue-700",
  grande:  "bg-violet-100 text-violet-700",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function EstructurasObligatoriasCard({
  cantidadTrabajadores,
  estadoActual = {},
  className,
}: EstructurasObligatoriasCardProps) {
  const tamano: TamanoEmpresa = calcularTamañoEmpresa(cantidadTrabajadores);
  const reglas = getReglasEmpresaByCount(cantidadTrabajadores);
  const claves = Object.keys(ESTRUCTURA_LABELS) as (keyof typeof ESTRUCTURA_LABELS)[];

  // Exigencias no cubiertas (obligatorio + no activo en empresa)
  const incumplidas = claves.filter((k) => {
    const regla = reglas[k];
    const tieneEstructura = estadoActual[k] ?? false;
    return regla.obligatorio && !tieneEstructura;
  });

  return (
    <article
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          <Shield className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-slate-900">
            Estructuras obligatorias DS44
          </h3>
          <p className="text-xs text-slate-500">
            Según dotación:{" "}
            <strong className="text-slate-700">{cantidadTrabajadores} trabajadores</strong>
            {" · "}
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                TAMANO_CLS[tamano]
              )}
            >
              Empresa {TAMANO_LABEL[tamano]}
            </span>
          </p>
        </div>
        {incumplidas.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-100">
            <AlertTriangle className="h-3 w-3" />
            {incumplidas.length} pendiente{incumplidas.length !== 1 ? "s" : ""}
          </span>
        )}
        {incumplidas.length === 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="h-3 w-3" />
            Al día
          </span>
        )}
      </div>

      {/* Grid de estructuras */}
      <div className="grid gap-2 sm:grid-cols-2">
        {claves.map((k) => {
          const regla = reglas[k];
          const tieneEstructura = estadoActual[k] ?? false;
          const label = ESTRUCTURA_LABELS[k];

          // Determinar estado visual
          let icon: React.ReactNode;
          let rowCls: string;
          let badge: React.ReactNode;

          if (!regla.obligatorio) {
            icon = <XCircle className="h-3.5 w-3.5 text-slate-300 shrink-0" />;
            rowCls = "opacity-50";
            badge = (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                No aplica
              </span>
            );
          } else if (tieneEstructura) {
            icon = <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
            rowCls = "";
            badge = (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-100">
                Activo
              </span>
            );
          } else {
            icon = <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />;
            rowCls = "";
            badge = (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 border border-rose-100">
                Obligatorio — pendiente
              </span>
            );
          }

          return (
            <div
              key={k}
              className={cn(
                "flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5",
                rowCls
              )}
              title={regla.base}
            >
              <div className="flex items-center gap-2 min-w-0">
                {icon}
                <span className="text-sm font-medium text-slate-700 truncate">{label}</span>
              </div>
              <div className="shrink-0">{badge}</div>
            </div>
          );
        })}
      </div>

      {/* Base normativa resumida */}
      <p className="mt-4 text-[11px] text-slate-400">
        Basado en Ley 16.744 · DS44 · DS40 · DS95 (normativa vigente Chile)
      </p>
    </article>
  );
}
