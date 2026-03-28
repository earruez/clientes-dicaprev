
export type TrainingStatus = "pendiente" | "vigente" | "porVencer" | "vencido";

export type Role = {
  id: string;
  nombre: string;
  critico?: boolean;
};

export type Course = {
  id: string;
  nombre: string;
  categoria: string;
  obligatorio: boolean;
  vigenciaMeses?: number;
  critico?: boolean;
  modalidad?: "presencial" | "mixto" | "elearning";
  normativa?: string[];
};

export type Requirement = {
  roleId: string;
  courseId: string;
  status: TrainingStatus;
  ultimaFecha?: string;
  proximaFecha?: string;
};

export type TemplatePlan = {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  norma?: string;
  roles?: Role[];
  cursos?: Course[];
  requisitos?: Requirement[];
};

export const statusConfig: Record<TrainingStatus, { label: string; className: string }> = {
  pendiente: {
    label: "Pendiente",
    className:
      "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100",
  },
  vigente: {
    label: "Vigente",
    className:
      "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100",
  },
  porVencer: {
    label: "Por vencer",
    className:
      "bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100",
  },
  vencido: {
    label: "Vencido",
    className:
      "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100",
  },
};

export function nextStatus(current: TrainingStatus): TrainingStatus {
  if (current === "pendiente") return "vigente";
  if (current === "vigente") return "porVencer";
  if (current === "porVencer") return "vencido";
  return "pendiente";
}
