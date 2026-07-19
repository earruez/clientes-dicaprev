"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import { getDs44DiagnosticoData } from "../diagnostico/actions";
import type { Ds44Brecha } from "../diagnostico/catalogo";
import {
  DS44_PLAN_ESTADOS,
  type Ds44PlanAccion,
  type Ds44PlanEstado,
  type Ds44PlanImplementacionData,
  type Ds44PlanOrden,
  type Ds44PlanPrioridad,
  type Ds44ResponsableDisponible,
  type GuardarDs44PlanAccionInput,
  type GuardarDs44PlanAccionResult,
} from "./types";

function prioridadPeso(prioridad: Ds44PlanPrioridad): number {
  if (prioridad === "critica") return 4;
  if (prioridad === "alta") return 3;
  if (prioridad === "media") return 2;
  return 1;
}

function prioridadToOrden(prioridad: Ds44PlanPrioridad): Ds44PlanOrden {
  if (prioridad === "critica") return "inmediatas";
  if (prioridad === "alta") return "altas";
  if (prioridad === "media") return "medias";
  return "seguimiento";
}

function getSugerencias(prioridad: Ds44PlanPrioridad): { responsableSugerido: string; frenteOperativo: string } {
  if (prioridad === "critica") {
    return {
      responsableSugerido: "Encargado SST / Administracion",
      frenteOperativo: "Cumplimiento critico",
    };
  }

  if (prioridad === "alta") {
    return {
      responsableSugerido: "Encargado SST",
      frenteOperativo: "Regularizacion preventiva",
    };
  }

  if (prioridad === "media") {
    return {
      responsableSugerido: "Administracion / Prevencion",
      frenteOperativo: "Mejora documental",
    };
  }

  return {
    responsableSugerido: "Administracion",
    frenteOperativo: "Mejora continua",
  };
}

function isEstadoValido(value: string): value is Ds44PlanEstado {
  return (DS44_PLAN_ESTADOS as readonly string[]).includes(value);
}

function toIsoOrNull(value: Date | null | undefined): string | null {
  if (!value) return null;
  const time = value.getTime();
  if (Number.isNaN(time)) return null;
  return value.toISOString();
}

function parseFechaCompromiso(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function inferMotivoRecomendacion(value: string): string | null {
  const token = normalizeToken(value);

  if (token.includes("gerente") || token.includes("gerencia")) return "Gerencia";
  if (token.includes("jefe") || token.includes("jefatura")) return "Jefatura";
  if (token.includes("supervisor") || token.includes("supervision")) return "Supervision";
  if (
    token.includes("prevencionista") ||
    token.includes("prevencion") ||
    token.includes("experto") ||
    token.includes("encargado sst") ||
    token.includes("sst")
  ) {
    return "Prevencion SST";
  }
  if (token.includes("administracion") || token.includes("administrador")) return "Administracion";

  return null;
}

function toNombreCompleto(nombres: string, apellidos: string): string {
  return `${nombres} ${apellidos}`.replace(/\s+/g, " ").trim();
}

async function getResponsablesDisponibles(empresaId: string): Promise<Ds44ResponsableDisponible[]> {
  const trabajadores = await prisma.trabajador.findMany({
    where: {
      empresaId,
      estado: "activo",
    },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      rut: true,
      email: true,
      cargo: {
        select: {
          id: true,
          nombre: true,
          perfilSST: true,
          perfilSstRequerido: true,
          esCritico: true,
        },
      },
      area: {
        select: {
          nombre: true,
        },
      },
    },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  });

  return trabajadores.map((trabajador) => {
    const nombreCompleto = toNombreCompleto(trabajador.nombres, trabajador.apellidos);
    const cargoNombre = trabajador.cargo?.nombre ?? null;
    const areaNombre = trabajador.area?.nombre ?? null;

    const fuente = [
      trabajador.cargo?.nombre,
      trabajador.cargo?.perfilSST,
      trabajador.cargo?.perfilSstRequerido,
    ]
      .filter((item): item is string => Boolean(item && item.trim()))
      .join(" ");

    const motivo = fuente ? inferMotivoRecomendacion(fuente) : null;

    return {
      id: trabajador.id,
      nombreCompleto,
      rut: trabajador.rut,
      email: trabajador.email,
      cargoNombre,
      areaNombre,
      recomendado: Boolean(motivo),
      motivoRecomendacion: motivo,
    };
  });
}

function toPlanAccion(args: {
  brecha: Ds44Brecha;
  persistida?: {
    id: string;
    estado: string;
    responsableReal: string | null;
    responsableTrabajadorId: string | null;
    fechaCompromiso: Date | null;
    observacionTecnica: string | null;
    accionSugerida: string;
    recomendacion: string;
    evidenciaEsperada: string | null;
    rutaSugerida: string | null;
    frenteOperativo: string | null;
    responsableSugerido: string | null;
    responsableTrabajador: {
      nombres: string;
      apellidos: string;
      cargo: {
        nombre: string;
      } | null;
    } | null;
  };
}): Ds44PlanAccion {
  const prioridad = args.brecha.prioridad as Ds44PlanPrioridad;
  const sugerencias = getSugerencias(prioridad);
  const rawEstado = args.persistida?.estado ?? "";
  const estado: Ds44PlanEstado = isEstadoValido(rawEstado) ? rawEstado : "pendiente";
  const responsableReal = args.persistida?.responsableReal?.trim() || null;
  const fechaCompromiso = toIsoOrNull(args.persistida?.fechaCompromiso);
  const responsableTrabajadorNombre = args.persistida?.responsableTrabajador
    ? toNombreCompleto(args.persistida.responsableTrabajador.nombres, args.persistida.responsableTrabajador.apellidos)
    : null;
  const responsableTrabajadorCargo = args.persistida?.responsableTrabajador?.cargo?.nombre ?? null;

  return {
    id: args.persistida?.id ?? `virtual-${args.brecha.preguntaClave}`,
    preguntaClave: args.brecha.preguntaClave,
    bloque: args.brecha.bloqueNombre,
    prioridad,
    orden: prioridadToOrden(prioridad),
    preguntaTexto: args.brecha.preguntaTexto,
    accionSugerida: args.persistida?.accionSugerida ?? args.brecha.recomendacion,
    recomendacion: args.persistida?.recomendacion ?? args.brecha.recomendacion,
    evidenciaEsperada: args.persistida?.evidenciaEsperada ?? args.brecha.evidenciaEsperada,
    rutaSugerida: args.persistida?.rutaSugerida ?? args.brecha.rutaSugerida,
    frenteOperativo: args.persistida?.frenteOperativo ?? sugerencias.frenteOperativo,
    responsableSugerido: args.persistida?.responsableSugerido ?? sugerencias.responsableSugerido,
    responsableReal,
    responsableTrabajadorId: args.persistida?.responsableTrabajadorId ?? null,
    responsableTrabajadorNombre,
    responsableTrabajadorCargo,
    fechaCompromiso,
    estado,
    observacionTecnica: args.persistida?.observacionTecnica ?? null,
    planificada: Boolean((responsableTrabajadorNombre || responsableReal) && fechaCompromiso),
  };
}

function sortAcciones(acciones: Ds44PlanAccion[]): Ds44PlanAccion[] {
  return [...acciones].sort((a, b) => {
    const prioridad = prioridadPeso(b.prioridad) - prioridadPeso(a.prioridad);
    if (prioridad !== 0) return prioridad;
    return a.preguntaTexto.localeCompare(b.preguntaTexto, "es");
  });
}

function emptyPlan(args: {
  estadoGeneracion: "sin_diagnostico" | "sin_brechas";
  diagnosticoId: string | null;
  diagnosticoUpdatedAt: string | null;
  responsablesDisponibles: Ds44ResponsableDisponible[];
}): Ds44PlanImplementacionData {
  return {
    estadoGeneracion: args.estadoGeneracion,
    diagnosticoId: args.diagnosticoId,
    diagnosticoUpdatedAt: args.diagnosticoUpdatedAt,
    responsablesDisponibles: args.responsablesDisponibles,
    totalBrechas: 0,
    acciones: [],
    columnas: {
      inmediatas: [],
      altas: [],
      medias: [],
      seguimiento: [],
    },
    resumen: {
      totalAcciones: 0,
      criticas: 0,
      planificadas: 0,
      plazosPorDefinir: 0,
      vencidasReales: 0,
      cerradas: 0,
    },
  };
}

export async function getDs44PlanImplementacionData(): Promise<Ds44PlanImplementacionData> {
  const { empresaId } = await requirePermission("canReadCumplimiento");
  const [diagnostico, responsablesDisponibles] = await Promise.all([
    getDs44DiagnosticoData(),
    getResponsablesDisponibles(empresaId),
  ]);

  if (!diagnostico.diagnosticoId) {
    return emptyPlan({
      estadoGeneracion: "sin_diagnostico",
      diagnosticoId: null,
      diagnosticoUpdatedAt: null,
      responsablesDisponibles,
    });
  }

  if (diagnostico.brechas.length === 0) {
    return emptyPlan({
      estadoGeneracion: "sin_brechas",
      diagnosticoId: diagnostico.diagnosticoId,
      diagnosticoUpdatedAt: diagnostico.updatedAt,
      responsablesDisponibles,
    });
  }

  const brechasByClave = new Map(diagnostico.brechas.map((item) => [item.preguntaClave, item]));

  const accionesPersistidas = await prisma.ds44PlanAccion.findMany({
    where: {
      empresaId,
      preguntaClave: {
        in: [...brechasByClave.keys()],
      },
    },
    select: {
      id: true,
      preguntaClave: true,
      estado: true,
      responsableReal: true,
      responsableTrabajadorId: true,
      fechaCompromiso: true,
      observacionTecnica: true,
      accionSugerida: true,
      recomendacion: true,
      evidenciaEsperada: true,
      rutaSugerida: true,
      frenteOperativo: true,
      responsableSugerido: true,
      responsableTrabajador: {
        select: {
          nombres: true,
          apellidos: true,
          cargo: {
            select: {
              nombre: true,
            },
          },
        },
      },
    },
  });

  const persistidasByClave = new Map(accionesPersistidas.map((item) => [item.preguntaClave, item]));

  const acciones = sortAcciones(
    diagnostico.brechas.map((brecha) =>
      toPlanAccion({
        brecha,
        persistida: persistidasByClave.get(brecha.preguntaClave),
      }),
    ),
  );

  const now = new Date().getTime();
  const vencidasReales = acciones.filter((item) => {
    if (!item.fechaCompromiso || item.estado === "cerrada") return false;
    const fecha = new Date(item.fechaCompromiso).getTime();
    return !Number.isNaN(fecha) && fecha < now;
  }).length;

  const columnas: Record<Ds44PlanOrden, Ds44PlanAccion[]> = {
    inmediatas: acciones.filter((item) => item.orden === "inmediatas"),
    altas: acciones.filter((item) => item.orden === "altas"),
    medias: acciones.filter((item) => item.orden === "medias"),
    seguimiento: acciones.filter((item) => item.orden === "seguimiento"),
  };

  return {
    estadoGeneracion: "con_brechas",
    diagnosticoId: diagnostico.diagnosticoId,
    diagnosticoUpdatedAt: diagnostico.updatedAt,
    responsablesDisponibles,
    totalBrechas: acciones.length,
    acciones,
    columnas,
    resumen: {
      totalAcciones: acciones.length,
      criticas: acciones.filter((item) => item.prioridad === "critica").length,
      planificadas: acciones.filter((item) => item.planificada).length,
      plazosPorDefinir: acciones.filter((item) => !item.fechaCompromiso).length,
      vencidasReales,
      cerradas: acciones.filter((item) => item.estado === "cerrada").length,
    },
  };
}

export async function guardarDs44PlanAccion(
  input: GuardarDs44PlanAccionInput,
): Promise<GuardarDs44PlanAccionResult> {
  const { empresaId } = await requirePermission("canManageCumplimiento");

  const preguntaClave = input.preguntaClave?.trim();
  if (!preguntaClave) {
    throw new Error("Pregunta DS44 invalida para planificacion.");
  }

  const responsableTrabajadorId = input.responsableTrabajadorId?.trim();
  if (!responsableTrabajadorId) {
    throw new Error("Selecciona un responsable valido de la empresa.");
  }

  const fechaCompromiso = parseFechaCompromiso(input.fechaCompromiso);
  if (!fechaCompromiso) {
    throw new Error("Define una fecha compromiso real para planificar esta accion.");
  }

  if (!isEstadoValido(input.estado)) {
    throw new Error("Estado de planificacion DS44 invalido.");
  }

  const trabajador = await prisma.trabajador.findFirst({
    where: {
      id: responsableTrabajadorId,
      empresaId,
      estado: "activo",
    },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      cargo: {
        select: {
          nombre: true,
        },
      },
    },
  });

  if (!trabajador) {
    throw new Error("Selecciona un responsable valido de la empresa.");
  }

  const responsableReal = toNombreCompleto(trabajador.nombres, trabajador.apellidos);

  const diagnostico = await getDs44DiagnosticoData();
  const brecha = diagnostico.brechas.find((item) => item.preguntaClave === preguntaClave);

  if (!brecha) {
    throw new Error("La brecha seleccionada no existe en el diagnostico DS44 actual.");
  }

  const prioridad = brecha.prioridad as Ds44PlanPrioridad;
  const sugerencias = getSugerencias(prioridad);

  const guardada = await prisma.ds44PlanAccion.upsert({
    where: {
      empresaId_preguntaClave: {
        empresaId,
        preguntaClave,
      },
    },
    create: {
      empresaId,
      diagnosticoId: diagnostico.diagnosticoId,
      preguntaClave,
      bloque: brecha.bloqueNombre,
      prioridad,
      accionSugerida: brecha.recomendacion,
      recomendacion: brecha.recomendacion,
      evidenciaEsperada: brecha.evidenciaEsperada,
      rutaSugerida: brecha.rutaSugerida,
      frenteOperativo: sugerencias.frenteOperativo,
      responsableSugerido: sugerencias.responsableSugerido,
      responsableTrabajadorId: trabajador.id,
      responsableReal,
      fechaCompromiso,
      estado: input.estado,
      observacionTecnica: input.observacionTecnica?.trim() || null,
    },
    update: {
      diagnosticoId: diagnostico.diagnosticoId,
      bloque: brecha.bloqueNombre,
      prioridad,
      accionSugerida: brecha.recomendacion,
      recomendacion: brecha.recomendacion,
      evidenciaEsperada: brecha.evidenciaEsperada,
      rutaSugerida: brecha.rutaSugerida,
      frenteOperativo: sugerencias.frenteOperativo,
      responsableSugerido: sugerencias.responsableSugerido,
      responsableTrabajadorId: trabajador.id,
      responsableReal,
      fechaCompromiso,
      estado: input.estado,
      observacionTecnica: input.observacionTecnica?.trim() || null,
    },
    select: {
      id: true,
      estado: true,
      responsableReal: true,
      responsableTrabajadorId: true,
      fechaCompromiso: true,
      observacionTecnica: true,
      accionSugerida: true,
      recomendacion: true,
      evidenciaEsperada: true,
      rutaSugerida: true,
      frenteOperativo: true,
      responsableSugerido: true,
      responsableTrabajador: {
        select: {
          nombres: true,
          apellidos: true,
          cargo: {
            select: {
              nombre: true,
            },
          },
        },
      },
    },
  });

  revalidatePath("/dicaprev/ds44");
  revalidatePath("/dicaprev/ds44/plan-implementacion");

  return {
    ok: true,
    mensaje: "Accion DS44 planificada correctamente.",
    accion: toPlanAccion({ brecha, persistida: { ...guardada, estado: guardada.estado } }),
  };
}
