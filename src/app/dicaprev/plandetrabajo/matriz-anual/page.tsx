"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { PlanNav } from "../components/plan-nav";
import { MonthlyMatrix } from "../components/plan-ui";
import {
  getPlanTrabajo,
  getActividadesPlan,
  MESES_SHORT,
  type ActividadPlanRow,
} from "@/actions/plandetrabajo";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

export default function MatrizAnualPage() {
  const [actividades, setActividades] = useState<ActividadPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const plan = await getPlanTrabajo();
      const acts = await getActividadesPlan(plan.id);
      setActividades(acts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar la matriz.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="p-6 space-y-5">
      <StandardPageHeader
        moduleLabel="Planificación"
        title="Matriz Anual"
        description="Excel inteligente del plan anual, con seguimiento mes a mes por actividad y norma."
        icon={CalendarDays}
      />

      <PlanNav />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-slate-500">Cargando matriz...</div>
      ) : (
        <MonthlyMatrix data={actividades} meses={MESES_SHORT} />
      )}
    </div>
  );
}
