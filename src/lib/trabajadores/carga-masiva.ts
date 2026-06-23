export const MAX_ARCHIVO_TRABAJADORES_BYTES = 5 * 1024 * 1024;
export const MAX_FILAS_TRABAJADORES = 1000;

export const TIPOS_CONTRATO = ["Indefinido", "Plazo Fijo", "Por Obra", "Part Time"] as const;
export const ESTADOS_TRABAJADOR = ["Activo", "Inactivo", "Licencia", "Vacaciones"] as const;

export type FilaExcel = {
  fila: number;
  rut: unknown;
  nombres: unknown;
  apellidos: unknown;
  email: unknown;
  telefono: unknown;
  fechaNacimiento: unknown;
  fechaIngreso: unknown;
  cargo: unknown;
  area: unknown;
  centroTrabajo: unknown;
  tipoContrato: unknown;
  estado: unknown;
};

export type FilaNormalizada = {
  fila: number;
  rut: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  fechaIngreso: string;
  cargo: string;
  area: string;
  centroTrabajo: string;
  tipoContrato: (typeof TIPOS_CONTRATO)[number];
  estado: (typeof ESTADOS_TRABAJADOR)[number];
};

export type CatalogosCarga = {
  cargos: Array<{ id: string; nombre: string; areaId: string | null }>;
  areas: Array<{ id: string; nombre: string }>;
  centros: Array<{ id: string; nombre: string }>;
  rutsExistentes: string[];
};

export type IncidenciaCarga = {
  fila: number;
  trabajador: string;
  campo: string;
  mensaje: string;
  tipo: "error" | "advertencia";
};

const texto = (value: unknown) => value instanceof Date
  ? value.toISOString().slice(0, 10)
  : String(value ?? "").trim();

export function normalizarClave(value: unknown): string {
  return texto(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function normalizarRut(value: unknown): string {
  const limpio = texto(value).replace(/[^0-9kK]/g, "").toUpperCase();
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpo}-${limpio.slice(-1)}`;
}

export function esRutChilenoValido(value: unknown): boolean {
  const limpio = texto(value).replace(/[^0-9kK]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false;
  const cuerpo = limpio.slice(0, -1);
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return limpio.slice(-1) === esperado;
}

export function normalizarFechaExcel(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000).toISOString().slice(0, 10);
  }
  const raw = texto(value);
  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  const local = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  const parts = iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])] : local ? [Number(local[3]), Number(local[2]), Number(local[1])] : null;
  if (!parts) return null;
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (date.getUTCFullYear() !== parts[0] || date.getUTCMonth() !== parts[1] - 1 || date.getUTCDate() !== parts[2]) return null;
  return date.toISOString().slice(0, 10);
}

function permitido<T extends string>(value: unknown, valores: readonly T[]): T | null {
  const clave = normalizarClave(value);
  return valores.find((item) => normalizarClave(item) === clave) ?? null;
}

export function validarFilas(filas: FilaExcel[], catalogos: CatalogosCarga) {
  const incidencias: IncidenciaCarga[] = [];
  const normalizadas: FilaNormalizada[] = [];
  const vistos = new Set<string>();
  const existentes = new Set(catalogos.rutsExistentes.map(normalizarRut));
  const cargos = new Map(catalogos.cargos.map((item) => [normalizarClave(item.nombre), item]));
  const areas = new Map(catalogos.areas.map((item) => [normalizarClave(item.nombre), item]));
  const centros = new Map(catalogos.centros.map((item) => [normalizarClave(item.nombre), item]));

  for (const fila of filas) {
    const label = `${texto(fila.nombres)} ${texto(fila.apellidos)}`.trim() || normalizarRut(fila.rut) || "Sin identificar";
    const reportar = (campo: string, mensaje: string, tipo: IncidenciaCarga["tipo"] = "error") =>
      incidencias.push({ fila: fila.fila, trabajador: label, campo, mensaje, tipo });
    const rut = normalizarRut(fila.rut);
    const nombres = texto(fila.nombres);
    const apellidos = texto(fila.apellidos);
    const email = texto(fila.email).toLowerCase();
    const telefono = texto(fila.telefono);
    const fechaNacimiento = normalizarFechaExcel(fila.fechaNacimiento);
    const fechaIngreso = normalizarFechaExcel(fila.fechaIngreso);
    const cargo = cargos.get(normalizarClave(fila.cargo));
    const area = areas.get(normalizarClave(fila.area));
    const centro = centros.get(normalizarClave(fila.centroTrabajo));
    const tipoContrato = permitido(fila.tipoContrato, TIPOS_CONTRATO);
    const estado = permitido(fila.estado || "Activo", ESTADOS_TRABAJADOR);

    if (!rut) reportar("RUT", "El RUT es obligatorio.");
    else if (!esRutChilenoValido(rut)) reportar("RUT", "El RUT no es válido.");
    else if (vistos.has(rut)) reportar("RUT", "El RUT está repetido dentro del archivo.");
    else if (existentes.has(rut)) reportar("RUT", "Ya existe un trabajador con este RUT en la empresa.");
    vistos.add(rut);
    if (!nombres) reportar("Nombres", "Los nombres son obligatorios.");
    if (!apellidos) reportar("Apellidos", "Los apellidos son obligatorios.");
    if (!email) reportar("Correo", "El correo es obligatorio.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) reportar("Correo", "El correo no tiene un formato válido.");
    if (!texto(fila.fechaNacimiento)) reportar("Fecha de nacimiento", "La fecha de nacimiento es obligatoria.");
    else if (!fechaNacimiento) reportar("Fecha de nacimiento", "Use una fecha válida con formato AAAA-MM-DD.");
    if (!texto(fila.fechaIngreso)) reportar("Fecha de ingreso", "La fecha de ingreso es obligatoria.");
    else if (!fechaIngreso) reportar("Fecha de ingreso", "Use una fecha válida con formato AAAA-MM-DD.");
    if (!cargo) reportar("Cargo", texto(fila.cargo) ? "El cargo no existe en la empresa activa." : "El cargo es obligatorio.");
    if (!area) reportar("Área", texto(fila.area) ? "El área no existe en la empresa activa." : "El área es obligatoria.");
    if (!centro) reportar("Centro de trabajo", texto(fila.centroTrabajo) ? "El centro no existe en la empresa activa." : "El centro es obligatorio.");
    if (!tipoContrato) reportar("Tipo de contrato", "El tipo de contrato no está permitido.");
    if (!estado) reportar("Estado", "El estado no está permitido.");
    if (cargo?.areaId && area && cargo.areaId !== area.id) reportar("Área", "El área no corresponde al cargo seleccionado.");
    if (!telefono) reportar("Teléfono", "No se informó un teléfono de contacto.", "advertencia");

    normalizadas.push({ fila: fila.fila, rut, nombres, apellidos, email, telefono, fechaNacimiento: fechaNacimiento ?? "", fechaIngreso: fechaIngreso ?? "", cargo: texto(fila.cargo), area: texto(fila.area), centroTrabajo: texto(fila.centroTrabajo), tipoContrato: tipoContrato ?? "Indefinido", estado: estado ?? "Activo" });
  }
  return { filas: normalizadas, incidencias };
}
