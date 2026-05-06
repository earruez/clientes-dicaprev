"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, File, FileEdit, FileImage, FileSpreadsheet, FileText, FileUp, History, MinusCircle, PlusCircle, Upload } from "lucide-react";
import { DocumentoMatrizRow } from "../types";
import StatusBadge from "./StatusBadge";

type TableViewProps = {
  documentos: DocumentoMatrizRow[];
  onView: (doc: DocumentoMatrizRow) => void;
  onDownload: (doc: DocumentoMatrizRow) => void;
  onReplace: (doc: DocumentoMatrizRow) => void;
  onHistory: (doc: DocumentoMatrizRow) => void;
  onEdit: (doc: DocumentoMatrizRow) => void;
  onNoAplica: (doc: DocumentoMatrizRow) => void;
  onAplica: (doc: DocumentoMatrizRow) => void;
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
  onNoAplica,
  onAplica,
  canManageDocumentacion,
}: TableViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[1580px] w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Documento requerido
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Categoría
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Vencimiento
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Obligatorio
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Vigencia
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Último archivo
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Subido por
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Fecha subida
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Última actualización
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {documentos.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">{doc.nombre}</p>
                  <p className="text-xs text-slate-500">{doc.descripcion}</p>
                  {(doc.nombre === "Formato base de entrega de EPP" ||
                    doc.nombre === "Formato / matriz de capacitaciones obligatorias") ? (
                    <p className="mt-1 text-[11px] font-medium text-amber-700">
                      El registro individual se gestiona por trabajador.
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                    {categoryLabel(doc.categoria)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={doc.estado} />
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {doc.obligatorio ? "Sí" : "No"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatVigencia(doc)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {doc.archivoUrl ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {iconoArchivo(doc)}
                        <span className="max-w-[260px] truncate" title={doc.archivoNombreOriginal ?? doc.archivoNombre ?? ""}>
                          {doc.archivoNombreOriginal ?? doc.archivoNombre ?? "Archivo"}
                        </span>
                      </div>
                      {doc.version ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-slate-300 bg-white text-slate-600">
                            v{doc.version}
                          </Badge>
                          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Actual</Badge>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-600">
                      Sin archivo
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  <p>{doc.subidoPor ?? "-"}</p>
                  <p className="text-xs text-slate-500">{doc.subidoPorEmail ?? "-"}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatDateTime(doc.fechaSubida)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatDateTime(doc.fechaActualizacion)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Button variant="outline" size="sm" onClick={() => onView(doc)} disabled={!doc.archivoUrl}>
                      <Eye className="mr-1 h-3.5 w-3.5" />Ver
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onDownload(doc)} disabled={!doc.archivoUrl}>
                      <Download className="mr-1 h-3.5 w-3.5" />Descargar
                    </Button>
                    {canManageDocumentacion ? (
                      !doc.archivoUrl ? (
                        <Button
                          size="sm"
                          onClick={() => onReplace(doc)}
                          className="bg-slate-900 text-white hover:bg-slate-800"
                        >
                          <Upload className="mr-1 h-3.5 w-3.5" />Subir archivo
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => onReplace(doc)}>
                          <FileUp className="mr-1 h-3.5 w-3.5" />Reemplazar
                        </Button>
                      )
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => onHistory(doc)}>
                      <History className="mr-1 h-3.5 w-3.5" />Historial
                    </Button>
                    {canManageDocumentacion ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => onEdit(doc)}>
                          <FileEdit className="mr-1 h-3.5 w-3.5" />Editar
                        </Button>
                        {doc.estado === "No aplica" ? (
                          <Button variant="outline" size="sm" onClick={() => onAplica(doc)}>
                            <PlusCircle className="mr-1 h-3.5 w-3.5" />Aplica
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => onNoAplica(doc)}>
                            <MinusCircle className="mr-1 h-3.5 w-3.5" />No aplica
                          </Button>
                        )}
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {documentos.length === 0 && (
        <div className="px-4 py-8 text-center text-slate-500">
          No hay documentos disponibles.
        </div>
      )}
    </div>
  );
}