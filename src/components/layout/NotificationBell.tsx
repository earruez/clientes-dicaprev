"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, AlertCircle, AlertTriangle, Info, ChevronRight, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Prioridad = "critica" | "alta" | "media";

interface Notificacion {
  id: string;
  titulo: string;
  descripcion: string;
  href: string;
  prioridad: Prioridad;
  leida: boolean;
}

const NOTIFICACIONES_INICIALES: Notificacion[] = [
  {
    id: "n-01",
    titulo: "Hallazgo crítico: Equipos defectuosos",
    descripcion: "Equipos de protección con defectos detectados — acción requerida.",
    href: "/dicaprev/cumplimiento/hallazgos",
    prioridad: "critica",
    leida: false,
  },
  {
    id: "n-02",
    titulo: "Hallazgo crítico: Documentación incompleta",
    descripcion: "Documentación de seguridad incompleta en contratistas.",
    href: "/dicaprev/cumplimiento/hallazgos",
    prioridad: "critica",
    leida: false,
  },
  {
    id: "n-03",
    titulo: "Obligación DS44 vencida: IPER",
    descripcion: "Matriz de riegos venció el 31-03-2026. Renovar de inmediato.",
    href: "/dicaprev/cumplimiento/obligaciones",
    prioridad: "critica",
    leida: false,
  },
  {
    id: "n-04",
    titulo: "Sebastián Vidal — 3 documentos pendientes",
    descripcion: "Trabajador sin documentación laboral completa.",
    href: "/dicaprev/trabajadores-v2/control-documental",
    prioridad: "alta",
    leida: false,
  },
  {
    id: "n-05",
    titulo: "Ricardo Flores — 2 documentos vencidos",
    descripcion: "Documentos de trabajador vencidos que requieren renovación.",
    href: "/dicaprev/trabajadores-v2/control-documental",
    prioridad: "alta",
    leida: false,
  },
  {
    id: "n-06",
    titulo: "Acreditación rechazada — Constructora Altamira",
    descripcion: "Documentos de vehículo no cumplen el formato requerido.",
    href: "/dicaprev/acreditaciones",
    prioridad: "alta",
    leida: false,
  },
  {
    id: "n-07",
    titulo: "Juan Muñoz — Capacitación vencida",
    descripcion: "Inducción SST venció en sep 2024. Requiere renovación.",
    href: "/dicaprev/trabajadores-v2",
    prioridad: "media",
    leida: false,
  },
];

const prioridadCfg: Record<Prioridad, { icon: React.ReactNode; dot: string; row: string }> = {
  critica: {
    icon: <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />,
    dot: "bg-red-500",
    row: "hover:bg-red-50/60",
  },
  alta: {
    icon: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />,
    dot: "bg-amber-500",
    row: "hover:bg-amber-50/60",
  },
  media: {
    icon: <Info className="h-4 w-4 shrink-0 text-blue-400" />,
    dot: "bg-blue-400",
    row: "hover:bg-blue-50/40",
  },
};

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<Notificacion[]>(NOTIFICACIONES_INICIALES);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.leida).length;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function markRead(id: string) {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
  }

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
          open
            ? "border-slate-300 bg-slate-100 text-slate-700"
            : "border-transparent bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700"
        )}
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-800">Notificaciones</span>
              {unread > 0 && (
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                  {unread} nuevas
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          {/* List */}
          <ul className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
            {notifs.map((n) => {
              const cfg = prioridadCfg[n.prioridad];
              return (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => {
                      markRead(n.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors",
                      cfg.row,
                      n.leida ? "opacity-50" : ""
                    )}
                  >
                    <div className="mt-0.5">{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm leading-snug text-slate-800", !n.leida && "font-semibold")}>
                        {n.titulo}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{n.descripcion}</p>
                    </div>
                    {!n.leida && (
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", cfg.dot)} />
                    )}
                    <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300" />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2.5">
            <Link
              href="/dicaprev/dashboard"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Ver resumen general →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
