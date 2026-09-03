"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  FileSignature,
  MapPin,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { type Worker, ESTADO_CONFIG, getInitials } from "./types";

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
  onGenerateInduccion: (id: string) => Promise<boolean>;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return (
      <span className="inline-flex flex-col gap-px opacity-25">
        <ChevronUp className="h-2.5 w-2.5" />
        <ChevronDown className="-mt-1 h-2.5 w-2.5" />
      </span>
    );
  }
  return dir === "asc" ? <ChevronUp className="h-3 w-3 text-emerald-600" /> : <ChevronDown className="h-3 w-3 text-emerald-600" />;
}

export function WorkersTable({
  workers,
  selectedIds,
  onSelectChange,
  onView,
  onEdit,
  onDelete,
  onGenerateInduccion,
}: WorkersTableProps) {
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: "apellido", dir: "asc" });
  const [page, setPage] = useState(1);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [induccionLoadingId, setInduccionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
    setMenuOpenId(null);
  }, [workers]);

  const handleGenerarInduccion = async (workerId: string) => {
    setInduccionLoadingId(workerId);
    setMenuOpenId(null);
    try {
      const creada = await onGenerateInduccion(workerId);
      alert(creada ? "Inducción generada y enviada al módulo de Inducciones." : "El trabajador ya tiene una inducción pendiente o en progreso.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo generar la inducción.");
    } finally {
      setInduccionLoadingId((current) => (current === workerId ? null : current));
    }
  };

  const sorted = [...workers].sort((a, b) => {
    const av = String(a[sort.field]);
    const bv = String(b[sort.field]);
    return sort.dir === "asc" ? av.localeCompare(bv, "es") : bv.localeCompare(av, "es");
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const allOnPage = paginated.length > 0 && paginated.every((w) => selectedIds.has(w.id));
  const someOnPage = paginated.some((w) => selectedIds.has(w.id)) && !allOnPage;

  const handleSort = (field: SortField) => {
    setSort((s) => s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" });
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
    if (!confirm(`¿Eliminar ${selectedIds.size} trabajador${selectedIds.size > 1 ? "es" : ""}?`)) return;
    selectedIds.forEach((id) => onDelete(id));
    onSelectChange(new Set());
  };

  const cols: { label: string; field?: SortField }[] = [
    { label: "Trabajador", field: "apellido" },
    { label: "Estado", field: "estado" },
    { label: "Centros", field: "centroTrabajo" },
    { label: "Rol", field: "area" },
    { label: "Pendientes" },
    { label: "DS44" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 bg-slate-900 px-5 py-2.5">
          <span className="text-sm font-semibold text-white">{selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}</span>
          <button onClick={handleBulkDelete} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/30">
            <Trash2 className="h-3.5 w-3.5" /> Eliminar seleccionados
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
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
              {cols.map(({ label, field }) => (
                <th key={label} className="px-3 py-2.5 text-left">
                  {field ? (
                    <button onClick={() => handleSort(field)} className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition hover:text-slate-700">
                      {label}<SortIcon active={sort.field === field} dir={sort.dir} />
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
                  )}
                </th>
              ))}
              <th className="py-2.5 pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <Users className="mx-auto mb-3 h-9 w-9 text-slate-200" />
                  <p className="text-sm font-medium text-slate-500">Sin trabajadores que coincidan</p>
                  <p className="mt-1 text-xs text-slate-400">Ajusta los filtros o agrega un nuevo trabajador.</p>
                </td>
              </tr>
            )}

            {paginated.map((w) => {
              const est = ESTADO_CONFIG[w.estado];
              const isSelected = selectedIds.has(w.id);
              const pendientesDocumentales = Math.max(0, w.documentosPendientes ?? 0);
              const pendientesCapacitacion = Math.max(0, w.capacitacionesPendientes ?? 0);
              const totalPendientes = pendientesDocumentales + pendientesCapacitacion;
              const hasPending = totalPendientes > 0;
              const critical = Boolean(w.cargoEsCritico) && totalPendientes > 2;

              return (
                <tr key={w.id} onClick={() => onView(w)} className={`group cursor-pointer transition-colors ${isSelected ? "bg-emerald-50/50" : "hover:bg-slate-50/60"}`}>
                  <td className="py-2.5 pl-5 pr-3" onClick={(e) => { e.stopPropagation(); toggleRow(w.id); }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleRow(w.id)} className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-emerald-600" />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{getInitials(w.nombre, w.apellido)}</div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold leading-tight text-slate-900">{w.nombre} {w.apellido}</p>
                        <p className="truncate text-[11px] leading-tight text-slate-500">{w.cargo}</p>
                        <p className="text-[11px] leading-tight text-slate-400">{w.rut}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${est.bg} ${est.text} ${est.ring}`}>{est.label}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"><MapPin className="h-3 w-3 text-slate-400" />1 centro</span>
                    <p className="mt-0.5 max-w-[120px] truncate text-[10px] text-slate-400">{w.centroTrabajo}</p>
                  </td>
                  <td className="px-3 py-2.5"><p className="text-[12px] font-medium text-slate-700">{w.area}</p></td>
                  <td className="px-3 py-2.5">
                    {hasPending ? (
                      <div className="flex flex-wrap gap-1">
                        {pendientesDocumentales > 0 && <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">{pendientesDocumentales} doc.</span>}
                        {pendientesCapacitacion > 0 && <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 ring-1 ring-orange-200">{pendientesCapacitacion} cap.</span>}
                      </div>
                    ) : <span className="text-[11px] text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {!w.cargoEsCritico ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">No aplica</span>
                    ) : critical ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200"><AlertTriangle className="h-3 w-3" />Crítico</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 ring-1 ring-emerald-200"><ShieldCheck className="h-3 w-3" />OK</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-5" onClick={(e) => e.stopPropagation()}>
                    <div className="relative flex items-center justify-end gap-0.5">
                      <button onClick={() => onView(w)} title="Ver detalle" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"><Eye className="h-3.5 w-3.5" /></button>
                      <button onClick={() => onEdit(w)} title="Editar" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setMenuOpenId((id) => id === w.id ? null : w.id)} title="Más acciones" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"><MoreHorizontal className="h-4 w-4" /></button>
                      {menuOpenId === w.id && (
                        <div className="absolute right-0 top-8 z-30 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                          <button disabled={induccionLoadingId === w.id} onClick={() => void handleGenerarInduccion(w.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                            <FileSignature className="h-3.5 w-3.5" />{induccionLoadingId === w.id ? "Generando..." : "Generar inducción"}
                          </button>
                          <button onClick={() => onDelete(w.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Eliminar</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
        <p className="text-xs text-slate-400">{sorted.length} trabajador{sorted.length !== 1 ? "es" : ""}</p>
        <div className="flex items-center gap-2">
          <button disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-xs font-medium text-slate-500">{currentPage} / {totalPages}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}
