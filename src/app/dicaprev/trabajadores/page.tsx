"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { UserPlus, FileStack, GraduationCap, Users } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { KPIs, type KpiId } from "@/components/trabajadores-v2/KPIs";
import { WorkersFilters } from "@/components/trabajadores-v2/WorkersFilters";
import { WorkersTable } from "@/components/trabajadores-v2/WorkersTable";
import { WorkerDrawer } from "@/components/trabajadores-v2/WorkerDrawer";
import { WorkerForm } from "@/components/trabajadores-v2/WorkerForm";
import {
  type Worker,
  type FilterConfig,
  DEFAULT_FILTERS,
  MOCK_WORKERS,
  applyFilters,
} from "@/components/trabajadores-v2/types";
import {
  findOrCreateDotacion,
  incrementAsignados,
  decrementAsignados,
} from "@/lib/dotacion/dotacion-store";

export default function TrabajadoresPage() {
  const [workers, setWorkers]       = useState<Worker[]>(MOCK_WORKERS);
  const [filters, setFilters]       = useState<FilterConfig>(DEFAULT_FILTERS);
  const [activeKpiId, setActiveKpiId] = useState<KpiId | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [drawerWorker, setDrawerWorker] = useState<Worker | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editWorker, setEditWorker]  = useState<Worker | null>(null);

  const filtered = useMemo(() => applyFilters(workers, filters), [workers, filters]);

  const handleKpiClick = useCallback((id: KpiId) => {
    const KPI_FILTERS: Record<KpiId, Partial<FilterConfig>> = {
      total:      DEFAULT_FILTERS,
      activos:    { ...DEFAULT_FILTERS, estado: "Activo" },
      ds44:       { ...DEFAULT_FILTERS, soloDs44: true },
      pendientes: { ...DEFAULT_FILTERS, conPendientes: true },
      cap:        { ...DEFAULT_FILTERS, conPendientes: true },
    };
    if (activeKpiId === id) {
      setActiveKpiId(null);
      setFilters(DEFAULT_FILTERS);
    } else {
      setActiveKpiId(id);
      setFilters(KPI_FILTERS[id] as FilterConfig);
    }
  }, [activeKpiId]);

  const openViewDrawer = (w: Worker) => { setDrawerWorker(w); setIsDrawerOpen(true); };
  const closeDrawer    = () => { setIsDrawerOpen(false); setTimeout(() => setDrawerWorker(null), 300); };

  const openNewForm  = () => { setEditWorker(null); setIsFormOpen(true); };
  const openEditForm = (w: Worker) => { setEditWorker(w); setIsFormOpen(true); if (isDrawerOpen) closeDrawer(); };
  const closeForm    = () => setIsFormOpen(false);

  const handleSaveWorker = (w: Worker) => {
    setWorkers((prev) => {
      const existing = prev.find((p) => p.id === w.id);

      // Auto-link dotación: find or create a posicion for this centro + cargo
      const dotacion = findOrCreateDotacion({
        centroNombre: w.centroTrabajo,
        cargoNombre: w.cargo,
      });
      const updatedWorker: Worker = { ...w, dotacionId: dotacion.id };

      if (!existing) {
        // New worker — increment asignados
        incrementAsignados(dotacion.id);
      } else if (existing.dotacionId !== dotacion.id) {
        // Centro or cargo changed — decrement old, increment new
        if (existing.dotacionId) decrementAsignados(existing.dotacionId);
        incrementAsignados(dotacion.id);
      }

      return existing
        ? prev.map((p) => (p.id === w.id ? updatedWorker : p))
        : [updatedWorker, ...prev];
    });
  };

  const handleDelete = (id: string) => {
    setWorkers((prev) => prev.filter((w) => w.id !== id));
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <StandardPageHeader
          moduleLabel="Módulo Personas"
          title="Trabajadores"
          description={`Gestión del capital humano — ${workers.length} personas registradas`}
          icon={<Users className="h-6 w-6" />}
          iconWrapClassName="bg-sky-700"
          actions={
            <>
            <Link
              href="/dicaprev/capacitacion"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
            >
              <GraduationCap className="h-4 w-4 text-slate-500" />
              Capacitaciones
            </Link>

            <Link
              href="/dicaprev/trabajadores/control-documental"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
            >
              <FileStack className="h-4 w-4 text-slate-500" />
              Control Documental
            </Link>

            <button
              onClick={openNewForm}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 hover:shadow-md"
            >
              <UserPlus className="h-4 w-4" />
              Nuevo trabajador
            </button>
            </>
          }
        />

        <KPIs workers={workers} activeKpiId={activeKpiId} onKpiClick={handleKpiClick} />

        <div className="space-y-4">
          <WorkersFilters
            filters={filters}
            onChange={(f) => { setFilters(f); setActiveKpiId(null); }}
            totalCount={workers.length}
            filteredCount={filtered.length}
          />
          <WorkersTable
            workers={filtered}
            selectedIds={selectedIds}
            onSelectChange={setSelectedIds}
            onView={openViewDrawer}
            onEdit={openEditForm}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <WorkerDrawer
        worker={drawerWorker}
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        onEdit={openEditForm}
      />

      <WorkerForm
        worker={editWorker}
        isOpen={isFormOpen}
        onClose={closeForm}
        onSave={handleSaveWorker}
      />
    </main>
  );
}
