/**
 * Identificadores y nombres oficiales para impedir que la pauta documental
 * se duplique por abreviaturas (p.ej. RIOHS vs Reglamento Interno).
 */
export function normalizarNombreRequisitoContratista(
  texto: string,
  categoria: "empresa" | "trabajador" | "vehiculo" | "equipo",
): string {
  const nombre = texto.trim().replace(/\s+/g, " ");
  const clave = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  if (categoria === "trabajador") {
    if (/(^| )(riohs|reglamento interno|reglamento de orden higiene|recepcion reglamento)( |$)/.test(clave)) {
      return "Entrega de Reglamento Interno de la empresa";
    }
    if (/^(irl|odi|informacion de riesgos laborales|obligacion de informar)( |$)/.test(clave)) {
      return "Información de riesgos laborales (IRL)";
    }
    if (/(registro de entrega de epp|entrega de epp|elementos de proteccion personal)/.test(clave)) {
      return "Registro de entrega de elementos de protección personal";
    }
  }
  if (categoria === "empresa") {
    if (/^(riohs|reglamento interno de orden higiene y seguridad|reglamento interno)$/.test(clave)) {
      return "Reglamento interno aplicable";
    }
    if (/^f ?30 ?1$/.test(clave)) return "Certificado F30-1 del período y contrato";
    if (/^f ?30$/.test(clave)) return "Certificado de antecedentes laborales y previsionales F30";
  }
  return nombre;
}
