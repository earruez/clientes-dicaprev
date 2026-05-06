/**
 * obligaciones-empresa/index.ts
 *
 * Capa intermedia que unifica las reglas de aplicabilidad de
 * Documentación Empresa y Cumplimiento DS44.
 *
 * Fuente de verdad:
 *   - aplicaDesdeTrabajadores / aplicaHastaTrabajadores → mismas reglas que
 *     DocumentoRequeridoEmpresa (documentacion/actions.ts)
 *   - tipoObligacion: distingue si la obligación exige solo un documento
 *     ("documental"), solo una estructura organizacional ("estructural"),
 *     o ambos ("mixta").
 *
 * Uso:
 *   import { OBLIGACIONES_EMPRESA_BASE, esObligacionEmpresaAplicable } from "@/lib/obligaciones-empresa";
 */

// ─── Tipo canónico ────────────────────────────────────────────────────────────

export type TipoObligacionEmpresa =
  | "documental"     // Requiere solo subir un documento
  | "estructural"    // Requiere crear una estructura (comité, depto, etc.)
  | "mixta";         // Requiere tanto documento como estructura

export interface ObligacionEmpresa {
  /** ID único estable — se alinea con documentoRequeridoId cuando aplica */
  id: string;
  nombre: string;
  tipoObligacion: TipoObligacionEmpresa;
  descripcion: string;
  referenciaLegal: string;
  /**
   * Umbral mínimo de trabajadores para que la obligación sea aplicable.
   * null → aplica desde 1 trabajador (toda empresa).
   */
  aplicaDesdeTrabajadores: number | null;
  /**
   * Umbral máximo de trabajadores (inclusive). null → sin límite superior.
   */
  aplicaHastaTrabajadores: number | null;
  /** Si la obligación exige acreditar un documento físico/digital */
  requiereDocumento: boolean;
}

// ─── Fuente de verdad ─────────────────────────────────────────────────────────

export const OBLIGACIONES_EMPRESA_BASE: ObligacionEmpresa[] = [
  // ── Legales empresa ───────────────────────────────────────────────────────
  {
    id: "oe-rut",
    nombre: "RUT empresa",
    tipoObligacion: "documental",
    descripcion: "Número de identificación tributaria de la empresa.",
    referenciaLegal: "SII / Ley 20.659",
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  {
    id: "oe-escritura",
    nombre: "Escritura de constitución y modificaciones",
    tipoObligacion: "documental",
    descripcion: "Escritura pública de constitución y todas sus modificaciones vigentes.",
    referenciaLegal: "Código de Comercio / Código Civil",
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  {
    id: "oe-vigencia-sociedad",
    nombre: "Certificado de vigencia de la sociedad",
    tipoObligacion: "documental",
    descripcion: "Certificado emitido por el Registro Civil o el CBR que acredita la vigencia.",
    referenciaLegal: "Registro Civil / CBR",
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  {
    id: "oe-personeria",
    nombre: "Personería o poder vigente del representante legal",
    tipoObligacion: "documental",
    descripcion: "Documento que acredita la representación legal vigente.",
    referenciaLegal: "Código Civil / Código de Comercio",
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  // ── Laborales y previsionales ────────────────────────────────────────────
  {
    id: "oe-f30",
    nombre: "Certificado F30",
    tipoObligacion: "documental",
    descripcion: "Certificado de antecedentes laborales y previsionales.",
    referenciaLegal: "DT / AFC / Previsión",
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  {
    id: "oe-f30-1",
    nombre: "Certificado F30-1",
    tipoObligacion: "documental",
    descripcion: "Certificado de cumplimiento de obligaciones laborales y previsionales.",
    referenciaLegal: "Código del Trabajo Art. 183-C",
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  {
    id: "oe-nomina",
    nombre: "Nómina de trabajadores vigente",
    tipoObligacion: "documental",
    descripcion: "Listado actualizado de todos los trabajadores en relación laboral.",
    referenciaLegal: "Código del Trabajo / DT",
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  {
    id: "oe-previred",
    nombre: "Certificado de deuda previsional / Previred",
    tipoObligacion: "documental",
    descripcion: "Comprobante de pago de cotizaciones previsionales al día.",
    referenciaLegal: "DL 3.500 / Ley 16.744",
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  // ── Mutualidad / Ley 16.744 ───────────────────────────────────────────────
  {
    id: "oe-mutualidad",
    nombre: "Certificado de afiliación a mutualidad / ISL",
    tipoObligacion: "documental",
    descripcion: "Acreditación de afiliación a un organismo administrador del seguro laboral.",
    referenciaLegal: "Ley 16.744 Art. 11",
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  // ── SST — toda empresa ────────────────────────────────────────────────────
  {
    id: "oe-iper",
    nombre: "Matriz IPER",
    tipoObligacion: "documental",
    descripcion: "Matriz de Identificación de Peligros y Evaluación de Riesgos vigente.",
    referenciaLegal: "DS44 / NCh OHSAS 18001",
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  {
    id: "oe-plan-emergencia",
    nombre: "Plan de emergencia",
    tipoObligacion: "documental",
    descripcion: "Plan de emergencia y evacuación difundido y practicado.",
    referenciaLegal: "DS594 Art. 44 / DS44",
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  {
    id: "oe-investigacion-accidentes",
    nombre: "Procedimiento de investigación de accidentes",
    tipoObligacion: "documental",
    descripcion: "Procedimiento formal para investigar accidentes del trabajo.",
    referenciaLegal: "Ley 16.744 / DS101",
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  {
    id: "oe-epp",
    nombre: "Procedimiento de entrega y reposición de EPP",
    tipoObligacion: "documental",
    descripcion: "Procedimiento documentado para la gestión de equipos de protección personal.",
    referenciaLegal: "DS594 Art. 53 / DS44",
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  {
    id: "oe-protocolos",
    nombre: "Documentos de protocolos aplicables",
    tipoObligacion: "documental",
    descripcion: "Protocolos psicosocial, TMERT, MMC, UV, PREXOR según exposición.",
    referenciaLegal: "MINSAL / SUSESO / ISP",
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  // ── SST — desde 10 trabajadores ──────────────────────────────────────────
  {
    id: "oe-riohs",
    nombre: "Reglamento Interno de Orden, Higiene y Seguridad (RIOHS)",
    tipoObligacion: "mixta",
    descripcion: "Reglamento actualizado, firmado y distribuido a todos los trabajadores.",
    referenciaLegal: "Código del Trabajo Art. 153 / DS44 Art. 14",
    aplicaDesdeTrabajadores: 10,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  {
    id: "oe-programa-trabajo",
    nombre: "Programa de trabajo preventivo / plan anual de prevención",
    tipoObligacion: "documental",
    descripcion: "Programa aprobado con indicadores y metas para el año en curso.",
    referenciaLegal: "DS44 Título II",
    aplicaDesdeTrabajadores: 10,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  {
    id: "oe-plan-capacitacion",
    nombre: "Plan de capacitación",
    tipoObligacion: "documental",
    descripcion: "Plan anual de capacitación en prevención de riesgos.",
    referenciaLegal: "Ley 19.518 SENCE / DS44",
    aplicaDesdeTrabajadores: 10,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  {
    id: "oe-matriz-capacitaciones",
    nombre: "Formato / matriz de capacitaciones obligatorias",
    tipoObligacion: "documental",
    descripcion: "Registro de capacitaciones obligatorias realizadas.",
    referenciaLegal: "DS44 / Ley 19.518",
    aplicaDesdeTrabajadores: 10,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  // ── SST — desde 25 trabajadores ──────────────────────────────────────────
  {
    id: "oe-comite-paritario",
    nombre: "Constitución Comité Paritario",
    tipoObligacion: "mixta",
    descripcion: "Comité Paritario de Higiene y Seguridad constituido y en operación.",
    referenciaLegal: "Ley 16.744 Art. 66 / DS54",
    aplicaDesdeTrabajadores: 25,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  {
    id: "oe-actas-comite",
    nombre: "Actas Comité Paritario",
    tipoObligacion: "documental",
    descripcion: "Actas de sesiones del Comité Paritario al día.",
    referenciaLegal: "DS54 Art. 23",
    aplicaDesdeTrabajadores: 25,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  {
    id: "oe-experto-prevencion",
    nombre: "Designación encargado/experto en prevención",
    tipoObligacion: "mixta",
    descripcion: "Experto en Prevención de Riesgos designado formalmente.",
    referenciaLegal: "DS40 / DS44",
    aplicaDesdeTrabajadores: 25,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
  // ── SST — desde 100 trabajadores ─────────────────────────────────────────
  {
    id: "oe-depto-prevencion",
    nombre: "Constitución Departamento de Prevención",
    tipoObligacion: "mixta",
    descripcion: "Departamento de Prevención de Riesgos constituido según DS95.",
    referenciaLegal: "DS95 / Ley 16.744 Art. 66",
    aplicaDesdeTrabajadores: 100,
    aplicaHastaTrabajadores: null,
    requiereDocumento: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determina si una obligación aplica a la empresa según su dotación actual.
 */
export function esObligacionEmpresaAplicable(
  ob: ObligacionEmpresa,
  nTrabajadores: number
): boolean {
  const desdeOk =
    ob.aplicaDesdeTrabajadores === null ||
    nTrabajadores >= ob.aplicaDesdeTrabajadores;
  const hastaOk =
    ob.aplicaHastaTrabajadores === null ||
    nTrabajadores <= ob.aplicaHastaTrabajadores;
  return desdeOk && hastaOk;
}

/**
 * Devuelve solo las obligaciones aplicables para la dotación dada.
 */
export function obligacionesAplicables(
  nTrabajadores: number,
  lista: ObligacionEmpresa[] = OBLIGACIONES_EMPRESA_BASE
): ObligacionEmpresa[] {
  return lista.filter((ob) => esObligacionEmpresaAplicable(ob, nTrabajadores));
}

/**
 * Etiqueta de aplicabilidad para mostrar en UI.
 */
export function labelAplicabilidad(ob: ObligacionEmpresa): string {
  if (ob.aplicaDesdeTrabajadores === null || ob.aplicaDesdeTrabajadores <= 1) {
    return "Aplica a toda empresa";
  }
  return `Aplica desde ${ob.aplicaDesdeTrabajadores} trabajadores`;
}
