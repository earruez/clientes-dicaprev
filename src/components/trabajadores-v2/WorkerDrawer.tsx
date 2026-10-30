"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  Calendar,
  FileText,
  CheckCircle2,
  ExternalLink,
  UploadCloud,
  AlertCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  X,
} from "lucide-react";
import { type Worker, ESTADO_CONFIG, antiguedad, formatDate, getInitials } from "./types";
import { DocumentUploadDrawer, type DocumentUploadContext } from "./documental/DocumentUploadDrawer";
import { normalizarArchivoSeguroUrl, construirArchivoSeguroUrl } from "@/lib/documentacion/archivo-seguro";
import { validarTrabajadorDocumento, cambiarEstadoTrabajadorDocumento } from "@/actions/trabajadores/documentos";
import Link from "next/link";
import {
  ESTADO_DOC_CONFIG,
  getWorkerDocs,
  getWorkerDocSummary,
  type DocTrabajadorView,
} from "./documental/types";
import {
  getControlDocumentalTrabajadores,
  type ControlDocumentalTrabajadoresPayload,
} from "@/actions/trabajadores/documentos";

type TabId = "resumen" | "documentos";

interface WorkerDrawerProps {
  worker: Worker | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (w: Worker) => void;
  controlDocumental?: ControlDocumentalTrabajadoresPayload | null;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-slate-900">{value || "No informado"}</p>
      </div>
    </div>
  );
}

export function WorkerDrawer({ worker, isOpen, onClose, onEdit, controlDocumental = null }: WorkerDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("resumen");
  const [controlDocState, setControlDocState] = useState<ControlDocumentalTrabajadoresPayload | null>(controlDocumental);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadContext, setUploadContext] = useState<DocumentUploadContext | undefined>(undefined);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reviewDocument, setReviewDocument] = useState<DocTrabajadorView | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"validar" | "rechazar">("validar");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [documentError, setDocumentError] = useState("");
  const [documentSuccess, setDocumentSuccess] = useState("");
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);

  useEffect(() => {
    if (controlDocumental) setControlDocState(controlDocumental);
  }, [controlDocumental]);

  useEffect(() => {
    if (isOpen) setActiveTab("resumen");
  }, [isOpen, worker?.id]);

  async function recargarDocumentos() {
    const payload = await getControlDocumentalTrabajadores();
    setControlDocState(payload);
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!isOpen || !worker) return;
      setLoadingDocs(true);
      setDocumentError("");
      setDocumentSuccess("");
      try {
        const payload = await getControlDocumentalTrabajadores();
        if (mounted) setControlDocState(payload);
      } catch {
        if (mounted) setControlDocState(null);
      } finally {
        if (mounted) setLoadingDocs(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [isOpen, worker?.id]);

  function abrirRevision(doc: DocTrabajadorView, decision: "validar" | "rechazar") {
    setReviewDocument(doc);
    setReviewDecision(decision);
    setReviewComment("");
    setDocumentError("");
  }

  async function confirmarRevision() {
    if (!reviewDocument?.documentoId || reviewBusy) return;
    if (reviewDecision === "rechazar" && !reviewComment.trim()) {
      setDocumentError("Debes indicar el motivo del rechazo.");
      return;
    }
    setReviewBusy(true); setDocumentError(""); setDocumentSuccess("");
    try {
      if (reviewDecision === "validar") {
        await validarTrabajadorDocumento(reviewDocument.documentoId, reviewComment.trim() || undefined);
      } else {
        await cambiarEstadoTrabajadorDocumento(reviewDocument.documentoId, "rechazado", reviewComment.trim());
      }
      await recargarDocumentos();
      setDocumentSuccess(reviewDecision === "validar"
        ? "Documento validado correctamente."
        : "Documento rechazado. El motivo quedó registrado en el historial.");
      setReviewDocument(null);
    } catch (e) {
      setDocumentError(e instanceof Error ? e.message : "No fue posible revisar el documento.");
      await recargarDocumentos().catch(() => undefined);
    } finally {
      setReviewBusy(false);
    }
  }

  const workerDocs = useMemo(() => {
    if (!worker || !controlDocState) return [];
    return getWorkerDocs(worker, controlDocState.reglas, controlDocState.tipos, controlDocState.documentos);
  }, [worker, controlDocState]);

  const docSummary = useMemo(() => getWorkerDocSummary(workerDocs), [workerDocs]);
  const workerDocumentLink = worker
    ? `/dicaprev/trabajadores/control-documental?tab=pendientes&workerId=${encodeURIComponent(worker.id)}`
    : "/dicaprev/trabajadores/control-documental";

  if (!isOpen || !worker) return null;

  return (
    <>
      <div aria-hidden onClick={onClose} className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen && worker ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <div role="dialog" aria-label="Detalle del trabajador" aria-modal className={`fixed inset-y-0 right-0 z-50 flex h-[100dvh] max-h-[100dvh] min-h-0 w-full max-w-[500px] flex-col overflow-hidden bg-white shadow-2xl transition-transform duration-300 ease-out ${isOpen && worker ? "translate-x-0" : "translate-x-full"}`}>
        {worker && (() => {
          const est = ESTADO_CONFIG[worker.estado];
          return (
            <>
              <div className="shrink-0 border-b border-slate-200 px-5 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-base font-bold text-white">{getInitials(worker.nombre, worker.apellido)}</div>
                    <div>
                      <h2 className="text-base font-bold leading-tight text-slate-900">{worker.nombre} {worker.apellido}</h2>
                      <p className="text-xs text-slate-400">{worker.rut}</p>
                      <span className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${est.bg} ${est.text} ${est.ring}`}>{est.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(worker)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /> Editar</button>
                    <button onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
                  </div>
                </div>

                <div className="-mx-5 grid grid-cols-3 border-t border-slate-100">
                  <div className="flex flex-col items-center px-3 py-3 text-center"><p className="text-base font-bold text-slate-900">{antiguedad(worker.fechaIngreso)}</p><p className="text-[10px] text-slate-500">En la empresa</p></div>
                  <div className="flex flex-col items-center border-x border-slate-100 px-3 py-3 text-center"><p className={`text-base font-bold ${docSummary.vencidos > 0 ? "text-red-600" : docSummary.pendientes > 0 ? "text-amber-600" : "text-slate-900"}`}>{docSummary.pendientes + docSummary.vencidos + docSummary.rechazados}</p><p className="text-[10px] text-slate-500">Docs pend.</p></div>
                  <div className="flex flex-col items-center px-3 py-3 text-center"><p className="text-base font-bold text-slate-900">{docSummary.pct}%</p><p className="text-[10px] text-slate-500">Cumplimiento</p></div>
                </div>

                <div className="-mx-5 flex border-t border-slate-100">
                  {(["resumen", "documentos"] as TabId[]).map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`relative flex-1 px-4 py-2.5 text-xs font-semibold capitalize ${activeTab === tab ? "text-slate-900" : "text-slate-400 hover:text-slate-700"}`}>
                      {tab}
                      {activeTab === tab && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-900" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-5 pb-[calc(env(safe-area-inset-bottom)+24px)] [-webkit-overflow-scrolling:touch]">
                {activeTab === "resumen" && (
                  <div className="space-y-7">
                    <section>
                      <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Datos personales</h3>
                      <div className="space-y-3">
                        <InfoRow icon={<Mail className="h-4 w-4" />} label="Correo" value={worker.email} />
                        <InfoRow icon={<Phone className="h-4 w-4" />} label="Teléfono" value={worker.telefono} />
                        <InfoRow icon={<Calendar className="h-4 w-4" />} label="Fecha de nacimiento" value={formatDate(worker.fechaNacimiento)} />
                      </div>
                    </section>
                    <section>
                      <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Datos laborales</h3>
                      <div className="space-y-3">
                        <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Cargo" value={worker.cargo} />
                        <InfoRow icon={<Building2 className="h-4 w-4" />} label="Área" value={worker.area} />
                        <InfoRow icon={<MapPin className="h-4 w-4" />} label="Centro de trabajo" value={worker.centroTrabajo} />
                        <InfoRow icon={<Calendar className="h-4 w-4" />} label="Fecha de ingreso" value={formatDate(worker.fechaIngreso)} />
                      </div>
                    </section>
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                      Esta vista muestra únicamente información persistida en NextPrev. Las antiguas asignaciones y matrices de riesgo simuladas fueron retiradas.
                    </div>
                  </div>
                )}

                {activeTab === "documentos" && (
                  <div>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Control documental real</h3>
                      <Link href={workerDocumentLink} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">
                        Ver control completo <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                    {!loadingDocs && controlDocState && workerDocs.length > 0 && (
                      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                          <span>{docSummary.cargados} de {docSummary.total} documentos conformes</span>
                          <span>{docSummary.pct}%</span>
                        </div>
                        <div role="progressbar" aria-label="Cumplimiento documental validado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={docSummary.pct}
                          className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
                          <div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${docSummary.pct}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-blue-800">
                          {docSummary.entregados} entregados · {docSummary.enRevision} en revisión · {workerDocs.filter((d) => d.estado === "enviado_firma").length} pendientes de firma
                        </p>
                        <p className="mt-1 text-[11px] text-blue-700">El cumplimiento aumenta al quedar validado, completo o firmado; subir un archivo no lo aprueba automáticamente.</p>
                      </div>
                    )}
                    {documentError && <p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{documentError}</p>}
                    {documentSuccess && <p role="status" className="mb-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">{documentSuccess}</p>}
                    {loadingDocs ? (
                      <p className="py-10 text-center text-sm text-slate-400">Cargando documentos…</p>
                    ) : !controlDocState ? (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No fue posible cargar el control documental.</p>
                    ) : workerDocs.length === 0 ? (
                      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No hay documentos requeridos para este trabajador.</p>
                    ) : (
                      <div className="space-y-2">
                        {workerDocs.map((doc) => {
                          const cfg = ESTADO_DOC_CONFIG[doc.estado];
                          return (
                            <div key={`${doc.tipo.id}-${doc.documentoId ?? "req"}`} className="rounded-xl border border-slate-200 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900">{doc.tipo.nombre}</p>
                                  <p className="mt-0.5 text-xs text-slate-400">{doc.tipo.categoria}</p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text} ${cfg.ring}`}>{cfg.label}</span>
                              </div>
                              {doc.fechaVencimiento && <p className="mt-2 text-[11px] text-slate-500">Vence: {formatDate(doc.fechaVencimiento)}</p>}
                              {doc.observacion && doc.estado === "rechazado" && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{doc.observacion}</p>}
                              <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                                {(() => {
                                  const url = normalizarArchivoSeguroUrl(doc.archivoUrl) ||
                                    (doc.archivoNombre ? construirArchivoSeguroUrl(doc.archivoNombre) : null);
                                  return url ? <a href={url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                                    <ExternalLink className="h-3.5 w-3.5" /> Ver archivo
                                  </a> : doc.contenidoMarkdown?.trim() ? (
                                    <button type="button" onClick={() => setExpandedPreview(expandedPreview === doc.tipo.id ? null : doc.tipo.id)}
                                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700">
                                      <FileText className="mr-1 inline h-3.5 w-3.5" /> {expandedPreview === doc.tipo.id ? "Ocultar contenido" : "Ver contenido"}
                                    </button>
                                  ) : null;
                                })()}
                                {doc.estado !== "firmado" && (
                                  <button type="button" onClick={() => {
                                    setUploadContext({
                                      documentoId: doc.origen === "induccion" ? undefined : doc.documentoId,
                                      workerId: worker.id, tipoDocumentoId: doc.tipo.id,
                                      mode: doc.documentoId && doc.origen !== "induccion" ? "reenviar" : "subir",
                                      rejectionObservation: doc.estado === "rechazado" ? doc.observacion : undefined,
                                    });
                                    setDocumentError(""); setUploadOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                    <UploadCloud className="h-3.5 w-3.5" /> {doc.documentoId ? "Reemplazar" : "Adjuntar"}
                                  </button>
                                )}
                                {doc.estado === "en_revision" && doc.origen !== "induccion" && doc.documentoId &&
                                  Boolean(doc.archivoNombre || doc.archivoUrl) && (
                                  <>
                                    <button type="button" onClick={() => abrirRevision(doc, "validar")}
                                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Validar
                                    </button>
                                    <button type="button" onClick={() => abrirRevision(doc, "rechazar")}
                                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                                      <AlertCircle className="h-3.5 w-3.5" /> Rechazar
                                    </button>
                                  </>
                                )}
                              </div>
                              {expandedPreview === doc.tipo.id && doc.contenidoMarkdown && (
                                <div className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                                  {doc.contenidoMarkdown}
                                </div>
                              )}
                              {doc.estado === "en_revision" && !doc.archivoNombre && !doc.archivoUrl && !doc.contenidoMarkdown &&
                                <p className="mt-2 text-[11px] text-amber-700">No hay archivo visible asociado a este registro. Adjunta un documento para validarlo.</p>}}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>
      <DocumentUploadDrawer
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        context={uploadContext}
        workers={[worker]}
        tipos={controlDocState?.tipos ?? []}
        onSaved={async () => {
          await recargarDocumentos();
          setDocumentSuccess("Documento guardado. Revisa su estado en la ficha.");
        }}
      />
      {reviewDocument && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4">
          <div role="dialog" aria-modal="true" aria-label="Revisar documento del trabajador"
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">{reviewDecision === "validar" ? "Validar documento" : "Rechazar documento"}</h3>
            <p className="text-sm text-slate-600">{reviewDocument.tipo.nombre} · {worker.nombre} {worker.apellido}</p>
            <label className="block text-xs font-semibold text-slate-700">
              {reviewDecision === "rechazar" ? "Motivo de rechazo *" : "Comentario de validación (opcional)"}
              <textarea rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
                placeholder={reviewDecision === "rechazar" ? "Indica qué debe corregirse" : "Observación o comentario"}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm" />
            </label>
            {documentError && <p role="alert" className="text-xs text-rose-700">{documentError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" disabled={reviewBusy} onClick={() => { setReviewDocument(null); setDocumentError(""); }}
                className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancelar</button>
              <button type="button" disabled={reviewBusy || (reviewDecision === "rechazar" && !reviewComment.trim())}
                onClick={() => void confirmarRevision()} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {reviewBusy ? "Guardando..." : "Confirmar revisión"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
