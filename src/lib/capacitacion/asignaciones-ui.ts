export type EnvioEstadoUI = "no_enviado" | "enviado" | "fallido" | "reenviado";
export type AvanceEstadoUI = "pendiente" | "link_abierto" | "iniciada" | "completada" | "aprobada" | "reprobada";

const ENVIO_KEYS: Readonly<Record<EnvioEstadoUI, true>> = {
  no_enviado: true,
  enviado: true,
  fallido: true,
  reenviado: true,
};

const AVANCE_KEYS: Readonly<Record<AvanceEstadoUI, true>> = {
  pendiente: true,
  link_abierto: true,
  iniciada: true,
  completada: true,
  aprobada: true,
  reprobada: true,
};

export function normalizeEnvioEstado(value?: string | null): EnvioEstadoUI {
  if (!value) return "no_enviado";
  return value in ENVIO_KEYS ? (value as EnvioEstadoUI) : "no_enviado";
}

export function normalizeAvanceEstado(value?: string | null): AvanceEstadoUI {
  if (!value) return "pendiente";
  return value in AVANCE_KEYS ? (value as AvanceEstadoUI) : "pendiente";
}

export async function loadTabAsignacionesData<TAsignacion, TCatalogo, TTrabajador>(deps: {
  getAsignaciones: () => Promise<TAsignacion[]>;
  getCatalogo: () => Promise<TCatalogo[]>;
  getTrabajadoresAsignables: () => Promise<TTrabajador[]>;
}): Promise<{
  asignaciones: TAsignacion[];
  catalogo: TCatalogo[];
  trabajadores: TTrabajador[];
  asignacionesError: string | null;
  catalogoError: string | null;
  trabajadoresError: string | null;
}> {
  const [asignacionesResult, catalogoResult, trabajadoresResult] = await Promise.allSettled([
    deps.getAsignaciones(),
    deps.getCatalogo(),
    deps.getTrabajadoresAsignables(),
  ]);

  return {
    asignaciones: asignacionesResult.status === "fulfilled" ? asignacionesResult.value : [],
    catalogo: catalogoResult.status === "fulfilled" ? catalogoResult.value : [],
    trabajadores: trabajadoresResult.status === "fulfilled" ? trabajadoresResult.value : [],
    asignacionesError:
      asignacionesResult.status === "rejected"
        ? "No se pudieron cargar las asignaciones."
        : null,
    catalogoError:
      catalogoResult.status === "rejected"
        ? "No se pudo cargar el catálogo de capacitaciones."
        : null,
    trabajadoresError:
      trabajadoresResult.status === "rejected"
        ? "No se pudieron cargar trabajadores asignables."
        : null,
  };
}
