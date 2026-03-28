// src/app/dicaprev/trabajadores/components/TableView.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

import type { Trabajador } from "../types";
import { Checkbox } from "@/components/ui/checkbox"; // si el alias @ no funciona, cambia a tu ruta relativa
import { cn } from "@/lib/utils";

type TableViewProps = {
  data: Trabajador[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function TableView({ data, onEdit, onDelete }: TableViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allSelected =
    data.length > 0 && selectedIds.length === data.map((t) => t.id).length;

  const someSelected =
    selectedIds.length > 0 && selectedIds.length < data.length;

  const total = useMemo(() => data.length, [data]);

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(data.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header meta (total, etc) – opcional */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3 text-xs text-slate-500">
        <span className="font-medium">
          Trabajadores{" "}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            {total} totales
          </span>
        </span>
      </div>

      {/* Tabla */}
      <div className="w-full overflow-x-auto">
        <table className="min-w-full border-t border-slate-100 text-sm">
          <thead className="bg-slate-50/80">
            <tr className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              <th className="w-10 px-4 py-3 text-left">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={(v: boolean) => handleToggleAll(v)}
                  aria-label="Seleccionar todos"
                />
              </th>
              <th className="px-4 py-3 text-left">Trabajador</th>
              <th className="px-4 py-3 text-left">Centro</th>
              <th className="px-4 py-3 text-left">Cargo / Puesto</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Riesgos</th>
              <th className="px-4 py-3 text-left">DS44</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {data.map((t) => {
              const isSelected = selectedIds.includes(t.id);

              return (
                <tr
                  key={t.id}
                  className={cn(
                    "border-t border-slate-100 bg-white transition-colors",
                    isSelected && "bg-slate-50"
                  )}
                >
                  {/* Checkbox fila */}
                  <td className="w-10 px-4 py-4 align-top">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(v: boolean) =>
                        handleToggleOne(t.id, v)
                      }
                      aria-label={`Seleccionar ${t.nombres} ${t.apellidos}`}
                    />
                  </td>

                  {/* Trabajador */}
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-slate-900">
                        {t.nombres} {t.apellidos}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {t.rut}
                      </span>
                    </div>
                  </td>

                  {/* Centro */}
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-slate-800">
                        {t.centroNombre}
                      </span>
                      {t.areaNombre && (
                        <span className="text-xs text-slate-500">
                          Área: {t.areaNombre}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Cargo / Puesto */}
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-slate-800">
                        {t.cargoNombre}
                      </span>
                      {t.puestoNombre && (
                        <span className="text-xs text-slate-500">
                          Puesto: {t.puestoNombre}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-4 align-top">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium shadow-sm",
                        t.estado === "vigente" &&
                          "border border-emerald-200 bg-emerald-50 text-emerald-700",
                        t.estado === "baja" &&
                          "border border-red-200 bg-red-50 text-red-700",
                        t.estado === "suspendido" &&
                          "border border-amber-200 bg-amber-50 text-amber-700"
                      )}
                    >
                      {t.estado}
                    </span>
                  </td>

                  {/* Riesgos */}
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      {t.riesgos.slice(0, 3).map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600"
                        >
                          {r}
                        </span>
                      ))}
                      {t.riesgos.length > 3 && (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">
                          +{t.riesgos.length - 3}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* DS44 */}
                  <td className="px-4 py-4 align-top">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium shadow-sm",
                        t.ds44Pendiente
                          ? "border border-amber-200 bg-amber-50 text-amber-700"
                          : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      )}
                    >
                      {t.ds44Pendiente ? "Pendiente" : "Ok"}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-center justify-end gap-2">
                      {/* VER → navega al detalle */}
                      <Link
                        href={`/dicaprev/trabajadores/${t.id}`}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Ver
                      </Link>

                      {/* Editar */}
                      <button
                        type="button"
                        onClick={() => onEdit(t.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                        aria-label="Editar trabajador"
                      >
                        ✏️
                      </button>

                      {/* Eliminar */}
                      <button
                        type="button"
                        onClick={() => onDelete(t.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50"
                        aria-label="Eliminar trabajador"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {data.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-10 text-center text-sm text-slate-500"
                >
                  No hay trabajadores cargados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
