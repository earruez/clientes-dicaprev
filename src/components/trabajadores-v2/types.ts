import { AREA_REFS } from "@/lib/empresa/domain";
import { getCentroNombres } from "@/lib/centros/centros-store";

export type WorkerEstado = "Activo" | "Inactivo" | "Licencia" | "Vacaciones";
export type WorkerContrato = "Indefinido" | "Plazo Fijo" | "Por Obra" | "Part Time";

export interface Worker {
  id: string;
  nombre: string;
  apellido: string;
  rut: string;
  cargo: string;
  area: string;
  centroTrabajo: string;
  email: string;
  telefono: string;
  estado: WorkerEstado;
  fechaIngreso: string;
  fechaNacimiento: string;
  tipoContrato: WorkerContrato;
  documentosPendientes: number;
  capacitacionesPendientes: number;
  /** ID of the Posicion (dotación) this worker is assigned to */
  dotacionId?: string;
}

export interface FilterConfig {
  search: string;
  area: string;
  estado: string;
  tipoContrato: string;
  centroTrabajo: string;
  soloDs44: boolean;
  conPendientes: boolean;
}

export const DEFAULT_FILTERS: FilterConfig = {
  search: "",
  area: "",
  estado: "",
  tipoContrato: "",
  centroTrabajo: "",
  soloDs44: false,
  conPendientes: false,
};

export const AREAS = AREA_REFS.map((a) => a.nombre);

export const CARGOS = [
  "Supervisor de Obra",
  "Maestro PVC/Aluminio",
  "Instalador",
  "Administrativa",
];

export const CENTROS = getCentroNombres();

export const CONTRATOS: WorkerContrato[] = [
  "Indefinido",
  "Plazo Fijo",
  "Por Obra",
  "Part Time",
];

export const ESTADOS: WorkerEstado[] = ["Activo", "Inactivo", "Licencia", "Vacaciones"];

export const ESTADO_CONFIG: Record<
  WorkerEstado,
  { label: string; bg: string; text: string; ring: string }
> = {
  Activo: {
    label: "Activo",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-1 ring-emerald-200",
  },
  Inactivo: {
    label: "Inactivo",
    bg: "bg-slate-100",
    text: "text-slate-600",
    ring: "ring-1 ring-slate-200",
  },
  Licencia: {
    label: "Licencia",
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-1 ring-amber-200",
  },
  Vacaciones: {
    label: "Vacaciones",
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-1 ring-blue-200",
  },
};

export const MOCK_WORKERS: Worker[] = [
  {
    id: "w-001",
    nombre: "Juan",
    apellido: "Muñoz Carvajal",
    rut: "12.345.678-K",
    cargo: "Supervisor de Obra",
    area: "Producción e Instalación",
    centroTrabajo: "Sede Central MVP Chile",
    email: "j.munoz@mvpchile.cl",
    telefono: "+56 9 8821 4402",
    estado: "Activo",
    fechaIngreso: "2022-03-01",
    fechaNacimiento: "1985-07-14",
    tipoContrato: "Indefinido",
    documentosPendientes: 0,
    capacitacionesPendientes: 1,
    dotacionId: "pos-001",
  },
  {
    id: "w-002",
    nombre: "Cristina",
    apellido: "Reyes Soto",
    rut: "14.789.012-3",
    cargo: "Administrativa",
    area: "Administración",
    centroTrabajo: "Sede Central MVP Chile",
    email: "c.reyes@mvpchile.cl",
    telefono: "+56 9 7741 3301",
    estado: "Activo",
    fechaIngreso: "2023-01-16",
    fechaNacimiento: "1990-03-22",
    tipoContrato: "Indefinido",
    documentosPendientes: 0,
    capacitacionesPendientes: 0,
  },
  {
    id: "w-003",
    nombre: "Ricardo",
    apellido: "Flores Pavez",
    rut: "16.023.456-7",
    cargo: "Maestro PVC/Aluminio",
    area: "Producción e Instalación",
    centroTrabajo: "Sede Central MVP Chile",
    email: "r.flores@mvpchile.cl",
    telefono: "+56 9 6612 8830",
    estado: "Activo",
    fechaIngreso: "2023-08-01",
    fechaNacimiento: "1993-11-05",
    tipoContrato: "Plazo Fijo",
    documentosPendientes: 2,
    capacitacionesPendientes: 1,
    dotacionId: "pos-002",
  },
  {
    id: "w-004",
    nombre: "Sebastián",
    apellido: "Vidal Herrera",
    rut: "17.890.123-4",
    cargo: "Instalador",
    area: "Producción e Instalación",
    centroTrabajo: "Sede Central MVP Chile",
    email: "s.vidal@mvpchile.cl",
    telefono: "+56 9 5503 7721",
    estado: "Activo",
    fechaIngreso: "2024-02-12",
    fechaNacimiento: "1998-06-30",
    tipoContrato: "Por Obra",
    documentosPendientes: 3,
    capacitacionesPendientes: 2,
    dotacionId: "pos-003",
  },
  {
    id: "w-005",
    nombre: "Carlos",
    apellido: "Espinoza Tapia",
    rut: "15.456.789-0",
    cargo: "Maestro PVC/Aluminio",
    area: "Producción e Instalación",
    centroTrabajo: "Sede Central MVP Chile",
    email: "c.espinoza@mvpchile.cl",
    telefono: "+56 9 4494 6610",
    estado: "Activo",
    fechaIngreso: "2022-09-05",
    fechaNacimiento: "1988-01-17",
    tipoContrato: "Plazo Fijo",
    documentosPendientes: 0,
    capacitacionesPendientes: 0,
    dotacionId: "pos-002",
  },
];

export function getInitials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatMonthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CL", {
    month: "short",
    year: "numeric",
  });
}

export function antiguedad(fechaIngreso: string): string {
  const start = new Date(fechaIngreso);
  const now = new Date("2026-04-07"); // stable reference date
  const diffMs = now.getTime() - start.getTime();
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const anos = Math.floor(dias / 365);
  const meses = Math.floor((dias % 365) / 30);
  if (anos > 0)
    return `${anos} año${anos > 1 ? "s" : ""}${meses > 0 ? ` ${meses} mes${meses > 1 ? "es" : ""}` : ""}`;
  if (meses > 0) return `${meses} mes${meses > 1 ? "es" : ""}`;
  return `${dias} día${dias !== 1 ? "s" : ""}`;
}

export function applyFilters(workers: Worker[], f: FilterConfig): Worker[] {
  return workers.filter((w) => {
    const nameRut = `${w.nombre} ${w.apellido} ${w.rut}`.toLowerCase();
    if (f.search && !nameRut.includes(f.search.toLowerCase())) return false;
    if (f.area && w.area !== f.area) return false;
    if (f.estado && w.estado !== f.estado) return false;
    if (f.tipoContrato && w.tipoContrato !== f.tipoContrato) return false;
    if (f.centroTrabajo && w.centroTrabajo !== f.centroTrabajo) return false;
    if (f.soloDs44 && w.documentosPendientes + w.capacitacionesPendientes <= 2) return false;
    if (f.conPendientes && w.documentosPendientes + w.capacitacionesPendientes === 0) return false;
    return true;
  });
}
