"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Sparkles,
  CheckCircle2,
  Send,
  PenLine,
  Shield,
  Clock,
  User,
  Briefcase,
  FileText,
  AlertTriangle,
  History,
  Download,
} from "lucide-react";
import { type Worker } from "../types";
import { type DocTrabajadorView } from "./types";
import { puedeGenerarseConIA } from "@/lib/documentacion/ia-generacion-helper";
import { exportTrabajadorDocumentoPdf } from "./export-trabajador-documento-pdf";
import {
  guardarContenidoIADocumento,
  validarTrabajadorDocumento,
  enviarTrabajadorDocumentoAFirma,
  firmarTrabajadorDocumento,
  getHistorialDocumentoTrabajador,
  createTrabajadorDocumento,
  type HistorialEntryView,
} from "@/actions/trabajadores/documentos";
import { normalizarNombreDocumentoDisplay } from "@/lib/documentacion/plantillas-documento";

// ── Public types ──────────────────────────────────────────────────────────────

export interface DocumentoReviewContext {
  /** Null = modo "generar" (todavía no existe el documento en DB) */
  doc: DocTrabajadorView | null;
  worker: Worker;
  /** Pre-fill inicial del contenido en modo "generar" */
  contenidoGenerado?: string;
}

export interface DocumentoReviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context?: DocumentoReviewContext | null;
  onUpdated?: () => void | Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type Phase = "idle" | "saving" | "validating" | "enviando" | "firmando" | "done" | "error";

function estadoBadge(estado: string) {
  const cfg: Record<string, { label: string; color: string }> = {
    pendiente:     { label: "Pendiente",      color: "bg-amber-100 text-amber-800 border-amber-200" },
    vencido:       { label: "Vencido",        color: "bg-red-100 text-red-800 border-red-200" },
    rechazado:     { label: "Rechazado",      color: "bg-rose-100 text-rose-800 border-rose-200" },
    en_revision:   { label: "En revisión",    color: "bg-blue-100 text-blue-800 border-blue-200" },
    validado:      { label: "Validado",       color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
    enviado_firma: { label: "Enviado a firma", color: "bg-teal-100 text-teal-800 border-teal-200" },
    firmado:       { label: "Firmado",        color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    completo:      { label: "Completo",       color: "bg-green-100 text-green-800 border-green-200" },
    no_aplica:     { label: "No aplica",      color: "bg-slate-100 text-slate-600 border-slate-200" },
  };
  const e = cfg[estado] ?? { label: estado, color: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${e.color}`}>
      {e.label}
    </span>
  );
}

function accionLabel(accion: string): string {
  const map: Record<string, string> = {
    ESTADO_ACTUALIZADO:      "Estado actualizado",
    CONTENIDO_EDITADO:       "Documento editado",
    DOCUMENTO_VALIDADO:      "Documento validado",
    DOCUMENTO_ENVIADO_FIRMA: "Enviado a firma",
    DOCUMENTO_FIRMADO:       "Firmado",
    DOCUMENTO_CREADO:        "Documento creado",
    ARCHIVO_CARGADO:         "Archivo cargado",
  };
  return map[accion] ?? accion;
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm text-slate-800">{value}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DocumentoReviewDrawer({
  isOpen,
  onClose,
  context,
  onUpdated,
}: DocumentoReviewDrawerProps) {
  const router = useRouter();
  const [contenido, setContenido]   = useState("");
  const [historial, setHistorial]   = useState<HistorialEntryView[]>([]);
  const [phase, setPhase]           = useState<Phase>("idle");
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [localDoc, setLocalDoc]     = useState<DocTrabajadorView | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // ── Init when drawer opens ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !context) return;

    setPhase("idle");
    setErrorMsg(null);
    setShowHistorial(false);
    setExportingPdf(false);

    const d = context.doc;
    setLocalDoc(d);

    // Pre-fill content
    if (d?.observacion) {
      setContenido(d.observacion);
    } else if (context.contenidoGenerado) {
      setContenido(context.contenidoGenerado);
    } else {
      setContenido("");
    }

    // Load historial from DB if we have a real documentoId
    if (d?.documentoId) {
      getHistorialDocumentoTrabajador(d.documentoId)
        .then(setHistorial)
        .catch(() => setHistorial([]));
    } else {
      setHistorial([]);
    }
  }, [isOpen, context]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen || !context) return null;

  const { worker, doc: originalDoc } = context;
  const doc = localDoc;
  const tipoNombre = doc?.tipo.nombre ?? originalDoc?.tipo.nombre ?? "";
  const nombreDisplay = normalizarNombreDocumentoDisplay(tipoNombre);
  const origen = puedeGenerarseConIA(doc?.tipo ?? originalDoc?.tipo ?? {}) ? "IA" : "Manual";
  const isReadOnly = doc?.estado === "firmado";
  const efectoEstado = doc?.estado ?? "pendiente";
  const pdfEstadosPermitidos = new Set(["en_revision", "validado", "enviado_firma", "firmado"]);
  const puedeDescargarPdf = Boolean(contenido.trim()) && pdfEstadosPermitidos.has(efectoEstado);
  const puedeMostrarSinContenido = pdfEstadosPermitidos.has(efectoEstado) && !contenido.trim();

  async function handleDescargarPdf() {
    if (!puedeDescargarPdf || isLoading) return;

    const documentoParaPdf = doc ?? originalDoc;
    if (!documentoParaPdf) return;

    setExportingPdf(true);
    setErrorMsg(null);

    try {
      await exportTrabajadorDocumentoPdf({
        documento: documentoParaPdf,
        trabajador: worker,
        contenido,
        estado: efectoEstado,
        firmadoPor: doc?.firmadoPor ?? originalDoc?.firmadoPor ?? null,
        firmadoEn: doc?.firmadoEn ?? originalDoc?.firmadoEn ?? null,
      });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "No fue posible exportar el PDF");
      setPhase("error");
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleGuardar() {
    if (phase !== "idle") return;
    setPhase("saving");
    setErrorMsg(null);
    try {
      const tipo = doc?.tipo ?? originalDoc?.tipo;
      if (doc?.documentoId) {
        // Update existing document content
        await guardarContenidoIADocumento(doc.documentoId, contenido);
      } else if (tipo) {
        // Create new documento with en_revision state
        const created = await createTrabajadorDocumento({
          trabajadorId: worker.id,
          tipoDocumentoId: tipo.id,
          estado: "en_revision",
          observaciones: contenido,
          cargadoPor: worker.email,
        });
        // Update local state so buttons reflect new estado
        setLocalDoc({
          documentoId: created.id,
          tipo: tipo,
          estado: "en_revision",
          observacion: contenido,
        });
        // Refresh historial
        const h = await getHistorialDocumentoTrabajador(created.id);
        setHistorial(h);
      }
      await onUpdated?.();
      router.refresh();
      setPhase("done");
      setTimeout(() => setPhase("idle"), 1500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al guardar");
      setPhase("error");
    }
  }

  async function handleValidar() {
    if (phase !== "idle" || !doc?.documentoId) return;
    setPhase("validating");
    setErrorMsg(null);
    try {
      await validarTrabajadorDocumento(doc.documentoId, "Documento validado técnicamente");
      const updated = { ...doc, estado: "validado" as const };
      setLocalDoc(updated);
      const h = await getHistorialDocumentoTrabajador(doc.documentoId);
      setHistorial(h);
      await onUpdated?.();
      router.refresh();
      setPhase("done");
      setTimeout(() => setPhase("idle"), 1500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al validar");
      setPhase("error");
    }
  }

  async function handleEnviarFirma() {
    if (phase !== "idle" || !doc?.documentoId) return;
    setPhase("enviando");
    setErrorMsg(null);
    try {
      await enviarTrabajadorDocumentoAFirma(doc.documentoId, "Documento enviado a firma");
      const updated = { ...doc, estado: "enviado_firma" as const };
      setLocalDoc(updated);
      const h = await getHistorialDocumentoTrabajador(doc.documentoId);
      setHistorial(h);
      await onUpdated?.();
      router.refresh();
      setPhase("done");
      setTimeout(() => setPhase("idle"), 1500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al enviar a firma");
      setPhase("error");
    }
  }

  async function handleFirmar() {
    if (phase !== "idle" || !doc?.documentoId) return;
    setPhase("firmando");
    setErrorMsg(null);
    try {
      const result = await firmarTrabajadorDocumento(doc.documentoId);
      const updated = { ...doc, estado: "firmado" as const, firmadoPor: result.firmadoPor, firmadoEn: result.firmadoEn.toISOString() };
      setLocalDoc(updated);
      const h = await getHistorialDocumentoTrabajador(doc.documentoId);
      setHistorial(h);
      await onUpdated?.();
      router.refresh();
      setPhase("done");
      setTimeout(() => setPhase("idle"), 1500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al firmar");
      setPhase("error");
    }
  }

  const isLoading = phase === "saving" || phase === "validating" || phase === "enviando" || phase === "firmando";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Revisar documento: ${nombreDisplay}`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl"
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100">
              <Sparkles className="h-4 w-4 text-violet-600" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{nombreDisplay}</h2>
              <p className="text-[11px] text-slate-500">Revisión y firma de documento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <MetaRow
              icon={<User className="h-3.5 w-3.5" />}
              label="Trabajador"
              value={`${worker.nombre} ${worker.apellido}`}
            />
            <MetaRow
              icon={<Briefcase className="h-3.5 w-3.5" />}
              label="Cargo"
              value={worker.cargo}
            />
            <MetaRow
              icon={<Briefcase className="h-3.5 w-3.5" />}
              label="Área"
              value={worker.area}
            />
            <MetaRow
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Documento"
              value={nombreDisplay}
            />
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-slate-400"><Clock className="h-3.5 w-3.5" /></span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Estado</p>
                <div className="mt-0.5">{estadoBadge(efectoEstado)}</div>
              </div>
            </div>
            {/* Origen */}
            <div className="col-span-2 flex items-center gap-2 border-t border-slate-100 pt-3">
              {origen === "IA" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                  <Sparkles className="h-2.5 w-2.5" />
                  Origen: IA
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                  <FileText className="h-2.5 w-2.5" />
                  Origen: Manual
                </span>
              )}
              {doc?.fechaCarga && (
                <span className="text-[11px] text-slate-400">
                  Creado: {doc.fechaCarga}
                </span>
              )}
            </div>
          </div>

          {/* Firmado — read-only banner */}
          {efectoEstado === "firmado" && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">
                Documento firmado — solo lectura
              </span>
            </div>
          )}

          {/* Error banner */}
          {phase === "error" && errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-800">{errorMsg}</p>
            </div>
          )}

          {/* Success banner */}
          {phase === "done" && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-emerald-800">Acción completada correctamente.</span>
            </div>
          )}

          {/* Content textarea */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Contenido del documento
            </label>
            <textarea
              value={contenido}
              onChange={(e) => !isReadOnly && setContenido(e.target.value)}
              readOnly={isReadOnly || isLoading}
              rows={18}
              className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-[12px] leading-relaxed text-slate-800 transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 ${
                isReadOnly
                  ? "cursor-not-allowed bg-slate-50 text-slate-500"
                  : "resize-y"
              } ${isLoading ? "opacity-60" : ""}`}
              placeholder="El contenido del documento aparecerá aquí. Puede editarlo antes de guardar o validar."
            />
            {!isReadOnly && (
              <p className="mt-1.5 text-[11px] text-slate-400">
                Puede editar el contenido generado antes de guardarlo o validarlo.
              </p>
            )}
          </div>

          {/* Historial */}
          {doc?.documentoId && (
            <div>
              <button
                onClick={() => setShowHistorial((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 transition hover:text-slate-800"
              >
                <History className="h-3.5 w-3.5" />
                {showHistorial ? "Ocultar historial" : `Ver historial (${historial.length})`}
              </button>
              {showHistorial && historial.length > 0 && (
                <ol className="mt-3 space-y-2">
                  {historial.map((h) => (
                    <li key={h.id} className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
                        <History className="h-2.5 w-2.5 text-slate-500" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-slate-700">{accionLabel(h.accion)}</p>
                        {h.detalle && <p className="text-[11px] text-slate-500">{h.detalle}</p>}
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {h.usuarioNombre ?? h.usuarioEmail ?? "Sistema"} ·{" "}
                          {new Date(h.createdAt).toLocaleString("es-CL")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {showHistorial && historial.length === 0 && (
                <p className="mt-2 text-[11px] text-slate-400">Sin historial registrado.</p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer: action buttons ─────────────────────────────────────────── */}
        <div className="border-t border-slate-100 px-6 py-4">
          {/* State-based buttons */}
          {(puedeDescargarPdf || puedeMostrarSinContenido || !isReadOnly) && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">

                {puedeDescargarPdf && (
                  <button
                    onClick={handleDescargarPdf}
                    disabled={exportingPdf || isLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {exportingPdf ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Descargar PDF
                  </button>
                )}

                {/* en_revision or initial create -> Guardar + Validar */}
                {(efectoEstado === "en_revision" || !doc?.documentoId) && (
                  <>
                    <button
                      onClick={handleGuardar}
                      disabled={isLoading || !contenido.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {phase === "saving"
                        ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        : <PenLine className="h-3.5 w-3.5" />
                      }
                      Guardar cambios
                    </button>
                    {doc?.documentoId && (
                      <button
                        onClick={handleValidar}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {phase === "validating"
                          ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          : <Shield className="h-3.5 w-3.5" />
                        }
                        Validar documento
                      </button>
                    )}
                  </>
                )}

                {/* validado → Enviar a firma */}
                {efectoEstado === "validado" && doc?.documentoId && (
                  <button
                    onClick={handleEnviarFirma}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {phase === "enviando"
                      ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      : <Send className="h-3.5 w-3.5" />
                    }
                    Enviar a firma
                  </button>
                )}

                {/* enviado_firma → Firmar */}
                {efectoEstado === "enviado_firma" && doc?.documentoId && (
                  <button
                    onClick={handleFirmar}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {phase === "firmando"
                      ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      : <CheckCircle2 className="h-3.5 w-3.5" />
                    }
                    Firmar documento
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" />
                Cerrar
              </button>
            </div>
          )}

          {puedeMostrarSinContenido && (
            <p className="mt-3 text-xs text-slate-500">No hay contenido para descargar</p>
          )}

          {/* Firmado — only close */}
          {isReadOnly && !puedeDescargarPdf && (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" />
                Cerrar
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
