/**
 * Single source of truth for Empresa domain reference data.
 *
 * No imports from other project files — safe to import from app routes,
 * page components, and shared components alike.
 *
 * In production these will be replaced by Firestore reads.
 */

/* ─── Area references ─────────────────────────────────────────────────── */

export interface AreaRef {
  id: string;
  nombre: string;
  codigo: string;
}

export const AREA_REFS: AreaRef[] = [
  { id: "a01", nombre: "Producción e Instalación", codigo: "PRD-001" },
  { id: "a02", nombre: "Administración",           codigo: "ADM-001" },
];

/* ─── Cargo references ────────────────────────────────────────────────── */

export interface CargoRef {
  id: string;
  nombre: string;
  /** id of the area this cargo belongs to */
  areaId: string;
  requiereDS44: boolean;
  riesgos: string;
}

export const CARGO_REFS: CargoRef[] = [
  {
    id: "c01", nombre: "Supervisor de Obra",
    areaId: "a01", requiereDS44: true,
    riesgos: "Coordinación de cuadrillas, trabajo en altura, supervisión de instalaciones PVC/aluminio.",
  },
  {
    id: "c02", nombre: "Maestro PVC/Aluminio",
    areaId: "a01", requiereDS44: true,
    riesgos: "Corte y ensamblaje de perfiles, trabajo en altura, herramientas eléctricas, instalaciones en fachada.",
  },
  {
    id: "c03", nombre: "Instalador",
    areaId: "a01", requiereDS44: true,
    riesgos: "Trabajo en altura, andamios, herramientas manuales y eléctricas, exposición a polvo.",
  },
  {
    id: "c04", nombre: "Administrativa",
    areaId: "a02", requiereDS44: false,
    riesgos: "Riesgo ergonómico, uso prolongado de pantallas, riesgo psicosocial.",
  },
];

/* ─── Cargo → Area name mapping ───────────────────────────────────────── */

/**
 * Maps cargo nombre → area nombre.
 *
 * Covers all entries in CARGO_REFS (official cargos) plus extended entries
 * used by the Trabajadores worker-form dropdown.
 */
export const CARGO_TO_AREA: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const cargo of CARGO_REFS) {
    const area = AREA_REFS.find((a) => a.id === cargo.areaId);
    if (area) map[cargo.nombre] = area.nombre;
  }
  // Extended: worker-form cargos not in CARGO_REFS
  return {
    ...map,
    "Supervisor de Obra":  "Producción e Instalación",
    "Maestro PVC/Aluminio": "Producción e Instalación",
    "Instalador":          "Producción e Instalación",
    "Administrativa":      "Administración",
  };
})();
