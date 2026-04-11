"use client";

import { Users, UserCheck, FileWarning, BookOpen, AlertTriangle, ArrowRight } from "lucide-react";
import type { Worker } from "./types";

export type KpiId = "total" | "activos" | "ds44" | "pendientes" | "cap";

interface KPIsProps {
  workers: Worker[];
  activeKpiId: KpiId | null;
  onKpiClick: (id: KpiId) => void;
}

export function KPIs({ workers, activeKpiId, onKpiClick }: KPIsProps) {
  const total = workers.length;
  const activos = workers.filter((w) => w.estado === "Activo").length;
  const ds44Count = workers.filter((w) => w.documentosPendientes + w.capacitacionesPendientes > 2).length;
  const conPendientes = workers.filter((w) => w.documentosPendientes + w.capacitacionesPendientes > 0).length;
  const totalCap = workers.reduce((sum, w) => sum + w.capacitacionesPendientes, 0);
  const activoPct = total > 0 ? Math.round((activos / total) * 100) : 0;

  type Stat = {
    id: KpiId;
    label: string;
    value: number;
    sub: string;
    icon: React.ReactNode;
    accentBar: string;
    iconBg: string;
    iconColor: string;
    activeRing: string;
    activeBg: string;
  };

  const stats: Stat[] = [
    {
      id: "total",
      label: "Total trabajadores",
      value: total,
      sub: "Nómina completa",
      icon: <Users className="h-5 w-5" />,
      accentBar: "bg-slate-400",
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
      activeRing: "ring-slate-400",
      activeBg: "bg-slate-50",
    },
    {
      id: "activos",
      label: "Activos ahora",
      value: activos,
      sub: `${activoPct}% del total`,
      icon: <UserCheck className="h-5 w-5" />,
      accentBar: "bg-emerald-500",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      activeRing: "ring-emerald-400",
      activeBg: "bg-emerald-50/60",
    },
    {
      id: "ds44",
      label: "DS44 críticos",
      value: ds44Count,
      sub: ds44Count > 0 ? "Requieren revisión" : "Sin alertas DS44",
      icon: <AlertTriangle className="h-5 w-5" />,
      accentBar: ds44Count > 0 ? "bg-red-500" : "bg-slate-200",
      iconBg: ds44Count > 0 ? "bg-red-50" : "bg-slate-100",
      iconColor: ds44Count > 0 ? "text-red-600" : "text-slate-400",
      activeRing: "ring-red-400",
      activeBg: "bg-red-50/60",
    },
    {
      id: "pendientes",
      label: "Con pendientes",
      value: conPendientes,
      sub: conPendientes > 0 ? "Docs o caps por atender" : "Todo al día",
      icon: <FileWarning className="h-5 w-5" />,
      accentBar: conPendientes > 0 ? "bg-amber-400" : "bg-slate-200",
      iconBg: conPendientes > 0 ? "bg-amber-50" : "bg-slate-100",
      iconColor: conPendientes > 0 ? "text-amber-600" : "text-slate-400",
      activeRing: "ring-amber-400",
      activeBg: "bg-amber-50/60",
    },
    {
      id: "cap",
      label: "Cap. pendientes",
      value: totalCap,
      sub: totalCap > 0 ? "Capacitaciones requeridas" : "Plan al día",
      icon: <BookOpen className="h-5 w-5" />,
      accentBar: totalCap > 0 ? "bg-orange-400" : "bg-slate-200",
      iconBg: totalCap > 0 ? "bg-orange-50" : "bg-slate-100",
      iconColor: totalCap > 0 ? "text-orange-600" : "text-slate-400",
      activeRing: "ring-orange-400",
      activeBg: "bg-orange-50/60",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {stats.map((s) => {
        const isActive = activeKpiId === s.id;

        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onKpiClick(s.id)}
            className={`group relative overflow-hidden rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              isActive
                ? `${s.activeBg} ${s.activeRing} shadow-md -translate-y-0.5`
                : "ring-slate-200 hover:ring-slate-300"
            }`}
          >
            {/* Accent bar — thicker when active */}
            <div
              className={`absolute inset-x-0 top-0 transition-all duration-200 ${s.accentBar} ${
                isActive ? "h-1" : "h-0.5"
              }`}
            />

            {/* Icon + arrow hint */}
            <div className="flex items-start justify-between gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                  isActive ? s.iconBg : s.iconBg
                } ${s.iconColor}`}
              >
                {s.icon}
              </div>
              <ArrowRight
                className={`mt-1 h-3.5 w-3.5 shrink-0 transition-all duration-200 ${
                  isActive
                    ? `${s.iconColor} opacity-100 rotate-0`
                    : "text-slate-300 opacity-0 group-hover:opacity-60 -rotate-45"
                }`}
              />
            </div>

            {/* Value */}
            <p
              className={`mt-3 text-3xl font-bold tracking-tight transition-colors ${
                isActive ? s.iconColor : "text-slate-900"
              }`}
            >
              {s.value}
            </p>

            {/* Label */}
            <p className="mt-0.5 text-xs font-semibold text-slate-700">{s.label}</p>

            {/* Sub */}
            <p
              className={`mt-1 text-[11px] font-medium transition-colors ${
                isActive ? s.iconColor : "text-slate-400"
              }`}
            >
              {s.sub}
            </p>

            {/* Active indicator */}
            {isActive && (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Filtrando ·{" "}
                <span
                  className="cursor-pointer underline hover:text-slate-600"
                >
                  limpiar
                </span>
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
