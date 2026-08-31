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
import { usePermissions } from "@/lib/permissions";
import type { PermissionKey } from "@/lib/permissions-matrix";
import type { CompanyModuleKey } from "@/lib/company-modules";
import SidebarModuleLabel from "@/components/layout/SidebarModuleLabel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type NavItem = { href: string; label: string; description?: string; permission?: PermissionKey; moduleKey?: CompanyModuleKey };
type ModuleItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultHref: string;
  alwaysVisible?: boolean;
  permission?: PermissionKey;
  moduleKey?: CompanyModuleKey;
  items: NavItem[];
};

const MODULES: ModuleItem[] = [
  {
    id: "dashboard",
    label: "Inicio",
    icon: Home,
    defaultHref: "/dicaprev/dashboard",
    alwaysVisible: true,
    moduleKey: "dashboard",
    items: [
      { href: "/dicaprev/dashboard", label: "Dashboard" },
      { href: "/dicaprev/activacion", label: "Activación inicial", permission: "canReadCumplimiento" },
    ],
  },
  {
    id: "empresa",
    label: "Empresa",
    icon: Building2,
    defaultHref: "/dicaprev/empresa",
    permission: "canReadEmpresa",
    moduleKey: "empresa",
    items: [
      { href: "/dicaprev/empresa", label: "Resumen", permission: "canReadCumplimiento" },
      { href: "/dicaprev/empresa/informacion-general", label: "Información general" },
      { href: "/dicaprev/empresa/centros", label: "Centros de trabajo" },
      { href: "/dicaprev/empresa/areas", label: "Áreas" },
      { href: "/dicaprev/empresa/cargos", label: "Cargos" },
      { href: "/dicaprev/empresa/indicadores-sst", label: "Indicadores SST" },
      { href: "/dicaprev/empresa/vehiculos", label: "Vehículos y equipos" },
      { href: "/dicaprev/documentacion", label: "Documentación empresa", description: "Documentos legales y corporativos propios de la empresa.", permission: "canReadDocumentacion", moduleKey: "documentacion" },
      { href: "/dicaprev/biblioteca", label: "Biblioteca documental", description: "Plantillas, formatos y documentos base reutilizables.", moduleKey: "biblioteca_capacitaciones" },
    ],
  },
  {
    id: "trabajadores",
    label: "Personas",
    icon: Users,
    defaultHref: "/dicaprev/trabajadores",
    permission: "canReadTrabajadores",
    moduleKey: "trabajadores",
    items: [
      { href: "/dicaprev/trabajadores", label: "Listado" },
      { href: "/dicaprev/trabajadores/control-documental", label: "Control documental" },
      { href: "/dicaprev/trabajadores/inducciones", label: "Inducciones" },
      { href: "/dicaprev/trabajadores/importar", label: "Importar trabajadores" },
      { href: "/dicaprev/capacitacion", label: "Capacitaciones" },
    ],
  },
  {
    id: "cumplimiento",
    label: "Cumplimiento",
    icon: ShieldCheck,
    defaultHref: "/dicaprev/cumplimiento",
    permission: "canReadCumplimiento",
    moduleKey: "cumplimiento",
    items: [
      { href: "/dicaprev/cumplimiento", label: "Resumen" },
      { href: "/dicaprev/cumplimiento/hallazgos", label: "Hallazgos" },
      { href: "/dicaprev/cumplimiento/evidencias", label: "Evidencias generales" },
      { href: "/dicaprev/checklists", label: "Checklists / Inspecciones" },
      { href: "/dicaprev/accidentes", label: "Accidentes" },
    ],
  },
  {
    id: "ds44",
    label: "DS44",
    icon: FileCheck2,
    defaultHref: "/dicaprev/ds44",
    permission: "canReadCumplimiento",
    moduleKey: "cumplimiento",
    items: [
      { href: "/dicaprev/ds44", label: "Resumen" },
      { href: "/dicaprev/ds44/diagnostico", label: "Diagnóstico" },
      { href: "/dicaprev/ds44/obligaciones", label: "Obligaciones" },
      { href: "/dicaprev/ds44/miper", label: "MIPER" },
      { href: "/dicaprev/ds44/plan-implementacion", label: "Plan de implementación" },
      { href: "/dicaprev/ds44/documentos", label: "Documentos DS44" },
      { href: "/dicaprev/ds44/evidencias", label: "Evidencias fiscalizables" },
    ],
  },
  {
    id: "epp",
    label: "EPP",
    icon: ShieldCheck,
    defaultHref: "/dicaprev/epp",
    permission: "canReadCumplimiento",
    items: [{ href: "/dicaprev/epp", label: "Gestión EPP" }],
  },
  {
    id: "contratistas",
    label: "Contratistas",
    icon: ClipboardList,
    defaultHref: "/dicaprev/contratistas",
    permission: "canReadCumplimiento",
    items: [{ href: "/dicaprev/contratistas", label: "Gestión contratistas" }],
  },
  {
    id: "acreditaciones",
    label: "Acreditación",
    icon: FileCheck2,
    defaultHref: "/dicaprev/acreditaciones",
    moduleKey: "acreditaciones",
    items: [
      { href: "/dicaprev/acreditaciones", label: "Resumen" },
      { href: "/dicaprev/acreditaciones/solicitudes", label: "Solicitudes" },
      { href: "/dicaprev/acreditaciones/plantillas", label: "Plantillas" },
      { href: "/dicaprev/acreditaciones/historial", label: "Historial" },
    ],
  },
  {
    id: "permisos",
    label: "Permisos",
    icon: FileCheck2,
    defaultHref: "/dicaprev/permisos",
    moduleKey: "permisos",
    permission: "canReadPermisos",
    items: [
      { href: "/dicaprev/permisos", label: "Gestión de permisos" },
      { href: "/dicaprev/permisos/responsables", label: "Responsables" },
      { href: "/dicaprev/permisos/organismos", label: "Organismos" },
    ],
  },
  {
    id: "plan",
    label: "Plan",
    icon: CalendarRange,
    defaultHref: "/dicaprev/plandetrabajo",
    moduleKey: "plan_trabajo",
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
    id: "select-company",
    label: "Empresa activa",
    icon: Building2,
    defaultHref: "/dicaprev/superadmin",
    alwaysVisible: true,
    items: [{ href: "/dicaprev/superadmin", label: "Seleccionar empresa" }],
  },
  {
    id: "sistema",
    label: "Sistema",
    icon: ClipboardList,
    defaultHref: "/dicaprev/auditoria",
    items: [
      { href: "/dicaprev/auditoria", label: "Auditoría" },
      { href: "/dicaprev/notificaciones", label: "Notificaciones" },
      { href: "/dicaprev/documentacion/firmas", label: "Firma prevencionista" },
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
    ],
  },
  {
    id: "alerts",
    label: "Alertas",
    icon: Bell,
    defaultHref: "/dicaprev/alertas",
    permission: "canReadAlertas",
    moduleKey: "notificaciones",
    items: [{ href: "/dicaprev/alertas", label: "Centro de alertas" }],
  },
];

const HIDDEN_MOCK_ROUTES_PRODUCTION = new Set<string>([
  "/dicaprev/alertas",
  "/dicaprev/reportes",
  "/dicaprev/reportes/vencimientos",
  "/dicaprev/reportes/pendientes",
  "/dicaprev/reportes/cumplimiento-centro",
  "/dicaprev/reportes/cumplimiento-area",
]);

function isItemActive(pathname: string, href: string) {
  const normalized = href.split("?")[0];
  return pathname === normalized || pathname.startsWith(normalized + "/");
}

function useSidebarData() {
  const pathname = usePathname();
  const { hasPermission, hasModule, role, hasActiveCompany, loading } = usePermissions();
  const isProductionBuild = process.env.NODE_ENV === "production";

  if (loading) {
    return { loading: true, pathname, visibleModules: [], activeModule: null } as const;
  }

  const isSuperAdmin = role === "SUPERADMIN";

  const visibleModules = MODULES
    .filter((module) => {
      if (module.id === "select-company") {
        return isSuperAdmin && !hasActiveCompany;
      }

      if (!hasActiveCompany && !module.alwaysVisible) {
        return false;
      }

      if (module.permission && !hasPermission(module.permission)) {
        return false;
      }

      if (hasActiveCompany && module.moduleKey && !hasModule(module.moduleKey)) {
        return false;
      }

      return true;
    })
    .map((module) => {
      const items = module.items.filter((item) => {
        if (!hasActiveCompany && !module.alwaysVisible) {
          return false;
        }

        if (isProductionBuild && HIDDEN_MOCK_ROUTES_PRODUCTION.has(item.href)) {
          return false;
        }

        const canByPermission = item.permission ? hasPermission(item.permission) : true;
        if (!canByPermission) {
          return false;
        }

        if (hasActiveCompany && item.moduleKey) {
          return hasModule(item.moduleKey);
        }

        return true;
      });

      const defaultHref =
        items.find((item) => item.href === module.defaultHref)?.href ??
        items[0]?.href ??
        module.defaultHref;

      return {
        ...module,
        items,
        defaultHref,
      };
    })
    .filter((module) => module.items.length > 0);

  if (hasActiveCompany) {
    const enabledOperational = visibleModules.some(
      (module) => !module.alwaysVisible && module.id !== "superadmin"
    );

    if (!enabledOperational) {
      visibleModules.splice(
        0,
        visibleModules.length,
        ...visibleModules.filter((module) => module.alwaysVisible || module.id === "superadmin")
      );
    }
  }

  if (isSuperAdmin) {
    const exists = visibleModules.some((module) => module.id === "superadmin");
    if (!exists) {
      visibleModules.push({
        id: "superadmin",
        label: "Admin",
        icon: ShieldCheck,
        defaultHref: "/dicaprev/superadmin",
        items: [{ href: "/dicaprev/superadmin", label: "Panel superadmin" }],
      });
    }
  }

  const legacyModuleId = pathname.startsWith("/dicaprev/cumplimiento/obligaciones") || pathname.startsWith("/dicaprev/cumplimiento/plan-trabajo")
    ? "cumplimiento"
    : null;
  const activeModule =
    visibleModules.find((module) => module.items.some((item) => isItemActive(pathname, item.href))) ??
    visibleModules.find((module) => module.id === legacyModuleId) ??
    visibleModules[0];

  return {
    loading: false,
    pathname,
    visibleModules,
    activeModule,
  } as const;
}

export function SidebarMobileNav({ onNavigate }: { onNavigate?: () => void }) {
  const { loading, pathname, visibleModules } = useSidebarData();

  if (loading || visibleModules.length === 0) {
    return null;
  }

  return (
    <nav className="space-y-4">
      {visibleModules.map((module) => {
        const Icon = module.icon;
        return (
          <div key={module.id} className="space-y-1">
            <div className="flex items-center gap-2 px-1 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              <Icon className="h-3.5 w-3.5" />
              <span>{module.label}</span>
            </div>
            <div className="space-y-1">
              {module.items.map((item) => {
                const active = isItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-[#052a57] font-semibold text-amber-300"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  const { loading, pathname, visibleModules, activeModule } = useSidebarData();

  if (loading) {
    return null;
  }

  if (!activeModule) {
    return null;
  }

  return (
    <aside className="hidden h-screen shrink-0 border-r border-slate-200 bg-white lg:flex lg:w-[320px] lg:sticky lg:top-0">
      <div className="flex w-[72px] flex-col items-center gap-3 border-r border-slate-800 bg-[#062b5b] py-4">
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400 via-emerald-500 to-blue-500 text-xs font-extrabold text-white shadow-lg shadow-blue-900/30">
          NP
        </div>

        <TooltipProvider>
          {visibleModules.map((module) => {
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
