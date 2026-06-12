"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { FileStack, ShieldCheck, FileWarning, CalendarClock, Settings2, ArrowLeft, UploadCloud } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { TiposDocPanel }    from "@/components/trabajadores-v2/documental/TiposDocPanel";
import { PlantillasPanel }  from "@/components/trabajadores-v2/documental/PlantillasPanel";
import { ReglasPanel }      from "@/components/trabajadores-v2/documental/ReglasPanel";
import { PendientesPanel }  from "@/components/trabajadores-v2/documental/PendientesPanel";
import { VencimientosPanel } from "@/components/trabajadores-v2/documental/VencimientosPanel";
import { BulkUploadDrawer } from "@/components/trabajadores-v2/documental/BulkUploadDrawer";
import { AlertasVencimientosWidget } from "@/components/trabajadores-v2/documental/AlertasVencimientosWidget";
import {
  getControlDocumentalTrabajadores,
  evaluarReglasDocumentalesEmpresa,
  type ControlDocumentalTrabajadoresPayload,
} from "@/actions/trabajadores/documentos";
import {
  getWorkerDocs,
  getWorkerDocSummary,
} from "@/components/trabajadores-v2/documental/types";

type TabId = "tipos" | "plantillas" | "reglas" | "pendientes" | "vencimientos";

const TABS: { id: TabId; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "tipos",        label: "Tipos de documentos", icon: <FileStack className="h-4 w-4" />,    description: "Catálogo de documentos exigibles" },
  { id: "plantillas",   label: "Plantillas",          icon: <Settings2 className="h-4 w-4" />,    description: "Grupos por cargo y área" },
  { id: "reglas",       label: "Reglas automáticas",  icon: <ShieldCheck className="h-4 w-4" />,  description: "Asignación automática por condición" },
  { id: "pendientes",   label: "Pendientes",          icon: <FileWarning className="h-4 w-4" />,  description: "Trabajadores con documentación incompleta" },
  { id: "vencimientos", label: "Vencimientos",        icon: <CalendarClock className="h-4 w-4" />, description: "Documentos vencidos o por vencer" },
];

type ControlDocumentalClientProps = {
  initialData: ControlDocumentalTrabajadoresPayload;
  workerId?: string;
  centro?: string;
};

export default function ControlDocumentalClient({
  initialData,
  workerId,
  centro,
}: ControlDocumentalClientProps) {

  const [activeTab, setActiveTab] = useState<TabId>("pendientes");
  const [bulkOpen,  setBulkOpen]  = useState(false);
  const [evaluandoReglas, setEvaluandoReglas] = useState(false);
  const [evaluacionMsg, setEvaluacionMsg] = useState<string | null>(null);
  const [documentalData, setDocumentalData] = useState<ControlDocumentalTrabajadoresPayload>(initialData);

  const refreshDocumentalData = async () => {
    try {
      const payload = await getControlDocumentalTrabajadores();
      setDocumentalData(payload);
    } catch {
      setEvaluacionMsg("No fue posible refrescar datos documentales. Manteniendo estado previo.");
    }
  };

  useEffect(() => {
    if (workerId) setActiveTab("pendientes");
  }, [workerId]);

  const stats = useMemo(() => {
    const allDocs = documentalData.workers.flatMap((w) =>
      getWorkerDocs(w, documentalData.reglas, documentalData.tipos, documentalData.documentos)
    );
    const workerSummaries = documentalData.workers.map((w) =>
      getWorkerDocSummary(getWorkerDocs(w, documentalData.reglas, documentalData.tipos, documentalData.documentos))
    );
    return {
      tiposTotal:    documentalData.tipos.length,
      reglasActivas: documentalData.reglas.filter((r) => r.activa).length,
      conPendientes: workerSummaries.filter((s) => s.pendientes > 0 || s.vencidos > 0).length,
      docsVencidos:  allDocs.filter((d) => d.estado === "vencido").length,
      pctGlobal:     workerSummaries.length > 0
        ? Math.round(workerSummaries.reduce((s, r) => s + r.pct, 0) / workerSummaries.length)
        : 0,
    };
  }, [documentalData]);

  const linkedWorker = workerId ? documentalData.workers.find((w) => w.id === workerId) : null;

  const handleEvaluarReglas = async () => {
    try {
      setEvaluandoReglas(true);
      setEvaluacionMsg(null);
      const result = await evaluarReglasDocumentalesEmpresa();
      await refreshDocumentalData();
      setEvaluacionMsg(`Evaluación completada: ${result.pendientesGenerados} pendientes generados.`);
    } catch {
      setEvaluacionMsg("No fue posible evaluar reglas documentales.");
    } finally {
      setEvaluandoReglas(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e8eefc_0%,_#f8fafc_40%,_#f8fafc_100%)] px-4 py-6 sm:px-6 sm:py-8">
      <BulkUploadDrawer
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        workers={documentalData.workers}
        tipos={documentalData.tipos}
      />
      <div className="mx-auto max-w-[1300px] space-y-6">

        <StandardPageHeader
          moduleLabel="Módulo Personas"
          title="Control documental"
          description={
            linkedWorker
              ? `Revisando documentación de ${linkedWorker.nombre} ${linkedWorker.apellido} · ${linkedWorker.cargo}`
              : centro
                ? `Gestión documental filtrada por centro: ${centro}`
                : "Gestión centralizada de documentos requeridos por trabajador, con asignación automática por reglas."
          }
          icon={<FileStack className="h-6 w-6" />}
          iconWrapClassName="bg-slate-900"
          actions={
            <div className="flex shrink-0 flex-col items-end gap-3">
              <Link
                href="/dicaprev/trabajadores"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Trabajadores
              </Link>

            <button
              onClick={handleEvaluarReglas}
              disabled={evaluandoReglas}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {evaluandoReglas ? "Evaluando..." : "Evaluar reglas"}
            </button>

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
            {evaluacionMsg ? (
              <p className="text-[11px] font-medium text-slate-500">{evaluacionMsg}</p>
            ) : null}
            </div>
          }
        />

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Tipos de documentos",   value: stats.tiposTotal,    icon: <FileStack className="h-5 w-5" />,      color: "text-blue-600",    bg: "bg-blue-50" },
            { label: "Reglas activas",         value: stats.reglasActivas, icon: <ShieldCheck className="h-5 w-5" />,   color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Workers con pendientes", value: stats.conPendientes, icon: <FileWarning className="h-5 w-5" />,   color: "text-amber-600",   bg: "bg-amber-50" },
            { label: "Documentos vencidos",    value: stats.docsVencidos,  icon: <CalendarClock className="h-5 w-5" />, color: "text-red-600",     bg: "bg-red-50" },
          ].map(({ label, value, icon, color, bg }) => (
            <div key={label} className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur">
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

        {/* ── Alertas de vencimientos ── */}
        <AlertasVencimientosWidget
          workers={documentalData.workers}
          documentos={documentalData.documentos}
          tipos={documentalData.tipos}
        />

        {/* ── Tab section ── */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 p-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative rounded-2xl border px-4 py-3 text-left transition-all ${
                    activeTab === tab.id
                      ? "border-slate-900 bg-slate-900 text-white shadow"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                  <p
                    className={`mt-1.5 text-[11px] ${
                      activeTab === tab.id ? "text-white/80" : "text-slate-400 group-hover:text-slate-500"
                    }`}
                  >
                    {tab.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-6">

            {documentalData.workers.length === 0 &&
            documentalData.tipos.length === 0 &&
            documentalData.reglas.length === 0 ? (
              <div className="mb-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                Aún no hay datos de control documental disponibles para esta empresa.
              </div>
            ) : null}

            {activeTab === "tipos"        && <TiposDocPanel tipos={documentalData.tipos} />}
            {activeTab === "plantillas"   && <PlantillasPanel tipos={documentalData.tipos} />}
            {activeTab === "reglas"       && <ReglasPanel reglas={documentalData.reglas} tipos={documentalData.tipos} />}
            {activeTab === "pendientes"   && (
              <PendientesPanel
                initialWorkerId={workerId}
                initialSearch={centro}
                workers={documentalData.workers}
                tipos={documentalData.tipos}
                reglas={documentalData.reglas}
                documentos={documentalData.documentos}
                onSaved={refreshDocumentalData}
              />
            )}
            {activeTab === "vencimientos" && (
              <VencimientosPanel
                workers={documentalData.workers}
                tipos={documentalData.tipos}
                reglas={documentalData.reglas}
                documentos={documentalData.documentos}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
