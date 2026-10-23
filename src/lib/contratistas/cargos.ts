/**
 * Sugerencias globales para CONTRATISTAS.
 * No dependen del catálogo de cargos de los trabajadores de la mandante.
 * Los cargos propios de cada contratista siguen siendo admitidos.
 */
export const CARGOS_SUGERIDOS_CONTRATISTAS = [
  { grupo: "Construcción y montaje", nombre: "Maestro de obras", aliases: ["maestro obra"] },
  { grupo: "Construcción y montaje", nombre: "Supervisor de obra", aliases: ["supervisor obra", "supervisor terreno"] },
  { grupo: "Construcción y montaje", nombre: "Capataz", aliases: [] },
  { grupo: "Construcción y montaje", nombre: "Jornal", aliases: ["jornalero", "jornal de obra"] },
  { grupo: "Construcción y montaje", nombre: "Ayudante", aliases: ["ayudante general"] },
  { grupo: "Construcción y montaje", nombre: "Albañil", aliases: ["albanil"] },
  { grupo: "Construcción y montaje", nombre: "Carpintero", aliases: ["carpintero de obra"] },
  { grupo: "Construcción y montaje", nombre: "Enfierrador", aliases: [] },
  { grupo: "Construcción y montaje", nombre: "Soldador", aliases: ["maestro soldador", "soldadura"] },
  { grupo: "Construcción y montaje", nombre: "Electricista", aliases: ["electrico", "eléctrico", "maestro electrico", "maestro eléctrico", "instalador eléctrico"] },
  { grupo: "Construcción y montaje", nombre: "Gasfíter", aliases: ["gasfiter", "gásfiter", "instalador sanitario"] },
  { grupo: "Construcción y montaje", nombre: "Pintor", aliases: ["maestro pintor"] },
  { grupo: "Construcción y montaje", nombre: "Instalador de aluminio y vidrio", aliases: ["instalador de aluminio", "instalador aluminio", "instalador ventanas", "instalador de ventanas"] },
  { grupo: "Construcción y montaje", nombre: "Vidriero", aliases: ["instalador de cristales"] },
  { grupo: "Construcción y montaje", nombre: "Montajista", aliases: ["montador", "montador de estructuras"] },
  { grupo: "Construcción y montaje", nombre: "Techador", aliases: ["instalador de techumbre"] },
  { grupo: "Construcción y montaje", nombre: "Rigger", aliases: ["señalero", "riguer"] },
  { grupo: "Construcción y montaje", nombre: "Operador de grúa", aliases: ["operador grua"] },
  { grupo: "Construcción y montaje", nombre: "Operador de plataforma elevadora", aliases: ["operador alzahombre", "operador manlift", "operador plataforma"] },
  { grupo: "Construcción y montaje", nombre: "Operador de maquinaria pesada", aliases: ["operador maquinaria", "operador maquinaria pesada"] },
  { grupo: "Construcción y montaje", nombre: "Operador de retroexcavadora", aliases: ["operador retroexcavadora"] },
  { grupo: "Mantenimiento y servicios técnicos", nombre: "Mecánico de mantenimiento", aliases: ["mecanico mantencion", "mecánico de mantención"] },
  { grupo: "Mantenimiento y servicios técnicos", nombre: "Técnico en climatización", aliases: ["tecnico clima", "técnico climatización", "tecnico hvac"] },
  { grupo: "Mantenimiento y servicios técnicos", nombre: "Técnico en redes", aliases: ["instalador de redes", "tecnico redes"] },
  { grupo: "Mantenimiento y servicios técnicos", nombre: "Técnico en seguridad electrónica", aliases: ["instalador de camaras", "instalador cctv"] },
  { grupo: "Mantenimiento y servicios técnicos", nombre: "Operador de planta", aliases: [] },
  { grupo: "Transporte y logística", nombre: "Conductor", aliases: ["chofer", "chófer"] },
  { grupo: "Transporte y logística", nombre: "Conductor de camión", aliases: ["chofer de camion", "chófer de camión"] },
  { grupo: "Transporte y logística", nombre: "Peoneta", aliases: ["ayudante de reparto"] },
  { grupo: "Transporte y logística", nombre: "Bodeguero", aliases: ["operario de bodega"] },
  { grupo: "Transporte y logística", nombre: "Operador de grúa horquilla", aliases: ["grua horquilla", "operador grúa horquilla", "gruero horquilla"] },
  { grupo: "Servicios generales", nombre: "Auxiliar de aseo", aliases: ["auxiliar limpieza", "personal de aseo"] },
  { grupo: "Servicios generales", nombre: "Jardinero", aliases: ["jardineria", "mantención jardines"] },
  { grupo: "Servicios generales", nombre: "Guardia de seguridad", aliases: ["guardia"] },
  { grupo: "Servicios generales", nombre: "Conserje", aliases: [] },
  { grupo: "Supervisión y prevención", nombre: "Prevencionista de riesgos", aliases: ["experto prevencion", "experto en prevencion de riesgos", "asesor sst"] },
  { grupo: "Supervisión y prevención", nombre: "Administrador de contrato", aliases: ["administrador contrato"] },
  { grupo: "Supervisión y prevención", nombre: "Inspector técnico de obra", aliases: ["ito", "inspector tecnico obra"] },
] as const;

function claveCargo(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es").replace(/[^a-z0-9]+/g, " ").trim();
}

const CARGOS_CANONICOS = new Map<string, string>();
for (const item of CARGOS_SUGERIDOS_CONTRATISTAS) {
  CARGOS_CANONICOS.set(claveCargo(item.nombre), item.nombre);
  for (const alias of item.aliases) CARGOS_CANONICOS.set(claveCargo(alias), item.nombre);
}

/** Normaliza solo equivalencias conocidas. Un cargo propio sigue permitido. */
export function normalizarCargoContratista(input: string): string {
  const nombre = String(input || "").trim().replace(/\s+/g, " ").slice(0, 160);
  return CARGOS_CANONICOS.get(claveCargo(nombre)) ?? nombre;
}

export function claveAgrupacionCargoContratista(input: string): string {
  return claveCargo(normalizarCargoContratista(input));
}
