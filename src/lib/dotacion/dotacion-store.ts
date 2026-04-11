/**
 * dotacion-store.ts
 *
 * Shared mock-state layer for Dotación (posiciones operativas).
 *
 * Architecture:
 *   dotacion-store → single runtime state for all posicion data
 *   puestos/page    → reads/writes via this store (no local INITIAL_POSICIONES)
 *   trabajadores    → calls findOrCreateDotacion on worker save
 *   WorkerDrawer    → reads posicion data to show dotación info
 *
 * No React — plain module singleton, safe to import from any component.
 * In production this will be replaced by Firestore listeners.
 */

export type PosicionEstado = "activo" | "inactivo";
export type PosicionTurno = "Diurno" | "Nocturno" | "Mixto" | "Especial";
export type PosicionModalidad = "Presencial" | "Híbrido" | "Remoto";

export interface Posicion {
  id: string;
  codigo: string;
  centroNombre: string;
  cargoNombre: string;
  dotacionRequerida: number;
  asignados: number;
  turno: PosicionTurno;
  modalidad: PosicionModalidad;
  ubicacion: string;
  riesgosClave: string;
  requiereDS44: boolean;
  estado: PosicionEstado;
  creadoEl: string;
}

// Canonical centro names — must match CENTROS in trabajadores-v2/types.ts
export const DOTACION_CENTROS = [
  "Sede Central MVP Chile",
] as const;

// ─── Initial mock data ─────────────────────────────────────────────────── //

const INITIAL_POSICIONES: Posicion[] = [
  {
    id: "pos-001", codigo: "DOT-001",
    centroNombre: "Sede Central MVP Chile",
    cargoNombre: "Supervisor de Obra",
    dotacionRequerida: 1, asignados: 1,
    turno: "Diurno", modalidad: "Presencial",
    ubicacion: "Oficina 503 + terreno (instalaciones en obra)",
    riesgosClave: "Trabajo en altura, coordinación de cuadrillas, herramientas eléctricas.",
    requiereDS44: true, estado: "activo", creadoEl: "2024-01-10",
  },
  {
    id: "pos-002", codigo: "DOT-002",
    centroNombre: "Sede Central MVP Chile",
    cargoNombre: "Maestro PVC/Aluminio",
    dotacionRequerida: 2, asignados: 2,
    turno: "Diurno", modalidad: "Presencial",
    ubicacion: "Taller de fabricación + instalación en terreno",
    riesgosClave: "Corte de perfiles, trabajo en altura, herramientas eléctricas, exposición a polvo.",
    requiereDS44: true, estado: "activo", creadoEl: "2024-01-10",
  },
  {
    id: "pos-003", codigo: "DOT-003",
    centroNombre: "Sede Central MVP Chile",
    cargoNombre: "Instalador",
    dotacionRequerida: 2, asignados: 1,
    turno: "Diurno", modalidad: "Presencial",
    ubicacion: "Instalación en terreno (obras de clientes)",
    riesgosClave: "Trabajo en altura, andamios, herramientas manuales y eléctricas, ruido.",
    requiereDS44: true, estado: "activo", creadoEl: "2024-01-10",
  },
  {
    id: "pos-004", codigo: "DOT-004",
    centroNombre: "Sede Central MVP Chile",
    cargoNombre: "Administrativa",
    dotacionRequerida: 1, asignados: 1,
    turno: "Diurno", modalidad: "Híbrido",
    ubicacion: "Oficina 503, Sede Central",
    riesgosClave: "Riesgo ergonómico, uso prolongado de pantallas, riesgo psicosocial.",
    requiereDS44: false, estado: "activo", creadoEl: "2024-01-10",
  },
];

// ─── Mutable singleton state ───────────────────────────────────────────── //

let posiciones: Posicion[] = INITIAL_POSICIONES.map((p) => ({ ...p }));

// ─── Subscriber pattern (for React components to react to changes) ─────── //

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ─── Getters ──────────────────────────────────────────────────────────────//

export function getPosiciones(): Posicion[] {
  return posiciones;
}

export function getPosicionById(id: string): Posicion | undefined {
  return posiciones.find((p) => p.id === id);
}

// ─── Core helper: find or create dotación ────────────────────────────────//

export function findOrCreateDotacion({
  centroNombre,
  cargoNombre,
}: {
  centroNombre: string;
  cargoNombre: string;
}): Posicion {
  // Find matching active posicion
  const existing = posiciones.find(
    (p) =>
      p.centroNombre === centroNombre &&
      p.cargoNombre === cargoNombre &&
      p.estado === "activo",
  );
  if (existing) return existing;

  // Create new dotación position
  const nums = posiciones
    .map((p) => {
      const m = p.codigo.match(/^DOT-(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const nextNum = (nums.length ? Math.max(...nums) : 0) + 1;

  const nueva: Posicion = {
    id: `pos-${Date.now()}`,
    codigo: `DOT-${String(nextNum).padStart(3, "0")}`,
    centroNombre,
    cargoNombre,
    dotacionRequerida: 1,
    asignados: 0,
    turno: "Diurno",
    modalidad: "Presencial",
    ubicacion: "",
    riesgosClave: "",
    requiereDS44: false,
    estado: "activo",
    creadoEl: new Date().toISOString().slice(0, 10),
  };

  posiciones = [...posiciones, nueva];
  notify();
  return nueva;
}

// ─── Mutations ────────────────────────────────────────────────────────────//

export function incrementAsignados(id: string): void {
  posiciones = posiciones.map((p) =>
    p.id === id ? { ...p, asignados: p.asignados + 1 } : p,
  );
  notify();
}

export function decrementAsignados(id: string): void {
  posiciones = posiciones.map((p) =>
    p.id === id ? { ...p, asignados: Math.max(0, p.asignados - 1) } : p,
  );
  notify();
}

export function updatePosicion(updated: Posicion): void {
  posiciones = posiciones.map((p) => (p.id === updated.id ? updated : p));
  notify();
}

export function addPosicion(p: Posicion): void {
  posiciones = [...posiciones, p];
  notify();
}

// ─── Helpers ──────────────────────────────────────────────────────────────//

export function vacantesPos(p: Posicion): number {
  return Math.max(0, p.dotacionRequerida - p.asignados);
}

export function isSobredotado(p: Posicion): boolean {
  return p.asignados > p.dotacionRequerida;
}

export function coberturaLabel(p: Posicion): string {
  if (isSobredotado(p)) return "Sobredotado";
  if (vacantesPos(p) === 0) return "Cubierta";
  if (vacantesPos(p) >= p.dotacionRequerida) return "Vacante";
  return "Parcial";
}

export function coberturaPct(p: Posicion): number {
  if (p.dotacionRequerida === 0) return 0;
  return Math.round((p.asignados / p.dotacionRequerida) * 100);
}
