"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  FileText,
  BookOpen,
  Pencil,
  MapPin,
  Clock,
  Plus,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart3,
  UserMinus,
  ExternalLink,
  Layers,
  GraduationCap,
} from "lucide-react";
import { type Worker, ESTADO_CONFIG, getInitials, formatDate, antiguedad } from "./types";
import {
  TIPOS_DOCUMENTO,
  REGLAS_DOCUMENTALES,
  MOCK_DOCUMENTOS,
  CATEGORIA_CONFIG,
  ESTADO_DOC_CONFIG,
  getWorkerDocs,
  getWorkerDocSummary,
} from "./documental/types";
import {
  DocumentUploadDrawer,
  type DocumentUploadContext,
} from "./documental/DocumentUploadDrawer";
import {
  getPosicionById,
  vacantesPos,
  isSobredotado,
  coberturaPct,
  coberturaLabel,
  type Posicion,
} from "@/lib/dotacion/dotacion-store";

type TabId = "resumen" | "asignaciones" | "riesgos" | "documentos" | "sst";

const TABS: { id: TabId; label: string }[] = [
  { id: "resumen",      label: "Resumen" },
  { id: "asignaciones", label: "Asignaciones" },
  { id: "riesgos",      label: "Riesgos" },
  { id: "documentos",   label: "Documentos" },
  { id: "sst",          label: "Indicadores SST" },
];

interface WorkerDrawerProps {
  worker: Worker | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (w: Worker) => void;
}

// ── Sub-components ────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
      {label}
    </h3>
  );
}

// ── Mock data generators ──────────────────────────────────

type AsignacionEstado = "Activa" | "Suspendida" | "Finalizada";
interface Asignacion {
  id: string;
  centro: string;
  area: string;
  cargo: string;
  puesto: string;
  jornada: string;
  estado: AsignacionEstado;
  esPrincipal: boolean;
}

const ASIGNACION_ESTADO_CLS: Record<AsignacionEstado, string> = {
  Activa:     "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Suspendida: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Finalizada: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
};

function mockAsignaciones(w: Worker): Asignacion[] {
  const primary: Asignacion = {
    id: `${w.id}-1`,
    centro: w.centroTrabajo,
    area: w.area,
    cargo: w.cargo,
    puesto: `Puesto ${w.area.slice(0, 3).toUpperCase()}-01`,
    jornada: w.tipoContrato === "Part Time" ? "Media jornada" : "Jornada completa",
    estado: "Activa",
    esPrincipal: true,
  };

  // Add a secondary assignment for workers whose id ends in odd digit
  const lastDigit = parseInt(w.id.replace(/\D/g, "").slice(-1));
  if (lastDigit % 2 !== 0) {
    const secondCentro = w.centroTrabajo === "Casa Matriz" ? "Obra Norte" : "Casa Matriz";
    return [
      primary,
      {
        id: `${w.id}-2`,
        centro: secondCentro,
        area: "Operaciones",
        cargo: "Colaborador externo",
        puesto: "Puesto OPE-02",
        jornada: "Jornada parcial",
        estado: "Activa",
        esPrincipal: false,
      },
    ];
  }
  return [primary];
}

interface RiesgoItem {
  id: string;
  categoria: string;
  descripcion: string;
  nivel: "Alto" | "Medio" | "Bajo";
}

const NIVEL_CLS = {
  Alto:  "bg-red-50 text-red-700 ring-1 ring-red-200",
  Medio: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Bajo:  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

function mockRiesgos(w: Worker): RiesgoItem[] {
  const base: RiesgoItem[] = [
    { id: "r1", categoria: "Ergonómico", descripcion: "Posturas forzadas en puesto de trabajo", nivel: "Medio" },
    { id: "r2", categoria: "Físico",     descripcion: "Exposición a ruido sobre límite permisible", nivel: "Bajo" },
  ];
  if (w.area === "SST" || w.area === "Operaciones" || w.area === "Mantención") {
    base.push({ id: "r3", categoria: "Químico", descripcion: "Contacto con sustancias peligrosas", nivel: "Alto" });
  }
  return base;
}



// ── Main component ────────────────────────────────────────

export function WorkerDrawer({ worker, isOpen, onClose, onEdit }: WorkerDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("resumen");
  const [uploadCtx, setUploadCtx] = useState<DocumentUploadContext | undefined>(undefined);
  const [uploadOpen, setUploadOpen] = useState(false);

  function openUpload(ctx: DocumentUploadContext) {
    setUploadCtx(ctx);
    setUploadOpen(true);
  }

  // Reset tab when a different worker is opened
  useEffect(() => {
    if (isOpen) setActiveTab("resumen");
  }, [isOpen, worker?.id]);

  return (
    <>
      <DocumentUploadDrawer
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        context={uploadCtx}
      />
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen && worker ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[500px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen && worker ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {worker && (() => {
          const est = ESTADO_CONFIG[worker.estado];
          const dotacion: Posicion | undefined = worker.dotacionId ? getPosicionById(worker.dotacionId) : undefined;
          const asignaciones = mockAsignaciones(worker);
          const riesgos = mockRiesgos(worker);
          const workerDocs = getWorkerDocs(worker, REGLAS_DOCUMENTALES, TIPOS_DOCUMENTO, MOCK_DOCUMENTOS);
          const docSummary = getWorkerDocSummary(workerDocs);
          const ds44Critical = (docSummary.pendientes + docSummary.vencidos) + worker.capacitacionesPendientes > 2;
          const sstPct = docSummary.pct;

          return (
            <>
              {/* ── Header ── */}
              <div className="shrink-0 border-b border-slate-200 px-5 pt-5 pb-0">
                <div className="flex items-start justify-between gap-4 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-base font-bold text-white">
                      {getInitials(worker.nombre, worker.apellido)}
                    </div>
                    <div>
                      <h2 className="text-base font-bold leading-tight text-slate-900">
                        {worker.nombre} {worker.apellido}
                      </h2>
                      <p className="text-xs text-slate-400">{worker.rut}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${est.bg} ${est.text} ${est.ring}`}>
                          {est.label}
                        </span>
                        {ds44Critical && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                            <AlertTriangle className="h-3 w-3" /> DS44 Crítico
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(worker)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={onClose}
                      className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Quick stats bar */}
                <div className="grid grid-cols-3 border-t border-slate-100 -mx-5">
                  <div className="flex flex-col items-center justify-center px-3 py-3 text-center">
                    <p className="text-base font-bold text-slate-900">{antiguedad(worker.fechaIngreso)}</p>
                    <p className="text-[10px] text-slate-500">En la empresa</p>
                  </div>
                  <div className="flex flex-col items-center justify-center border-l border-r border-slate-100 px-3 py-3 text-center">
                    <p className={`text-base font-bold ${(docSummary.pendientes + docSummary.vencidos) > 0 ? (docSummary.vencidos > 0 ? "text-red-600" : "text-amber-600") : "text-slate-900"}`}>
                      {docSummary.pendientes + docSummary.vencidos}
                    </p>
                    <p className="text-[10px] text-slate-500">Docs pend.</p>
                  </div>
                  <div className="flex flex-col items-center justify-center px-3 py-3 text-center">
                    <p className={`text-base font-bold ${worker.capacitacionesPendientes > 0 ? "text-orange-600" : "text-slate-900"}`}>
                      {worker.capacitacionesPendientes}
                    </p>
                    <p className="text-[10px] text-slate-500">Cap. pend.</p>
                  </div>
                </div>

                {/* Tab bar */}
                <div className="-mx-5 overflow-x-auto border-t border-slate-100">
                  <div className="flex min-w-max">
                    {TABS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`relative px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                          activeTab === t.id
                            ? "text-slate-900"
                            : "text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        {t.label}
                        {activeTab === t.id && (
                          <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-slate-900" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Tab content (scrollable) ── */}
              <div className="flex-1 overflow-y-auto px-5 py-5">

                {/* ═══ RESUMEN ═══ */}
                {activeTab === "resumen" && (
                  <div className="space-y-7">
                    <section>
                      <SectionTitle label="Datos Personales" />
                      <div className="space-y-3">
                        <InfoRow icon={<Mail className="h-4 w-4" />}     label="Correo"              value={worker.email} />
                        <InfoRow icon={<Phone className="h-4 w-4" />}    label="Teléfono"            value={worker.telefono} />
                        <InfoRow icon={<Calendar className="h-4 w-4" />} label="Fecha de nacimiento" value={formatDate(worker.fechaNacimiento)} />
                      </div>
                    </section>

                    <section>
                      <SectionTitle label="Datos Laborales" />
                      <div className="space-y-3">
                        <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Cargo"            value={worker.cargo} />
                        <InfoRow icon={<Building2 className="h-4 w-4" />} label="Área"             value={worker.area} />
                        <InfoRow icon={<MapPin className="h-4 w-4" />}    label="Centro principal"  value={worker.centroTrabajo} />
                        <InfoRow icon={<FileText className="h-4 w-4" />}  label="Tipo de contrato" value={worker.tipoContrato} />
                        <InfoRow icon={<Clock className="h-4 w-4" />}     label="Fecha de ingreso" value={formatDate(worker.fechaIngreso)} />
                      </div>
                    </section>

                    {(docSummary.pendientes > 0 || docSummary.vencidos > 0 || worker.capacitacionesPendientes > 0) && (
                      <section>
                        <SectionTitle label="Alertas" />
                        <div className="space-y-2.5">
                          {docSummary.vencidos > 0 && (
                            <div className="flex items-start gap-3 rounded-xl bg-red-50 p-3.5 ring-1 ring-red-200">
                              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                              <div>
                                <p className="text-sm font-semibold text-red-900">
                                  {docSummary.vencidos} documento{docSummary.vencidos !== 1 ? "s" : ""} vencido{docSummary.vencidos !== 1 ? "s" : ""}
                                </p>
                                <p className="text-xs text-red-700">Documentos con fecha de vigencia expirada</p>
                              </div>
                            </div>
                          )}
                          {docSummary.pendientes > 0 && (
                            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3.5 ring-1 ring-amber-200">
                              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                              <div>
                                <p className="text-sm font-semibold text-amber-900">
                                  {docSummary.pendientes} documento{docSummary.pendientes !== 1 ? "s" : ""} pendiente{docSummary.pendientes !== 1 ? "s" : ""}
                                </p>
                                <p className="text-xs text-amber-700">Requieren carga o renovación</p>
                              </div>
                            </div>
                          )}
                          {worker.capacitacionesPendientes > 0 && (
                            <div className="flex items-start gap-3 rounded-xl bg-orange-50 p-3.5 ring-1 ring-orange-200">
                              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                              <div>
                                <p className="text-sm font-semibold text-orange-900">
                                  {worker.capacitacionesPendientes} capacitación{worker.capacitacionesPendientes !== 1 ? "es" : ""} pendiente{worker.capacitacionesPendientes !== 1 ? "s" : ""}
                                </p>
                                <p className="text-xs text-orange-700">Deben completarse según el plan</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </section>
                    )}
                  </div>
                )}

                {/* ═══ ASIGNACIONES ═══ */}
                {activeTab === "asignaciones" && (
                  <div className="space-y-5">

                    {/* ── Posición de dotación (real data from store) ── */}
                    {dotacion ? (
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                              <Layers className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">
                              Posición de Dotación
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-indigo-400 bg-indigo-100 rounded px-1.5 py-0.5">
                            {dotacion.codigo}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Centro</p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-800">{dotacion.centroNombre}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Cargo</p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-800">{dotacion.cargoNombre}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Requeridos</p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-800">{dotacion.dotacionRequerida}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Asignados</p>
                            <p className={`mt-0.5 text-xs font-semibold ${isSobredotado(dotacion) ? "text-purple-700" : "text-slate-800"}`}>
                              {dotacion.asignados}
                              {isSobredotado(dotacion) && <span className="ml-1 text-[10px]">(+{dotacion.asignados - dotacion.dotacionRequerida} exceso)</span>}
                            </p>
                          </div>
                        </div>

                        {/* Coverage bar */}
                        <div>
                          <div className="flex justify-between text-[10px] text-indigo-500 mb-1">
                            <span>Cobertura de la posición</span>
                            <span className="font-semibold">{coberturaPct(dotacion)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-indigo-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isSobredotado(dotacion) ? "bg-purple-500" : vacantesPos(dotacion) === 0 ? "bg-emerald-500" : "bg-amber-400"}`}
                              style={{ width: `${Math.min(100, coberturaPct(dotacion))}%` }}
                            />
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                            isSobredotado(dotacion)
                              ? "bg-purple-50 text-purple-700 border-purple-100"
                              : vacantesPos(dotacion) === 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}>
                            {isSobredotado(dotacion) && <TrendingUp className="h-3 w-3 mr-1" />}
                            {coberturaLabel(dotacion)}
                          </span>
                          {vacantesPos(dotacion) > 0 && !isSobredotado(dotacion) && (
                            <span className="text-[11px] text-slate-400">
                              {vacantesPos(dotacion)} vacante{vacantesPos(dotacion) !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
                        <Layers className="mx-auto h-6 w-6 text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-500">Sin posición de dotación asignada</p>
                        <p className="text-xs text-slate-400 mt-0.5">Se vinculará automáticamente al editar</p>
                      </div>
                    )}

                    {/* ── Mock additional assignments header ── */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        {asignaciones.length} asignación{asignaciones.length !== 1 ? "es" : ""} activa{asignaciones.length !== 1 ? "s" : ""}
                      </p>
                      <button className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800">
                        <Plus className="h-3.5 w-3.5" /> Agregar asignación
                      </button>
                    </div>

                    {asignaciones.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                              <MapPin className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{a.centro}</p>
                              {a.esPrincipal && (
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                                  Principal
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${ASIGNACION_ESTADO_CLS[a.estado]}`}>
                            {a.estado}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                          {[
                            { label: "Área",    value: a.area },
                            { label: "Cargo",   value: a.cargo },
                            { label: "Puesto",  value: a.puesto },
                            { label: "Jornada", value: a.jornada },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
                              <p className="mt-0.5 text-xs font-medium text-slate-800">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ═══ RIESGOS ═══ */}
                {activeTab === "riesgos" && (
                  <div className="space-y-5">
                    {/* DS44 status */}
                    <div className={`flex items-center gap-3 rounded-2xl p-4 ${ds44Critical ? "bg-red-50 ring-1 ring-red-200" : "bg-emerald-50 ring-1 ring-emerald-200"}`}>
                      {ds44Critical
                        ? <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
                        : <ShieldCheck   className="h-5 w-5 shrink-0 text-emerald-600" />
                      }
                      <div>
                        <p className={`text-sm font-bold ${ds44Critical ? "text-red-900" : "text-emerald-900"}`}>
                          {ds44Critical ? "DS44 — Estado Crítico" : "DS44 — Sin alertas críticas"}
                        </p>
                        <p className={`text-xs ${ds44Critical ? "text-red-700" : "text-emerald-700"}`}>
                          {ds44Critical
                            ? "Requiere revisión inmediata de gestión de riesgos"
                            : "Gestión de riesgos al día"}
                        </p>
                      </div>
                    </div>

                    <section>
                      <SectionTitle label="Riesgos identificados" />
                      <div className="space-y-3">
                        {riesgos.map((r) => (
                          <div key={r.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                            <span className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${NIVEL_CLS[r.nivel]}`}>
                              {r.nivel}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-slate-700">{r.categoria}</p>
                              <p className="text-xs text-slate-500">{r.descripcion}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <SectionTitle label="Observaciones" />
                      <p className="rounded-xl bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-200">
                        Trabajador con exposición moderada a factores de riesgo propios del cargo. Se recomienda mantener actualización de evaluaciones periódicas y control de EPP.
                      </p>
                    </section>
                  </div>
                )}

                {/* ═══ DOCUMENTOS ═══ */}
                {activeTab === "documentos" && (
                  <div className="space-y-4">
                    {/* Compliance card */}
                    <div className="rounded-2xl bg-slate-900 p-4 text-white">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-3xl font-bold">{docSummary.pct}%</p>
                          <p className="mt-0.5 text-xs text-slate-400">Cumplimiento documental</p>
                        </div>
                        <div className="space-y-1 text-right text-xs">
                          <p><span className="font-bold text-emerald-400">{docSummary.cargados}</span> al día</p>
                          {docSummary.vencidos > 0 && <p><span className="font-bold text-red-400">{docSummary.vencidos}</span> vencidos</p>}
                          {docSummary.pendientes > 0 && <p><span className="font-bold text-amber-400">{docSummary.pendientes}</span> pendientes</p>}
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                        <div
                          className={`h-full rounded-full transition-all ${docSummary.pct >= 80 ? "bg-emerald-400" : docSummary.pct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${docSummary.pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Document list (vencidos → rechazados → pendientes → en_revision → completos) */}
                    <div className="space-y-2">
                      {[...workerDocs]
                        .sort((a, b) => {
                          const order: Record<string, number> = { vencido: 0, rechazado: 1, pendiente: 2, en_revision: 3, completo: 4, no_aplica: 5 };
                          return (order[a.estado] ?? 9) - (order[b.estado] ?? 9);
                        })
                        .map((d) => {
                          const catCfg  = CATEGORIA_CONFIG[d.tipo.categoria];
                          const estCfg  = ESTADO_DOC_CONFIG[d.estado];
                          const needsAction = d.estado === "vencido" || d.estado === "pendiente" || d.estado === "rechazado";
                          return (
                            <div
                              key={d.tipo.id}
                              className={`rounded-xl border px-4 py-3 transition ${
                                d.estado === "vencido"     ? "border-red-200 bg-red-50"
                                : d.estado === "rechazado" ? "border-rose-200 bg-rose-50"
                                : d.estado === "pendiente" ? "border-amber-200 bg-amber-50"
                                : d.estado === "en_revision" ? "border-blue-200 bg-blue-50"
                                : "border-slate-200 bg-white"
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${catCfg.bg} ${catCfg.text} ${catCfg.ring}`}>
                                  {d.tipo.categoria}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm font-semibold leading-tight ${
                                    d.estado === "vencido" || d.estado === "rechazado" ? "text-red-900"
                                    : d.estado === "pendiente" ? "text-amber-900"
                                    : d.estado === "en_revision" ? "text-blue-900"
                                    : "text-slate-900"
                                  }`}>
                                    {d.tipo.nombre}
                                    {d.tipo.esCritico && <span className="ml-1 text-[10px] font-bold text-red-600">●</span>}
                                  </p>
                                  {d.cargadoPor && (
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                      Por: {d.cargadoPor}{d.fechaCarga ? ` · ${formatDate(d.fechaCarga)}` : ""}
                                    </p>
                                  )}
                                  {!d.cargadoPor && d.estado === "completo" && d.fechaCarga && (
                                    <p className="mt-0.5 text-[11px] text-slate-400">Cargado: {formatDate(d.fechaCarga)}</p>
                                  )}
                                  {d.fechaVencimiento && d.diasParaVencer !== undefined && (
                                    <p className={`mt-0.5 text-[11px] font-medium ${d.diasParaVencer < 0 ? "text-red-600" : d.diasParaVencer <= 30 ? "text-amber-600" : "text-slate-400"}`}>
                                      {d.diasParaVencer < 0
                                        ? `Venció hace ${Math.abs(d.diasParaVencer)} días`
                                        : `Vence en ${d.diasParaVencer} días`}
                                    </p>
                                  )}
                                  {d.observacion && (
                                    <p className="mt-1 rounded-lg bg-white/60 px-2 py-1 text-[11px] italic text-slate-500">
                                      “{d.observacion}”
                                    </p>
                                  )}
                                </div>
                                <div className="shrink-0 flex flex-col items-end gap-1.5">
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${estCfg.bg} ${estCfg.text} ${estCfg.ring}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${estCfg.dot}`} />
                                    {estCfg.label}
                                  </span>
                                  {needsAction && (
                                    <button
                                      onClick={() =>
                                        openUpload({
                                          workerId:             worker.id,
                                          tipoDocumentoId:      d.tipo.id,
                                          mode:                 d.estado === "rechazado" ? "reenviar" : "subir",
                                          rejectionObservation: d.estado === "rechazado" ? d.observacion : undefined,
                                        })
                                      }
                                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white transition ${
                                        d.estado === "rechazado"
                                          ? "bg-rose-600 hover:bg-rose-700"
                                          : "bg-amber-600 hover:bg-amber-700"
                                      }`}
                                    >
                                      <Plus className="h-3 w-3" />
                                      {d.estado === "rechazado" ? "Reenviar" : "Subir"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Link to global module */}
                    <Link
                      href={`/dicaprev/trabajadores/control-documental?workerId=${worker.id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ver en Control Documental
                    </Link>

                    <Link
                      href={`/dicaprev/trabajadores/capacitaciones?workerId=${worker.id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
                    >
                      <GraduationCap className="h-3.5 w-3.5" />
                      Ver en Capacitaciones
                    </Link>
                  </div>
                )}

                {/* ═══ INDICADORES SST ═══ */}
                {activeTab === "sst" && (
                  <div className="space-y-5">
                    {/* Cumplimiento global */}
                    <div className="rounded-2xl bg-slate-900 p-5 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                            Cumplimiento SST
                          </p>
                          <p className="mt-1 text-4xl font-bold">{sstPct}%</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {sstPct >= 80 ? "Estado aceptable" : sstPct >= 60 ? "Requiere atención" : "Estado crítico"}
                          </p>
                        </div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                          <BarChart3 className="h-7 w-7 text-white" />
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
                        <div
                          className={`h-full rounded-full transition-all ${sstPct >= 80 ? "bg-emerald-400" : sstPct >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${sstPct}%` }}
                        />
                      </div>
                    </div>

                    {/* KPI grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          label: "Capacitaciones al día",
                          value: worker.capacitacionesPendientes === 0 ? "✓ OK" : `${worker.capacitacionesPendientes} pend.`,
                          ok: worker.capacitacionesPendientes === 0,
                          icon: <BookOpen className="h-4 w-4" />,
                        },
                        {
                          label: "Docs. vigentes",
                          value: (docSummary.pendientes === 0 && docSummary.vencidos === 0) ? "✓ OK" : `${docSummary.pendientes + docSummary.vencidos} pend.`,
                          ok: docSummary.pendientes === 0 && docSummary.vencidos === 0,
                          icon: <FileText className="h-4 w-4" />,
                        },
                        {
                          label: "Riesgos críticos",
                          value: riesgos.filter((r) => r.nivel === "Alto").length > 0
                            ? `${riesgos.filter((r) => r.nivel === "Alto").length} activo${riesgos.filter((r) => r.nivel === "Alto").length > 1 ? "s" : ""}`
                            : "Sin críticos",
                          ok: riesgos.filter((r) => r.nivel === "Alto").length === 0,
                          icon: <AlertTriangle className="h-4 w-4" />,
                        },
                        {
                          label: "Evaluaciones pend.",
                          value: ds44Critical ? "1 pendiente" : "Al día",
                          ok: !ds44Critical,
                          icon: <TrendingUp className="h-4 w-4" />,
                        },
                      ].map((k) => (
                        <div
                          key={k.label}
                          className={`rounded-2xl p-4 ring-1 ${k.ok ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-200"}`}
                        >
                          <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${k.ok ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                            {k.icon}
                          </div>
                          <p className={`text-sm font-bold ${k.ok ? "text-emerald-900" : "text-amber-900"}`}>{k.value}</p>
                          <p className={`text-[11px] ${k.ok ? "text-emerald-700" : "text-amber-700"}`}>{k.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Alertas SST */}
                    {(docSummary.pendientes === 0 && docSummary.vencidos === 0 && !worker.capacitacionesPendientes) ? (
                      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                        <p className="text-sm font-semibold text-emerald-900">Sin alertas SST activas</p>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                        <div>
                          <p className="text-sm font-bold text-red-900">Alertas activas</p>
                          <p className="text-xs text-red-700">
                            Existen pendientes que afectan el cumplimiento SST de este trabajador.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(worker)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar trabajador
                  </button>
                  <button className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
                    <UserMinus className="h-3.5 w-3.5" /> Dar de baja
                  </button>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </>
  );
}
