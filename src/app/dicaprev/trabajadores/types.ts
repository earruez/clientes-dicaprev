// -------------------------------------------------------------
// Estados de trabajador (visión prevención, NO RRHH tradicional)
// -------------------------------------------------------------
export type EstadoTrabajador = "vigente" | "baja" | "suspendido";

// -------------------------------------------------------------
// Modelo base del trabajador (estructura principal en Firestore)
// -------------------------------------------------------------
export type TrabajadorBase = {
  id: string;

  // Identificación
  rut: string;
  nombres: string;
  apellidos: string;

  // Estado laboral para prevención
  estado: EstadoTrabajador;

  // Ubicación en la estructura organizacional (IDs + nombres legibles)
  centroId: string;
  centroNombre: string;

  areaId: string;
  areaNombre: string;

  cargoId: string;
  cargoNombre: string;

  puestoId: string;
  puestoNombre: string;

  // Prevención pura
  riesgos: string[];
  eppObligatorio: string[];
  capacitacionObligatoriaCumplida: boolean;

  // Si tiene pendientes DS44 u otras brechas críticas
  ds44Pendiente: boolean;

  // Timestamps ISO (string) – vienen directo de Firestore o dayjs
  creadoEl: string;
  actualizadoEl: string;
};

// -------------------------------------------------------------
// Campos extendidos usados por la UI (opcionales)
// -------------------------------------------------------------
export type TrabajadorUIAlias = {
  // Alias legibles (por si en la UI usas estos nombres simples)
  centroTrabajo?: string | null;
  area?: string | null;
  cargo?: string | null;
  puesto?: string | null;

  // Datos de contacto
  telefono?: string | null;
  correo?: string | null;

  // Datos laborales complementarios
  fechaIngreso?: string | null;      // ej: "2024-01-15"
  fechaNacimiento?: string | null;   // ej: "1990-07-03"

  // -------------------------------------------------------------
  // 👇 NUEVO: Observaciones internas del trabajador
  // -------------------------------------------------------------
  observaciones?: string | null;
};

// -------------------------------------------------------------
// Modelo final de Trabajador que usará TODO el módulo
// -------------------------------------------------------------
export type Trabajador = TrabajadorBase & TrabajadorUIAlias;

// -------------------------------------------------------------
// Tipos de apoyo para formularios, filtros y ordenamiento
// -------------------------------------------------------------
export type TrabajadorFormValues = Omit<
  Trabajador,
  "id" | "creadoEl" | "actualizadoEl"
> & {
  estado?: EstadoTrabajador;
};

export type TrabajadorFiltroEstado = EstadoTrabajador | "todos";

export type TrabajadorFiltros = {
  texto?: string;
  estado?: TrabajadorFiltroEstado;
  centroId?: string;
  areaId?: string;
  cargoId?: string;
  ds44Pendiente?: boolean;
  capacitacionObligatoriaCumplida?: boolean;
};

export type TrabajadorOrdenCampo =
  | "creadoEl"
  | "actualizadoEl"
  | "nombres"
  | "apellidos"
  | "rut";

export type TrabajadorOrden = {
  campo: TrabajadorOrdenCampo;
  direccion: "asc" | "desc";
};

export type TrabajadoresVista = "tabla" | "cards";
