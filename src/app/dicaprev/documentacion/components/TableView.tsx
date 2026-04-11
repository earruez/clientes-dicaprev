"use client";

import { Documento } from "../types";
import StatusBadge from "./StatusBadge";

type TableViewProps = {
  documentos: Documento[];
};

export default function TableView({ documentos }: TableViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Documento
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide hidden md:table-cell">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Vencimiento
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Responsable
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide hidden lg:table-cell">
                Obra
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {documentos.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                  {doc.nombre}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 capitalize hidden md:table-cell">
                  {doc.tipo}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={doc.status} />
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {new Date(doc.fechaVencimiento).toLocaleDateString("es-ES")}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {doc.responsable}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 hidden lg:table-cell">
                  {doc.obra || "-"}
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