/** Clave visual de un documento corporativo, independiente de acentos y guiones. */
export function claveDocumentoRevision(nombre: string): string {
  return nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Agrupa requisitos duplicados sin fusionar ni eliminar archivos, estados o auditoría. */
export function agruparDocumentosRevision<T extends { nombre: string }>(requisitos: readonly T[]) {
  const grupos = new Map<string, T[]>();
  for (const requisito of requisitos) {
    const clave = claveDocumentoRevision(requisito.nombre);
    const grupo = grupos.get(clave) || [];
    grupo.push(requisito);
    grupos.set(clave, grupo);
  }
  return Array.from(grupos.values());
}
