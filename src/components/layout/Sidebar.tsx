"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  Building2,
  CalendarRange,
  ClipboardList,
  FileCheck2,
  Home,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SidebarModuleLabel from "@/components/layout/SidebarModuleLabel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type NavItem = { href: string; label: string; description?: string };
type ModuleItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultHref: string;
  items: NavItem[];
};

const MODULES: ModuleItem[] = [
  {
    id: "dashboard",
    label: "Inicio",
    icon: Home,
    defaultHref: "/dicaprev/dashboard",
    items: [{ href: "/dicaprev/dashboard", label: "Dashboard" }],
  },
  {
    id: "empresa",
    label: "Empresa",
    icon: Building2,
    defaultHref: "/dicaprev/empresa",
    items: [
      { href: "/dicaprev/empresa", label: "Resumen" },
      { href: "/dicaprev/empresa/informacion-general", label: "Información general" },
      { href: "/dicaprev/empresa/centros", label: "Centros de trabajo" },
      { href: "/dicaprev/empresa/areas", label: "Áreas" },
      { href: "/dicaprev/empresa/cargos", label: "Cargos" },
      { href: "/dicaprev/empresa/indicadores-sst", label: "Indicadores SST" },
      { href: "/dicaprev/empresa/vehiculos", label: "Vehículos y equipos" },
      { href: "/dicaprev/documentacion", label: "Documentación empresa", description: "Documentos legales y corporativos propios de la empresa." },
      { href: "/dicaprev/biblioteca", label: "Biblioteca documental", description: "Plantillas, formatos y documentos base reutilizables." },
    ],
  },
  {
    id: "trabajadores",
    label: "Personas",
    icon: Users,
    defaultHref: "/dicaprev/trabajadores",
    items: [
      { href: "/dicaprev/trabajadores", label: "Listado" },
      { href: "/dicaprev/trabajadores/control-documental", label: "Control documental" },
      { href: "/dicaprev/capacitacion", label: "Capacitaciones" },
    ],
  },
  {
    id: "cumplimiento",
    label: "Cumplimiento",
    icon: ShieldCheck,
    defaultHref: "/dicaprev/cumplimiento",
    items: [
      { href: "/dicaprev/cumplimiento", label: "Resumen" },
      { href: "/dicaprev/cumplimiento/obligaciones", label: "Obligaciones" },
      { href: "/dicaprev/cumplimiento/hallazgos", label: "Hallazgos" },
      { href: "/dicaprev/cumplimiento/evidencias", label: "Evidencias" },
      { href: "/dicaprev/cumplimiento/plan-trabajo", label: "Plan de trabajo" },
    ],
  },
  {
    id: "acreditaciones",
    label: "Acreditación",
    icon: FileCheck2,
    defaultHref: "/dicaprev/acreditaciones",
    items: [
      { href: "/dicaprev/acreditaciones", label: "Resumen" },
      { href: "/dicaprev/acreditaciones/solicitudes", label: "Solicitudes" },
      { href: "/dicaprev/acreditaciones/plantillas", label: "Plantillas" },
      { href: "/dicaprev/acreditaciones/historial", label: "Historial" },
    ],
  },
  {
    id: "plan",
    label: "Plan",
    icon: CalendarRange,
    defaultHref: "/dicaprev/plandetrabajo",
    items: [
      { href: "/dicaprev/plandetrabajo/resumen", label: "Resumen" },
      { href: "/dicaprev/plandetrabajo/matriz-anual", label: "Matriz anual" },
      { href: "/dicaprev/plandetrabajo/actividades", label: "Actividades" },
      { href: "/dicaprev/plandetrabajo/evidencias", label: "Evidencias" },
      { href: "/dicaprev/plandetrabajo/indicadores", label: "Indicadores" },
      { href: "/dicaprev/reportes", label: "Reportes" },
      { href: "/dicaprev/reportes/vencimientos", label: "Vencimientos" },
      { href: "/dicaprev/reportes/pendientes", label: "Pendientes" },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    icon: ClipboardList,
    defaultHref: "/dicaprev/auditoria",
    items: [
      { href: "/dicaprev/auditoria", label: "Auditoría" },
      { href: "/dicaprev/notificaciones", label: "Notificaciones" },
    ],
  },
  {
    id: "extra",
    label: "Info",
    icon: BookOpen,
    defaultHref: "/dicaprev/reportes/cumplimiento-centro",
    items: [
      { href: "/dicaprev/reportes/cumplimiento-centro", label: "Cumplimiento por centro" },
      { href: "/dicaprev/reportes/cumplimiento-area", label: "Cumplimiento por área" },
      { href: "/dicaprev/ds44", label: "DS44" },
    ],
  },
  {
    id: "alerts",
    label: "Alertas",
    icon: Bell,
    defaultHref: "/dicaprev/notificaciones",
    items: [{ href: "/dicaprev/notificaciones", label: "Centro de alertas" }],
  },
];

function isItemActive(pathname: string, href: string) {
  const normalized = href.split("?")[0];
  return pathname === normalized || pathname.startsWith(normalized + "/");
}

export default function Sidebar() {
  const pathname = usePathname();
  const activeModule =
    MODULES.find((module) => module.items.some((item) => isItemActive(pathname, item.href))) ??
    MODULES[0];

  return (
    <aside className="hidden h-screen shrink-0 border-r border-slate-200 bg-white lg:flex lg:w-[320px] lg:sticky lg:top-0">
      <div className="flex w-[72px] flex-col items-center gap-3 border-r border-slate-800 bg-[#062b5b] py-4">
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400 via-emerald-500 to-blue-500 text-xs font-extrabold text-white shadow-lg shadow-blue-900/30">
          NP
        </div>

        <TooltipProvider>
          {MODULES.map((module) => {
            const Icon = module.icon;
            const active = module.id === activeModule.id;
            return (
              <Tooltip key={module.id}>
                <TooltipTrigger asChild>
                  <Link
                    href={module.defaultHref}
                    aria-label={module.label}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl transition-all",
                      active
                        ? "bg-[#0b3f7d] text-amber-300 ring-1 ring-amber-300/60"
                        : "text-slate-200 hover:bg-[#0b3f7d] hover:text-white"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="border-slate-700/30 bg-[#0b2b57] text-slate-100">
                  {module.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto bg-[#07366f] text-white">
        <div className="border-b border-slate-500/30 px-5 py-5">
          <div className="space-y-3">
            <div className="leading-tight">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-100">NEXTPREV</p>
              <p className="text-[11px] uppercase tracking-[0.08em] text-slate-300/90">Next-Level Safety &amp; Compliance</p>
            </div>
            <SidebarModuleLabel />
          </div>
        </div>

        <nav className="space-y-1 p-3">
          {activeModule.items.map((item) => {
            const active = isItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.description ?? item.label}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-[#052a57] font-semibold text-amber-300"
                    : "text-slate-100/90 hover:bg-[#0b3f7d] hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
