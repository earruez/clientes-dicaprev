import type { Worker } from "../types";

export type CapacitacionCategoria =
  | "SST Base"
  | "DS44"
  | "Riesgo Crítico"
  | "Operacional"
  | "Administrativa";

export type CapacitacionEstado = "completada" | "pendiente" | "vencida" | "no_aplica";

export interface TipoCapacitacion {
  id: string;
  nombre: string;
  categoria: CapacitacionCategoria;
  requiereVigencia: boolean;
  vigenciaMeses: number | null;
  criticaDs44: boolean;
  modalidad: "presencial" | "elearning" | "mixta";
}

export interface ReglaCapacitacion {
  id: string;
  nombre: string;
  activa: boolean;
  condicion: {
    cargo?: string;
    area?: string;
    centroTrabajo?: string;
    tipoContrato?: Worker["tipoContrato"];
    soloDs44?: boolean;
  };
  tipoCapacitacionIds: string[];
}

export interface RegistroCapacitacionTrabajador {
  id: string;
  workerId: string;
  tipoCapacitacionId: string;
  estado: CapacitacionEstado;
  fechaCompletada?: string;
  fechaVencimiento?: string;
  fuente?: string;
  nota?: string;
}

export interface CapacitacionTrabajadorView {
  tipo: TipoCapacitacion;
  estado: CapacitacionEstado;
  fechaCompletada?: string;
  fechaVencimiento?: string;
  diasParaVencer?: number;
  fuente?: string;
  nota?: string;
}

export interface CapacitacionResumen {
  requeridas: number;
  completadas: number;
  pendientes: number;
  vencidas: number;
  noAplica: number;
  pct: number;
}

const REF_DATE = new Date("2026-04-08");

const DS44_CARGO_HINTS = [
  "prevencionista",
  "supervisor",
  "operario",
  "tecnico",
  "eléctric",
  "electric",
  "chofer",
  "conductor",
  "maestro",
];

export function isWorkerDs44Critical(worker: Worker): boolean {
  const target = `${worker.cargo} ${worker.area}`.toLowerCase();
  return DS44_CARGO_HINTS.some((k) => target.includes(k));
}

export const TIPO_CAPACITACIONES: TipoCapacitacion[] = [
  {
    id: "cap-01",
    nombre: "Inducción General SST",
    categoria: "SST Base",
    requiereVigencia: true,
    vigenciaMeses: 24,
    criticaDs44: true,
    modalidad: "presencial",
  },
  {
    id: "cap-02",
    nombre: "Obligación de Informar (ODI)",
    categoria: "DS44",
    requiereVigencia: false,
    vigenciaMeses: null,
    criticaDs44: true,
    modalidad: "presencial",
  },
  {
    id: "cap-03",
    nombre: "Trabajo en Altura y Rescate",
    categoria: "Riesgo Crítico",
    requiereVigencia: true,
    vigenciaMeses: 12,
    criticaDs44: true,
    modalidad: "mixta",
  },
  {
    id: "cap-04",
    nombre: "Bloqueo y Etiquetado (LOTO)",
    categoria: "Riesgo Crítico",
    requiereVigencia: true,
    vigenciaMeses: 12,
    criticaDs44: true,
    modalidad: "mixta",
  },
  {
    id: "cap-05",
    nombre: "Manejo Defensivo y Conducción Segura",
    categoria: "Operacional",
    requiereVigencia: true,
    vigenciaMeses: 24,
    criticaDs44: true,
    modalidad: "elearning",
  },
  {
    id: "cap-06",
    nombre: "Ergonomía y Pausas Activas",
    categoria: "Administrativa",
    requiereVigencia: true,
    vigenciaMeses: 36,
    criticaDs44: false,
    modalidad: "elearning",
  },
  {
    id: "cap-07",
    nombre: "Investigación de Incidentes",
    categoria: "SST Base",
    requiereVigencia: true,
    vigenciaMeses: 24,
    criticaDs44: true,
    modalidad: "presencial",
  },
  {
    id: "cap-08",
    nombre: "Primeros Auxilios en Faena",
    categoria: "Riesgo Crítico",
    requiereVigencia: true,
    vigenciaMeses: 24,
    criticaDs44: false,
    modalidad: "presencial",
  },
];

export const REGLAS_CAPACITACION: ReglaCapacitacion[] = [
  {
    id: "r-cap-01",
    nombre: "Base universal",
    activa: true,
    condicion: {},
    tipoCapacitacionIds: ["cap-01", "cap-02"],
  },
  {
    id: "r-cap-02",
    nombre: "Área Producción e Instalación",
    activa: true,
    condicion: { area: "Producción e Instalación" },
    tipoCapacitacionIds: ["cap-03"],
  },
  {
    id: "r-cap-03",
    nombre: "Cargo: Supervisor de Obra",
    activa: true,
    condicion: { cargo: "supervisor" },
    tipoCapacitacionIds: ["cap-07", "cap-08"],
  },
  {
    id: "r-cap-04",
    nombre: "Área Administración",
    activa: true,
    condicion: { area: "Administración" },
    tipoCapacitacionIds: ["cap-06"],
  },
  {
    id: "r-cap-05",
    nombre: "Inactiva",
    activa: false,
    condicion: {},
    tipoCapacitacionIds: [],
  },
];

export const MOCK_CAPACITACIONES: RegistroCapacitacionTrabajador[] = [
  // w-001: Juan Muñoz (Supervisor de Obra) — inducción SST vencida → sinCapVigente
  { id: "rw-001-1", workerId: "w-001", tipoCapacitacionId: "cap-01", estado: "vencida", fechaCompletada: "2022-09-01", fechaVencimiento: "2024-09-01", fuente: "OTEC", nota: "Renovación pendiente" },
  { id: "rw-001-2", workerId: "w-001", tipoCapacitacionId: "cap-02", estado: "completada", fechaCompletada: "2022-03-01", fuente: "OJT" },
  { id: "rw-001-3", workerId: "w-001", tipoCapacitacionId: "cap-03", estado: "completada", fechaCompletada: "2025-02-15", fechaVencimiento: "2026-02-15", fuente: "OTEC" },
  { id: "rw-001-7", workerId: "w-001", tipoCapacitacionId: "cap-07", estado: "completada", fechaCompletada: "2024-05-10", fechaVencimiento: "2026-05-10", fuente: "LMS" },
  { id: "rw-001-8", workerId: "w-001", tipoCapacitacionId: "cap-08", estado: "completada", fechaCompletada: "2024-05-10", fechaVencimiento: "2026-05-10", fuente: "Mutualidad" },

  // w-002: Cristina Reyes (Administrativa) — todo al día
  { id: "rw-002-1", workerId: "w-002", tipoCapacitacionId: "cap-01", estado: "completada", fechaCompletada: "2024-01-16", fechaVencimiento: "2026-01-16", fuente: "LMS" },
  { id: "rw-002-2", workerId: "w-002", tipoCapacitacionId: "cap-02", estado: "completada", fechaCompletada: "2023-01-16", fuente: "LMS" },
  { id: "rw-002-6", workerId: "w-002", tipoCapacitacionId: "cap-06", estado: "completada", fechaCompletada: "2025-03-10", fechaVencimiento: "2028-03-10", fuente: "LMS" },

  // w-003: Ricardo Flores (Maestro PVC/Aluminio) — inducción vencida + cap-02 pendiente → sinCapVigente
  { id: "rw-003-1", workerId: "w-003", tipoCapacitacionId: "cap-01", estado: "vencida", fechaCompletada: "2023-10-10", fechaVencimiento: "2025-10-10", fuente: "LMS", nota: "Renovación no programada" },
  { id: "rw-003-2", workerId: "w-003", tipoCapacitacionId: "cap-02", estado: "pendiente" },
  { id: "rw-003-3", workerId: "w-003", tipoCapacitacionId: "cap-03", estado: "pendiente", nota: "Sin cupo confirmado" },

  // w-004: Sebastián Vidal (Instalador) — todo pendiente → sinCapVigente
  { id: "rw-004-1", workerId: "w-004", tipoCapacitacionId: "cap-01", estado: "pendiente" },
  { id: "rw-004-2", workerId: "w-004", tipoCapacitacionId: "cap-02", estado: "pendiente" },
  { id: "rw-004-3", workerId: "w-004", tipoCapacitacionId: "cap-03", estado: "pendiente", nota: "Recién ingresado, sin cupo asignado" },

  // w-005: Carlos Espinoza (Maestro PVC/Aluminio) — inducción vence en ~43 días → alertasProximas
  { id: "rw-005-1", workerId: "w-005", tipoCapacitacionId: "cap-01", estado: "completada", fechaCompletada: "2024-05-20", fechaVencimiento: "2026-05-20", fuente: "LMS" },
  { id: "rw-005-2", workerId: "w-005", tipoCapacitacionId: "cap-02", estado: "completada", fechaCompletada: "2022-09-05", fuente: "OJT" },
  { id: "rw-005-3", workerId: "w-005", tipoCapacitacionId: "cap-03", estado: "completada", fechaCompletada: "2025-01-15", fechaVencimiento: "2026-01-15", fuente: "OTEC" },
];

function matchesCondition(worker: Worker, cond: ReglaCapacitacion["condicion"]): boolean {
  const text = (value: string) => value.trim().toLowerCase();

  if (cond.soloDs44 && !isWorkerDs44Critical(worker)) return false;
  if (cond.cargo && !text(worker.cargo).includes(text(cond.cargo))) return false;
  if (cond.area && !text(worker.area).includes(text(cond.area))) return false;
  if (cond.centroTrabajo && !text(worker.centroTrabajo).includes(text(cond.centroTrabajo))) return false;
  if (cond.tipoContrato && worker.tipoContrato !== cond.tipoContrato) return false;
  return true;
}

export function getRequiredTrainingIds(worker: Worker, reglas: ReglaCapacitacion[]): Set<string> {
  const required = new Set<string>();
  for (const regla of reglas) {
    if (!regla.activa) continue;
    if (!matchesCondition(worker, regla.condicion)) continue;
    regla.tipoCapacitacionIds.forEach((id) => required.add(id));
  }
  return required;
}

export function getWorkerTrainings(
  worker: Worker,
  reglas: ReglaCapacitacion[],
  tipos: TipoCapacitacion[],
  registros: RegistroCapacitacionTrabajador[],
): CapacitacionTrabajadorView[] {
  const requiredIds = getRequiredTrainingIds(worker, reglas);
  const workerRecords = registros.filter((r) => r.workerId === worker.id);

  const output: CapacitacionTrabajadorView[] = [];

  requiredIds.forEach((tipoId) => {
    const tipo = tipos.find((t) => t.id === tipoId);
    if (!tipo) return;

    const record = workerRecords.find((r) => r.tipoCapacitacionId === tipoId);
    let estado: CapacitacionEstado = "pendiente";
    let diasParaVencer: number | undefined;

    if (record) {
      estado = record.estado;
      if (record.estado === "completada" && tipo.requiereVigencia && record.fechaVencimiento) {
        const diff = Math.floor((new Date(record.fechaVencimiento).getTime() - REF_DATE.getTime()) / 86400000);
        diasParaVencer = diff;
        if (diff < 0) estado = "vencida";
      }
      if (record.estado === "vencida") {
        if (record.fechaVencimiento) {
          diasParaVencer = Math.floor((new Date(record.fechaVencimiento).getTime() - REF_DATE.getTime()) / 86400000);
        }
      }
    }

    output.push({
      tipo,
      estado,
      fechaCompletada: record?.fechaCompletada,
      fechaVencimiento: record?.fechaVencimiento,
      diasParaVencer,
      fuente: record?.fuente,
      nota: record?.nota,
    });
  });

  // Keep explicit no-aplica records visible even when rule does not require them currently.
  workerRecords
    .filter((r) => r.estado === "no_aplica" && !requiredIds.has(r.tipoCapacitacionId))
    .forEach((record) => {
      const tipo = tipos.find((t) => t.id === record.tipoCapacitacionId);
      if (!tipo) return;
      output.push({
        tipo,
        estado: "no_aplica",
        fechaCompletada: record.fechaCompletada,
        fechaVencimiento: record.fechaVencimiento,
        fuente: record.fuente,
        nota: record.nota,
      });
    });

  return output.sort((a, b) => a.tipo.nombre.localeCompare(b.tipo.nombre, "es"));
}

export function getWorkerTrainingSummary(rows: CapacitacionTrabajadorView[]): CapacitacionResumen {
  const requeridas = rows.filter((r) => r.estado !== "no_aplica").length;
  const completadas = rows.filter((r) => r.estado === "completada").length;
  const pendientes = rows.filter((r) => r.estado === "pendiente").length;
  const vencidas = rows.filter((r) => r.estado === "vencida").length;
  const noAplica = rows.filter((r) => r.estado === "no_aplica").length;

  return {
    requeridas,
    completadas,
    pendientes,
    vencidas,
    noAplica,
    pct: requeridas > 0 ? Math.round((completadas / requeridas) * 100) : 0,
  };
}

export function getWorkerTrainingHistory(
  worker: Worker,
  tipos: TipoCapacitacion[],
  registros: RegistroCapacitacionTrabajador[],
): Array<RegistroCapacitacionTrabajador & { tipoNombre: string }> {
  return registros
    .filter((r) => r.workerId === worker.id)
    .map((r) => ({
      ...r,
      tipoNombre: tipos.find((t) => t.id === r.tipoCapacitacionId)?.nombre ?? r.tipoCapacitacionId,
    }))
    .sort((a, b) => {
      const aDate = a.fechaCompletada ?? a.fechaVencimiento ?? "";
      const bDate = b.fechaCompletada ?? b.fechaVencimiento ?? "";
      return bDate.localeCompare(aDate);
    });
}
