/**
 * centros-store.ts
 *
 * Shared mock-state layer for Centros de Trabajo.
 *
 * Architecture:
 *   centros-store → single runtime state for all CentroAdmin data
 *   CentrosTrabajoExecutivePage → reads/writes via this store (CRUD)
 *   WorkerForm → reads getCentroNombres() for dropdown
 *   DotacionPage (puestos) → reads getCentroNombres() for filter
 *
 * No React — plain module singleton, safe to import from any component.
 * In production this will be replaced by Firestore listeners.
 */

export type CentroTipo =
  | "Casa Matriz"
  | "Sucursal"
  | "Obra"
  | "Planta"
  | "Bodega"
  | "Faena"
  | "Otro";

export type CentroEstado = "activo" | "inactivo" | "en-riesgo" | "detenido";

export interface DotacionCargo {
  cargo: string;
  dotacion: number;
  asignados: number;
}

export interface TrabajadorAsociado {
  id: string;
  nombre: string;
  cargo: string;
  estadoDoc: "al-dia" | "pendiente" | "vencido";
}

export interface CentroAdmin {
  id: string;
  nombre: string;
  codigo: string;
  tipo: CentroTipo;
  direccion: string;
  ciudad: string;
  estado: CentroEstado;
  aplicaDs44: boolean;
  observaciones: string;
  // Operational KPI data (mock — derived from workers/dotacion in production)
  trabajadoresTotal: number;
  dotacionTotal: number;
  cumplimientoDocPct: number;
  capacitacionesPendientes: number;
  vencimientos: number;
  alertasDs44: number;
  dotacionPorCargo: DotacionCargo[];
  trabajadoresAsociados: TrabajadorAsociado[];
  creadoEl: string;
}

// ─── Initial mock data ──────────────────────────────────────────────────── //

const INITIAL_CENTROS: CentroAdmin[] = [
  {
    id: "ct-001",
    nombre: "Sede Central MVP Chile",
    codigo: "CTR-001",
    tipo: "Casa Matriz",
    direccion: "Avenida Irarrázabal 5185, oficina 503",
    ciudad: "Ñuñoa",
    estado: "activo",
    aplicaDs44: true,
    observaciones: "Única sede de la empresa. Concentra producción, administración e instalaciones.",
    trabajadoresTotal: 5,
    dotacionTotal: 6,
    cumplimientoDocPct: 62,
    capacitacionesPendientes: 4,
    vencimientos: 3,
    alertasDs44: 2,
    dotacionPorCargo: [
      { cargo: "Supervisor de Obra",  dotacion: 1, asignados: 1 },
      { cargo: "Maestro PVC/Aluminio", dotacion: 2, asignados: 2 },
      { cargo: "Instalador",          dotacion: 2, asignados: 1 },
      { cargo: "Administrativa",      dotacion: 1, asignados: 1 },
    ],
    trabajadoresAsociados: [
      { id: "w-001", nombre: "Juan Muñoz Carvajal",     cargo: "Supervisor de Obra",   estadoDoc: "al-dia"   },
      { id: "w-002", nombre: "Cristina Reyes Soto",     cargo: "Administrativa",        estadoDoc: "al-dia"   },
      { id: "w-003", nombre: "Ricardo Flores Pavez",    cargo: "Maestro PVC/Aluminio",  estadoDoc: "vencido"  },
      { id: "w-004", nombre: "Sebastián Vidal Herrera", cargo: "Instalador",            estadoDoc: "pendiente" },
      { id: "w-005", nombre: "Carlos Espinoza Tapia",   cargo: "Maestro PVC/Aluminio",  estadoDoc: "al-dia"   },
    ],
    creadoEl: "2024-01-10",
  },
];

// ─── Mutable singleton state ────────────────────────────────────────────── //

let centros: CentroAdmin[] = INITIAL_CENTROS.map((c) => ({ ...c }));

// ─── Subscriber pattern ────────────────────────────────────────────────── //

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ─── Getters ───────────────────────────────────────────────────────────── //

export function getCentros(): CentroAdmin[] {
  return centros;
}

export function getCentroById(id: string): CentroAdmin | undefined {
  return centros.find((c) => c.id === id);
}

/**
 * Returns centro nombres for dropdowns (WorkerForm, DotacionPage).
 * Excludes "inactivo" centros so deactivated ones cannot receive new assignments.
 */
export function getCentroNombres(): string[] {
  return centros
    .filter((c) => c.estado !== "inactivo")
    .map((c) => c.nombre);
}

// ─── Mutations ─────────────────────────────────────────────────────────── //

export function addCentro(centro: CentroAdmin): void {
  centros = [...centros, centro];
  notify();
}

export function updateCentro(id: string, updates: Partial<CentroAdmin>): void {
  centros = centros.map((c) => (c.id === id ? { ...c, ...updates } : c));
  notify();
}

export function toggleCentroEstado(id: string): void {
  centros = centros.map((c) =>
    c.id === id
      ? { ...c, estado: c.estado === "activo" ? "inactivo" : "activo" }
      : c,
  );
  notify();
}

export function deleteCentro(id: string): void {
  centros = centros.filter((c) => c.id !== id);
  notify();
}
