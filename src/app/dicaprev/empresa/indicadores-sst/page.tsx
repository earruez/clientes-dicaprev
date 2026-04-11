"use client";

import React from "react";
import { ShieldCheck, TrendingDown, AlertTriangle, Activity, Users, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Mock SST indicators ────────────────────────────────────────────────

const INDICADORES = [
  {
    id: "ta",
    label: "Tasa de accidentabilidad",
    value: "0,82%",
    ref: "≤ 1,5%",
    estado: "ok",
    desc: "Accidentes con tiempo perdido × 100 / dotación promedio.",
    icon: <Activity className="h-5 w-5" />,
  },
  {
    id: "ts",
    label: "Tasa de siniestralidad",
    value: "1,55%",
    ref: "≤ 3,0%",
    estado: "ok",
    desc: "Días perdidos × 100 / días trabajados totales.",
    icon: <TrendingDown className="h-5 w-5" />,
  },
  {
    id: "if",
    label: "Índice de frecuencia",
    value: "4,8",
    ref: "≤ 8,0",
    estado: "ok",
    desc: "N° accidentes × 1.000.000 / horas hombre trabajadas.",
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  {
    id: "ig",
    label: "Índice de gravedad",
    value: "32",
    ref: "≤ 60",
    estado: "ok",
    desc: "Días perdidos × 1.000 / horas hombre trabajadas.",
    icon: <CalendarOff className="h-5 w-5" />,
  },
  {
    id: "dp",
    label: "Días perdidos (acum.)",
    value: "12",
    ref: "—",
    estado: "neutral",
    desc: "Total de días perdidos por accidentes en el período.",
    icon: <CalendarOff className="h-5 w-5" />,
  },
  {
    id: "wc",
    label: "Trabajadores sin accidentes",
    value: "46 / 48",
    ref: "—",
    estado: "ok",
    desc: "Dotación activa sin ningún accidente registrado en el período.",
    icon: <Users className="h-5 w-5" />,
  },
];

const ESTADO_CLS: Record<string, string> = {
  ok: "text-emerald-600",
  alerta: "text-amber-600",
  critico: "text-rose-600",
  neutral: "text-slate-700",
};

const ESTADO_BADGE: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  alerta: "bg-amber-50 text-amber-700 border-amber-200",
  critico: "bg-rose-50 text-rose-700 border-rose-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function IndicadoresSSTPage() {
  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="max-w-screen-lg mx-auto flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-900 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Empresa
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Indicadores SST
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Tasas e índices de seguridad y salud en el trabajo del período vigente.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-lg mx-auto px-6 py-6">
        {/* Período */}
        <div className="mb-5 flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Período
          </span>
          <span className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm">
            Enero – Abril 2026
          </span>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {INDICADORES.map((ind) => (
            <div
              key={ind.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-400">{ind.icon}</div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    ESTADO_BADGE[ind.estado]
                  )}
                >
                  {ind.estado === "ok" ? "En rango" : ind.estado === "alerta" ? "Alerta" : ind.estado === "critico" ? "Crítico" : "Refs."}
                </span>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                  {ind.label}
                </p>
                <p className={cn("text-3xl font-bold tracking-tight", ESTADO_CLS[ind.estado])}>
                  {ind.value}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-2 mt-auto">
                <span>{ind.desc}</span>
                {ind.ref !== "—" && (
                  <span className="shrink-0 ml-2 font-medium text-slate-500">
                    Ref: {ind.ref}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
