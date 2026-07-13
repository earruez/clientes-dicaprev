export type PlanCapacitacionEstado =
  | "borrador"
  | "en_revision"
  | "aprobado"
  | "rechazado"
  | "cerrado";

export type PlanCapacitacionItemEstado =
  | "pendiente"
  | "programado"
  | "ejecutado"
  | "vencido"
  | "cancelado";

export type PlanCapacitacionItemView = {
  id: string;
  planId: string;
  capacitacionId: string;
  capacitacionNombre: string;
  cargoId: string | null;
  cargoNombre: string | null;
  areaId: string | null;
  areaNombre: string | null;
  centroTrabajoId: string | null;
  centroTrabajoNombre: string | null;
  periodicidad: string;
  mesProgramado: number | null;
  obligatorio: boolean;
  estado: PlanCapacitacionItemEstado;
  responsableId: string | null;
  responsableNombre: string | null;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlanCapacitacionView = {
  id: string;
  empresaId: string;
  nombre: string;
  periodo: string | null;
  anio: number;
  estado: PlanCapacitacionEstado;
  version: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  aprobadoPorId: string | null;
  aprobadoPorNombre: string | null;
  aprobadoEn: string | null;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
  items: PlanCapacitacionItemView[];
};

export type CreatePlanCapacitacionInput = {
  nombre: string;
  periodo?: string | null;
  anio: number;
  estado?: PlanCapacitacionEstado;
  version?: string;
  fechaInicio?: string | Date | null;
  fechaFin?: string | Date | null;
  observaciones?: string | null;
};

export type UpdatePlanCapacitacionInput = {
  nombre?: string;
  periodo?: string | null;
  anio?: number;
  estado?: PlanCapacitacionEstado;
  version?: string;
  fechaInicio?: string | Date | null;
  fechaFin?: string | Date | null;
  aprobadoPorId?: string | null;
  aprobadoEn?: string | Date | null;
  observaciones?: string | null;
};

export type CreatePlanDesdePlantillaInput = CreatePlanCapacitacionInput;

export type GenerarItemsPlanDesdeReglasResult = {
  planId: string;
  creados: number;
  omitidos: number;
  totalReglasActivas: number;
};

export type UpdatePlanCapacitacionItemInput = {
  periodicidad?: string;
  mesProgramado?: number | null;
  obligatorio?: boolean;
  estado?: PlanCapacitacionItemEstado;
  responsableId?: string | null;
  observaciones?: string | null;
};

export type MergePlantillaEnPlanResult = {
  itemsCreados: number;
  itemsOmitidos: number;
  totalPlantillaItems: number;
};
