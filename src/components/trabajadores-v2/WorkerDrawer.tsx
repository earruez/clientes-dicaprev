"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  Calendar,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  X,
} from "lucide-react";
import { type Worker, ESTADO_CONFIG, antiguedad, formatDate, getInitials } from "./types";
import {
  ESTADO_DOC_CONFIG,
  getWorkerDocs,
  getWorkerDocSummary,
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

  useEffect(() => {
    if (controlDocumental) setControlDocState(controlDocumental);
  }, [controlDocumental]);

  useEffect(() => {
    if (isOpen) setActiveTab("resumen");
  }, [isOpen, worker?.id]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!isOpen || !worker) return;
      setLoadingDocs(true);
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

  const workerDocs = useMemo(() => {
    if (!worker || !controlDocState) return [];
    return getWorkerDocs(worker, controlDocState.reglas, controlDocState.tipos, controlDocState.documentos);
  }, [worker, controlDocState]);

  const docSummary = useMemo(() => getWorkerDocSummary(workerDocs), [workerDocs]);

  return (
    <>
      <div aria-hidden onClick={onClose} className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen && worker ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <div role="dialog" aria-modal className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[500px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${isOpen && worker ? "translate-x-0" : "translate-x-full"}`}>
        {worker && (() => {
          const est = ESTADO_CONFIG[worker.estado];
          return (
            <>
              <div className="shrink-0 border-b border-slate-200 px-5 pt-5">
                <div className="flex items-start justify-between gap-4 pb-4">
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
                  <div className="flex flex-col items-center border-x border-slate-100 px-3 py-3 text-center"><p className={`text-base font-bold ${docSummary.vencidos > 0 ? "text-red-600" : docSummary.pendientes > 0 ? "text-amber-600" : "text-slate-900"}`}>{docSummary.pendientes + docSummary.vencidos}</p><p className="text-[10px] text-slate-500">Docs pend.</p></div>
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

              <div className="flex-1 overflow-y-auto px-5 py-5">
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
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Control documental real</h3>
                      <FileText className="h-4 w-4 text-slate-400" />
                    </div>
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
    </>
  );
}
