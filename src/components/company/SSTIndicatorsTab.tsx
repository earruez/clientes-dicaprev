"use client";

import { TrendingUp, TrendingDown, Activity, AlertCircle, Clock, Users, Target } from "lucide-react";
import type { SSTIndicatorValues } from "./EditSSTIndicatorsModal";

interface SSTIndicator {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const SST_INDICATORS: SSTIndicator[] = [
  {
    id: "accidentabilidad",
    title: "Tasa de Accidentabilidad",
    value: "0.82",
    unit: "%",
    trend: "down",
    trendValue: "-0.15%",
    description: "Accidentes por 100 trabajadores",
    icon: <Activity className="h-5 w-5" />,
    color: "text-blue-600"
  },
  {
    id: "siniestralidad",
    title: "Tasa de Siniestralidad",
    value: "1.55",
    unit: "%",
    trend: "stable",
    trendValue: "0.00%",
    description: "Incidentes por 100 trabajadores",
    icon: <AlertCircle className="h-5 w-5" />,
    color: "text-orange-600"
  },
  {
    id: "cotizacion",
    title: "Cotización Adicional",
    value: "Sí",
    description: "Estado de cotización adicional",
    icon: <Target className="h-5 w-5" />,
    color: "text-emerald-600"
  },
  {
    id: "frecuencia",
    title: "Índice de Frecuencia",
    value: "2.4",
    unit: "acc./100trab",
    trend: "down",
    trendValue: "-0.3",
    description: "Accidentes con tiempo perdido",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "text-purple-600"
  },
  {
    id: "gravedad",
    title: "Índice de Gravedad",
    value: "45.2",
    unit: "días/acc.",
    trend: "up",
    trendValue: "+2.1",
    description: "Días perdidos por accidente",
    icon: <Clock className="h-5 w-5" />,
    color: "text-red-600"
  },
  {
    id: "dias-perdidos",
    title: "Días Perdidos",
    value: 124,
    unit: "días",
    trend: "down",
    trendValue: "-18",
    description: "Total días perdidos por accidentes",
    icon: <Clock className="h-5 w-5" />,
    color: "text-amber-600"
  },
  {
    id: "accidentes-tp",
    title: "Accidentes con TP",
    value: 8,
    unit: "accidentes",
    trend: "stable",
    trendValue: "0",
    description: "Accidentes con tiempo perdido",
    icon: <Users className="h-5 w-5" />,
    color: "text-slate-600"
  },
  {
    id: "accidentes-stp",
    title: "Accidentes sin TP",
    value: 12,
    unit: "accidentes",
    trend: "up",
    trendValue: "+3",
    description: "Accidentes sin tiempo perdido",
    icon: <Activity className="h-5 w-5" />,
    color: "text-slate-600"
  }
];

interface SSTIndicatorsTabProps {
  onEdit?: () => void;
  values?: SSTIndicatorValues[];
}

export function SSTIndicatorsTab({ onEdit, values }: SSTIndicatorsTabProps) {
  // Merge saved values over the static defaults
  const indicators = SST_INDICATORS.map((indicator) => {
    const override = values?.find((v) => v.id === indicator.id);
    return override
      ? {
          ...indicator,
          value: override.value,
          trend: override.trend,
          trendValue: override.trendValue,
        }
      : indicator;
  });

  // Resumen computed from live values
  const totalAccidentes =
    (Number(indicators.find((i) => i.id === "accidentes-tp")?.value) || 0) +
    (Number(indicators.find((i) => i.id === "accidentes-stp")?.value) || 0);
  const diasPerdidos = indicators.find((i) => i.id === "dias-perdidos")?.value ?? 0;
  const indiceFrecuencia = indicators.find((i) => i.id === "frecuencia")?.value ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Indicadores SST</h3>
          <p className="text-sm text-slate-600">Métricas de seguridad y salud en el trabajo</p>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Activity className="h-4 w-4" />
            Configurar Indicadores
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {indicators.map((indicator) => (
          <div
            key={indicator.id}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 ${indicator.color}`}>
                {indicator.icon}
              </div>
              {indicator.trend && (
                <div className={`flex items-center gap-1 text-xs font-semibold ${
                  indicator.trend === "up" ? "text-red-600" :
                  indicator.trend === "down" ? "text-emerald-600" : "text-slate-600"
                }`}>
                  {indicator.trend === "up" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : indicator.trend === "down" ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <div className="h-1 w-3 rounded-full bg-current" />
                  )}
                  {indicator.trendValue}
                </div>
              )}
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                {indicator.title}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-slate-900">
                  {indicator.value}
                  {indicator.unit && <span className="text-sm font-normal text-slate-500 ml-1">{indicator.unit}</span>}
                </p>
              </div>
              <p className="mt-3 text-sm text-slate-600">{indicator.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen del período */}
      <div className="rounded-2xl bg-slate-50 p-6">
        <h4 className="text-sm font-semibold text-slate-900 mb-4">Resumen del Período</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="text-center">
            <p className="text-2xl font-semibold text-slate-900">{totalAccidentes}</p>
            <p className="text-sm text-slate-600">Total Accidentes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-slate-900">{diasPerdidos}</p>
            <p className="text-sm text-slate-600">Días Perdidos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-slate-900">{indiceFrecuencia}</p>
            <p className="text-sm text-slate-600">Índice Frecuencia</p>
          </div>
        </div>
      </div>
    </div>
  );
}
