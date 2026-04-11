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

import { AREA_REFS, CARGO_REFS } from "./domain";
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
 * Full runtime representation of an Área (as used by areas/page.tsx).
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

// ─── Default mock data (used when no template is active) ──────────────── //

function cargosDeArea(areaId: string) {
  return CARGO_REFS.filter((c) => c.areaId === areaId);
}

const DEFAULT_AREAS: EmpresaArea[] = [
  {
    ...AREA_REFS[0],
    descripcion:
      "Fabricación e instalación de ventanas y cerramientos de PVC y aluminio. Coordina cuadrillas en terreno, controla calidad de instalaciones y gestiona cumplimiento SST operativo.",
    responsable: "Juan Muñoz Carvajal",
    correoResponsable: "j.munoz@mvpchile.cl",
    telefonoResponsable: "+56 9 8821 4402",
    cargosIds: cargosDeArea("a01").map((c) => c.id),
    cargosNombres: cargosDeArea("a01").map((c) => c.nombre),
    tieneDs44: cargosDeArea("a01").some((c) => c.requiereDS44),
    dotacionTotal: 5, asignadosTotal: 4, vacantesTotal: 1,
    trabajadores: 4, cumplimientoPromedio: 58,
    estado: "activa", creadaEl: "2024-01-10",
  },
  {
    ...AREA_REFS[1],
    descripcion:
      "Gestión administrativa, soporte documental SST y coordinación de recursos humanos. Opera desde la sede central.",
    responsable: "Cristina Reyes Soto",
    correoResponsable: "c.reyes@mvpchile.cl",
    telefonoResponsable: "+56 9 7741 3301",
    cargosIds: cargosDeArea("a02").map((c) => c.id),
    cargosNombres: cargosDeArea("a02").map((c) => c.nombre),
    tieneDs44: cargosDeArea("a02").some((c) => c.requiereDS44),
    dotacionTotal: 1, asignadosTotal: 1, vacantesTotal: 0,
    trabajadores: 1, cumplimientoPromedio: 100,
    estado: "activa", creadaEl: "2024-01-10",
  },
];

const DEFAULT_CARGOS: EmpresaCargo[] = [
  {
    id: "c01", nombre: "Supervisor de Obra", codigo: "SUP-001",
    areaId: "a01", areaNombre: "Producción e Instalación", tipo: "Supervisión",
    descripcion: "Coordina cuadrillas de instalación, supervisa faenas en terreno y controla el cumplimiento SST en proyectos de ventanas PVC/aluminio.",
    perfilSST: "Conocimiento trabajo en altura, procedimientos de seguridad en instalación.",
    riesgosClave: "Trabajo en altura, coordinación de cuadrillas, herramientas eléctricas.",
    requiereDS44: true,
    documentosBase: ["Contrato de trabajo", "ODI firmada", "Notificación DS44", "Registro formación"],
    capacitacionesBase: ["Inducción SST empresa", "ODI", "Trabajo en altura", "Investigación de incidentes", "Primeros auxilios"],
    trabajadores: 1, centros: ["Sede Central MVP Chile"],
    estado: "activo", creadoEl: "2024-01-10",
  },
  {
    id: "c02", nombre: "Maestro PVC/Aluminio", codigo: "MPV-001",
    areaId: "a01", areaNombre: "Producción e Instalación", tipo: "Técnico",
    descripcion: "Fabrica e instala ventanas y cerramientos de PVC y aluminio. Opera en taller y en terreno.",
    perfilSST: "Trabajo con herramientas eléctricas, riesgo de corte, ruido, polvo y trabajo en altura.",
    riesgosClave: "Corte de perfiles, trabajo en altura, herramientas eléctricas, exposición a polvo.",
    requiereDS44: true,
    documentosBase: ["Contrato de trabajo", "ODI firmada", "Notificación DS44", "Certificado de competencia"],
    capacitacionesBase: ["Inducción SST empresa", "ODI", "Trabajo en altura"],
    trabajadores: 2, centros: ["Sede Central MVP Chile"],
    estado: "activo", creadoEl: "2024-01-10",
  },
  {
    id: "c03", nombre: "Instalador", codigo: "INS-001",
    areaId: "a01", areaNombre: "Producción e Instalación", tipo: "Operativo",
    descripcion: "Ejecuta la instalación de ventanas y cerramientos en obra. Opera en terreno bajo supervisión directa.",
    perfilSST: "Trabajo en altura y andamios. Herramientas manuales y eléctricas.",
    riesgosClave: "Trabajo en altura en fachadas, andamios, herramientas manuales y eléctricas, ruido.",
    requiereDS44: true,
    documentosBase: ["Contrato de trabajo", "ODI firmada", "Examen preocupacional"],
    capacitacionesBase: ["Inducción SST empresa", "ODI", "Trabajo en altura"],
    trabajadores: 1, centros: ["Sede Central MVP Chile"],
    estado: "activo", creadoEl: "2024-01-10",
  },
  {
    id: "c04", nombre: "Administrativa", codigo: "ADM-001",
    areaId: "a02", areaNombre: "Administración", tipo: "Administración",
    descripcion: "Gestiona documentación, facturación, coordinación de agenda y soporte administrativo general.",
    perfilSST: "Ergonomía y pantallas. Pausas activas. Riesgo psicosocial.",
    riesgosClave: "Trabajo repetitivo, pantalla, sedentarismo, carga mental.",
    requiereDS44: false,
    documentosBase: ["Contrato de trabajo", "Evaluación ergonómica"],
    capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina"],
    trabajadores: 1, centros: ["Sede Central MVP Chile"],
    estado: "activo", creadoEl: "2024-01-10",
  },
];

// ─── Hydration helpers ─────────────────────────────────────────────────── //

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

function loadInitialStructure(): EmpresaStructure {
  if (typeof window === "undefined") {
    // SSR: return defaults, no localStorage access
    return { areas: DEFAULT_AREAS, cargos: DEFAULT_CARGOS, tipoPlantilla: null };
  }
  try {
    const raw = localStorage.getItem(PLANTILLA_STORAGE_KEY);
    if (!raw) {
      return { areas: DEFAULT_AREAS, cargos: DEFAULT_CARGOS, tipoPlantilla: null };
    }
    const saved = JSON.parse(raw) as PlantillaAplicada;
    const hydratedAreas = hydrateAreas(saved);
    const hydratedCargos = hydrateCargos(saved);
    if (saved.modo === "agregar") {
      const existingAreaIds = new Set(DEFAULT_AREAS.map((a) => a.id));
      const existingCargoIds = new Set(DEFAULT_CARGOS.map((c) => c.id));
      return {
        areas: [
          ...DEFAULT_AREAS,
          ...hydratedAreas.filter((a) => !existingAreaIds.has(a.id)),
        ],
        cargos: [
          ...DEFAULT_CARGOS,
          ...hydratedCargos.filter((c) => !existingCargoIds.has(c.id)),
        ],
        tipoPlantilla: saved.tipo,
      };
    }
    return { areas: hydratedAreas, cargos: hydratedCargos, tipoPlantilla: saved.tipo };
  } catch {
    return { areas: DEFAULT_AREAS, cargos: DEFAULT_CARGOS, tipoPlantilla: null };
  }
}

function persist(tipo: TipoEmpresa, modo: PlantillaModo): void {
  if (typeof window === "undefined") return;
  const p = PLANTILLAS[tipo];
  const data: PlantillaAplicada = {
    tipo,
    modo,
    areas: p.areas,
    cargos: p.cargos,
    aplicadaEl: new Date().toISOString(),
  };
  localStorage.setItem(PLANTILLA_STORAGE_KEY, JSON.stringify(data));
}

function clearPersistence(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(PLANTILLA_STORAGE_KEY);
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────── //

class EmpresaStore {
  private _areas: EmpresaArea[] = DEFAULT_AREAS;
  private _cargos: EmpresaCargo[] = DEFAULT_CARGOS;
  private _tipoPlantilla: TipoEmpresa | null = null;
  private _initialized = false;

  /** Must be called once on the client (in a useEffect). Safe to call multiple times. */
  init(): void {
    if (this._initialized) return;
    const s = loadInitialStructure();
    this._areas = s.areas;
    this._cargos = s.cargos;
    this._tipoPlantilla = s.tipoPlantilla;
    this._initialized = true;
  }

  // ── Getters ──────────────────────────────────────────────────────────── //

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

  // ── Mutations ────────────────────────────────────────────────────────── //

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
    persist(tipo, modo);
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
    clearPersistence();
    this._areas = DEFAULT_AREAS;
    this._cargos = DEFAULT_CARGOS;
    this._tipoPlantilla = null;
  }
}

// ─── Exports ───────────────────────────────────────────────────────────── //

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
