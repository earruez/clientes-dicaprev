"use client";

import { Button } from "@/components/ui/button";
import { Download, Eye, File, FileEdit, FileImage, FileSpreadsheet, FileSignature, FileText, FileUp, History, MinusCircle, PlusCircle, Upload } from "lucide-react";
import { DocumentoMatrizRow } from "../types";
import StatusBadge from "./StatusBadge";
import { cn } from "@/lib/utils";

type TableViewProps = {
  documentos: DocumentoMatrizRow[];
  onView: (doc: DocumentoMatrizRow) => void;
  onDownload: (doc: DocumentoMatrizRow) => void;
  onReplace: (doc: DocumentoMatrizRow) => void;
  onHistory: (doc: DocumentoMatrizRow) => void;
  onEdit: (doc: DocumentoMatrizRow) => void;
  onValidar: (doc: DocumentoMatrizRow) => void;
  onEnviarAFirma: (doc: DocumentoMatrizRow) => void;
  onNoAplica: (doc: DocumentoMatrizRow) => void;
  onAplica: (doc: DocumentoMatrizRow) => void;
  onFirmar: (doc: DocumentoMatrizRow) => void;
  canManageDocumentacion: boolean;
};

function categoryLabel(value: DocumentoMatrizRow["categoria"]) {
  const map = {
    legales_empresa: "Legales empresa",
    laborales_previsionales: "Laborales y previsionales",
    sst: "Seguridad y salud",
    mutualidad_ley_16744: "Mutualidad / Ley 16.744",
    protocolos: "Protocolos",
    plantillas_formatos: "Plantillas y formatos",
  } as const;
  return map[value];
}

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatVigencia(doc: DocumentoMatrizRow) {
  return doc.vigencia;
}

function iconoArchivo(doc: DocumentoMatrizRow) {
  const nombre = (doc.archivoNombreOriginal ?? doc.archivoNombre ?? "").toLowerCase();
  const tipo = (doc.archivoTipo ?? "").toLowerCase();

  if (tipo === "application/pdf" || nombre.endsWith(".pdf")) {
    return <FileText className="h-4 w-4 text-rose-600" />;
  }
  if (tipo.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif)$/i.test(nombre)) {
    return <FileImage className="h-4 w-4 text-sky-600" />;
  }
  if (tipo.includes("spreadsheet") || /\.(xlsx|xls|csv)$/i.test(nombre)) {
    return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />;
  }
  if (tipo.includes("wordprocessingml") || /\.(docx|doc)$/i.test(nombre)) {
    return <FileText className="h-4 w-4 text-indigo-600" />;
  }
  return <File className="h-4 w-4 text-slate-500" />;
}

export default function TableView({
  documentos,
  onView,
  onDownload,
  onReplace,
  onHistory,
  onEdit,
  onValidar,
  onEnviarAFirma,
  onNoAplica,
  onAplica,
  onFirmar,
  canManageDocumentacion,
}: TableViewProps) {
  if (documentos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
        No hay documentos disponibles.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documentos.map((doc) => {
        const estadoNormalizado = (doc.estado ?? "").toLowerCase().replace(/\s+/g, "_");
        const enRevision = estadoNormalizado === "en_revision";
        const validado = estadoNormalizado === "validado";
        const enviadoFirma = estadoNormalizado === "enviado_a_firma" || estadoNormalizado === "enviado_firma";

        return (
          <div
            key={doc.id}
            className={cn(
              "rounded-2xl border bg-white shadow-sm transition-all",
              !doc.esAplicable ? "border-slate-100 opacity-70" : "border-slate-200 hover:border-slate-300",
            )}
          >
            {/* Main row */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
              {/* Icon */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                {iconoArchivo(doc)}
              </div>

              {/* Name + meta */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{doc.nombre}</p>
                  <StatusBadge status={doc.estado} />
                  {doc.firmado && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      <FileSignature className="h-3 w-3" />Firmado
                    </span>
                  )}
                  {doc.obligatorio && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      Obligatorio
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                  <span>{categoryLabel(doc.categoria)}</span>
                  {formatVigencia(doc) && formatVigencia(doc) !== "-" && (
                    <span>Vigencia: {formatVigencia(doc)}</span>
                  )}
                  {doc.archivoUrl ? (
                    <span className="flex items-center gap-1 truncate max-w-[260px]">
                      {doc.archivoNombreOriginal ?? doc.archivoNombre ?? "Archivo"}
                      {doc.version && <span className="rounded bg-slate-100 px-1 font-mono text-[10px] text-slate-600">v{doc.version}</span>}
                    </span>
                  ) : (
                    <span className="text-slate-400">Sin archivo cargado</span>
                  )}
                  {doc.subidoPor && <span>por {doc.subidoPor}</span>}
                  {doc.fechaActualizacion && (
                    <span>{formatDateTime(doc.fechaActualizacion)}</span>
                  )}
                  {!doc.esAplicable && doc.aplicaDesdeTrabajadores !== null && (
                    <span className="text-slate-400">Aplica desde {doc.aplicaDesdeTrabajadores} trabajadores</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onView(doc)}
                  disabled={!doc.archivoUrl}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onDownload(doc)}
                  disabled={!doc.archivoUrl}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {canManageDocumentacion ? (
                  !doc.archivoUrl ? (
                    <Button
                      size="sm"
                      className="h-7 bg-slate-900 px-2 text-xs text-white hover:bg-slate-800"
                      onClick={() => onReplace(doc)}
                    >
                      <Upload className="mr-1 h-3.5 w-3.5" />Subir
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onReplace(doc)}>
                      <FileUp className="mr-1 h-3.5 w-3.5" />Reemplazar
                    </Button>
                  )
                ) : null}
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onHistory(doc)}>
                  <History className="h-3.5 w-3.5" />
                </Button>
                {canManageDocumentacion && (
                  <>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onEdit(doc)}>
                      <FileEdit className="h-3.5 w-3.5" />
                    </Button>
                    {!doc.firmado && enRevision && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 border-indigo-200 px-2 text-xs text-indigo-700 hover:bg-indigo-50"
                        onClick={() => onValidar(doc)}
                      >
                        Validar
                      </Button>
                    )}
                    {!doc.firmado && validado && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 border-teal-200 px-2 text-xs text-teal-700 hover:bg-teal-50"
                        onClick={() => onEnviarAFirma(doc)}
                      >
                        Enviar a firma
                      </Button>
                    )}
                    {!doc.firmado && enviadoFirma && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 border-emerald-200 px-2 text-xs text-emerald-700 hover:bg-emerald-50"
                        onClick={() => onFirmar(doc)}
                      >
                        <FileSignature className="mr-1 h-3.5 w-3.5" />Firmar
                      </Button>
                    )}
                    {doc.estado === "No aplica" ? (
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onAplica(doc)}>
                        <PlusCircle className="mr-1 h-3.5 w-3.5" />Aplica
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onNoAplica(doc)}>
                        <MinusCircle className="mr-1 h-3.5 w-3.5" />No aplica
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}