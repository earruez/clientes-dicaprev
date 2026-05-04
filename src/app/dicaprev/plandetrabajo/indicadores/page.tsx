import { KpiCard, ProgressList } from "../components/plan-ui";
import { PlanNav } from "../components/plan-nav";
import { BarChart3 } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import {
  INDICADORES_CENTRO,
  INDICADORES_NORMATIVA,
  INDICADORES_RESPONSABLE,
  INDICADORES_TIPO,
} from "../mock-data";

export default function IndicadoresPlanPage() {
  const promedioNormativo = Math.round(
    INDICADORES_NORMATIVA.reduce((acc, i) => acc + i.valor, 0) /
      INDICADORES_NORMATIVA.length
  );
  const promedioTipo = Math.round(
    INDICADORES_TIPO.reduce((acc, i) => acc + i.valor, 0) /
      INDICADORES_TIPO.length
  );

  return (
    <div className="p-6 space-y-5">
      <StandardPageHeader
        moduleLabel="Planificación"
        title="Indicadores"
        description="Cumplimiento por normativa, tipo de actividad, centro y responsable."
        icon={BarChart3}
      />

      <PlanNav />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Promedio normativo" value={`${promedioNormativo}%`} />
        <KpiCard label="Promedio por tipo" value={`${promedioTipo}%`} />
        <KpiCard
          label="Centros sobre 70%"
          value={INDICADORES_CENTRO.filter((i) => i.valor >= 70).length}
        />
        <KpiCard
          label="Responsables bajo 60%"
          value={INDICADORES_RESPONSABLE.filter((i) => i.valor < 60).length}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ProgressList title="Cumplimiento por normativa" items={INDICADORES_NORMATIVA} />
        <ProgressList title="Cumplimiento por tipo de actividad" items={INDICADORES_TIPO} />
        <ProgressList title="Cumplimiento por centro" items={INDICADORES_CENTRO} />
        <ProgressList title="Cumplimiento por responsable" items={INDICADORES_RESPONSABLE} />
      </div>
    </div>
  );
}
