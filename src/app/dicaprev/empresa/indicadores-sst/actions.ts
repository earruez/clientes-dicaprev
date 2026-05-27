"use server";

import { requirePermission } from "@/server/auth/permissions";

export type IndicadorSSTId = "ta" | "ts" | "if" | "ig" | "dp" | "wc";

export type IndicadorSST = {
  id: IndicadorSSTId;
  label: string;
  value: string;
  ref: string;
  refMax: number | null;
  desc: string;
};

export type IndicadoresSSTData = {
  periodo: string;
  indicadores: IndicadorSST[];
  updatedAt: string | null;
  updatedBy: string | null;
};

export type GuardarIndicadoresSSTInput = {
  periodo: string;
  valores: Array<{
    id: IndicadorSSTId;
    value: string;
  }>;
};

const DEFAULT_INDICADORES: IndicadorSST[] = [
  {
    id: "ta",
    label: "Tasa de accidentabilidad",
    value: "0,82%",
    ref: "<= 1,5%",
    refMax: 1.5,
    desc: "Accidentes con tiempo perdido x 100 / dotacion promedio.",
  },
  {
    id: "ts",
    label: "Tasa de siniestralidad",
    value: "1,55%",
    ref: "<= 3,0%",
    refMax: 3,
    desc: "Dias perdidos x 100 / dias trabajados totales.",
  },
  {
    id: "if",
    label: "Indice de frecuencia",
    value: "4,8",
    ref: "<= 8,0",
    refMax: 8,
    desc: "N. de accidentes x 1.000.000 / horas hombre trabajadas.",
  },
  {
    id: "ig",
    label: "Indice de gravedad",
    value: "32",
    ref: "<= 60",
    refMax: 60,
    desc: "Dias perdidos x 1.000 / horas hombre trabajadas.",
  },
  {
    id: "dp",
    label: "Dias perdidos (acum.)",
    value: "12",
    ref: "-",
    refMax: null,
    desc: "Total de dias perdidos por accidentes en el periodo.",
  },
  {
    id: "wc",
    label: "Trabajadores sin accidentes",
    value: "46 / 48",
    ref: "-",
    refMax: null,
    desc: "Dotacion activa sin accidentes en el periodo.",
  },
];

function sanitizePeriodo(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Periodo no definido";
}

export async function getIndicadoresSST(): Promise<IndicadoresSSTData> {
  await requirePermission("canReadEmpresa");

  return {
    periodo: "Enero - Abril 2026",
    indicadores: DEFAULT_INDICADORES,
    updatedAt: null,
    updatedBy: null,
  };
}

export async function guardarIndicadoresSST(
  input: GuardarIndicadoresSSTInput,
): Promise<IndicadoresSSTData> {
  const { email } = await requirePermission("canManageEmpresa");

  const valueById = new Map(input.valores.map((item) => [item.id, item.value]));

  const indicadores = DEFAULT_INDICADORES.map((indicador) => ({
    ...indicador,
    value: (valueById.get(indicador.id) ?? indicador.value).trim() || indicador.value,
  }));

  return {
    periodo: sanitizePeriodo(input.periodo),
    indicadores,
    updatedAt: new Date().toISOString(),
    updatedBy: email,
  };
}
