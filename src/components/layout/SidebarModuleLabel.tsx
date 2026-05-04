"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  FileText,
  Home,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ModuleMeta = {
  label: string;
  icon: LucideIcon;
  className: string;
};

const MODULE_META: Record<string, ModuleMeta> = {
  empresa: {
    label: "Empresa",
    icon: Building2,
    className: "bg-blue-500/15 text-blue-100 border-blue-300/20",
  },
  trabajadores: {
    label: "Trabajadores",
    icon: Users,
    className: "bg-cyan-500/15 text-cyan-100 border-cyan-300/20",
  },
  cumplimiento: {
    label: "Cumplimiento",
    icon: ShieldCheck,
    className: "bg-emerald-500/15 text-emerald-100 border-emerald-300/20",
  },
  acreditaciones: {
    label: "Acreditaciones",
    icon: BadgeCheck,
    className: "bg-violet-500/15 text-violet-100 border-violet-300/20",
  },
  planificacion: {
    label: "Planificación",
    icon: CalendarDays,
    className: "bg-amber-500/15 text-amber-100 border-amber-300/20",
  },
  reportes: {
    label: "Reportes",
    icon: BarChart3,
    className: "bg-indigo-500/15 text-indigo-100 border-indigo-300/20",
  },
  documentos: {
    label: "Documentos",
    icon: FileText,
    className: "bg-slate-500/15 text-slate-100 border-slate-300/20",
  },
  configuracion: {
    label: "Configuración",
    icon: Settings,
    className: "bg-zinc-500/15 text-zinc-100 border-zinc-300/20",
  },
  inicio: {
    label: "Inicio",
    icon: Home,
    className: "bg-white/10 text-white border-white/15",
  },
};

const MODULE_ALIASES: Record<string, string> = {
  dashboard: "inicio",
  plandetrabajo: "planificacion",
  documentacion: "documentos",
  biblioteca: "documentos",
  auditoria: "configuracion",
  notificaciones: "configuracion",
};

function getModuleKey(pathname: string) {
  if (!pathname.startsWith("/dicaprev")) return "inicio";

  const segments = pathname.split("/").filter(Boolean);
  const segment = segments[1];
  if (!segment) return "inicio";

  const normalized = MODULE_ALIASES[segment] ?? segment;
  return MODULE_META[normalized] ? normalized : "inicio";
}

export default function SidebarModuleLabel({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();

  const meta = useMemo(() => {
    const key = getModuleKey(pathname);
    return MODULE_META[key] ?? MODULE_META.inicio;
  }, [pathname]);

  const Icon = meta.icon;

  if (collapsed) {
    return (
      <div
        title={meta.label}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm backdrop-blur transition-all",
          meta.className
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 w-fit rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition-all",
        meta.className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{meta.label}</span>
    </div>
  );
}
