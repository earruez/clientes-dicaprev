"use client";

import React from "react";
import { Search, Plus } from "lucide-react";
import type { TrabajadorFiltros } from "../types";

interface Props {
  filtros: TrabajadorFiltros;
  setFiltros: (f: TrabajadorFiltros) => void;
  total: number;
  filtrados: number;
  onCrear: () => void;
}

export default function Filtros({
  filtros,
  setFiltros,
  total,
  filtrados,
  onCrear,
}: Props) {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col gap-4">

      {/* FILA SUPERIOR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

        {/* Buscador */}
        <div className="flex items-center w-full md:max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Buscar trabajador..."
            value={filtros.texto || ""}
            onChange={(e) =>
              setFiltros({ ...filtros, texto: e.target.value })
            }
            className="w-full pl-10 pr-4 py-2 border rounded-xl shadow-sm text-sm"
          />
        </div>

        {/* Botón Nuevo */}
        <button
          onClick={onCrear}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl shadow hover:bg-emerald-700"
        >
          <Plus size={16} /> Nuevo trabajador
        </button>
      </div>

      {/* RESUMEN */}
      <div className="text-xs text-slate-500">
        Mostrando <span className="font-semibold">{filtrados}</span> de{" "}
        <span className="font-semibold">{total}</span> trabajadores
      </div>
    </div>
  );
}
