"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FileStack, ShieldCheck, FileWarning, CalendarClock, Settings2, ArrowLeft, UploadCloud } from "lucide-react";
import { TiposDocPanel }    from "@/components/trabajadores-v2/documental/TiposDocPanel";
import { PlantillasPanel }  from "@/components/trabajadores-v2/documental/PlantillasPanel";
import { ReglasPanel }      from "@/components/trabajadores-v2/documental/ReglasPanel";
import { PendientesPanel }  from "@/components/trabajadores-v2/documental/PendientesPanel";
import { VencimientosPanel } from "@/components/trabajadores-v2/documental/VencimientosPanel";
import { BulkUploadDrawer } from "@/components/trabajadores-v2/documental/BulkUploadDrawer";
import {
  TIPOS_DOCUMENTO,
  REGLAS_DOCUMENTALES,
  MOCK_DOCUMENTOS,
  getWorkerDocs,
  getWorkerDocSummary,
} from "@/components/trabajadores-v2/documental/types";
import { MOCK_WORKERS } from "@/components/trabajadores-v2/types";

type TabId = "tipos" | "plantillas" | "reglas" | "pendientes" | "vencimientos";

const TABS: { id: TabId; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "tipos",        label: "Tipos de documentos", icon: <FileStack className="h-4 w-4" />,    description: "Catálogo de documentos exigibles" },
  { id: "plantillas",   label: "Plantillas",          icon: <Settings2 className="h-4 w-4" />,    description: "Grupos por cargo y área" },
  { id: "reglas",       label: "Reglas automáticas",  icon: <ShieldCheck className="h-4 w-4" />,  description: "Asignación automática por condición" },
  { id: "pendientes",   label: "Pendientes",          icon: <FileWarning className="h-4 w-4" />,  description: "Trabajadores con documentación incompleta" },
  { id: "vencimientos", label: "Vencimientos",        icon: <CalendarClock className="h-4 w-4" />, description: "Documentos vencidos o por vencer" },
];

function ControlDocumentalContent() {
  const searchParams = useSearchParams();
  const workerId = searchParams.get("workerId") ?? undefined;
  const centro = searchParams.get("centro") ?? undefined;

  const [activeTab, setActiveTab] = useState<TabId>("pendientes");
  const [bulkOpen,  setBulkOpen]  = useState(false);

  useEffect(() => {
    if (workerId) setActiveTab("pendientes");
  }, [workerId]);

  const stats = useMemo(() => {
    const allDocs = MOCK_WORKERS.flatMap((w) =>
      getWorkerDocs(w, REGLAS_DOCUMENTALES, TIPOS_DOCUMENTO, MOCK_DOCUMENTOS)
    );
    const workerSummaries = MOCK_WORKERS.map((w) =>
      getWorkerDocSummary(getWorkerDocs(w, REGLAS_DOCUMENTALES, TIPOS_DOCUMENTO, MOCK_DOCUMENTOS))
    );
    return {
      tiposTotal:    TIPOS_DOCUMENTO.length,
      reglasActivas: REGLAS_DOCUMENTALES.filter((r) => r.activa).length,
      conPendientes: workerSummaries.filter((s) => s.pendientes > 0 || s.vencidos > 0).length,
      docsVencidos:  allDocs.filter((d) => d.estado === "vencido").length,
      pctGlobal:     workerSummaries.length > 0
        ? Math.round(workerSummaries.reduce((s, r) => s + r.pct, 0) / workerSummaries.length)
        : 0,
    };
  }, []);

  const linkedWorker = workerId ? MOCK_WORKERS.find((w) => w.id === workerId) : null;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <BulkUploadDrawer isOpen={bulkOpen} onClose={() => setBulkOpen(false)} />
      <div className="mx-auto max-w-7xl space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/dicaprev/trabajadores"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Trabajadores
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">Control Documental</h1>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                SST
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-500">
              {linkedWorker
                ? `Revisando documentación de ${linkedWorker.nombre} ${linkedWorker.apellido} · ${linkedWorker.cargo}`
                : centro
                ? `Gestión documental filtrada por centro: ${centro}`
                : "Gestión centralizada de documentos requeridos por trabajador, con asignación automática por reglas."}
            </p>
          </div>

          {/* Global compliance badge + Carga masiva */}
          <div className="flex shrink-0 flex-col items-end gap-3">
            <button
              onClick={() => setBulkOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              <UploadCloud className="h-4 w-4" />
              Carga masiva
            </button>
            <div className="flex flex-col items-end gap-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Cumplimiento global</p>
              <span
                className={`text-4xl font-bold ${
                  stats.pctGlobal >= 80 ? "text-emerald-600" : stats.pctGlobal >= 60 ? "text-amber-600" : "text-red-600"
                }`}
              >
                {stats.pctGlobal}%
              </span>
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${
                    stats.pctGlobal >= 80 ? "bg-emerald-500" : stats.pctGlobal >= 60 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${stats.pctGlobal}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Tipos de documentos",   value: stats.tiposTotal,    icon: <FileStack className="h-5 w-5" />,      color: "text-blue-600",    bg: "bg-blue-50" },
            { label: "Reglas activas",         value: stats.reglasActivas, icon: <ShieldCheck className="h-5 w-5" />,   color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Workers con pendientes", value: stats.conPendientes, icon: <FileWarning className="h-5 w-5" />,   color: "text-amber-600",   bg: "bg-amber-50" },
            { label: "Documentos vencidos",    value: stats.docsVencidos,  icon: <CalendarClock className="h-5 w-5" />, color: "text-red-600",     bg: "bg-red-50" },
          ].map(({ label, value, icon, color, bg }) => (
            <div key={label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{label}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}>
                  {icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab section ── */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto border-b border-slate-100">
            <div className="flex min-w-max">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "text-slate-900"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-slate-900" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            <p className="mb-6 text-xs text-slate-400">
              {TABS.find((t) => t.id === activeTab)?.description}
            </p>

            {activeTab === "tipos"        && <TiposDocPanel />}
            {activeTab === "plantillas"   && <PlantillasPanel />}
            {activeTab === "reglas"       && <ReglasPanel />}
            {activeTab === "pendientes"   && <PendientesPanel initialWorkerId={workerId} initialSearch={centro} />}
            {activeTab === "vencimientos" && <VencimientosPanel />}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ControlDocumentalPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Cargando...</p>
      </div>
    }>
      <ControlDocumentalContent />
    </Suspense>
  );
}
