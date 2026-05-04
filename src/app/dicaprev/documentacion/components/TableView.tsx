"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, FileEdit, FileUp, History, MinusCircle } from "lucide-react";
import { DocumentoEmpresa } from "../types";
import StatusBadge from "./StatusBadge";

type TableViewProps = {
  documentos: DocumentoEmpresa[];
  onView: (doc: DocumentoEmpresa) => void;
  onDownload: (doc: DocumentoEmpresa) => void;
  onReplace: (doc: DocumentoEmpresa) => void;
  onHistory: (doc: DocumentoEmpresa) => void;
  onEdit: (doc: DocumentoEmpresa) => void;
  onNoAplica: (doc: DocumentoEmpresa) => void;
};

function categoryLabel(value: DocumentoEmpresa["categoria"]) {
  const map = {
    legales_empresa: "Legales empresa",
    laborales_previsionales: "Laborales y previsionales",
    sst: "Seguridad y salud",
    mutualidad_ley_16744: "Mutualidad / Ley 16.744",
    protocolos: "Protocolos",
  } as const;
  return map[value];
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatVigencia(doc: DocumentoEmpresa) {
  if (!doc.tieneVencimiento || !doc.fechaVencimiento) return "Sin vencimiento";
  return new Date(doc.fechaVencimiento).toLocaleDateString("es-CL");
}

export default function TableView({
  documentos,
  onView,
  onDownload,
  onReplace,
  onHistory,
  onEdit,
  onNoAplica,
}: TableViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[1520px] w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Documento
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Categoría
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Vigencia / vencimiento
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Versión
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Subido por
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Fecha y hora de subida
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
                  <p className="text-xs text-slate-500">{doc.tipo}</p>
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
                  {formatVigencia(doc)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {doc.version}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  <p>{doc.subidoPor}</p>
                  <p className="text-xs text-slate-500">{doc.subidoPorEmail}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatDateTime(doc.fechaSubida)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatDateTime(doc.fechaActualizacion)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Button variant="outline" size="sm" onClick={() => onView(doc)}>
                      <Eye className="mr-1 h-3.5 w-3.5" />Ver
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onDownload(doc)} disabled={!doc.archivoUrl}>
                      <Download className="mr-1 h-3.5 w-3.5" />Descargar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onReplace(doc)}>
                      <FileUp className="mr-1 h-3.5 w-3.5" />Reemplazar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onHistory(doc)}>
                      <History className="mr-1 h-3.5 w-3.5" />Historial
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onEdit(doc)}>
                      <FileEdit className="mr-1 h-3.5 w-3.5" />Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onNoAplica(doc)}>
                      <MinusCircle className="mr-1 h-3.5 w-3.5" />No aplica
                    </Button>
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