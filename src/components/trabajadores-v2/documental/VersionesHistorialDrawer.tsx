"use client";

import { useState } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Sparkles,
  User,
  Archive,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Worker } from "../types";
import type { VersionDocumentoView } from "@/actions/trabajadores/documentos";
import { exportTrabajadorDocumentoPdf } from "./export-trabajador-documento-pdf";
import type { EmpresaDocumentoMeta } from "@/actions/trabajadores/documentos";
import { persistirDocumentoGenerado } from "@/lib/documentacion/registro-documento-generado-client";

interface VersionesHistorialDrawerProps {
  open: boolean;
  onClose: () => void;
  tipoNombre: string;
  trabajador: Worker;
  versiones: VersionDocumentoView[];
  empresaMeta: EmpresaDocumentoMeta | null;
}

const ACCION_LABELS: Record<string, string> = {
  DOCUMENTO_CREADO:           "Documento creado",
  DOCUMENTO_REEMPLAZADO:      "Reemplazado manualmente",
  DOCUMENTO_ARCHIVADO:        "Versión archivada",
  CONTENIDO_GENERADO_IA:      "Contenido generado con IA",
  CONTENIDO_EDITADO:          "Contenido editado",
  ESTADO_ACTUALIZADO:         "Estado actualizado",
  DOCUMENTO_VALIDADO:         "Documento validado",
  DOCUMENTO_ENVIADO_FIRMA:    "Enviado a firma",
  DOCUMENTO_FIRMADO:          "Documento firmado",
  DOCUMENTO_GENERADO_POR_REGLA: "Generado por regla documental",
};

const ORIGEN_BADGE: Record<string, { label: string; cls: string }> = {
  ia:      { label: "IA",      cls: "bg-violet-100 text-violet-700 ring-1 ring-violet-200" },
  manual:  { label: "Manual",  cls: "bg-amber-100 text-amber-700 ring-1 ring-amber-200" },
  sistema: { label: "Sistema", cls: "bg-slate-100 text-slate-600 ring-1 ring-slate-200" },
};

const ESTADO_VERSIONES: Record<string, { label: string; cls: string; dot: string }> = {
  pendiente:    { label: "Pendiente",     cls: "bg-amber-50 text-amber-700",   dot: "bg-amber-400" },
  en_revision:  { label: "En revisión",   cls: "bg-blue-50 text-blue-700",     dot: "bg-blue-400" },
  validado:     { label: "Validado",      cls: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
  enviado_firma:{ label: "Enviado firma", cls: "bg-teal-50 text-teal-700",     dot: "bg-teal-500" },
  firmado:      { label: "Firmado",       cls: "bg-emerald-50 text-emerald-700",dot: "bg-emerald-500" },
  rechazado:    { label: "Rechazado",     cls: "bg-rose-50 text-rose-700",     dot: "bg-rose-500" },
  vencido:      { label: "Vencido",       cls: "bg-red-50 text-red-700",       dot: "bg-red-500" },
  completo:     { label: "Completo",      cls: "bg-emerald-50 text-emerald-700",dot: "bg-emerald-500" },
  no_aplica:    { label: "No aplica",     cls: "bg-slate-100 text-slate-500",  dot: "bg-slate-300" },
};

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

export function VersionesHistorialDrawer({
  open,
  onClose,
  tipoNombre,
  trabajador,
  versiones,
  empresaMeta,
}: VersionesHistorialDrawerProps) {
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [descargandoId, setDescargandoId] = useState<string | null>(null);

  if (!open) return null;

  async function handleDescargarVersion(v: VersionDocumentoView) {
    setDescargandoId(v.id);
    try {
      const pdf = await exportTrabajadorDocumentoPdf({
        documento: {
          tipo: { id: v.id, nombre: tipoNombre, categoria: "SST", descripcion: "", requiereVencimiento: false, vencimientoMeses: null, esCritico: false },
          estado: v.estado as import("./types").DocEstado,
          documentoId: v.id,
          fechaCarga: v.fechaCarga,
          cargadoPor: v.cargadoPor ?? undefined,
          observacion: v.observacion ?? undefined,
          firmadoPor: v.firmadoPor ?? undefined,
          firmadoEn: v.firmadoEn ?? undefined,
        },
        trabajador,
        contenido: v.contenidoMarkdown ?? v.observacion ?? "",
        estado: v.estado as import("./types").DocEstado,
        firmadoPor: v.firmadoPor ?? undefined,
        firmadoEn: v.firmadoEn ?? undefined,
        empresa: empresaMeta,
      });

      if (empresaMeta?.id) {
        const filename = `version-${tipoNombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${trabajador.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
        await persistirDocumentoGenerado({
          empresaId: empresaMeta.id,
          modulo: "trabajadores",
          tipoDocumento: "documento_trabajador_pdf",
          entidadTipo: "trabajador_documento_version",
          entidadId: v.id,
          nombre: `${tipoNombre} - ${trabajador.nombre} ${trabajador.apellido}`,
          blob: pdf,
          filename,
          metadata: {
            trabajadorId: trabajador.id,
            versionId: v.id,
            estado: v.estado,
            firmadoPor: v.firmadoPor ?? null,
            firmadoEn: v.firmadoEn ?? null,
          },
        });
      }
    } catch (e) {
      console.error("Error descargando PDF versión:", e);
    } finally {
      setDescargandoId(null);
    }
  }

  const totalVersiones = versiones.length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-violet-700 to-violet-600 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Archive className="h-5 w-5 text-white/80 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-200">
                Historial de versiones
              </p>
              <h2 className="truncate text-[15px] font-bold text-white">
                {tipoNombre}
              </h2>
              <p className="text-[11px] text-violet-200">
                {trabajador.nombre} {trabajador.apellido} · {totalVersiones} versión{totalVersiones !== 1 ? "es" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {versiones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <FileText className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm font-medium">Sin versiones registradas</p>
            </div>
          ) : (
            versiones.map((v) => {
              const origenCfg = ORIGEN_BADGE[v.origen] ?? ORIGEN_BADGE.manual;
              const estadoCfg = ESTADO_VERSIONES[v.estado] ?? ESTADO_VERSIONES.pendiente;
              const isExpanded = expandedVersionId === v.id;
              const hasContent = Boolean(v.observacion && v.observacion.trim().length > 0);
              const hasFile = Boolean(v.archivoUrl || v.archivoNombreOriginal);

              return (
                <div
                  key={v.id}
                  className={`rounded-2xl border overflow-hidden transition ${
                    v.esVigente
                      ? "border-violet-200 bg-violet-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {/* Version header */}
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-[11px] ${
                          v.esVigente ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-600"
                        }`}>
                          v{v.versionNumero}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[12px] font-bold ${v.esVigente ? "text-violet-900" : "text-slate-800"}`}>
                            Versión {v.versionNumero}
                            {v.esVigente && (
                              <span className="ml-1.5 rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                Vigente
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {formatDateShort(v.fechaCarga)}
                            {v.cargadoPor && ` · ${v.cargadoPor}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* origen */}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${origenCfg.cls}`}>
                          {origenCfg.label}
                        </span>
                        {/* estado */}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${estadoCfg.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${estadoCfg.dot}`} />
                          {estadoCfg.label}
                        </span>
                      </div>
                    </div>

                    {/* Motivo reemplazo */}
                    {v.motivoReemplazo && (
                      <p className="mt-1.5 text-[11px] text-slate-500 italic">
                        {v.motivoReemplazo}
                      </p>
                    )}

                    {/* Firma snapshot */}
                    {v.firmadoPor && (
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Firmado por {v.firmadoPor}
                        {v.firmadoEn && ` el ${formatDateShort(v.firmadoEn)}`}
                      </div>
                    )}

                    {/* Actions row */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {/* Descargar PDF si hay contenido */}
                      {(hasContent || hasFile) && (
                        <button
                          onClick={() => handleDescargarVersion(v)}
                          disabled={descargandoId === v.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          {descargandoId === v.id ? (
                            <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <Download className="h-2.5 w-2.5" />
                          )}
                          Descargar PDF
                        </button>
                      )}

                      {/* Ver archivo si hay URL */}
                      {v.archivoUrl && (
                        <a
                          href={v.archivoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <FileText className="h-2.5 w-2.5" />
                          Ver archivo
                        </a>
                      )}

                      {/* Toggle historial de eventos */}
                      {v.historial.length > 0 && (
                        <button
                          onClick={() => setExpandedVersionId(isExpanded ? null : v.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          <Clock className="h-2.5 w-2.5" />
                          Eventos ({v.historial.length})
                          {isExpanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Historial de eventos (expandible) */}
                  {isExpanded && v.historial.length > 0 && (
                    <div className="border-t border-slate-200 px-4 py-3 space-y-2 bg-slate-50">
                      {v.historial.map((e) => (
                        <div key={e.id} className="flex gap-2.5">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200">
                            {e.accion.includes("FIRMADO") ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            ) : e.accion.includes("IA") ? (
                              <Sparkles className="h-3 w-3 text-violet-600" />
                            ) : e.accion.includes("USUARIO") || e.accion.includes("CREADO") ? (
                              <User className="h-3 w-3 text-blue-600" />
                            ) : (
                              <Clock className="h-3 w-3 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold text-slate-800">
                              {ACCION_LABELS[e.accion] ?? e.accion}
                            </p>
                            {e.detalle && (
                              <p className="text-[10px] text-slate-500">{e.detalle}</p>
                            )}
                            <p className="text-[10px] text-slate-400">
                              {formatDateShort(e.createdAt)}
                              {e.usuarioNombre && ` · ${e.usuarioNombre}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
