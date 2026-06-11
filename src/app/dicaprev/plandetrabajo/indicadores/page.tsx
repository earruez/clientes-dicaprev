"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KpiCard, ProgressList } from "../components/plan-ui";
import { PlanNav } from "../components/plan-nav";
import { BarChart3 } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import {
  getPlanTrabajo,
  getActividadesPlan,
  type ActividadPlanRow,
} from "@/actions/plandetrabajo";

function calcCumplimiento(actividades: ActividadPlanRow[]): number {
  if (!actividades.length) return 0;
  const realizadas = actividades.filter((a) => a.estado === "realizada").length;
  return Math.round((realizadas / actividades.length) * 100);
}

function agruparCumplimiento(
  actividades: ActividadPlanRow[],
  key: keyof Pick<ActividadPlanRow, "normativa" | "categoria" | "centroContratista" | "responsable">
): Array<{ nombre: string; valor: number }> {
  const grupos: Record<string, { total: number; realizadas: number }> = {};
  for (const a of actividades) {
    const k = a[key];
    if (!grupos[k]) grupos[k] = { total: 0, realizadas: 0 };
    grupos[k].total += 1;
    if (a.estado === "realizada") grupos[k].realizadas += 1;
  }
  return Object.entries(grupos).map(([nombre, { total, realizadas }]) => ({
    nombre,
    valor: total ? Math.round((realizadas / total) * 100) : 0,
  }));
}

export default function IndicadoresPlanPage() {
  const [actividades, setActividades] = useState<ActividadPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const plan = await getPlanTrabajo();
      const acts = await getActividadesPlan(plan.id);
      setActividades(acts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar indicadores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const indicadoresNormativa = useMemo(() => agruparCumplimiento(actividades, "normativa"), [actividades]);
  const indicadoresTipo = useMemo(() => agruparCumplimiento(actividades, "categoria"), [actividades]);
  const indicadoresCentro = useMemo(() => agruparCumplimiento(actividades, "centroContratista"), [actividades]);
  const indicadoresResponsable = useMemo(() => agruparCumplimiento(actividades, "responsable"), [actividades]);

  const promedioNormativo = indicadoresNormativa.length
    ? Math.round(indicadoresNormativa.reduce((acc, i) => acc + i.valor, 0) / indicadoresNormativa.length)
    : 0;
  const promedioTipo = indicadoresTipo.length
    ? Math.round(indicadoresTipo.reduce((acc, i) => acc + i.valor, 0) / indicadoresTipo.length)
    : 0;

  return (
    <div className="p-6 space-y-5">
      <StandardPageHeader
        moduleLabel="Planificación"
        title="Indicadores"
        description="Cumplimiento por normativa, tipo de actividad, centro y responsable."
        icon={BarChart3}
      />

      <PlanNav />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-slate-500">Cargando indicadores...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Promedio normativo" value={`${promedioNormativo}%`} />
            <KpiCard label="Promedio por tipo" value={`${promedioTipo}%`} />
            <KpiCard
              label="Centros sobre 70%"
              value={indicadoresCentro.filter((i) => i.valor >= 70).length}
            />
            <KpiCard
              label="Responsables bajo 60%"
              value={indicadoresResponsable.filter((i) => i.valor < 60).length}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ProgressList title="Cumplimiento por normativa" items={indicadoresNormativa} />
            <ProgressList title="Cumplimiento por tipo de actividad" items={indicadoresTipo} />
            <ProgressList title="Cumplimiento por centro" items={indicadoresCentro} />
            <ProgressList title="Cumplimiento por responsable" items={indicadoresResponsable} />
          </div>
        </>
      )}
    </div>
  );
}
