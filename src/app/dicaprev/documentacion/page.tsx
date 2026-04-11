"use client";

import { FileSearch } from "lucide-react";
import { useDocumentos } from "./hooks/useDocumentos";
import TableView from "./components/TableView";
import Filtros from "./components/Filtros";

export default function DocumentacionPage() {
  const { filtrados, filtros, setFiltros } = useDocumentos();

  const hasActiveFilters = filtros.status !== "todos" || filtros.search.trim() !== "";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documentación</h1>
          <p className="text-slate-600 mt-1">
            Documentos de la empresa — contratos, reglamentos y normativa interna.
          </p>
        </div>
        <div className="text-sm text-slate-500">
          {filtrados.length} documento{filtrados.length !== 1 ? "s" : ""}
        </div>
      </div>

      <Filtros filtros={filtros} onChangeFiltros={setFiltros} />

      {filtrados.length === 0 && hasActiveFilters ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-8 text-center">
          <FileSearch className="mx-auto h-12 w-12 text-slate-200 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No se encontraron documentos</h3>
          <p className="text-slate-600 mb-4">
            No hay documentos que coincidan con los filtros aplicados.
          </p>
          <div className="text-sm text-slate-500 space-y-1">
            {filtros.status !== "todos" && (
              <p>Estado filtrado: <span className="font-medium capitalize">{filtros.status}</span></p>
            )}
            {filtros.search.trim() && (
              <p>Búsqueda: <span className="font-medium">"{filtros.search}"</span></p>
            )}
          </div>
        </div>
      ) : (
        <TableView documentos={filtrados} />
      )}
    </div>
  );
}