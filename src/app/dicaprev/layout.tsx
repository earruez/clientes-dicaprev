"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationBell from "@/components/layout/NotificationBell";

/* =========================
   SIDEBAR PREMIUM (COLAPSABLE + SUBMENÚS)
   ========================= */

function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  const baseItem = collapsed
    ? "flex items-center justify-center gap-2 px-2 py-3 rounded-xl text-sm font-medium transition-colors"
    : "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors";

  const subItemBase =
    "flex items-center gap-2 px-10 py-1.5 text-sm rounded-lg transition-colors";

  const subItem = (href: string, exact = false) => {
    const base = href.split("?")[0];
    const active = exact
      ? pathname === base
      : pathname === base || pathname.startsWith(base + "/");
    return active
      ? `${subItemBase} text-white font-semibold bg-slate-700/80`
      : `${subItemBase} text-slate-300/80 hover:text-white hover:bg-slate-800/70`;
  };

  // estados para colapsar cada sección
  const [openSections, setOpenSections] = useState({
    empresa: true,
    trabajadores: true,
    cumplimiento: true,
    acreditaciones: true,
    planificacion: true,
    programaTrabajo: true,
    reportes: true,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside
      className={`hidden lg:flex ${
        collapsed ? "w-20" : "w-72"
      } flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100 border-r border-slate-800 transition-all duration-300`}
    >
      {/* Logo + toggle */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        {collapsed ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-emerald-400/70 bg-slate-950">
            <span className="text-xl text-emerald-400">✓</span>
          </div>
        ) : (
          <img
            src="/prevantia-logo.svg"
            alt="PREVANTIA"
            className="h-8 w-auto"
          />
        )}
        <button
          type="button"
          onClick={onToggle}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="flex-1 px-3 pb-6 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        <Link
          href="/dicaprev/dashboard"
          className={`${baseItem} bg-slate-900/80 border border-emerald-500/30 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)]`}
        >
          <span className="text-lg">▦</span>
          {!collapsed && <span>Dashboard</span>}
        </Link>

        {/* ============= Empresa ============= */}
        {!collapsed && (
          <>
            <button
              type="button"
              onClick={() => toggleSection("empresa")}
              className={`${baseItem} mt-2 text-emerald-300 hover:bg-slate-900/60`}
            >
              <span className="text-lg">▣</span>
              <span className="flex-1 text-left">Empresa</span>
              <span className="text-xs">{openSections.empresa ? "▾" : "▸"}</span>
            </button>

            {openSections.empresa && (
              <div className="space-y-1">
                <Link href="/dicaprev/empresa" className={subItem("/dicaprev/empresa", true)}>Resumen</Link>
                <Link href="/dicaprev/empresa/informacion-general" className={subItem("/dicaprev/empresa/informacion-general")}>Información general</Link>
                <Link href="/dicaprev/empresa/centros" className={subItem("/dicaprev/empresa/centros")}>Centros de trabajo</Link>
                <Link href="/dicaprev/empresa/indicadores-sst" className={subItem("/dicaprev/empresa/indicadores-sst")}>Indicadores SST</Link>
                <Link href="/dicaprev/empresa/documentacion" className={subItem("/dicaprev/empresa/documentacion")}>Documentación</Link>
                <Link href="/dicaprev/empresa/vehiculos" className={subItem("/dicaprev/empresa/vehiculos")}>Vehículos y equipos</Link>
              </div>
            )}
          </>
        )}

        {/* ============= Trabajadores ============= */}
        {!collapsed && (
          <>
            <button
              type="button"
              onClick={() => toggleSection("trabajadores")}
              className={`${baseItem} mt-2 text-cyan-300 hover:bg-slate-900/60`}
            >
              <span className="text-lg">▤</span>
              <span className="flex-1 text-left">Trabajadores</span>
              <span className="text-xs">{openSections.trabajadores ? "▾" : "▸"}</span>
            </button>

            {openSections.trabajadores && (
              <div className="space-y-1">
                <Link href="/dicaprev/trabajadores/dotacion" className={subItem("/dicaprev/trabajadores/dotacion")}>Listado de trabajadores</Link>
                <Link href="/dicaprev/trabajadores/areas-cargos" className={subItem("/dicaprev/trabajadores/areas-cargos")}>Áreas y cargos</Link>
                <Link href="/dicaprev/trabajadores/organigrama" className={subItem("/dicaprev/trabajadores/organigrama")}>Organigrama</Link>
                <Link href="/dicaprev/trabajadores/control-documental" className={subItem("/dicaprev/trabajadores/control-documental")}>Control documental</Link>
                <Link href="/dicaprev/capacitacion" className={subItem("/dicaprev/capacitacion")}>Capacitaciones</Link>
              </div>
            )}
          </>
        )}

        {/* ============= Gestión DS44 ============= */}
        {!collapsed && (
          <>
            <button
              type="button"
              onClick={() => toggleSection("cumplimiento")}
              className={`${baseItem} mt-2 text-amber-300 hover:bg-slate-900/60`}
            >
              <span className="text-lg">⚠</span>
              <span className="flex-1 text-left">Cumplimiento</span>
              <span className="text-xs">{openSections.cumplimiento ? "▾" : "▸"}</span>
            </button>

            {openSections.cumplimiento && (
              <div className="space-y-1">
                <Link href="/dicaprev/cumplimiento/resumen" className={subItem("/dicaprev/cumplimiento/resumen")}>Resumen</Link>
                <Link href="/dicaprev/cumplimiento/obligaciones" className={subItem("/dicaprev/cumplimiento/obligaciones")}>Obligaciones</Link>
                <Link href="/dicaprev/cumplimiento/hallazgos" className={subItem("/dicaprev/cumplimiento/hallazgos")}>Hallazgos</Link>
                <Link href="/dicaprev/cumplimiento/evidencias" className={subItem("/dicaprev/cumplimiento/evidencias")}>Evidencias</Link>
                <Link href="/dicaprev/cumplimiento/plan-trabajo" className={subItem("/dicaprev/cumplimiento/plan-trabajo")}>Plan de trabajo</Link>
              </div>
            )}
          </>
        )}

        {/* ============= Acreditaciones ============= */}
        {!collapsed && (
          <>
            <button
              type="button"
              onClick={() => toggleSection("acreditaciones")}
              className={`${baseItem} mt-2 text-teal-300 hover:bg-slate-900/60`}
            >
              <span className="text-lg">📋</span>
              <span className="flex-1 text-left">Acreditaciones</span>
              <span className="text-xs">{openSections.acreditaciones ? "▾" : "▸"}</span>
            </button>

            {openSections.acreditaciones && (
              <div className="space-y-1">
                <Link href="/dicaprev/acreditaciones/resumen" className={subItem("/dicaprev/acreditaciones/resumen")}>Resumen</Link>
                <Link href="/dicaprev/acreditaciones/solicitudes" className={subItem("/dicaprev/acreditaciones/solicitudes")}>Solicitudes</Link>
                <Link href="/dicaprev/acreditaciones/plantillas" className={subItem("/dicaprev/acreditaciones/plantillas")}>Plantillas</Link>
                <Link href="/dicaprev/acreditaciones/historial" className={subItem("/dicaprev/acreditaciones/historial")}>Historial</Link>
              </div>
            )}
          </>
        )}

        {/* ============= Planificación ============= */}
        {!collapsed && (
          <>
            <button
              type="button"
              onClick={() => toggleSection("planificacion")}
              className={`${baseItem} mt-2 text-fuchsia-300 hover:bg-slate-900/60`}
            >
              <span className="text-lg">📈</span>
              <span className="flex-1 text-left">Planificación</span>
              <span className="text-xs">{openSections.planificacion ? "▾" : "▸"}</span>
            </button>

            {openSections.planificacion && (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleSection("programaTrabajo")}
                  className={`${subItemBase} text-slate-300/80 hover:text-white hover:bg-slate-800/70 w-full text-left`}
                >
                  <span className="flex-1">Programa de trabajo</span>
                  <span className="text-xs">{openSections.programaTrabajo ? "▾" : "▸"}</span>
                </button>

                {openSections.programaTrabajo && (
                  <div className="space-y-1">
                    <Link href="/dicaprev/plandetrabajo/plananual" className={subItem("/dicaprev/plandetrabajo/plananual")}>Plan anual</Link>
                    <Link href="/dicaprev/plandetrabajo/indicadores" className={subItem("/dicaprev/plandetrabajo/indicadores")}>Indicadores</Link>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ============= Reportes ============= */}
        {!collapsed && (
          <>
            <button
              type="button"
              onClick={() => toggleSection("reportes")}
              className={`${baseItem} mt-2 text-rose-300 hover:bg-slate-900/60`}
            >
              <span className="text-lg">📊</span>
              <span className="flex-1 text-left">Reportes</span>
              <span className="text-xs">{openSections.reportes ? "▾" : "▸"}</span>
            </button>

            {openSections.reportes && (
              <div className="space-y-1">
                <Link href="/dicaprev/reportes/vencimientos" className={subItem("/dicaprev/reportes/vencimientos")}>Vencimientos</Link>
                <Link href="/dicaprev/reportes/pendientes" className={subItem("/dicaprev/reportes/pendientes")}>Pendientes</Link>
                <Link href="/dicaprev/reportes/cumplimiento-centro" className={subItem("/dicaprev/reportes/cumplimiento-centro")}>Cumplimiento por centro</Link>
                <Link href="/dicaprev/reportes/cumplimiento-area" className={subItem("/dicaprev/reportes/cumplimiento-area")}>Cumplimiento por área</Link>
              </div>
            )}
          </>
        )}

        {/* ============= Auditoría ============= */}
        {!collapsed && (
          <Link
            href="/dicaprev/auditoria"
            className={`${baseItem} mt-2 ${
              pathname.startsWith("/dicaprev/auditoria")
                ? "text-slate-100 bg-slate-800/80"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <span className="text-lg">🔍</span>
            <span>Auditoría</span>
          </Link>
        )}

      </nav>
    </aside>
  );
}

/* =========================
   LAYOUT DICAPREV
   ========================= */

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Defensive cleanup: if a modal leaves body locked after route changes,
    // restore interactivity so buttons keep working across Empresa pages.
    if (document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = "";
    }
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />
      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-13 items-center justify-between border-b border-slate-200 bg-white px-5 py-2.5 shadow-sm">
          <span className="text-sm font-semibold text-slate-700 tracking-wide">MVP CHILE SPA</span>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-xs text-slate-500">admin@dicaprev.cl</span>
          </div>
        </header>
        <main className="flex-1 bg-[#f5f7ff] px-4 py-6 md:px-8 md:py-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
