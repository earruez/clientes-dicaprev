"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, AlertCircle, AlertTriangle, Info, ChevronRight, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAlertasEmpresa } from "@/app/dicaprev/alertas/actions";

type Prioridad = "alta" | "media" | "baja";

interface Notificacion {
  id: string;
  documento: string;
  mensaje: string;
  href: string;
  prioridad: Prioridad;
  leida: boolean;
}

const prioridadCfg: Record<Prioridad, { icon: React.ReactNode; dot: string; row: string }> = {
  alta: {
    icon: <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />,
    dot: "bg-red-500",
    row: "hover:bg-red-50/60",
  },
  media: {
    icon: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />,
    dot: "bg-amber-500",
    row: "hover:bg-amber-50/60",
  },
  baja: {
    icon: <Info className="h-4 w-4 shrink-0 text-blue-400" />,
    dot: "bg-blue-400",
    row: "hover:bg-blue-50/40",
  },
};

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.leida).length;

  // Close on outside click
  useEffect(() => {
    let mounted = true;

    getAlertasEmpresa()
      .then((result) => {
        if (!mounted) return;
        setNotifs(
          result.alertas.map((alerta) => ({
            id: alerta.id,
            documento: alerta.documento,
            mensaje: alerta.mensaje,
            href: "/dicaprev/empresa/resumen?tab=gobierno",
            prioridad: alerta.prioridad,
            leida: false,
          })),
        );
      })
      .catch(() => {
        if (!mounted) return;
        setNotifs([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

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
                        {n.documento}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{n.mensaje}</p>
                    </div>
                    {!n.leida && (
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", cfg.dot)} />
                    )}
                    <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300" />
                  </Link>
                </li>
              );
            })}
            {notifs.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-slate-500">Sin alertas de cumplimiento.</li>
            )}
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
