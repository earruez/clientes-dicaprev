"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  FileWarning,
  XCircle,
  CalendarClock,
  CheckCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generarAlertas } from "@/lib/alertas";
import type { AlertaTipo, Notificacion } from "@/lib/alertas";

/* ─── Datos iniciales ───────────────────────────────────────── */

const NOTIFICACIONES_BASE: Notificacion[] = generarAlertas().map((a) => ({
  ...a,
  leida: false,
}));

/* ─── Configuración visual por tipo ────────────────────────── */

type FiltroTipo = "todas" | AlertaTipo;

const TIPO_CONFIG: Record<
  AlertaTipo,
  { label: string; iconBg: string; iconColor: string }
> = {
  critica: {
    label: "Crítica",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
  },
  proxima: {
    label: "Próxima",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  gestion: {
    label: "Gestión",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
};

const ROW_CONFIG: Record<number, { row: string; badge: string }> = {
  1: { row: "border-rose-100 bg-rose-50 hover:bg-rose-100", badge: "bg-rose-100 text-rose-700" },
  2: { row: "border-amber-100 bg-amber-50 hover:bg-amber-100", badge: "bg-amber-100 text-amber-700" },
  3: { row: "border-slate-100 bg-white hover:bg-slate-50", badge: "bg-slate-100 text-slate-600" },
};

function NotificacionIcon({ tipo }: { tipo: AlertaTipo }) {
  const cfg = TIPO_CONFIG[tipo];
  const Icon =
    tipo === "critica" ? FileWarning : tipo === "gestion" ? XCircle : CalendarClock;
  return (
    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", cfg.iconBg)}>
      <Icon className={cn("h-4 w-4", cfg.iconColor)} />
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */

export default function Page() {
  const [notifs, setNotifs] = useState<Notificacion[]>(NOTIFICACIONES_BASE);
  const [filtro, setFiltro] = useState<FiltroTipo>("todas");

  const noLeidas = notifs.filter((n) => !n.leida).length;

  const visibles = notifs.filter(
    (n) => filtro === "todas" || n.tipo === filtro
  );

  function marcarLeida(id: string) {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
  }

  function marcarTodasLeidas() {
    setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
  }

  const filtros: { value: FiltroTipo; label: string }[] = [
    { value: "todas",   label: "Todas" },
    { value: "critica", label: "Críticas" },
    { value: "gestion", label: "Gestión" },
    { value: "proxima", label: "Próximas" },
  ];

  return (
    <div className="max-w-3xl space-y-5">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Notificaciones</h1>
            <p className="text-xs text-slate-500">
              {noLeidas > 0
                ? `${noLeidas} sin leer`
                : "Todas leídas"}
            </p>
          </div>
        </div>

        {noLeidas > 0 && (
          <button
            onClick={marcarTodasLeidas}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {filtros.map((f) => {
          const count =
            f.value === "todas"
              ? notifs.length
              : notifs.filter((n) => n.tipo === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors",
                filtro === f.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  filtro === f.value
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        {visibles.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <p className="text-sm font-medium text-slate-700">Sin notificaciones en esta categoría</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {visibles.map((n) => {
              const rowCfg = ROW_CONFIG[n.prioridad] ?? ROW_CONFIG[3];
              return (
                <li key={n.id} className="first:rounded-t-2xl last:rounded-b-2xl overflow-hidden">
                  <Link
                    href={n.link}
                    onClick={() => marcarLeida(n.id)}
                    className={cn(
                      "group flex items-start gap-4 border-l-4 px-5 py-4 transition-colors",
                      rowCfg.row,
                      n.leida ? "opacity-60" : ""
                    )}
                  >
                    <NotificacionIcon tipo={n.tipo} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn("text-sm font-semibold", n.leida ? "text-slate-500" : "text-slate-900")}>
                          {n.titulo}
                        </p>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", rowCfg.badge)}>
                          {TIPO_CONFIG[n.tipo].label}
                        </span>
                        {!n.leida && (
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{n.descripcion}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{n.fecha}</p>
                    </div>

                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

    </div>
  );
}
