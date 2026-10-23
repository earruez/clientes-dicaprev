/** Prelación establecida en el artículo 9 del DS 44 (Chile).
 * Persistencia compatible: el título documental existente conserva el código,
 * sin modificar el esquema Prisma ni sobrescribir 'origen' (que registra estado).
 */
export const JERARQUIA_CONTROL_DS44 = [
  { codigo: "eliminacion", orden: 1, nombre: "Evitar o eliminar los riesgos", descripcion: "Eliminar el peligro o evitar la exposición a su fuente." },
  { codigo: "fuente", orden: 2, nombre: "Control en la fuente (ingeniería o técnicas)", descripcion: "Controles técnicos o de ingeniería en el origen, incluida sustitución cuando corresponda." },
  { codigo: "administrativa", orden: 3, nombre: "Medidas organizacionales o administrativas", descripcion: "Métodos de trabajo seguro, organización, capacitación o señalización para reducir riesgos." },
  { codigo: "epp", orden: 4, nombre: "Elementos de Protección Personal (EPP)", descripcion: "Protección frente a riesgos residuales, después de priorizar controles de mayor nivel." },
] as const;

export type NivelJerarquiaControlDs44 = (typeof JERARQUIA_CONTROL_DS44)[number]["codigo"];
const PREFIJO = "Medida correctiva DS44 · ";

export function esNivelJerarquiaControlDs44(valor: unknown): valor is NivelJerarquiaControlDs44 {
  return typeof valor === "string" && JERARQUIA_CONTROL_DS44.some((nivel) => nivel.codigo === valor);
}

export function tituloMedidaJerarquiaControlDs44(nivel: NivelJerarquiaControlDs44): string {
  const valor = JERARQUIA_CONTROL_DS44.find((item) => item.codigo === nivel);
  if (!valor) throw new Error("Nivel de jerarquía DS44 no válido.");
  return PREFIJO + valor.codigo;
}

export function leerJerarquiaControlDs44(titulo: string | null | undefined): NivelJerarquiaControlDs44 | null {
  if (!titulo?.startsWith(PREFIJO)) return null;
  const codigo = titulo.slice(PREFIJO.length);
  return esNivelJerarquiaControlDs44(codigo) ? codigo : null;
}

export function nombreJerarquiaControlDs44(codigo: NivelJerarquiaControlDs44 | null | undefined): string {
  return JERARQUIA_CONTROL_DS44.find((nivel) => nivel.codigo === codigo)?.nombre ?? "Sin clasificar (registro anterior)";
}
