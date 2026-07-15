"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { UserPlus, FileStack, FileSpreadsheet, GraduationCap, Users } from "lucide-react";
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
  applyFilters,
} from "@/components/trabajadores-v2/types";
import { useTrabajadores } from "./hooks/useTrabajadores";
import { getOpcionesTrabajador, type OpcionesTrabajador } from "@/actions/trabajadores";

export default function TrabajadoresPage() {
  const {
    trabajadores: workers,
    guardarTrabajador,
    eliminarTrabajador,
    generarInduccion,
  } = useTrabajadores();
  const [opciones, setOpciones] = useState<OpcionesTrabajador | undefined>(undefined);
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

  // Load real cargo/area/centro options for the form
  useEffect(() => {
    void getOpcionesTrabajador().then(setOpciones).catch(() => undefined);
  }, []);

  const handleSaveWorker = async (w: Worker) => {
    await guardarTrabajador(w);
  };

  const handleDelete = async (id: string) => {
    await eliminarTrabajador(id);
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleGenerarInduccion = async (id: string) => {
    return generarInduccion(id);
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

            <Link
              href="/dicaprev/trabajadores/importar"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
            >
              <FileSpreadsheet className="h-4 w-4 text-sky-700" />
              Carga masiva
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
            onGenerateInduccion={handleGenerarInduccion}
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
        opciones={opciones}
      />
    </main>
  );
}
