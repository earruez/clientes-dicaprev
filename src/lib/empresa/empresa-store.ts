/**
 * empresa-store.ts
 *
 * Shared mock-state layer for Empresa structure (Áreas + Cargos).
 *
 * Architecture:
 *   domain.ts      → reference data (AREA_REFS, CARGO_REFS) — immutable
 *   plantillas.ts  → template definitions + PlantillaAplicada schema
 *   empresa-store  → single runtime state + localStorage persistence ← THIS FILE
 *   pages          → read initial state from store, write mutations back
 *
 * In production this layer will be replaced by Firestore listeners.
 * No React — plain module singleton, safe to import from any component.
 */

import {
  PLANTILLAS,
  PLANTILLA_STORAGE_KEY,
  type TipoEmpresa,
  type PlantillaModo,
  type PlantillaAplicada,
  type AreaDef,
  type CargoDef,
} from "./plantillas";

// ─── Active types ──────────────────────────────────────────────────────── //

export type AreaStatus = "activa" | "inactiva";
export type CargoEstado = "activo" | "inactivo";
export type CargoTipoUI =
  | "Operativo"
  | "Supervisión"
  | "Administración"
  | "Prevención"
  | "Técnico";

/**
 * Full local state of an Área (as used by areas/page.tsx).
 * Superset of AreaDef — includes all UI-level fields.
 */
export interface EmpresaArea {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string;
  responsable: string;
  correoResponsable: string;
  telefonoResponsable?: string;
  cargosNombres: string[];
  cargosIds: string[];
  dotacionTotal: number;
  asignadosTotal: number;
  vacantesTotal: number;
  trabajadores: number;
  cumplimientoPromedio: number;
  tieneDs44: boolean;
  estado: AreaStatus;
  creadaEl: string;
}

/**
 * Full runtime representation of a Cargo (as used by cargos/page.tsx).
 * Superset of CargoDef — includes all UI-level fields.
 */
export interface EmpresaCargo {
  id: string;
  nombre: string;
  codigo: string;
  areaId: string;
  areaNombre: string;
  tipo: CargoTipoUI;
  descripcion: string;
  perfilSST: string;
  riesgosClave: string;
  requiereDS44: boolean;
  documentosBase: string[];
  capacitacionesBase: string[];
  trabajadores: number;
  centros: string[];
  estado: CargoEstado;
  creadoEl: string;
}

export interface EmpresaStructure {
  areas: EmpresaArea[];
  cargos: EmpresaCargo[];
  tipoPlantilla: TipoEmpresa | null;
}

type MePermissionsPayload = {
  empresaId?: string;
};

// ─── Hydration helpers ────────────────────────────────────────────────── //

function hydrateAreas(saved: PlantillaAplicada): EmpresaArea[] {
  return saved.areas.map((def: AreaDef): EmpresaArea => {
    const mismosCargos = saved.cargos.filter((c: CargoDef) => c.areaId === def.id);
    return {
      id: def.id,
      nombre: def.nombre,
      codigo: def.codigo,
      descripcion: def.descripcion,
      responsable: "",
      correoResponsable: "",
      telefonoResponsable: "",
      cargosNombres: mismosCargos.map((c) => c.nombre),
      cargosIds: mismosCargos.map((c) => c.id),
      dotacionTotal: 0,
      asignadosTotal: 0,
      vacantesTotal: 0,
      trabajadores: 0,
      cumplimientoPromedio: 0,
      tieneDs44: mismosCargos.some((c) => c.requiereDS44),
      estado: "activa",
      creadaEl: new Date().toISOString().slice(0, 10),
    };
  });
}

function hydrateCargos(saved: PlantillaAplicada): EmpresaCargo[] {
  const areaMap = Object.fromEntries(saved.areas.map((a: AreaDef) => [a.id, a.nombre]));
  return saved.cargos.map((def: CargoDef): EmpresaCargo => ({
    id: def.id,
    nombre: def.nombre,
    codigo: def.codigo,
    areaId: def.areaId,
    areaNombre: areaMap[def.areaId] ?? def.areaId,
    tipo: def.tipo as CargoTipoUI,
    descripcion: "",
    perfilSST: "",
    riesgosClave: def.riesgosClave,
    requiereDS44: def.requiereDS44,
    documentosBase: [...def.documentosBase],
    capacitacionesBase: [...def.capacitacionesBase],
    trabajadores: 0,
    centros: [],
    estado: "activo",
    creadoEl: new Date().toISOString().slice(0, 10),
  }));
}

// ─── Store ─────────────────────────────────────────────────────────────── //

function buildScopedStorageKey(empresaId: string | null): string {
  return `${PLANTILLA_STORAGE_KEY}:${empresaId ?? "sin-empresa"}`;
}

function loadInitialStructure(empresaId: string | null): EmpresaStructure {
  if (typeof window === "undefined") {
    // SSR: avoid localStorage and avoid mock data leakage.
    return { areas: [], cargos: [], tipoPlantilla: null };
  }
  try {
    const raw = localStorage.getItem(buildScopedStorageKey(empresaId));
    if (!raw) {
      return { areas: [], cargos: [], tipoPlantilla: null };
    }
    const saved = JSON.parse(raw) as PlantillaAplicada;
    const hydratedAreas = hydrateAreas(saved);
    const hydratedCargos = hydrateCargos(saved);
    if (saved.modo === "agregar") {
      return {
        areas: hydratedAreas,
        cargos: hydratedCargos,
        tipoPlantilla: saved.tipo,
      };
    }
    return { areas: hydratedAreas, cargos: hydratedCargos, tipoPlantilla: saved.tipo };
  } catch {
    return { areas: [], cargos: [], tipoPlantilla: null };
  }
}

function persist(tipo: TipoEmpresa, modo: PlantillaModo, empresaId: string | null): void {
  if (typeof window === "undefined") return;
  const p = PLANTILLAS[tipo];
  const data: PlantillaAplicada = {
    tipo,
    modo,
    areas: p.areas,
    cargos: p.cargos,
    aplicadaEl: new Date().toISOString(),
  };
  localStorage.setItem(buildScopedStorageKey(empresaId), JSON.stringify(data));
}

function clearPersistence(empresaId: string | null): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(buildScopedStorageKey(empresaId));
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────── //

class EmpresaStore {
  private _areas: EmpresaArea[] = [];
  private _cargos: EmpresaCargo[] = [];
  private _tipoPlantilla: TipoEmpresa | null = null;
  private _empresaId: string | null = null;
  private _initialized = false;

  /** Must be called once on the client (in a useEffect). Safe to call multiple times. */
  async init(): Promise<void> {
    if (this._initialized) return;

    if (typeof window !== "undefined") {
      try {
        const response = await fetch("/api/dicaprev/me/permissions", { cache: "no-store" });
        if (response.ok) {
          const payload = (await response.json()) as MePermissionsPayload;
          this._empresaId = typeof payload.empresaId === "string" ? payload.empresaId : null;
        }
      } catch {
        this._empresaId = null;
      }
    }

    const s = loadInitialStructure(this._empresaId);
    this._areas = s.areas;
    this._cargos = s.cargos;
    this._tipoPlantilla = s.tipoPlantilla;
    this._initialized = true;
  }

  // ── Getters ─────────────────────────────────────────────────────────── //

  getActiveStructure(): EmpresaStructure {
    return {
      areas: [...this._areas],
      cargos: [...this._cargos],
      tipoPlantilla: this._tipoPlantilla,
    };
  }

  getAreas(): EmpresaArea[] {
    return [...this._areas];
  }

  getCargos(): EmpresaCargo[] {
    return [...this._cargos];
  }

  getActivePlantillaTipo(): TipoEmpresa | null {
    return this._tipoPlantilla;
  }

  // ── Mutations ───────────────────────────────────────────────────────── //

  /** Replace the full area list (called by areas/page on every local mutation). */
  setAreas(areas: EmpresaArea[]): void {
    this._areas = areas;
  }

  /** Replace the full cargo list (called by cargos/page on every local mutation). */
  setCargos(cargos: EmpresaCargo[]): void {
    this._cargos = cargos;
  }

  /**
   * Apply a company-type template.
   * - "reemplazar": replaces areas + cargos entirely.
   * - "agregar": appends new-ID items to existing lists.
   * Persists the choice to localStorage.
   */
  applyTemplate(tipo: TipoEmpresa, modo: PlantillaModo): void {
    if (modo === "reemplazar") {
      window.alert("El modo reemplazar queda pendiente para evitar afectar áreas, cargos o dotación existente.");
      throw new Error("El modo reemplazar queda pendiente para evitar afectar áreas o cargos existentes");
    }

    persist(tipo, modo, this._empresaId);
    const p = PLANTILLAS[tipo];
    const fake: PlantillaAplicada = {
      tipo,
      modo,
      areas: p.areas,
      cargos: p.cargos,
      aplicadaEl: new Date().toISOString(),
    };
    const hydratedAreas = hydrateAreas(fake);
    const hydratedCargos = hydrateCargos(fake);

    if (modo === "agregar") {
      const existingAreaIds = new Set(this._areas.map((a) => a.id));
      const existingCargoIds = new Set(this._cargos.map((c) => c.id));
      this._areas = [
        ...this._areas,
        ...hydratedAreas.filter((a) => !existingAreaIds.has(a.id)),
      ];
      this._cargos = [
        ...this._cargos,
        ...hydratedCargos.filter((c) => !existingCargoIds.has(c.id)),
      ];
    } else {
      this._areas = hydratedAreas;
      this._cargos = hydratedCargos;
    }
    this._tipoPlantilla = tipo;

  }

  /** Reset to defaults and clear persistence. */
  clearTemplate(): void {
    clearPersistence(this._empresaId);
    this._areas = [];
    this._cargos = [];
    this._tipoPlantilla = null;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────── //

export const empresaStore = new EmpresaStore();

/**
 * Convenience named API — matches the helper names requested.
 * Pages can import these directly instead of reaching into empresaStore.
 */
export function getActiveEmpresaStructure(): EmpresaStructure {
  return empresaStore.getActiveStructure();
}

export function applyEmpresaTemplate(tipo: TipoEmpresa, modo: PlantillaModo): void {
  empresaStore.applyTemplate(tipo, modo);
}

export function replaceEmpresaStructure(
  areas: EmpresaArea[],
  cargos: EmpresaCargo[]
): void {
  empresaStore.setAreas(areas);
  empresaStore.setCargos(cargos);
}

export function mergeEmpresaStructure(
  newAreas: EmpresaArea[],
  newCargos: EmpresaCargo[]
): void {
  const existingAreaIds = new Set(empresaStore.getAreas().map((a) => a.id));
  const existingCargoIds = new Set(empresaStore.getCargos().map((c) => c.id));
  empresaStore.setAreas([
    ...empresaStore.getAreas(),
    ...newAreas.filter((a) => !existingAreaIds.has(a.id)),
  ]);
  empresaStore.setCargos([
    ...empresaStore.getCargos(),
    ...newCargos.filter((c) => !existingCargoIds.has(c.id)),
  ]);
}

export function clearEmpresaTemplate(): void {
  empresaStore.clearTemplate();
}

// ─── Datos básicos de empresa ─────────────────────────────────────────── //

/**
 * Datos básicos de empresa compartidos entre módulos (cumplimiento, reportes…).
 * Fuente de verdad única mientras no hay Firebase.
 * En producción se reemplaza por un listener de Firestore.
 */
export const EMPRESA_MOCK = {
  cantidadTrabajadores: 5,
  nombre: "MVP CHILE SPA",
  /**
   * Estado actual de estructuras SST en la empresa.
   * Usado por hallazgosEstructurales() y EstructurasObligatoriasCard.
   * reglamentoInterno: false → genera un hallazgo de demo en plan-trabajo.
   */
  sst: {
    comiteParitario:         true,
    expertoPrevencion:       true,
    departamentoPrevencion:  false,
    reglamentoInterno:       false,  // pendiente → genera acción estructural
    programaAnual:           true,
    investigacionAccidentes: true,
    planCapacitacion:        true,
  },
} as const;
