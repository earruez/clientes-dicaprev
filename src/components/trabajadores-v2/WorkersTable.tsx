"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  Users,
} from "lucide-react";
import { type Worker, ESTADO_CONFIG, getInitials } from "./types";
import {
  TIPOS_DOCUMENTO,
  REGLAS_DOCUMENTALES,
  MOCK_DOCUMENTOS,
  getWorkerDocs,
  getWorkerDocSummary,
} from "./documental/types";

const PAGE_SIZE = 12;

type SortField = "apellido" | "area" | "centroTrabajo" | "estado";
type SortDir = "asc" | "desc";

interface WorkersTableProps {
  workers: Worker[];
  selectedIds: Set<string>;
  onSelectChange: (ids: Set<string>) => void;
  onView: (w: Worker) => void;
  onEdit: (w: Worker) => void;
  onDelete: (id: string) => void;
}



function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active)
    return (
      <span className="inline-flex flex-col gap-px opacity-25">
        <ChevronUp className="h-2.5 w-2.5" />
        <ChevronDown className="-mt-1 h-2.5 w-2.5" />
      </span>
    );
  return dir === "asc" ? (
    <ChevronUp className="h-3 w-3 text-emerald-600" />
  ) : (
    <ChevronDown className="h-3 w-3 text-emerald-600" />
  );
}

export function WorkersTable({
  workers,
  selectedIds,
  onSelectChange,
  onView,
  onEdit,
  onDelete,
}: WorkersTableProps) {
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({
    field: "apellido",
    dir: "asc",
  });
  const [page, setPage] = useState(1);

  // Pre-compute documental stats per worker using the rule engine
  const docStatsMap = useMemo(() => {
    const map = new Map<string, { pendientes: number; vencidos: number; pct: number }>();
    workers.forEach((w) => {
      const docs = getWorkerDocs(w, REGLAS_DOCUMENTALES, TIPOS_DOCUMENTO, MOCK_DOCUMENTOS);
      const s = getWorkerDocSummary(docs);
      map.set(w.id, { pendientes: s.pendientes, vencidos: s.vencidos, pct: s.pct });
    });
    return map;
  }, [workers]);

  useEffect(() => {
    setPage(1);
  }, [workers]);

  const sorted = [...workers].sort((a, b) => {
    const av = String(a[sort.field]);
    const bv = String(b[sort.field]);
    return sort.dir === "asc" ? av.localeCompare(bv, "es") : bv.localeCompare(av, "es");
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allOnPage = paginated.length > 0 && paginated.every((w) => selectedIds.has(w.id));
  const someOnPage = paginated.some((w) => selectedIds.has(w.id)) && !allOnPage;

  const handleSort = (field: SortField) => {
    setSort((s) =>
      s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" }
    );
    setPage(1);
  };

  const toggleAll = () => {
    const next = new Set(selectedIds);
    if (allOnPage) paginated.forEach((w) => next.delete(w.id));
    else paginated.forEach((w) => next.add(w.id));
    onSelectChange(next);
  };

  const toggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectChange(next);
  };

  const handleBulkDelete = () => {
    if (!confirm(`¿Eliminar ${selectedIds.size} trabajador${selectedIds.size > 1 ? "es" : ""}?`))
      return;
    selectedIds.forEach((id) => onDelete(id));
    onSelectChange(new Set());
  };

  // Column definitions for sortable headers
  const COLS: { label: string; field?: SortField; cls?: string }[] = [
    { label: "Trabajador", field: "apellido" },
    { label: "Estado",     field: "estado" },
    { label: "Centros",    field: "centroTrabajo" },
    { label: "Rol",        field: "area" },
    { label: "Pendientes" },
    { label: "DS44" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      {/* Bulk bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 bg-slate-900 px-5 py-2.5">
          <span className="text-sm font-semibold text-white">
            {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <button
            onClick={handleBulkDelete}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar seleccionados
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* ── Head ── */}
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              <th className="w-10 py-2.5 pl-5 pr-3">
                <input
                  type="checkbox"
                  checked={allOnPage}
                  ref={(el) => { if (el) el.indeterminate = someOnPage; }}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-emerald-600"
                />
              </th>
              {COLS.map(({ label, field }) => (
                <th key={label} className="px-3 py-2.5 text-left">
                  {field ? (
                    <button
                      onClick={() => handleSort(field)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition hover:text-slate-700"
                    >
                      {label}
                      <SortIcon active={sort.field === field} dir={sort.dir} />
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {label}
                    </span>
                  )}
                </th>
              ))}
              <th className="py-2.5 pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Acciones
              </th>
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <Users className="mx-auto h-9 w-9 text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-500">Sin trabajadores que coincidan</p>
                  <p className="text-xs text-slate-400 mt-1">Ajusta los filtros o agrega un nuevo trabajador.</p>
                </td>
              </tr>
            )}

            {paginated.map((w) => {
              const est = ESTADO_CONFIG[w.estado];
              const isSelected = selectedIds.has(w.id);
              const docStats = docStatsMap.get(w.id) ?? { pendientes: 0, vencidos: 0, pct: 0 };
              const hasPending = docStats.pendientes > 0 || docStats.vencidos > 0 || w.capacitacionesPendientes > 0;
              const critical = (docStats.pendientes + docStats.vencidos) + w.capacitacionesPendientes > 2;

              return (
                <tr
                  key={w.id}
                  onClick={() => onView(w)}
                  className={`group cursor-pointer transition-colors ${
                    isSelected ? "bg-emerald-50/50" : "hover:bg-slate-50/60"
                  }`}
                >
                  {/* ── Checkbox ── */}
                  <td
                    className="py-2.5 pl-5 pr-3"
                    onClick={(e) => { e.stopPropagation(); toggleRow(w.id); }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(w.id)}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-emerald-600"
                    />
                  </td>

                  {/* ── Trabajador: avatar + nombre + cargo + RUT ── */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                        {getInitials(w.nombre, w.apellido)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold leading-tight text-slate-900">
                          {w.nombre} {w.apellido}
                        </p>
                        <p className="truncate text-[11px] leading-tight text-slate-500">{w.cargo}</p>
                        <p className="text-[11px] leading-tight text-slate-400">{w.rut}</p>
                      </div>
                    </div>
                  </td>

                  {/* ── Estado ── */}
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${est.bg} ${est.text} ${est.ring}`}
                    >
                      {est.label}
                    </span>
                  </td>

                  {/* ── Centros ── */}
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      1 centro
                    </span>
                    <p className="mt-0.5 truncate text-[10px] text-slate-400 max-w-[120px]">
                      {w.centroTrabajo}
                    </p>
                  </td>

                  {/* ── Rol (área) ── */}
                  <td className="px-3 py-2.5">
                    <p className="text-[12px] font-medium text-slate-700">{w.area}</p>
                  </td>

                  {/* ── Pendientes (rule-engine docs + caps) ── */}
                  <td className="px-3 py-2.5">
                    {hasPending ? (
                      <div className="flex flex-wrap gap-1">
                        {docStats.pendientes > 0 && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                            {docStats.pendientes}d
                          </span>
                        )}
                        {docStats.vencidos > 0 && (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-200">
                            {docStats.vencidos}v
                          </span>
                        )}
                        {w.capacitacionesPendientes > 0 && (
                          <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 ring-1 ring-orange-200">
                            {w.capacitacionesPendientes}c
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                  </td>

                  {/* ── DS44 ── */}
                  <td className="px-3 py-2.5">
                    {critical ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                        <AlertTriangle className="h-3 w-3" />
                        Crítico
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 ring-1 ring-emerald-200">
                        <ShieldCheck className="h-3 w-3" />
                        OK
                      </span>
                    )}
                  </td>

                  {/* ── Acciones ── */}
                  <td
                    className="py-2.5 pr-5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => onView(w)}
                        title="Ver detalle"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onEdit(w)}
                        title="Editar"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar a ${w.nombre} ${w.apellido}?`)) onDelete(w.id);
                        }}
                        title="Eliminar"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
          <p className="text-xs text-slate-400">
            Página <span className="font-semibold text-slate-700">{page}</span> de{" "}
            <span className="font-semibold text-slate-700">{totalPages}</span>
            <span className="ml-2 text-slate-400">· {workers.length} trabajadores</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-7 w-7 rounded-lg text-xs font-semibold transition ${
                  p === page ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
