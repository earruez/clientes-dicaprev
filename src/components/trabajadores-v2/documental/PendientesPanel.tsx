"use client";

import { useState, useMemo, useEffect, Fragment } from "react";
import Link from "next/link";
import {
  Search,
  UploadCloud,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Bell,
  Download,
  Layers,
  CheckCheck,
  X,
  SlidersHorizontal,
  Building2,
  Briefcase,
  Clock,
  ShieldAlert,
  Users,
  Sparkles,
  PenLine,
} from "lucide-react";
import { puedeGenerarseConIA, esContenidoPlaceholder } from "@/lib/documentacion/ia-generacion-helper";
import {
  CATEGORIA_CONFIG,
  ESTADO_DOC_CONFIG,
  PLANTILLAS_DOCUMENTALES,
  getWorkerDocs,
  getWorkerDocSummary,
  type TipoDocumento,
  type ReglaDocumental,
  type DocumentoTrabajador,
} from "./types";
import { formatDate, type Worker } from "../types";
import {
  cambiarEstadoTrabajadorDocumento,
  enviarTrabajadorDocumentoAFirma,
  firmarTrabajadorDocumento,
  generarContenidoIATrabajadorDocumento,
  getHistorialDocumentoTrabajador,
  validarTrabajadorDocumento,
  type EstadoDocumentoTrabajadorInput,
  type HistorialEntryView,
} from "@/actions/trabajadores/documentos";
import {
  DocumentUploadDrawer,
  type DocumentUploadContext,
} from "./DocumentUploadDrawer";
import {
  DocumentoReviewDrawer,
  type DocumentoReviewContext,
} from "./DocumentoReviewDrawer";
import { generarPlantillaContenidoIA } from "@/lib/documentacion/ia-generacion-helper";
import {
  construirContenidoBasePlantilla,
  getPlantilla,
  normalizarNombreDocumentoDisplay,
} from "@/lib/documentacion/plantillas-documento";
import { PorCentroView }       from "./PorCentroView";
import { PorCargoView }        from "./PorCargoView";
import { PorVencimientosView } from "./PorVencimientosView";

type FilterEstado = "todos" | "criticos" | "pendientes" | "vencidos" | "rechazados" | "en_revision";
type BulkModal    = null | "plantilla" | "revisado" | "exportar" | "recordar" | "estado";
type MainView     = "trabajador" | "centro" | "cargo" | "vencimientos";
type DocActionType = "validar" | "rechazar" | "no_aplica" | "en_revision" | "enviar_firma" | "firmar";

interface PendientesPanelProps {
  initialWorkerId?: string;
  initialSearch?: string;
  workers: Worker[];
  tipos: TipoDocumento[];
  reglas: ReglaDocumental[];
  documentos: DocumentoTrabajador[];
  onSaved?: () => void | Promise<void>;
}

export function PendientesPanel({
  initialWorkerId,
  initialSearch,
  workers,
  tipos,
  reglas,
  documentos,
  onSaved,
}: PendientesPanelProps) {

  const [mainView, setMainView]                 = useState<MainView>("trabajador");
  const [soloDS44, setSoloDS44]                 = useState(false);
  const [search, setSearch]                     = useState("");
  const [filterEstado, setFilterEstado]         = useState<FilterEstado>("todos");
  const [uploadCtx, setUploadCtx]               = useState<DocumentUploadContext | undefined>(undefined);
  const [uploadOpen, setUploadOpen]             = useState(false);

  // ── Review drawer (IA documents) ───────────────────────────
  const [reviewCtx, setReviewCtx]               = useState<DocumentoReviewContext | null>(null);
  const [reviewOpen, setReviewOpen]             = useState(false);

  function openReview(ctx: DocumentoReviewContext) {
    setReviewCtx(ctx);
    setReviewOpen(true);
  }

  const [generandoDocId, setGenerandoDocId] = useState<string | null>(null);

  async function handleGenerarConIA(doc: import("./types").DocTrabajadorView, worker: Worker) {
    try {
      setGenerandoDocId(doc.tipo.id);
      const plantilla = getPlantilla(doc.tipo.id, doc.tipo.nombre);
      // Prioriza plantillas estructuradas; fallback al generador IA existente.
      const contenidoGenerado = plantilla
        ? construirContenidoBasePlantilla(plantilla)
        : generarPlantillaContenidoIA({
            tipoNombre: doc.tipo.nombre,
            trabajadorNombre: `${worker.nombre} ${worker.apellido}`,
            trabajadorRut: worker.rut,
            cargo: worker.cargo,
          });

      // Persist content with estado change to en_revision
      const generated = await generarContenidoIATrabajadorDocumento(
        doc.documentoId ?? null,
        contenidoGenerado,
        worker.id,
        doc.tipo.id,
      );

      // Refresh data and open drawer with updated estado
      await onSaved?.();
      // Update the doc locally to reflect new estado
      const updatedDoc = {
        ...doc,
        documentoId: generated.id,
        estado: "en_revision" as const,
        observacion: contenidoGenerado,
      };
      openReview({ doc: updatedDoc, worker });
    } catch (error) {
      console.error("Error generating document:", error);
      // TODO: Show error toast
    } finally {
      setGenerandoDocId(null);
    }
  }

  function openUpload(ctx: DocumentUploadContext) {
    setUploadCtx(ctx);
    setUploadOpen(true);
  }

  // ── Bulk selection ─────────────────────────────────────────
  const [checkedIds, setCheckedIds]                     = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal]                       = useState<BulkModal>(null);
  const [mockBulkDone, setMockBulkDone]                 = useState<string | null>(null);
  const [selectedPlantilla, setSelectedPlantilla]       = useState("");
  const [selectedBulkEstado, setSelectedBulkEstado]     = useState("en_revision");

  // ── Per-document state actions ─────────────────────────────
  const [actionModal, setActionModal]   = useState<{ documentoId: string; tipoNombre: string; accion: DocActionType } | null>(null);
  const [actionMotivo, setActionMotivo] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]   = useState<string | null>(null);
  const [actionDone, setActionDone]     = useState<string | null>(null);

  function openActionModal(documentoId: string, tipoNombre: string, accion: DocActionType) {
    setActionModal({ documentoId, tipoNombre, accion });
    setActionMotivo("");
    setActionError(null);
  }

  // ── Historial modal ──────────────────────────────────
  const [historialModal, setHistorialModal] = useState<{ documentoId: string; tipoNombre: string } | null>(null);
  const [historialEntries, setHistorialEntries] = useState<HistorialEntryView[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialError, setHistorialError] = useState<string | null>(null);

  async function openHistorialModal(documentoId: string, tipoNombre: string) {
    setHistorialModal({ documentoId, tipoNombre });
    setHistorialEntries([]);
    setHistorialError(null);
    setHistorialLoading(true);
    try {
      const data = await getHistorialDocumentoTrabajador(documentoId);
      setHistorialEntries(data);
    } catch (err) {
      setHistorialError(err instanceof Error ? err.message : "Error al cargar historial");
    } finally {
      setHistorialLoading(false);
    }
  }

  async function handleDocAction() {
    if (!actionModal) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const labels: Record<DocActionType, string> = {
        validar:    "validado",
        rechazar:   "rechazado",
        no_aplica:  "marcado como no aplica",
        en_revision: "enviado a revisión",
        enviar_firma: "enviado a firma",
        firmar: "firmado",
      };
      if (actionModal.accion === "validar") {
        await validarTrabajadorDocumento(actionModal.documentoId, actionMotivo.trim() || undefined);
      } else if (actionModal.accion === "enviar_firma") {
        await enviarTrabajadorDocumentoAFirma(actionModal.documentoId, actionMotivo.trim() || undefined);
      } else if (actionModal.accion === "firmar") {
        await firmarTrabajadorDocumento(actionModal.documentoId);
      } else {
        const estadoMap: Record<"rechazar" | "no_aplica" | "en_revision", EstadoDocumentoTrabajadorInput> = {
          rechazar: "rechazado",
          no_aplica: "no_aplica",
          en_revision: "en_revision",
        };
        await cambiarEstadoTrabajadorDocumento(
          actionModal.documentoId,
          estadoMap[actionModal.accion],
          actionMotivo.trim() || undefined,
        );
      }
      const msg = `Documento "${actionModal.tipoNombre}" ${labels[actionModal.accion]}`;
      setActionDone(msg);
      setTimeout(() => setActionDone(null), 3500);
      setActionModal(null);
      setActionMotivo("");
      await onSaved?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setActionLoading(false);
    }
  }

  function toggleCheck(id: string) {
    setCheckedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function clearChecked() { setCheckedIds(new Set()); setBulkModal(null); }

  function handleBulkAction(action: Exclude<BulkModal, null>) {
    if (action === "exportar") {
      const n = checkedIds.size;
      setMockBulkDone(`${n} trabajador${n !== 1 ? "es" : ""} exportado${n !== 1 ? "s" : ""} como CSV`);
      setTimeout(() => setMockBulkDone(null), 3000);
      clearChecked();
      return;
    }
    setBulkModal(action);
  }

  function confirmBulkAction() {
    const n = checkedIds.size;
    const msg: Record<string, string> = {
      plantilla: `Plantilla asignada a ${n} trabajador${n !== 1 ? "es" : ""}`,
      revisado:  `${n} trabajador${n !== 1 ? "es" : ""} marcado${n !== 1 ? "s" : ""} como revisado${n !== 1 ? "s" : ""}`,
      recordar:  `Recordatorio enviado a ${n} trabajador${n !== 1 ? "es" : ""}`,
      estado:    `Estado actualizado para ${n} trabajador${n !== 1 ? "es" : ""}`,
    };
    setMockBulkDone(msg[bulkModal as string] ?? "Acción completada");
    setTimeout(() => setMockBulkDone(null), 3000);
    clearChecked();
  }

  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(initialWorkerId ?? null);

  // When initialWorkerId changes (e.g. page re-renders with new param), sync state
  useEffect(() => {
    if (initialWorkerId) {
      setSelectedWorkerId(initialWorkerId);
      // Also show only this worker's estado filter by default
      setFilterEstado("todos");
    }
  }, [initialWorkerId]);

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
      setMainView("trabajador");
    }
  }, [initialSearch]);

  const rows = useMemo(() => {
    return workers.map((worker) => {
      const docs    = getWorkerDocs(worker, reglas, tipos, documentos);
      const summary = getWorkerDocSummary(docs);
      return { worker, docs, summary };
    });
  }, [workers, reglas, tipos, documentos]);

  const baseRows = useMemo(() => {
    if (!soloDS44) return rows;
    return rows.filter(({ docs }) =>
      docs.some((d) => d.tipo.esCritico && d.estado !== "completo" && d.estado !== "no_aplica")
    );
  }, [rows, soloDS44]);

  const searchRows = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return baseRows;
    return baseRows.filter(({ worker }) =>
      `${worker.nombre} ${worker.apellido} ${worker.cargo} ${worker.area} ${worker.centroTrabajo}`
        .toLowerCase().includes(q)
    );
  }, [baseRows, search]);

  const filtered = useMemo(() => {
    return searchRows.filter(({ summary }) => {
      if (filterEstado === "criticos")    return summary.vencidos > 0 || summary.rechazados > 0;
      if (filterEstado === "pendientes")  return summary.pendientes > 0;
      if (filterEstado === "vencidos")    return summary.vencidos > 0;
      if (filterEstado === "rechazados")  return summary.rechazados > 0;
      if (filterEstado === "en_revision") return summary.enRevision > 0;
      return true;
    });
  }, [searchRows, filterEstado]);

  const allFilteredChecked  = filtered.length > 0 && filtered.every((r) => checkedIds.has(r.worker.id));
  const someFilteredChecked = !allFilteredChecked && filtered.some((r) => checkedIds.has(r.worker.id));

  function toggleCheckAll() {
    if (allFilteredChecked) {
      setCheckedIds((prev) => { const n = new Set(prev); filtered.forEach((r) => n.delete(r.worker.id)); return n; });
    } else {
      setCheckedIds((prev) => { const n = new Set(prev); filtered.forEach((r) => n.add(r.worker.id)); return n; });
    }
  }

  const globalStats = useMemo(() => ({
    conPendientes:   baseRows.filter(({ summary }) => summary.pendientes > 0).length,
    conVencidos:     baseRows.filter(({ summary }) => summary.vencidos   > 0).length,
    conRechazados:   baseRows.filter(({ summary }) => summary.rechazados > 0).length,
    conEnRevision:   baseRows.filter(({ summary }) => summary.enRevision > 0).length,
    totalPendientes: baseRows.reduce((s, { summary }) => s + summary.pendientes, 0),
    totalVencidos:   baseRows.reduce((s, { summary }) => s + summary.vencidos,   0),
    totalRechazados: baseRows.reduce((s, { summary }) => s + summary.rechazados, 0),
    totalEnRevision: baseRows.reduce((s, { summary }) => s + summary.enRevision, 0),
  }), [baseRows]);

  const FILTER_OPTS: { id: FilterEstado; label: string; count: number }[] = [
    { id: "todos",       label: "Todos",           count: baseRows.length },
    { id: "pendientes",  label: "Con pendientes",  count: globalStats.conPendientes },
    { id: "vencidos",    label: "Con vencidos",    count: globalStats.conVencidos },
    { id: "rechazados",  label: "Rechazados",      count: globalStats.conRechazados },
    { id: "en_revision", label: "En revisión",    count: globalStats.conEnRevision },
    { id: "criticos",    label: "Críticos",        count: baseRows.filter(({ summary }) => summary.vencidos > 0 || summary.rechazados > 0).length },
  ];

  const selectedRow = rows.find((r) => r.worker.id === selectedWorkerId) ?? null;

  const toggleSelect = (workerId: string) =>
    setSelectedWorkerId((prev) => (prev === workerId ? null : workerId));

  const VIEW_OPTS = [
    { id: "trabajador"   as const, label: "Por trabajador", Icon: Users },
    { id: "centro"       as const, label: "Por centro",     Icon: Building2 },
    { id: "cargo"        as const, label: "Por cargo",      Icon: Briefcase },
    { id: "vencimientos" as const, label: "Vencimientos",   Icon: Clock },
  ];

  return (
    <div className="space-y-5">
      <DocumentUploadDrawer
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        context={uploadCtx}
        workers={workers}
        tipos={tipos}
        onSaved={onSaved}
      />

      {/* ── Documento Review Drawer (IA) ── */}
      <DocumentoReviewDrawer
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        context={reviewCtx}
        onUpdated={onSaved}
      />

      {/* ── Doc action confirmation toast ── */}
      {actionDone && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2">
          <div className="flex items-center gap-2.5 rounded-2xl bg-slate-900 px-5 py-3 shadow-2xl ring-1 ring-white/10">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <p className="text-sm font-semibold text-white">{actionDone}</p>
          </div>
        </div>
      )}

      {/* ── Historial modal ── */}
      {historialModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setHistorialModal(null)}>
          <div className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Historial documental</p>
                <h3 className="mt-0.5 text-sm font-bold text-slate-900">{historialModal.tipoNombre}</h3>
              </div>
              <button onClick={() => setHistorialModal(null)} className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {historialLoading && (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                </div>
              )}
              {historialError && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{historialError}</p>
              )}
              {!historialLoading && !historialError && historialEntries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
                    <Clock className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-500">Sin historial registrado</p>
                  <p className="mt-1 text-xs text-slate-400">Las acciones sobre este documento aparecerán aquí.</p>
                </div>
              )}
              {!historialLoading && historialEntries.length > 0 && (
                <ol className="relative border-l border-slate-200 pl-5 space-y-5">
                  {historialEntries.map((entry) => {
                    const date = new Date(entry.createdAt);
                    const dateStr = date.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
                    const timeStr = date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
                    const accionLabel: Record<string, string> = {
                      DOCUMENTO_CREADO:          "Documento creado",
                      ESTADO_ACTUALIZADO:        "Estado actualizado",
                      DOCUMENTO_GENERADO_POR_REGLA: "Generado por regla",
                      ARCHIVO_SUBIDO:            "Archivo subido",
                      OBSERVACION_AGREGADA:      "Observación agregada",
                    };
                    return (
                      <li key={entry.id} className="relative">
                        <span className="absolute -left-[1.35rem] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-slate-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        </span>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              {accionLabel[entry.accion] ?? entry.accion}
                            </span>
                            <span className="shrink-0 text-[11px] text-slate-400">{dateStr} · {timeStr}</span>
                          </div>
                          {entry.detalle && (
                            <p className="mt-2 text-xs text-slate-600 leading-relaxed">{entry.detalle}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                            {entry.usuarioNombre && (
                              <span>Por: <span className="font-medium text-slate-700">{entry.usuarioNombre}</span></span>
                            )}
                            {!entry.usuarioNombre && entry.usuarioEmail && (
                              <span>Por: <span className="font-medium text-slate-700">{entry.usuarioEmail}</span></span>
                            )}
                            {entry.version && (
                              <span>Versión: <span className="font-medium text-slate-700">{entry.version}</span></span>
                            )}
                            {(entry.archivoNombreOriginal ?? entry.archivoNombre) && (
                              <span>Archivo: <span className="font-medium text-slate-700">{entry.archivoNombreOriginal ?? entry.archivoNombre}</span></span>
                            )}
                            {entry.archivoPeso && (
                              <span>{(entry.archivoPeso / 1024).toFixed(0)} KB</span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Doc action modal ── */}
      {actionModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => !actionLoading && setActionModal(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                actionModal.accion === "validar"    ? "bg-indigo-100" :
                actionModal.accion === "enviar_firma" ? "bg-teal-100" :
                actionModal.accion === "firmar"     ? "bg-emerald-100" :
                actionModal.accion === "rechazar"   ? "bg-red-100"     :
                actionModal.accion === "no_aplica"  ? "bg-slate-100"   :
                "bg-blue-100"
              }`}>
                {actionModal.accion === "validar"    && <CheckCircle2 className="h-5 w-5 text-indigo-600" />}
                {actionModal.accion === "enviar_firma" && <UploadCloud className="h-5 w-5 text-teal-600" />}
                {actionModal.accion === "firmar"     && <CheckCheck className="h-5 w-5 text-emerald-600" />}
                {actionModal.accion === "rechazar"   && <XCircle      className="h-5 w-5 text-red-600" />}
                {actionModal.accion === "no_aplica"  && <X            className="h-5 w-5 text-slate-500" />}
                {actionModal.accion === "en_revision" && <Clock       className="h-5 w-5 text-blue-600" />}
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-900">
                {actionModal.accion === "validar"    && "Validar documento"}
                {actionModal.accion === "enviar_firma" && "Enviar a firma"}
                {actionModal.accion === "firmar"     && "Firmar documento"}
                {actionModal.accion === "rechazar"   && "Rechazar documento"}
                {actionModal.accion === "no_aplica"  && "Marcar como No aplica"}
                {actionModal.accion === "en_revision" && "Enviar a revisión"}
              </h3>
              <p className="mt-1.5 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{actionModal.tipoNombre}</span>
                {actionModal.accion === "validar"    && " — Se marcará como validado."}
                {actionModal.accion === "enviar_firma" && " — Se enviará a firma."}
                {actionModal.accion === "firmar"     && " — Se firmará de forma definitiva."}
                {actionModal.accion === "rechazar"   && " — Se marcará como rechazado y se solicitará corrección."}
                {actionModal.accion === "no_aplica"  && " — Se marcará como no requerido para este trabajador."}
                {actionModal.accion === "en_revision" && " — Se enviará a revisión."}
              </p>

              {/* Motivo / observación */}
              <div className="mt-4">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  {actionModal.accion === "rechazar" ? "Motivo de rechazo *" : "Observación (opcional)"}
                </label>
                <textarea
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none resize-none"
                  rows={3}
                  placeholder={actionModal.accion === "rechazar" ? "Describe el motivo del rechazo..." : "Comentario o detalle..."}
                  value={actionMotivo}
                  onChange={(e) => setActionMotivo(e.target.value)}
                />
              </div>

              {actionError && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200">
                  {actionError}
                </p>
              )}

              <div className="mt-5 flex gap-2.5">
                <button
                  onClick={() => { setActionModal(null); setActionMotivo(""); }}
                  disabled={actionLoading}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDocAction}
                  disabled={actionLoading || (actionModal.accion === "rechazar" && !actionMotivo.trim())}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    actionModal.accion === "validar"    ? "bg-indigo-600 hover:bg-indigo-700" :
                    actionModal.accion === "enviar_firma" ? "bg-teal-600 hover:bg-teal-700" :
                    actionModal.accion === "firmar"     ? "bg-emerald-600 hover:bg-emerald-700" :
                    actionModal.accion === "rechazar"   ? "bg-red-600 hover:bg-red-700" :
                    actionModal.accion === "no_aplica"  ? "bg-slate-700 hover:bg-slate-800" :
                    "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {actionLoading ? "Guardando..." : (
                    actionModal.accion === "validar"    ? "Validar" :
                    actionModal.accion === "enviar_firma" ? "Enviar" :
                    actionModal.accion === "firmar"     ? "Firmar" :
                    actionModal.accion === "rechazar"   ? "Rechazar" :
                    actionModal.accion === "no_aplica"  ? "Confirmar" :
                    "Enviar a revisión"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk confirmation toast ── */}
      {mockBulkDone && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2">
          <div className="flex items-center gap-2.5 rounded-2xl bg-slate-900 px-5 py-3 shadow-2xl ring-1 ring-white/10">
            <CheckCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            <p className="text-sm font-semibold text-white">{mockBulkDone}</p>
          </div>
        </div>
      )}

      {/* ── Bulk action modals ── */}
      {bulkModal && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={() => setBulkModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white shadow-2xl ring-1 ring-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* PLANTILLA */}
            {bulkModal === "plantilla" && (
              <div className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100">
                  <Layers className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-slate-900">Asignar plantilla documental</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Selecciona la plantilla para {checkedIds.size} trabajador{checkedIds.size !== 1 ? "es" : ""}.
                </p>
                <div className="mt-4 space-y-2">
                  {PLANTILLAS_DOCUMENTALES.map((p) => (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        selectedPlantilla === p.id ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio" name="bulkPlantilla" value={p.id}
                        checked={selectedPlantilla === p.id}
                        onChange={() => setSelectedPlantilla(p.id)}
                        className="mt-0.5 accent-blue-600"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{p.nombre}</p>
                        <p className="text-[11px] text-slate-400">{p.descripcion}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-5 flex gap-2.5">
                  <button onClick={() => setBulkModal(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button>
                  <button onClick={confirmBulkAction} disabled={!selectedPlantilla} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">Asignar</button>
                </div>
              </div>
            )}

            {/* REVISADO */}
            {bulkModal === "revisado" && (
              <div className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100">
                  <CheckCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-slate-900">Marcar como revisado</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  ¿Confirmar que {checkedIds.size} trabajador{checkedIds.size !== 1 ? "es" : ""} ha{checkedIds.size !== 1 ? "n" : ""} sido revisado{checkedIds.size !== 1 ? "s" : ""}?
                  Esto quedará registrado en el historial documental.
                </p>
                <div className="mt-5 flex gap-2.5">
                  <button onClick={() => setBulkModal(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button>
                  <button onClick={confirmBulkAction} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">Confirmar</button>
                </div>
              </div>
            )}

            {/* RECORDAR */}
            {bulkModal === "recordar" && (
              <div className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100">
                  <Bell className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-slate-900">Enviar recordatorio</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Se enviará una notificación de documentos pendientes a {checkedIds.size} trabajador{checkedIds.size !== 1 ? "es" : ""}.
                </p>
                <div className="mt-5 flex gap-2.5">
                  <button onClick={() => setBulkModal(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button>
                  <button onClick={confirmBulkAction} className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600">Enviar</button>
                </div>
              </div>
            )}

            {/* CAMBIAR ESTADO */}
            {bulkModal === "estado" && (
              <div className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
                  <SlidersHorizontal className="h-5 w-5 text-slate-600" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-slate-900">Cambiar estado documental</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Nuevo estado para {checkedIds.size} trabajador{checkedIds.size !== 1 ? "es" : ""}.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {(Object.entries(ESTADO_DOC_CONFIG) as [string, { label: string; bg: string; text: string; ring: string; dot: string }][]).map(([value, cfg]) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 transition ${
                        selectedBulkEstado === value ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input type="radio" name="bulkEstado" value={value} checked={selectedBulkEstado === value} onChange={() => setSelectedBulkEstado(value)} className="accent-blue-600" />
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-5 flex gap-2.5">
                  <button onClick={() => setBulkModal(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button>
                  <button onClick={confirmBulkAction} className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Aplicar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── View switcher + DS44 toggle ── */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {VIEW_OPTS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setMainView(id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition ${
                mainView === id
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSoloDS44((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-semibold shadow-sm ring-1 transition ${
            soloDS44
              ? "bg-red-600 text-white ring-red-500 hover:bg-red-700"
              : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Solo DS44 críticos
        </button>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Workers a revisar",      value: globalStats.conPendientes + globalStats.conVencidos + globalStats.conRechazados, color: "text-slate-900" },
          { label: "Total docs pendientes",  value: globalStats.totalPendientes,  color: "text-amber-600" },
          { label: "Docs vencidos",          value: globalStats.totalVencidos,    color: "text-red-600" },
          { label: "En revisión / Rechazados", value: globalStats.totalEnRevision + globalStats.totalRechazados, color: "text-blue-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* If a specific worker is pre-selected (from URL param), show a contextual banner */}
      {mainView === "trabajador" && initialWorkerId && selectedRow && (
        <div className="flex items-center gap-3 rounded-2xl bg-blue-50 px-4 py-3 ring-1 ring-blue-200">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">
            {selectedRow.worker.nombre[0]}{selectedRow.worker.apellido[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-blue-900">
              Mostrando detalle de {selectedRow.worker.nombre} {selectedRow.worker.apellido}
            </p>
            <p className="text-xs text-blue-600">
              {selectedRow.worker.cargo} · {selectedRow.worker.area}
            </p>
          </div>
          <button
            onClick={() => setSelectedWorkerId(null)}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Ver todos
          </button>
        </div>
      )}

      {mainView === "trabajador" && (<>
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterEstado(f.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filterEstado === f.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filterEstado === f.id ? "bg-white/20 text-white" : "bg-white text-slate-600"}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar trabajador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none sm:w-56"
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {checkedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 shadow-lg">
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-900">
              {checkedIds.size}
            </span>
            <p className="text-xs font-semibold text-white">
              seleccionado{checkedIds.size !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="mx-1 h-4 w-px shrink-0 bg-slate-600" />
          <button onClick={() => handleBulkAction("plantilla")} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20">
            <Layers className="h-3.5 w-3.5" /> Asignar plantilla
          </button>
          <button onClick={() => handleBulkAction("revisado")} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20">
            <CheckCheck className="h-3.5 w-3.5" /> Marcar revisado
          </button>
          <button onClick={() => handleBulkAction("exportar")} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20">
            <Download className="h-3.5 w-3.5" /> Exportar
          </button>
          <button onClick={() => handleBulkAction("recordar")} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20">
            <Bell className="h-3.5 w-3.5" /> Recordar
          </button>
          <button onClick={() => handleBulkAction("estado")} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Cambiar estado
          </button>
          <div className="ml-auto shrink-0">
            <button onClick={clearChecked} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allFilteredChecked}
                  ref={(el: HTMLInputElement | null) => { if (el) el.indeterminate = someFilteredChecked; }}
                  onChange={toggleCheckAll}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                />
              </th>
              {["Trabajador", "Área / Cargo", "Docs req.", "Al día", "Pendientes", "Vencidos", "Cumplimiento", "Detalle"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                  No hay trabajadores que coincidan con los filtros seleccionados.
                </td>
              </tr>
            )}
            {filtered.map(({ worker, docs, summary }) => {
              const isSelected = selectedWorkerId === worker.id;
              const initials   = `${worker.nombre[0]}${worker.apellido[0]}`;

              return (
                <Fragment key={worker.id}>
                  <tr
                    key={worker.id}
                    onClick={() => toggleSelect(worker.id)}
                    className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-50 ring-inset ring-1 ring-blue-200" : "hover:bg-slate-50"}`}
                  >
                    {/* Checkbox */}
                    <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checkedIds.has(worker.id)}
                        onChange={() => toggleCheck(worker.id)}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                      />
                    </td>
                    {/* Trabajador */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${isSelected ? "bg-blue-600" : "bg-slate-800"}`}>
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{worker.apellido}, {worker.nombre}</p>
                          <p className="text-[11px] text-slate-400">{worker.rut}</p>
                        </div>
                      </div>
                    </td>
                    {/* Área / Cargo */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-slate-700">{worker.cargo}</p>
                      <p className="text-[11px] text-slate-400">{worker.area}</p>
                    </td>
                    {/* Stats */}
                    <td className="px-4 py-3 text-center text-sm font-semibold text-slate-700">{summary.total}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-emerald-600">{summary.cargados}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {summary.pendientes > 0
                        ? <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">{summary.pendientes}</span>
                        : <span className="text-sm font-semibold text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      {summary.vencidos > 0
                        ? <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 ring-1 ring-red-200">{summary.vencidos}</span>
                        : <span className="text-sm font-semibold text-slate-300">—</span>
                      }
                    </td>
                    {/* Progress */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${summary.pct >= 80 ? "bg-emerald-500" : summary.pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${summary.pct}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold ${summary.pct >= 80 ? "text-emerald-600" : summary.pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {summary.pct}%
                        </span>
                      </div>
                    </td>
                    {/* Expand toggle */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelect(worker.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {isSelected ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {isSelected ? "Cerrar" : "Ver docs"}
                      </button>
                    </td>
                  </tr>

                  {/* ── Worker detail panel ── */}
                  {isSelected && (
                    <tr key={`${worker.id}-detail`}>
                      <td colSpan={9} className="border-t border-slate-100 bg-slate-50 px-6 py-5">
                        {/* Detail header */}
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                              Detalle documental — {worker.nombre} {worker.apellido}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-2">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${summary.pct >= 80 ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : summary.pct >= 50 ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-red-50 text-red-700 ring-red-200"}`}>
                                Cumplimiento: {summary.pct}%
                              </span>
                              {summary.vencidos > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-700 ring-1 ring-red-200">
                                  <XCircle className="h-3 w-3" /> {summary.vencidos} vencido{summary.vencidos !== 1 ? "s" : ""}
                                </span>
                              )}
                              {summary.rechazados > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200">
                                  <XCircle className="h-3 w-3" /> {summary.rechazados} rechazado{summary.rechazados !== 1 ? "s" : ""}
                                </span>
                              )}
                              {summary.pendientes > 0 && (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                                  {summary.pendientes} pendiente{summary.pendientes !== 1 ? "s" : ""}
                                </span>
                              )}
                              {summary.enRevision > 0 && (
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 ring-1 ring-blue-200">
                                  {summary.enRevision} en revisión
                                </span>
                              )}
                              {summary.cargados === summary.total && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                                  <CheckCircle2 className="h-3 w-3" /> Completo
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Ver ficha trabajador */}
                          <Link
                            href="/dicaprev/trabajadores"
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                            Ver ficha trabajador
                          </Link>
                        </div>

                        {/* Full doc list — priority: vencido, rechazado, pendiente, en_revision, completo, no_aplica */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {[...docs]
                            .sort((a, b) => {
                              const order: Record<string, number> = { vencido: 0, rechazado: 1, pendiente: 2, en_revision: 3, validado: 4, enviado_firma: 5, firmado: 6, completo: 7, no_aplica: 8 };
                              return (order[a.estado] ?? 9) - (order[b.estado] ?? 9);
                            })
                            .map((doc) => {
                              const catCfg    = CATEGORIA_CONFIG[doc.tipo.categoria];
                              const estCfg    = ESTADO_DOC_CONFIG[doc.estado];
                              const needsAction = doc.estado === "vencido" || doc.estado === "pendiente" || doc.estado === "rechazado";
                              const cardBg =
                                doc.estado === "vencido"     ? "border-red-200 bg-red-50"
                                : doc.estado === "rechazado" ? "border-rose-200 bg-rose-50"
                                : doc.estado === "pendiente" ? "border-amber-200 bg-amber-50"
                                : doc.estado === "en_revision" ? "border-blue-200 bg-blue-50"
                                : doc.estado === "validado" ? "border-indigo-200 bg-indigo-50"
                                : doc.estado === "enviado_firma" ? "border-teal-200 bg-teal-50"
                                : doc.estado === "firmado" ? "border-emerald-200 bg-emerald-50"
                                : "border-slate-200 bg-white";
                              const nameColor =
                                doc.estado === "vencido" || doc.estado === "rechazado" ? "text-red-900"
                                : doc.estado === "pendiente" ? "text-amber-900"
                                : doc.estado === "en_revision" ? "text-blue-900"
                                : doc.estado === "validado" ? "text-indigo-900"
                                : doc.estado === "enviado_firma" ? "text-teal-900"
                                : doc.estado === "firmado" ? "text-emerald-900"
                                : "text-slate-900";
                              return (
                                <div key={doc.tipo.id} className={`flex flex-col gap-1.5 rounded-xl border px-3.5 py-3 ${cardBg}`}>
                                  {/* Row 1: categoria + nombre + estado badge */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2 min-w-0">
                                      <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${catCfg.bg} ${catCfg.text} ${catCfg.ring}`}>
                                        {doc.tipo.categoria}
                                      </span>
                                      <p className={`text-xs font-semibold leading-tight ${nameColor}`}>
                                        {normalizarNombreDocumentoDisplay(doc.tipo.nombre)}
                                        {doc.tipo.esCritico && <span className="ml-1 text-[10px] font-bold text-red-600">●</span>}
                                      </p>
                                    </div>
                                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${estCfg.bg} ${estCfg.text} ${estCfg.ring}`}>
                                      <span className={`h-1.5 w-1.5 rounded-full ${estCfg.dot}`} />
                                      {estCfg.label}
                                    </span>
                                  </div>

                                  {/* Row 2: cargadoPor + fechaCarga */}
                                  {(doc.cargadoPor || doc.fechaCarga) && (
                                    <p className="text-[11px] text-slate-500">
                                      {doc.cargadoPor && `Por: ${doc.cargadoPor}`}
                                      {doc.cargadoPor && doc.fechaCarga && " · "}
                                      {doc.fechaCarga && `Cargado: ${formatDate(doc.fechaCarga)}`}
                                    </p>
                                  )}

                                  {/* Row 3: vencimiento */}
                                  {doc.fechaVencimiento && doc.diasParaVencer !== undefined && (
                                    <p className={`text-[11px] font-medium ${doc.diasParaVencer < 0 ? "text-red-600" : doc.diasParaVencer <= 30 ? "text-amber-600" : "text-slate-400"}`}>
                                      {doc.diasParaVencer < 0
                                        ? `Venció el ${formatDate(doc.fechaVencimiento)} (hace ${Math.abs(doc.diasParaVencer)} días)`
                                        : `Vence el ${formatDate(doc.fechaVencimiento)} · en ${doc.diasParaVencer} días`}
                                    </p>
                                  )}

                                  {/* Row 4: observación */}
                                  {doc.observacion && (
                                    <p className="rounded-lg bg-white/70 px-2.5 py-1.5 text-[11px] italic text-slate-600">
                                      &quot;{doc.observacion}&quot;
                                    </p>
                                  )}

                                  {/* Row 5: actions */}
                                  <div className="mt-0.5 flex flex-wrap gap-1.5">
                                    {/* Upload/reenviar — solo para docs no automatizables con IA */}
                                    {needsAction && !puedeGenerarseConIA(doc.tipo) && (
                                      <button
                                        onClick={() =>
                                          openUpload({
                                            documentoId:           doc.documentoId,
                                            workerId:              worker.id,
                                            tipoDocumentoId:       doc.tipo.id,
                                            mode:                  doc.estado === "rechazado" ? "reenviar" : "subir",
                                            rejectionObservation:  doc.estado === "rechazado" ? doc.observacion : undefined,
                                          })
                                        }
                                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold text-white transition ${
                                          doc.estado === "rechazado"
                                            ? "bg-rose-600 hover:bg-rose-700"
                                            : "bg-amber-600 hover:bg-amber-700"
                                        }`}
                                      >
                                        <UploadCloud className="h-2.5 w-2.5" />
                                        {doc.estado === "rechazado" ? "Reenviar" : "Subir"}
                                      </button>
                                    )}

                                    {/* Generar con IA — si contenido vacío o es solo placeholder */}
                                    {needsAction && puedeGenerarseConIA(doc.tipo) && (
                                      !doc.observacion?.trim() || esContenidoPlaceholder(doc.observacion)
                                    ) && (
                                      <button
                                        onClick={() => handleGenerarConIA(doc, worker)}
                                        disabled={generandoDocId === doc.tipo.id}
                                        className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {generandoDocId === doc.tipo.id ? (
                                          <>
                                            <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Generando...
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="h-2.5 w-2.5" />
                                            Generar con IA
                                          </>
                                        )}
                                      </button>
                                    )}

                                    {/* Revisar — IA con contenido REAL o en estados del flujo */}
                                    {puedeGenerarseConIA(doc.tipo) && (
                                      (!!doc.observacion?.trim() && !esContenidoPlaceholder(doc.observacion)) ||
                                      doc.estado === "en_revision" ||
                                      doc.estado === "validado" ||
                                      doc.estado === "enviado_firma" ||
                                      doc.estado === "firmado"
                                    ) && doc.estado !== "rechazado" && (
                                      <button
                                        onClick={() => openReview({ doc, worker })}
                                        className="inline-flex items-center gap-1 rounded-lg bg-violet-100 px-2.5 py-1 text-[10px] font-semibold text-violet-800 ring-1 ring-violet-200 transition hover:bg-violet-200"
                                      >
                                        <Sparkles className="h-2.5 w-2.5" />
                                        Revisar
                                      </button>
                                    )}

                                    {/* Rechazado — acción de corrección */}
                                    {doc.estado === "rechazado" && doc.documentoId && (
                                      <button
                                        onClick={() => openReview({ doc, worker })}
                                        className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-200"
                                      >
                                        <PenLine className="h-2.5 w-2.5" />
                                        Corregir
                                      </button>
                                    )}

                                    {/* Rechazado generable — regeneración IA */}
                                    {doc.estado === "rechazado" && doc.documentoId && puedeGenerarseConIA(doc.tipo) && (
                                      <button
                                        onClick={() => handleGenerarConIA(doc, worker)}
                                        disabled={generandoDocId === doc.tipo.id}
                                        className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {generandoDocId === doc.tipo.id ? (
                                          <>
                                            <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Regenerando...
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="h-2.5 w-2.5" />
                                            Regenerar con IA
                                          </>
                                        )}
                                      </button>
                                    )}

                                    {/* Validar — for en_revision docs with real DB record */}
                                    {doc.estado === "en_revision" && doc.documentoId && !puedeGenerarseConIA(doc.tipo) && (
                                      <button
                                        onClick={() => openActionModal(doc.documentoId!, normalizarNombreDocumentoDisplay(doc.tipo.nombre), "validar")}
                                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-indigo-700"
                                      >
                                        <CheckCircle2 className="h-2.5 w-2.5" />
                                        Validar
                                      </button>
                                    )}

                                    {/* Enviar a firma — for validado docs */}
                                    {doc.estado === "validado" && doc.documentoId && !puedeGenerarseConIA(doc.tipo) && (
                                      <button
                                        onClick={() => openActionModal(doc.documentoId!, normalizarNombreDocumentoDisplay(doc.tipo.nombre), "enviar_firma")}
                                        className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-teal-700"
                                      >
                                        <UploadCloud className="h-2.5 w-2.5" />
                                        Enviar firma
                                      </button>
                                    )}

                                    {/* Firmar — only for enviado_firma docs */}
                                    {doc.estado === "enviado_firma" && doc.documentoId && !puedeGenerarseConIA(doc.tipo) && (
                                      <button
                                        onClick={() => openActionModal(doc.documentoId!, normalizarNombreDocumentoDisplay(doc.tipo.nombre), "firmar")}
                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-emerald-700"
                                      >
                                        <CheckCheck className="h-2.5 w-2.5" />
                                        Firmar
                                      </button>
                                    )}

                                    {/* Badge firmado */}
                                    {doc.estado === "firmado" && (
                                      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                                        <CheckCircle2 className="h-2.5 w-2.5" />
                                        Firmado
                                      </span>
                                    )}

                                    {/* Rechazar — for en_revision docs with real DB record */}
                                    {doc.estado === "en_revision" && doc.documentoId && (
                                      <button
                                        onClick={() => openActionModal(doc.documentoId!, doc.tipo.nombre, "rechazar")}
                                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-red-700"
                                      >
                                        <XCircle className="h-2.5 w-2.5" />
                                        Rechazar
                                      </button>
                                    )}

                                    {/* Enviar a revisión — for completo docs (re-review) */}
                                    {doc.estado === "completo" && doc.documentoId && (
                                      <button
                                        onClick={() => openActionModal(doc.documentoId!, doc.tipo.nombre, "en_revision")}
                                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-blue-700"
                                      >
                                        <Clock className="h-2.5 w-2.5" />
                                        En revisión
                                      </button>
                                    )}

                                    {/* No aplica — for any doc with a real DB record except already no_aplica */}
                                    {doc.estado !== "no_aplica" && doc.documentoId && (
                                      <button
                                        onClick={() => openActionModal(doc.documentoId!, doc.tipo.nombre, "no_aplica")}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50"
                                      >
                                        <X className="h-2.5 w-2.5" />
                                        No aplica
                                      </button>
                                    )}

                                    {/* Ver historial — for any doc with a real DB record */}
                                    {doc.documentoId && (
                                      <button
                                        onClick={() => openHistorialModal(doc.documentoId!, doc.tipo.nombre)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-50"
                                      >
                                        <Clock className="h-2.5 w-2.5" />
                                        Historial
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      </>)}
      {mainView === "centro"       && <PorCentroView       rows={searchRows} />}
      {mainView === "cargo"        && <PorCargoView        rows={searchRows} />}
      {mainView === "vencimientos" && <PorVencimientosView rows={searchRows} />}
    </div>
  );
}
