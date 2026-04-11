/**
 * reglas-empresa.ts
 *
 * Reglas derivadas por tamaño de empresa según normativa chilena DS44 /
 * Ley 16.744 / Decreto 40.
 *
 * Uso:
 *   import { getReglasEmpresa } from "@/lib/empresa/reglas-empresa";
 *   const reglas = getReglasEmpresa(calcularTamañoEmpresa(dotacion));
 *
 * Arquitectura:
 *   - Pure functions, no React, no app/* imports
 *   - Extensible: agregar nuevas estructuras = agregar campo en ReglasEmpresa
 *   - En producción estas reglas podrían venir de Firestore (config por cliente)
 */

import {
  calcularTamañoEmpresa,
  type TamanoEmpresa,
} from "@/lib/cumplimiento/cumplimiento-engine";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ReglaEstructura {
  /** Si la estructura es legalmente obligatoria para este tamaño */
  obligatorio: boolean;
  /** Razón legal o normativa */
  base: string;
  /** Umbral o condición resumida para mostrar en UI */
  condicion: string;
}

/**
 * Resumen de estructuras y exigencias aplicables a una empresa
 * según su tamaño / dotación.
 */
export interface ReglasEmpresa {
  tamano: TamanoEmpresa;
  /** Reglamento Interno de Higiene y Seguridad (DS44 Art. 14) */
  reglamentoInterno: ReglaEstructura;
  /** Comité Paritario de Higiene y Seguridad — Ley 16.744 Art. 66 */
  comiteParitario: ReglaEstructura;
  /** Departamento de Prevención de Riesgos — DS95 / Ley 16.744 Art. 66 */
  departamentoPrevencion: ReglaEstructura;
  /** Programa Anual de Prevención DS44 */
  programaAnual: ReglaEstructura;
  /** Experto en Prevención de Riesgos */
  expertoPrevencion: ReglaEstructura;
  /** Investigación de Accidentes del Trabajo */
  investigacionAccidentes: ReglaEstructura;
  /** Capacitación en Prevención de Riesgos */
  planCapacitacion: ReglaEstructura;
}

// ─── Definiciones por tamaño ─────────────────────────────────────────────────

const REGLAS_POR_TAMANO: Record<TamanoEmpresa, ReglasEmpresa> = {
  micro: {
    tamano: "micro",
    reglamentoInterno: {
      obligatorio: false,
      base: "Sin exigencia formal para empresas menores a 10 trabajadores",
      condicion: "< 10 trabajadores",
    },
    comiteParitario: {
      obligatorio: false,
      base: "No obligatorio — requiere ≥ 25 trabajadores (Ley 16.744 Art. 66)",
      condicion: "< 25 trabajadores",
    },
    departamentoPrevencion: {
      obligatorio: false,
      base: "No obligatorio — requiere ≥ 100 trabajadores (DS95)",
      condicion: "< 100 trabajadores",
    },
    programaAnual: {
      obligatorio: false,
      base: "Recomendado pero no exigido formalmente bajo 10 trabajadores",
      condicion: "Recomendado",
    },
    expertoPrevencion: {
      obligatorio: false,
      base: "No obligatorio para micro empresa",
      condicion: "< 10 trabajadores",
    },
    investigacionAccidentes: {
      obligatorio: true,
      base: "Obligatorio para toda empresa — Ley 16.744 Art. 76",
      condicion: "Toda empresa",
    },
    planCapacitacion: {
      obligatorio: false,
      base: "Recomendado — no exigido formalmente bajo 10 trabajadores",
      condicion: "Recomendado",
    },
  },

  pequena: {
    tamano: "pequena",
    reglamentoInterno: {
      obligatorio: true,
      base: "Obligatorio ≥ 10 trabajadores — DS44 Art. 14",
      condicion: "≥ 10 trabajadores",
    },
    comiteParitario: {
      obligatorio: false,
      base: "No obligatorio — requiere ≥ 25 trabajadores (Ley 16.744 Art. 66)",
      condicion: "< 25 trabajadores",
    },
    departamentoPrevencion: {
      obligatorio: false,
      base: "No obligatorio — requiere ≥ 100 trabajadores (DS95)",
      condicion: "< 100 trabajadores",
    },
    programaAnual: {
      obligatorio: true,
      base: "Obligatorio ≥ 10 trabajadores — DS44",
      condicion: "≥ 10 trabajadores",
    },
    expertoPrevencion: {
      obligatorio: false,
      base: "No obligatorio bajo 25 trabajadores",
      condicion: "< 25 trabajadores",
    },
    investigacionAccidentes: {
      obligatorio: true,
      base: "Obligatorio para toda empresa — Ley 16.744 Art. 76",
      condicion: "Toda empresa",
    },
    planCapacitacion: {
      obligatorio: true,
      base: "Obligatorio — DS40 / Ley 19.518",
      condicion: "≥ 10 trabajadores",
    },
  },

  mediana: {
    tamano: "mediana",
    reglamentoInterno: {
      obligatorio: true,
      base: "Obligatorio ≥ 10 trabajadores — DS44 Art. 14",
      condicion: "≥ 10 trabajadores",
    },
    comiteParitario: {
      obligatorio: true,
      base: "Obligatorio ≥ 25 trabajadores — Ley 16.744 Art. 66",
      condicion: "≥ 25 trabajadores",
    },
    departamentoPrevencion: {
      obligatorio: false,
      base: "No obligatorio — requiere ≥ 100 trabajadores (DS95)",
      condicion: "< 100 trabajadores",
    },
    programaAnual: {
      obligatorio: true,
      base: "Obligatorio — DS44",
      condicion: "≥ 10 trabajadores",
    },
    expertoPrevencion: {
      obligatorio: true,
      base: "Obligatorio ≥ 25 trabajadores — DS40",
      condicion: "≥ 25 trabajadores",
    },
    investigacionAccidentes: {
      obligatorio: true,
      base: "Obligatorio para toda empresa — Ley 16.744 Art. 76",
      condicion: "Toda empresa",
    },
    planCapacitacion: {
      obligatorio: true,
      base: "Obligatorio — DS40 / Ley 19.518",
      condicion: "≥ 10 trabajadores",
    },
  },

  grande: {
    tamano: "grande",
    reglamentoInterno: {
      obligatorio: true,
      base: "Obligatorio ≥ 10 trabajadores — DS44 Art. 14",
      condicion: "≥ 10 trabajadores",
    },
    comiteParitario: {
      obligatorio: true,
      base: "Obligatorio ≥ 25 trabajadores — Ley 16.744 Art. 66",
      condicion: "≥ 25 trabajadores",
    },
    departamentoPrevencion: {
      obligatorio: true,
      base: "Obligatorio ≥ 100 trabajadores — DS95",
      condicion: "≥ 100 trabajadores",
    },
    programaAnual: {
      obligatorio: true,
      base: "Obligatorio — DS44",
      condicion: "≥ 10 trabajadores",
    },
    expertoPrevencion: {
      obligatorio: true,
      base: "Obligatorio ≥ 25 trabajadores — DS40",
      condicion: "≥ 25 trabajadores",
    },
    investigacionAccidentes: {
      obligatorio: true,
      base: "Obligatorio para toda empresa — Ley 16.744 Art. 76",
      condicion: "Toda empresa",
    },
    planCapacitacion: {
      obligatorio: true,
      base: "Obligatorio — DS40 / Ley 19.518",
      condicion: "≥ 10 trabajadores",
    },
  },
};

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Devuelve las reglas de estructuras obligatorias para un tamaño de empresa.
 *
 * Ejemplo:
 * ```ts
 * const reglas = getReglasEmpresa("mediana");
 * reglas.comiteParitario.obligatorio // true
 * reglas.departamentoPrevencion.obligatorio // false
 * ```
 */
export function getReglasEmpresa(tamano: TamanoEmpresa): ReglasEmpresa {
  return REGLAS_POR_TAMANO[tamano];
}

/**
 * Retorna solo los campos booleanos de aplicabilidad, para uso rápido en UI.
 */
export function getAplicabilidadEmpresa(tamano: TamanoEmpresa) {
  const r = REGLAS_POR_TAMANO[tamano];
  return {
    aplicaReglamentoInterno:    r.reglamentoInterno.obligatorio,
    aplicaComiteParitario:      r.comiteParitario.obligatorio,
    aplicaDeptoPrevencion:      r.departamentoPrevencion.obligatorio,
    aplicaProgramaAnual:        r.programaAnual.obligatorio,
    aplicaExpertoPrevencion:    r.expertoPrevencion.obligatorio,
    aplicaInvestigacionAcc:     r.investigacionAccidentes.obligatorio,
    aplicaPlanCapacitacion:     r.planCapacitacion.obligatorio,
  };
}

/**
 * Devuelve las reglas de estructuras obligatorias calculadas exactamente
 * desde el número de trabajadores, sin depender de la categoría de tamaño.
 *
 * Usa los umbrales legales exactos (no rangos de categoría) para evitar
 * imprecisiones en empresas "pequeñas" con 25–49 trabajadores (donde el
 * comité paritario ya es obligatorio aunque la categoría sea "pequena").
 *
 * Ejemplo:
 * ```ts
 * const reglas = getReglasEmpresaByCount(48);
 * reglas.comiteParitario.obligatorio // true  (48 ≥ 25)
 * reglas.departamentoPrevencion.obligatorio // false (48 < 100)
 * ```
 */
export function getReglasEmpresaByCount(n: number): ReglasEmpresa {
  const tamano = calcularTamañoEmpresa(n);
  return {
    tamano,
    reglamentoInterno: {
      obligatorio: n >= 10,
      base: "DS44 Art. 14 — obligatorio desde 10 trabajadores",
      condicion: n >= 10 ? "≥ 10 trabajadores" : "< 10 trabajadores",
    },
    comiteParitario: {
      obligatorio: n >= 25,
      base: "Ley 16.744 Art. 66 — obligatorio desde 25 trabajadores",
      condicion: n >= 25 ? "≥ 25 trabajadores" : "< 25 trabajadores",
    },
    departamentoPrevencion: {
      obligatorio: n >= 100,
      base: "DS95 — obligatorio desde 100 trabajadores",
      condicion: n >= 100 ? "≥ 100 trabajadores" : "< 100 trabajadores",
    },
    programaAnual: {
      obligatorio: n >= 10,
      base: "DS44 — obligatorio desde 10 trabajadores",
      condicion: n >= 10 ? "≥ 10 trabajadores" : "< 10 trabajadores",
    },
    expertoPrevencion: {
      obligatorio: n >= 25,
      base: "DS40 — obligatorio desde 25 trabajadores",
      condicion: n >= 25 ? "≥ 25 trabajadores" : "< 25 trabajadores",
    },
    investigacionAccidentes: {
      obligatorio: true,
      base: "Ley 16.744 Art. 76 — obligatorio para toda empresa",
      condicion: "Toda empresa",
    },
    planCapacitacion: {
      obligatorio: n >= 10,
      base: "DS40 / Ley 19.518 — obligatorio desde 10 trabajadores",
      condicion: n >= 10 ? "≥ 10 trabajadores" : "< 10 trabajadores",
    },
  };
}

/**
 * Nombres legibles para cada clave de ReglaEstructura,
 * para usar en componentes genéricos.
 */
export const ESTRUCTURA_LABELS: Record<keyof Omit<ReglasEmpresa, "tamano">, string> = {
  reglamentoInterno:      "Reglamento Interno SST",
  comiteParitario:        "Comité Paritario",
  departamentoPrevencion: "Departamento de Prevención",
  programaAnual:          "Programa Anual de Prevención",
  expertoPrevencion:      "Experto en Prevención",
  investigacionAccidentes:"Investigación de Accidentes",
  planCapacitacion:       "Plan de Capacitación",
};
