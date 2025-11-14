"use client";

import React, { useState } from "react";
import Link from "next/link";

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
  const baseItem = collapsed
    ? "flex items-center justify-center gap-2 px-2 py-3 rounded-xl text-sm font-medium transition-colors"
    : "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors";

  const subItem =
    "flex items-center gap-2 px-10 py-1.5 text-sm text-slate-300/80 hover:text-white hover:bg-slate-800/70 rounded-lg";

  // estados para colapsar cada sección
  const [openSections, setOpenSections] = useState({
    ds44: true,
    docs: true,
    programa: true,
    cap: true,
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
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-emerald-400/70 bg-slate-950">
          <span className="text-xl text-emerald-400">🛡️</span>
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold tracking-wide text-emerald-300">
            DICAPREV
          </span>
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

        {/* ============= Centro DS44 ============= */}
        {!collapsed && (
          <>
            <button
              type="button"
              onClick={() => toggleSection("ds44")}
              className={`${baseItem} mt-2 text-emerald-300 hover:bg-slate-900/60`}
            >
              <span className="text-lg">▣</span>
              <span className="flex-1 text-left">Centro DS44</span>
              <span className="text-xs">
                {openSections.ds44 ? "▾" : "▸"}
              </span>
            </button>

            {openSections.ds44 && (
              <div className="space-y-1">
                <Link href="/dicaprev/ds44/resumen" className={subItem}>
                  Resumen
                </Link>
                <Link
                  href="/dicaprev/ds44/obligaciones"
                  className={subItem}
                >
                  Obligaciones
                </Link>
                
                <Link href="/dicaprev/ds44/hallazgos" className={subItem}>
                  Hallazgos
                </Link>
              </div>
            )}
          </>
        )}

        {/* ============= Documentación ============= */}
        {!collapsed && (
          <>
            <button
              type="button"
              onClick={() => toggleSection("docs")}
              className={`${baseItem} mt-2 text-sky-300 hover:bg-slate-900/60`}
            >
              <span className="text-lg">🗂️</span>
              <span className="flex-1 text-left">Documentación</span>
              <span className="text-xs">
                {openSections.docs ? "▾" : "▸"}
              </span>
            </button>

            {openSections.docs && (
              <div className="space-y-1">
                <Link
                  href="/dicaprev/documentacion/generales"
                  className={subItem}
                >
                  Generales
                </Link>
                <Link
                  href="/dicaprev/documentacion/centrotrabajo"
                  className={subItem}
                >
                  Centro de trabajo
                </Link>
                <Link
                  href="/dicaprev/documentacion/centrotrabajo"
                  className={subItem}
                >
                  Contratistas
                </Link>
                <Link
                  href="/dicaprev/documentacion?tab=aprobaciones"
                  className={subItem}
                >
                  Aprobaciones
                </Link>
                <Link
                  href="/dicaprev/documentacion?tab=vencimientos"
                  className={subItem}
                >
                  Vencimientos
                </Link>
                <Link
                  href="/dicaprev/documentacion?tab=plantillas"
                  className={subItem}
                >
                  Plantillas
                </Link>
                <Link
                  href="/dicaprev/documentacion?tab=firmas"
                  className={subItem}
                >
                  Firmas Digitales
                </Link>
                <Link
                  href="/dicaprev/documentacion?tab=accesos"
                  className={subItem}
                >
                  Accesos Rápidos
                </Link>
              </div>
            )}
          </>
        )}

        {/* ============= Programa de Trabajo ============= */}
        {!collapsed && (
          <>
            <button
              type="button"
              onClick={() => toggleSection("programa")}
              className={`${baseItem} mt-2 text-fuchsia-300 hover:bg-slate-900/60`}
            >
              <span className="text-lg">📈</span>
              <span className="flex-1 text-left">Programa de Trabajo</span>
              <span className="text-xs">
                {openSections.programa ? "▾" : "▸"}
              </span>
            </button>

            {openSections.programa && (
              <div className="space-y-1">
                <Link
                  href="/dicaprev/sgsst/plan"
                  className={subItem}
                >
                  Plan Anual
                </Link>
                <Link
                  href="/dicaprev/sgsst/indicadores"
                  className={subItem}
                >
                  Indicadores
                </Link>
              </div>
            )}
          </>
        )}

        {/* ============= Capacitación ============= */}
        {!collapsed && (
          <>
            <button
              type="button"
              onClick={() => toggleSection("cap")}
              className={`${baseItem} mt-2 text-pink-300 hover:bg-slate-900/60`}
            >
              <span className="text-lg">🎓</span>
              <span className="flex-1 text-left">Capacitación</span>
              <span className="text-xs">
                {openSections.cap ? "▾" : "▸"}
              </span>
            </button>

            {openSections.cap && (
              <div className="space-y-1">
                <Link
                  href="/dicaprev/capacitacion/plan"
                  className={subItem}
                >
                  Plan de Capacitación
                </Link>
                <Link
                  href="/dicaprev/capacitacion/calendario"
                  className={subItem}
                >
                  Calendario
                </Link>
                <Link
                  href="/dicaprev/capacitacion/participacion"
                  className={subItem}
                >
                  Participación
                </Link>
                <Link
                  href="/dicaprev/capacitacion/evaluaciones"
                  className={subItem}
                >
                  Evaluaciones
                </Link>
                <Link
                  href="/dicaprev/capacitacion/historial"
                  className={subItem}
                >
                  Historial
                </Link>
              </div>
            )}
          </>
        )}

        {/* Auditorías */}
        <Link
          href="/dicaprev/auditorias"
          className={`${baseItem} mt-2 text-indigo-300 hover:bg-slate-900/60`}
        >
          <span className="text-lg">🧾</span>
          {!collapsed && <span>Auditorías</span>}
        </Link>

        {/* Contratistas */}
        <Link
          href="/dicaprev/contratistas"
          className={`${baseItem} text-slate-200 hover:bg-slate-900/60`}
        >
          <span className="text-lg">👥</span>
          {!collapsed && <span>Contratistas</span>}
        </Link>

        {/* Configuración */}
        <Link
          href="/dicaprev/configuracion"
          className={`${baseItem} text-slate-400 hover:text-white hover:bg-slate-900/60`}
        >
          <span className="text-lg">⚙️</span>
          {!collapsed && <span>Configuración</span>}
        </Link>
      </nav>
    </aside>
  );
}

/* =========================
   LAYOUT DICAPREV
   ========================= */

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />
      <main className="flex-1 bg-[#f5f7ff] px-4 py-6 md:px-8 md:py-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
