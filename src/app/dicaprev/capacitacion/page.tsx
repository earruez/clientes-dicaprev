"use client";

import React, { useState, useEffect, useMemo } from "react";
import TabAsignaciones from "./components/TabAsignaciones";
import TabCalendario from "./components/TabCalendario";
import TabCatalogo from "./components/TabCatalogo";
import TabHistorial from "./components/TabHistorial";
import {
  getAsignaciones,
  getSesiones,
  getCatalogo,
  subscribe,
} from "@/lib/capacitacion/capacitacion-store";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Calendar,
  BookOpen,
  History,
  GraduationCap,
} from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

type Tab = "asignaciones" | "calendario" | "catalogo" | "historial";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "asignaciones", label: "Asignaciones",  icon: <ClipboardList className="h-4 w-4" /> },
  { id: "calendario",   label: "Calendario",    icon: <Calendar className="h-4 w-4" /> },
  { id: "catalogo",     label: "Catálogo",      icon: <BookOpen className="h-4 w-4" /> },
  { id: "historial",    label: "Historial",     icon: <History className="h-4 w-4" /> },
];

export default function CapacitacionPage() {
  const [activeTab, setActiveTab] = useState<Tab>("asignaciones");
  const [asignaciones, setAsignaciones] = useState(() => getAsignaciones());
  const [sesiones, setSesiones] = useState(() => getSesiones());
  const [catalogo, setCatalogo] = useState(() => getCatalogo());

  useEffect(() => subscribe(() => {
    setAsignaciones(getAsignaciones());
    setSesiones(getSesiones());
    setCatalogo(getCatalogo());
  }), []);

  const pendientes = useMemo(() =>
    asignaciones.filter((a) => a.estado === "pendiente").length,
    [asignaciones]
  );

  return (
    <div className="min-h-screen bg-slate-50/80">
      <div className="py-8 space-y-6">
        <StandardPageHeader
          moduleLabel="Módulo Personas"
          title="Capacitaciones"
          description={`${catalogo.filter((c) => c.activa).length} capacitaciones activas · ${asignaciones.length} asignaciones · ${sesiones.length} sesiones`}
          icon={<GraduationCap className="h-6 w-6" />}
          iconWrapClassName="bg-cyan-700"
          actions={
            pendientes > 0 ? (
              <div className="shrink-0 flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-medium text-amber-700">
                  {pendientes} {pendientes === 1 ? "asignación pendiente de envío" : "asignaciones pendientes de envío"}
                </span>
              </div>
            ) : null
          }
        />

        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "asignaciones" && <TabAsignaciones />}
          {activeTab === "calendario"   && <TabCalendario />}
          {activeTab === "catalogo"     && <TabCatalogo />}
          {activeTab === "historial"    && <TabHistorial />}
        </div>
      </div>
    </div>
  );
}
