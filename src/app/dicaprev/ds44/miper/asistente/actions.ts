"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CATALOGO_RIESGOS_ISP } from "@/lib/ds44/miper-catalogo-isp";
import { sugerirRiesgosMiperConIa, sugerirTareasMiperConIa } from "@/lib/ds44/miper-asistente-ia";
import { obtenerProveedorRiesgosMiperOpenAI, obtenerProveedorTareasMiperOpenAI } from "@/lib/ds44/miper-asistente-openai.server";
import { evaluarVepIsp } from "@/lib/ds44/miper-vep-isp";
import {
  calcularPasoSimplificado,
  crearPendienteEvaluacionEspecifica,
  ESTADOS_SUGERENCIA_MIPER,
  esRespuestaNuevaValida,
  type ContextoLevantamientoMiper,
  type EstadoSugerenciaMiper,
} from "@/lib/ds44/miper-flujo-simplificado";
import { requirePermission } from "@/server/auth/permissions";

const RESPUESTAS = new Set(["aplica", "no_aplica", "no_se"]);
const ESTADOS_SUGERENCIA = new Set<string>(ESTADOS_SUGERENCIA_MIPER);
const TIPOS_CONTROL = new Set(["eliminacion", "sustitucion", "ingenieria", "administrativo", "epp"]);
const ESTADOS_CONTROL = new Set(["pendiente", "implementado", "en_revision", "descartado"]);
const TAMANO_LOTE_ACTUALIZACION = 20;
const VALORES_VEP = new Set([1, 2, 4]);

function texto(value: string, nombre: string, max = 500): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error(`${nombre} es obligatorio.`);
  if (normalized.length > max) throw new Error(`${nombre} no puede superar ${max} caracteres.`);
  return normalized;
}

function opcional(value: string | undefined, max = 2000): string | null {
  const normalized = value?.trim() ?? "";
  if (normalized.length > max) throw new Error(`El texto no puede superar ${max} caracteres.`);
  return normalized || null;
}

function fecha(value: string): Date {
  const parsed = new Date(`${value}T00:00:00`);
  if (!value || Number.isNaN(parsed.getTime())) throw new Error("La fecha de próxima revisión no es válida.");
  return parsed;
}

async function ejecutarEnLotes<T>(items: T[], ejecutar: (item: T) => Promise<unknown>): Promise<void> {
  for (let index = 0; index < items.length; index += TAMANO_LOTE_ACTUALIZACION) {
    await Promise.all(items.slice(index, index + TAMANO_LOTE_ACTUALIZACION).map(ejecutar));
  }
}

async function validarMiperAsistente(miperId: string, empresaId: string) {
  const miper = await prisma.ds44Miper.findFirst({ where: { id: miperId, empresaId, estado: "borrador", modoCreacion: { in: ["asistente", "asistente_simplificado"] } }, select: { id: true, modoCreacion: true } });
  if (!miper) throw new Error("El borrador del asistente no pertenece a la empresa activa.");
  return miper;
}

async function asegurarCatalogoIsp(): Promise<void> {
  await prisma.ds44MiperRiesgoCatalogo.createMany({
    data: CATALOGO_RIESGOS_ISP.map((item) => ({ ...item })),
    skipDuplicates: true,
  });
}

export async function getMiperAsistenteData(miperId?: string) {
  const { empresaId } = await requirePermission("canReadCumplimiento");
  const [empresa, centros, areas, cargos, responsables, borrador] = await Promise.all([
    prisma.empresa.findFirst({ where: { id: empresaId, activa: true }, select: { nombre: true, razonSocial: true, rut: true } }),
    prisma.centroTrabajo.findMany({ where: { empresaId, estado: "activo" }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.area.findMany({ where: { empresaId, estado: "activa" }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.cargo.findMany({ where: { empresaId, estado: "activo" }, select: { id: true, nombre: true, areaId: true, descripcion: true, perfilSST: true, riesgosClave: true }, orderBy: { nombre: "asc" } }),
    prisma.trabajador.findMany({ where: { empresaId, estado: "activo" }, select: { id: true, nombres: true, apellidos: true, centroTrabajoId: true, areaId: true, cargoId: true, cargo: { select: { nombre: true } } }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }] }),
    miperId ? prisma.ds44Miper.findFirst({
      where: { id: miperId, empresaId, estado: "borrador", modoCreacion: { in: ["asistente", "asistente_simplificado"] } },
      include: {
        asistenteCargos: { include: { cargo: { select: { nombre: true } }, tareas: { orderBy: { orden: "asc" }, include: { exposiciones: true } } }, orderBy: { orden: "asc" } },
        items: { where: { tareaId: { not: null } }, orderBy: { orden: "asc" }, include: { controles: { orderBy: { orden: "asc" } } } },
      },
    }) : null,
  ]);
  const fechaRevisionSugerida = new Date();
  fechaRevisionSugerida.setFullYear(fechaRevisionSugerida.getFullYear() + 1);
  return {
    empresa: { nombre: empresa?.razonSocial || empresa?.nombre || "", rut: empresa?.rut ?? "" },
    sugerencias: {
      codigo: `MIPER-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`,
      version: 1,
      fechaProximaRevision: fechaRevisionSugerida.toISOString().slice(0, 10),
    },
    centros,
    areas,
    cargos,
    responsables: responsables.map((item) => ({ id: item.id, nombre: `${item.nombres} ${item.apellidos}`.replace(/\s+/g, " ").trim(), cargo: item.cargo?.nombre ?? null })),
    trabajadores: responsables.map((item) => ({ id: item.id, centroTrabajoId: item.centroTrabajoId, areaId: item.areaId, cargoId: item.cargoId })),
    catalogo: CATALOGO_RIESGOS_ISP,
    borrador: borrador ? {
      id: borrador.id,
      paso: calcularPasoSimplificado(borrador.asistentePaso, borrador.modoCreacion),
      cabecera: {
        codigo: borrador.codigo, nombre: borrador.nombre,
        procesoNombre: borrador.procesoNombre ?? "",
        procesoTipo: borrador.procesoTipo ?? "",
        procesoResponsableId: borrador.procesoResponsableId ?? "",
        centroTrabajoId: borrador.asistenteCargos[0]?.centroTrabajoId ?? "",
        areaId: borrador.asistenteCargos[0]?.areaId ?? "",
        cargoIds: borrador.asistenteCargos.map((item) => item.cargoId),
        responsableElaboracionId: borrador.responsableElaboracionId ?? "",
        fechaProximaRevision: borrador.fechaProximaRevision?.toISOString().slice(0, 10) ?? "",
        observaciones: borrador.observaciones ?? "",
        contexto: (borrador.contextoLevantamiento ?? null) as ContextoLevantamientoMiper | null,
      },
      cargos: borrador.asistenteCargos.map((item) => ({ id: item.id, cargoId: item.cargoId, nombre: item.cargo.nombre, descripcionTrabajo: item.descripcionTrabajo ?? "", tareasTexto: item.tareas.map((tarea) => tarea.nombre).join("\n") })),
      tareas: borrador.asistenteCargos.flatMap((item) => item.tareas.map((tarea) => ({
        id: tarea.id,
        asistenteCargoId: item.id,
        nombre: tarea.nombre,
        esRutinaria: tarea.esRutinaria,
        lugarEspecifico: tarea.lugarEspecifico ?? "",
        personasExpuestasTotal: tarea.personasExpuestasTotal,
        distribucionSexogenerica: (tarea.distribucionSexogenerica ?? null) as Record<string, unknown> | null,
        observaciones: tarea.observaciones ?? "",
      }))),
      respuestas: borrador.asistenteCargos.flatMap((item) => item.tareas.flatMap((tarea) => tarea.exposiciones.map((respuesta) => ({ clave: `${tarea.id}:${respuesta.clave}`, respuesta: respuesta.respuesta })))),
      pendientesHistoricos: borrador.asistenteCargos.flatMap((item) => item.tareas.flatMap((tarea) => tarea.exposiciones
        .filter((respuesta) => respuesta.respuesta === "no_se")
        .map((respuesta) => ({ id: respuesta.id, tareaId: tarea.id, tarea: tarea.nombre, pregunta: respuesta.pregunta })))),
      riesgos: borrador.items.map((item) => ({
        id: item.id, tareaId: item.tareaId!, codigoIsp: item.codigoIsp!, confirmado: item.confirmadoPorUsuario,
        estadoSugerencia: item.estadoSugerencia,
        consecuencia: item.consecuencia, probabilidad: item.probabilidad ?? null, severidad: item.severidad ?? null,
        magnitudExposicion: item.magnitudExposicion ?? "", nivelRiesgoEspecifico: item.nivelRiesgoEspecifico ?? "",
        estadoEvaluacionEspecifica: item.estadoEvaluacionEspecifica ?? "pendiente", observacionTecnica: item.observacionTecnica ?? "",
        motivoSugerencia: item.motivoSugerencia ?? "Sugerencia determinística desde exposición confirmada.",
        control: item.controles[0]?.descripcion ?? "", controlTipo: item.controles[0]?.tipoControl ?? "administrativo",
        controlResponsableId: item.controles[0]?.responsableTrabajadorId ?? borrador.responsableElaboracionId ?? "",
        controlFecha: item.controles[0]?.fechaCompromiso?.toISOString().slice(0, 10) ?? "",
        controlEstado: item.controles[0]?.estado ?? "pendiente",
        peligroGente: item.peligroGente ?? "",
        peligroEquipos: item.peligroEquipos ?? "",
        peligroMateriales: item.peligroMateriales ?? "",
        peligroAmbiente: item.peligroAmbiente ?? "",
        peligroDescripcion: item.peligroDescripcion ?? "",
      })),
    } : null,
  };
}

export async function iniciarMiperAsistente(input: {
  codigo?: string; nombre: string; centroTrabajoId: string; areaId: string; cargoIds: string[];
  responsableElaboracionId: string; fechaProximaRevision: string; observaciones?: string;
  procesoNombre?: string;
  procesoTipo?: "operacional" | "apoyo";
  procesoResponsableId: string;
  contexto?: ContextoLevantamientoMiper;
}): Promise<{ id: string; cargos: { id: string; cargoId: string; nombre: string; descripcionTrabajo: string }[] }> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  if (input.cargoIds.length < 1 || input.cargoIds.length > 30) throw new Error("Selecciona entre 1 y 30 cargos.");
  const [centro, area, cargos, responsableElaboracion, responsableProceso] = await Promise.all([
    prisma.centroTrabajo.findFirst({ where: { id: input.centroTrabajoId, empresaId, estado: "activo" }, select: { id: true } }),
    prisma.area.findFirst({ where: { id: input.areaId, empresaId, estado: "activa" }, select: { id: true } }),
    prisma.cargo.findMany({ where: { id: { in: input.cargoIds }, empresaId, estado: "activo" }, select: { id: true, nombre: true, descripcion: true, areaId: true } }),
    prisma.trabajador.findFirst({ where: { id: input.responsableElaboracionId, empresaId, estado: "activo" }, select: { id: true } }),
    prisma.trabajador.findFirst({ where: { id: input.procesoResponsableId, empresaId, estado: "activo" }, select: { id: true } }),
  ]);
  if (!centro || !area || !responsableElaboracion || !responsableProceso || cargos.length !== new Set(input.cargoIds).size) throw new Error("El alcance contiene registros inactivos o ajenos a la empresa.");
  if (cargos.some((cargo) => cargo.areaId && cargo.areaId !== area.id)) throw new Error("Todos los cargos deben pertenecer al área seleccionada.");
  await asegurarCatalogoIsp();
  const codigoAutomatico = `MIPER-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;
  const fechaRevision = new Date();
  fechaRevision.setFullYear(fechaRevision.getFullYear() + 1);

  const miper = await prisma.ds44Miper.create({
    data: {
      empresaId, codigo: texto(input.codigo || codigoAutomatico, "El código", 40).toUpperCase(), nombre: texto(input.nombre, "El nombre", 160),
      procesoNombre: opcional(input.procesoNombre, 160),
      procesoTipo: input.procesoTipo ?? null,
      procesoResponsableId: responsableProceso.id,
      fechaProximaRevision: input.fechaProximaRevision ? fecha(input.fechaProximaRevision) : fechaRevision, observaciones: opcional(input.observaciones),
      contextoLevantamiento: input.contexto
        ? input.contexto as unknown as Prisma.InputJsonValue
        : undefined,
      responsableElaboracionId: responsableElaboracion.id, modoCreacion: "asistente_simplificado", asistentePaso: 1,
      creadoPorId: usuarioId, actualizadoPorId: usuarioId,
      asistenteCargos: { create: cargos.map((cargo, index) => ({ empresaId, cargoId: cargo.id, centroTrabajoId: centro.id, areaId: area.id, descripcionTrabajo: cargo.descripcion, orden: index + 1 })) },
    },
    include: { asistenteCargos: { include: { cargo: { select: { nombre: true } } }, orderBy: { orden: "asc" } } },
  });
  return { id: miper.id, cargos: miper.asistenteCargos.map((item) => ({ id: item.id, cargoId: item.cargoId, nombre: item.cargo.nombre, descripcionTrabajo: item.descripcionTrabajo ?? "" })) };
}

export async function guardarDescripcionesAsistente(input: { miperId: string; cargos: { id: string; descripcionTrabajo: string }[] }): Promise<void> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  const miperActivo = await validarMiperAsistente(input.miperId, empresaId);
  const existentes = await prisma.ds44MiperAsistenteCargo.findMany({ where: { miperId: input.miperId, empresaId }, select: { id: true } });
  const permitidos = new Set(existentes.map((item) => item.id));
  if (input.cargos.some((item) => !permitidos.has(item.id))) throw new Error("Uno de los cargos no pertenece al asistente activo.");
  await prisma.$transaction([
    ...input.cargos.map((item) => prisma.ds44MiperAsistenteCargo.update({ where: { id: item.id }, data: { descripcionTrabajo: texto(item.descripcionTrabajo, "La descripción del trabajo", 2000) } })),
    prisma.ds44Miper.update({ where: { id: input.miperId }, data: { asistentePaso: miperActivo.modoCreacion === "asistente_simplificado" ? 1 : 2, actualizadoPorId: usuarioId } }),
  ]);
}

export async function obtenerSugerenciasTareasIa(input: { miperId: string; asistenteCargoId: string }) {
  const { empresaId } = await requirePermission("canManageCumplimiento");
  await validarMiperAsistente(input.miperId, empresaId);
  const alcance = await prisma.ds44MiperAsistenteCargo.findFirst({ where: { id: input.asistenteCargoId, miperId: input.miperId, empresaId }, include: {
    cargo: { select: { id: true, nombre: true, descripcion: true, perfilSST: true, riesgosClave: true } },
    area: { select: { nombre: true } },
    centroTrabajo: { select: { nombre: true } },
  } });
  if (!alcance) throw new Error("El cargo no pertenece al asistente activo.");
  return sugerirTareasMiperConIa(
    { cargoId: alcance.cargo.id, nombre: alcance.cargo.nombre, descripcion: [alcance.cargo.descripcion, alcance.descripcionTrabajo].filter(Boolean).join("\n\n") || null, perfilSst: alcance.cargo.perfilSST, riesgosClave: alcance.cargo.riesgosClave, area: alcance.area.nombre, centroTrabajo: alcance.centroTrabajo.nombre },
    obtenerProveedorTareasMiperOpenAI(),
  );
}

export async function guardarTareasAsistente(input: { miperId: string; cargos: { asistenteCargoId: string; tareas: {
  nombre: string;
  origen?: "manual" | "ia";
  esRutinaria?: boolean | null;
  lugarEspecifico?: string;
  personasExpuestasTotal?: number | null;
  distribucionSexogenerica?: Record<string, unknown> | null;
  observaciones?: string;
}[] }[] }) {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  const miperActivo = await validarMiperAsistente(input.miperId, empresaId);
  const [cargos, centrosActivos] = await Promise.all([
    prisma.ds44MiperAsistenteCargo.findMany({ where: { miperId: input.miperId, empresaId }, select: { id: true } }),
    prisma.centroTrabajo.findMany({ where: { empresaId, estado: "activo" }, select: { nombre: true } }),
  ]);
  const permitidos = new Set(cargos.map((item) => item.id));
  if (input.cargos.some((item) => !permitidos.has(item.asistenteCargoId))) throw new Error("Uno de los cargos no pertenece al asistente activo.");
  const centrosPorNombre = new Map(centrosActivos.map((centro) => [centro.nombre.trim().toLocaleLowerCase("es-CL"), centro.nombre]));
  const tareasEntrada = input.cargos.flatMap((cargo) => cargo.tareas);
  const lugaresInvalidos = tareasEntrada.some((tarea) => {
    const nombre = tarea.lugarEspecifico?.trim() ?? "";
    return !nombre || !centrosPorNombre.has(nombre.toLocaleLowerCase("es-CL"));
  });
  if (lugaresInvalidos) throw new Error("El lugar específico de cada tarea debe ser un centro de trabajo activo de la empresa.");
  const result = await prisma.$transaction(async (tx) => {
    await tx.ds44MiperTarea.deleteMany({ where: { miperId: input.miperId, empresaId } });
    for (const cargo of input.cargos) {
      if (cargo.tareas.length < 1 || cargo.tareas.length > 30) throw new Error("Cada cargo debe tener entre 1 y 30 tareas confirmadas.");
      await tx.ds44MiperTarea.createMany({ data: cargo.tareas.map((tarea, index) => ({
        empresaId,
        miperId: input.miperId,
        asistenteCargoId: cargo.asistenteCargoId,
        nombre: texto(tarea.nombre, "La tarea", 300),
        esRutinaria: typeof tarea.esRutinaria === "boolean" ? tarea.esRutinaria : null,
        lugarEspecifico: centrosPorNombre.get(tarea.lugarEspecifico!.trim().toLocaleLowerCase("es-CL"))!,
        personasExpuestasTotal: typeof tarea.personasExpuestasTotal === "number" && Number.isFinite(tarea.personasExpuestasTotal)
          ? Math.max(0, Math.floor(tarea.personasExpuestasTotal))
          : null,
        distribucionSexogenerica: tarea.distribucionSexogenerica
          ? (tarea.distribucionSexogenerica as Prisma.InputJsonValue)
          : undefined,
        observaciones: opcional(tarea.observaciones, 1000),
        origen: tarea.origen ?? "manual",
        confirmada: true,
        orden: index + 1,
      })) });
    }
    await tx.ds44Miper.update({ where: { id: input.miperId }, data: { asistentePaso: miperActivo.modoCreacion === "asistente_simplificado" ? 2 : 3, actualizadoPorId: usuarioId } });
    return tx.ds44MiperTarea.findMany({
      where: { miperId: input.miperId, empresaId },
      select: {
        id: true,
        asistenteCargoId: true,
        nombre: true,
        esRutinaria: true,
        lugarEspecifico: true,
        personasExpuestasTotal: true,
        distribucionSexogenerica: true,
        observaciones: true,
      },
      orderBy: [{ asistenteCargoId: "asc" }, { orden: "asc" }],
    });
  });
  return result;
}

export async function obtenerSugerenciasRiesgosIa(input: { miperId: string }) {
  const { empresaId } = await requirePermission("canManageCumplimiento");
  await validarMiperAsistente(input.miperId, empresaId);
  const miper = await prisma.ds44Miper.findFirst({
    where: { id: input.miperId, empresaId },
    include: {
      asistenteCargos: {
        include: {
          cargo: { select: { nombre: true, descripcion: true } },
          area: { select: { nombre: true } },
          centroTrabajo: { select: { nombre: true } },
          tareas: { orderBy: { orden: "asc" } },
        },
      },
    },
  });
  if (!miper) throw new Error("El borrador no pertenece a la empresa activa.");
  const contexto = (miper.contextoLevantamiento ?? {}) as Record<string, unknown>;
  const resultados = [];
  const mensajes: string[] = [];
  for (const alcance of miper.asistenteCargos) {
    if (!alcance.tareas.length) continue;
    const result = await sugerirRiesgosMiperConIa({
      cargo: alcance.cargo.nombre,
      descripcionCargo: alcance.descripcionTrabajo || alcance.cargo.descripcion,
      area: alcance.area.nombre,
      centroTrabajo: alcance.centroTrabajo.nombre,
      proceso: miper.procesoNombre,
      tareas: alcance.tareas.map((tarea) => ({
        id: tarea.id,
        nombre: tarea.nombre,
        esRutinaria: tarea.esRutinaria,
        lugar: tarea.lugarEspecifico,
      })),
      antecedentes: [
        contexto.accidentesEnfermedades,
        contexto.programasVigilancia,
        contexto.antecedentesSensibilidad,
      ].filter((value): value is string => typeof value === "string" && value.trim().length > 0),
    }, obtenerProveedorRiesgosMiperOpenAI());
    resultados.push(...result.resultado.riesgos);
    mensajes.push(result.mensaje);
  }
  return {
    riesgos: resultados,
    mensaje: resultados.length
      ? "Riesgos probables sugeridos con IA. Confirma, descarta o envía cada uno a revisión técnica."
      : mensajes[0] ?? "No se generaron sugerencias. Usa el catálogo ISP manual.",
  };
}

export async function guardarExposicionesAsistente(input: { miperId: string; respuestas: { tareaId: string; grupo: string; clave: string; pregunta: string; respuesta: "aplica" | "no_aplica" | "no_se" }[] }): Promise<void> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  await validarMiperAsistente(input.miperId, empresaId);
  const tareas = await prisma.ds44MiperTarea.findMany({ where: { miperId: input.miperId, empresaId }, select: { id: true } });
  const permitidas = new Set(tareas.map((item) => item.id));
  if (input.respuestas.some((item) => !permitidas.has(item.tareaId) || !RESPUESTAS.has(item.respuesta))) throw new Error("Las respuestas de exposición no son válidas para este borrador.");
  const miper = await prisma.ds44Miper.findFirst({ where: { id: input.miperId, empresaId }, select: { modoCreacion: true } });
  if (miper?.modoCreacion === "asistente_simplificado" && input.respuestas.some((item) => !esRespuestaNuevaValida(item.respuesta))) {
    throw new Error("Los registros nuevos solo admiten Aplica o No aplica. Usa revisión técnica para conservar una duda.");
  }
  const respuestas = input.respuestas.map((item) => ({
    empresaId,
    tareaId: item.tareaId,
    grupo: texto(item.grupo, "El grupo", 80),
    clave: texto(item.clave, "La clave", 80),
    pregunta: texto(item.pregunta, "La pregunta", 500),
    respuesta: item.respuesta,
    revisionTecnicaPendiente: item.respuesta === "no_se",
  }));
  const claves = new Set(respuestas.map((item) => `${item.tareaId}:${item.clave}`));
  if (claves.size !== respuestas.length) throw new Error("Las respuestas de exposición contienen preguntas duplicadas.");

  await prisma.$transaction(async (tx) => {
    await tx.ds44MiperExposicionRespuesta.deleteMany({ where: { tareaId: { in: tareas.map((item) => item.id) }, empresaId } });
    if (respuestas.length > 0) await tx.ds44MiperExposicionRespuesta.createMany({ data: respuestas });
    await tx.ds44Miper.update({ where: { id: input.miperId }, data: { asistentePaso: 4, actualizadoPorId: usuarioId } });
  });
}

export async function guardarRiesgosAsistente(input: {
  miperId: string;
  items: {
    tareaId: string;
    codigoIsp: string;
    confirmado: boolean;
    estadoSugerencia?: EstadoSugerenciaMiper;
    consecuencia: string;
    responsableTrabajadorId: string;
    motivoSugerencia: string;
    peligroGente?: string;
    peligroEquipos?: string;
    peligroMateriales?: string;
    peligroAmbiente?: string;
    peligroDescripcion?: string;
  }[];
}) {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  const miperActivo = await validarMiperAsistente(input.miperId, empresaId);
  if (input.items.length < 1 || input.items.length > 200) throw new Error("El paso debe contener entre 1 y 200 sugerencias de riesgo.");
  if (input.items.some((item) => item.estadoSugerencia && !ESTADOS_SUGERENCIA.has(item.estadoSugerencia))) {
    throw new Error("Uno de los estados de sugerencia no es válido.");
  }
  await asegurarCatalogoIsp();
  const [tareas, responsables, catalogo] = await Promise.all([
    prisma.ds44MiperTarea.findMany({ where: { miperId: input.miperId, empresaId }, include: { asistenteCargo: true } }),
    prisma.trabajador.findMany({ where: { id: { in: input.items.map((item) => item.responsableTrabajadorId) }, empresaId, estado: "activo" }, select: { id: true } }),
    prisma.ds44MiperRiesgoCatalogo.findMany({ where: { codigoIsp: { in: input.items.map((item) => item.codigoIsp) }, activo: true } }),
  ]);
  const tareasMap = new Map(tareas.map((item) => [item.id, item]));
  const responsablesSet = new Set(responsables.map((item) => item.id));
  const catalogoMap = new Map(catalogo.map((item) => [item.codigoIsp, item]));
  if (input.items.some((item) => !tareasMap.has(item.tareaId) || !responsablesSet.has(item.responsableTrabajadorId) || !catalogoMap.has(item.codigoIsp))) throw new Error("Un riesgo, tarea o responsable no pertenece al alcance validado.");

  const items = input.items.map((item, index) => {
    const tarea = tareasMap.get(item.tareaId)!;
    const riesgo = catalogoMap.get(item.codigoIsp)!;
    const estadoSugerencia = item.estadoSugerencia ?? (item.confirmado ? "confirmado" : "no_aplica");
    const pendienteEspecifica = crearPendienteEvaluacionEspecifica(riesgo);
    const gema = [
      item.peligroGente?.trim() ? `Gente: ${item.peligroGente.trim()}` : null,
      item.peligroEquipos?.trim() ? `Equipos: ${item.peligroEquipos.trim()}` : null,
      item.peligroMateriales?.trim() ? `Materiales: ${item.peligroMateriales.trim()}` : null,
      item.peligroAmbiente?.trim() ? `Ambiente: ${item.peligroAmbiente.trim()}` : null,
    ].filter(Boolean).join(" | ");
    const detalle = item.peligroDescripcion?.trim() ? `${gema ? " | " : ""}Detalle: ${item.peligroDescripcion.trim()}` : "";

    return {
      empresaId, miperId: input.miperId, tareaId: tarea.id, catalogoRiesgoId: riesgo.id,
      centroTrabajoId: tarea.asistenteCargo.centroTrabajoId, areaId: tarea.asistenteCargo.areaId, cargoId: tarea.asistenteCargo.cargoId,
      actividad: tarea.nombre,
      peligro: gema || item.peligroDescripcion?.trim() ? `${gema}${detalle}`.trim() : riesgo.familia,
      riesgo: riesgo.riesgoEspecifico,
      consecuencia: texto(item.consecuencia, "La consecuencia", 500),
      categoriaRiesgo: riesgo.categoria, metodologiaEvaluacion: riesgo.metodologiaEvaluacion, codigoIsp: riesgo.codigoIsp,
      requiereEvaluacionEspecifica: pendienteEspecifica.requiereEvaluacionEspecifica,
      protocoloAplicable: riesgo.protocoloAplicable,
      estadoEvaluacionEspecifica: pendienteEspecifica.estadoEvaluacionEspecifica,
      observacionTecnica: pendienteEspecifica.observacionTecnica,
      motivoSugerencia: texto(item.motivoSugerencia, "El motivo de sugerencia", 500), confirmadoPorUsuario: item.confirmado,
      estadoSugerencia,
      peligroGente: opcional(item.peligroGente, 500),
      peligroEquipos: opcional(item.peligroEquipos, 500),
      peligroMateriales: opcional(item.peligroMateriales, 500),
      peligroAmbiente: opcional(item.peligroAmbiente, 500),
      peligroDescripcion: opcional(item.peligroDescripcion, 1000),
      responsableTrabajadorId: item.responsableTrabajadorId, orden: index + 1, creadoPorId: usuarioId, actualizadoPorId: usuarioId,
    };
  });

  const guardados = await prisma.$transaction(async (tx) => {
    await tx.ds44MiperItem.deleteMany({ where: { miperId: input.miperId, empresaId, tareaId: { not: null } } });
    await tx.ds44MiperItem.createMany({ data: items });
    await tx.ds44Miper.update({ where: { id: input.miperId }, data: { asistentePaso: miperActivo.modoCreacion === "asistente_simplificado" ? 3 : 5, actualizadoPorId: usuarioId } });
    return tx.ds44MiperItem.findMany({ where: { miperId: input.miperId, empresaId, tareaId: { not: null } }, select: { id: true, tareaId: true, codigoIsp: true }, orderBy: { orden: "asc" } });
  });
  return guardados;
}

export async function guardarEvaluacionesAsistente(input: {
  miperId: string;
  items: { id: string; consecuencia: string; probabilidad?: number | null; severidad?: number | null; magnitudExposicion?: string; nivelRiesgoEspecifico?: string; estadoEvaluacionEspecifica?: "pendiente" | "en_evaluacion" | "evaluado"; observacionTecnica?: string }[];
}): Promise<void> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  const miperActivo = await validarMiperAsistente(input.miperId, empresaId);
  const existentes = await prisma.ds44MiperItem.findMany({ where: { id: { in: input.items.map((item) => item.id) }, miperId: input.miperId, empresaId, tareaId: { not: null }, confirmadoPorUsuario: true }, select: { id: true, metodologiaEvaluacion: true } });
  if (existentes.length !== new Set(input.items.map((item) => item.id)).size) throw new Error("Una evaluación no pertenece al borrador activo.");
  const metodologias = new Map(existentes.map((item) => [item.id, item.metodologiaEvaluacion]));
  const evaluaciones = input.items.map((item) => {
    const usaVep = metodologias.get(item.id) === "vep_isp";
    const probabilidad = typeof item.probabilidad === "number" ? item.probabilidad : null;
    const severidad = typeof item.severidad === "number" ? item.severidad : null;
    if (usaVep) {
      const ambasPendientes = probabilidad === null && severidad === null;
      const ambasInformadas = probabilidad !== null && severidad !== null;
      if (!ambasPendientes && !ambasInformadas) {
        throw new Error("La evaluación VEP requiere probabilidad y consecuencia juntas, o ambas pendientes.");
      }
      if (ambasInformadas && (!VALORES_VEP.has(probabilidad) || !VALORES_VEP.has(severidad))) {
        throw new Error("Probabilidad y consecuencia VEP solo permiten valores ISP 1, 2 o 4.");
      }
    }
    const evaluacion = usaVep && probabilidad !== null && severidad !== null
      ? evaluarVepIsp(probabilidad, severidad)
      : null;
    return { id: item.id, data: {
        consecuencia: texto(item.consecuencia, "La consecuencia", 500),
        probabilidad: evaluacion?.probabilidad ?? null, severidad: evaluacion?.severidad ?? null,
        nivelRiesgo: evaluacion?.nivelRiesgo ?? null, clasificacionRiesgo: evaluacion?.clasificacionRiesgo ?? null,
        magnitudExposicion: usaVep ? null : opcional(item.magnitudExposicion, 200),
        nivelRiesgoEspecifico: usaVep ? null : opcional(item.nivelRiesgoEspecifico, 200),
        estadoEvaluacionEspecifica: usaVep ? null : (item.estadoEvaluacionEspecifica ?? "pendiente"),
        observacionTecnica: usaVep ? null : opcional(item.observacionTecnica), actualizadoPorId: usuarioId,
    } };
  });
  // Estas actualizaciones son idempotentes y se ejecutan en lotes fuera de una transacción larga.
  // El paso solo avanza cuando todas finalizaron, de modo que un reintento completa cualquier lote pendiente.
  await ejecutarEnLotes(evaluaciones, (item) => prisma.ds44MiperItem.update({ where: { id: item.id }, data: item.data }));
  await prisma.ds44Miper.update({ where: { id: input.miperId }, data: { asistentePaso: miperActivo.modoCreacion === "asistente_simplificado" ? 4 : 6, actualizadoPorId: usuarioId } });
}

export async function guardarControlesAsistente(input: {
  miperId: string;
  items: { id: string; controles: { tipoControl: string; descripcion: string; responsableTrabajadorId: string; fechaCompromiso?: string; estado: string }[] }[];
}): Promise<void> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  const miperActivo = await validarMiperAsistente(input.miperId, empresaId);
  const items = await prisma.ds44MiperItem.findMany({ where: { id: { in: input.items.map((item) => item.id) }, miperId: input.miperId, empresaId, tareaId: { not: null }, confirmadoPorUsuario: true }, select: { id: true } });
  if (items.length !== new Set(input.items.map((item) => item.id)).size) throw new Error("Un control no pertenece al borrador activo.");
  const idsResponsables = input.items.flatMap((item) => item.controles.map((control) => control.responsableTrabajadorId).filter(Boolean));
  const responsables = await prisma.trabajador.findMany({ where: { id: { in: idsResponsables }, empresaId, estado: "activo" }, select: { id: true } });
  if (responsables.length !== new Set(idsResponsables).size) throw new Error("Un responsable de control no pertenece a la empresa activa.");
  const controles = input.items.flatMap((item) => {
    const controlesItem = item.controles.filter((control) => control.descripcion.trim());
    if (controlesItem.some((control) => !TIPOS_CONTROL.has(control.tipoControl) || !ESTADOS_CONTROL.has(control.estado))) throw new Error("Uno de los tipos o estados de control no es válido.");
    return controlesItem.map((control, index) => ({
      empresaId, miperItemId: item.id,
      tipoControl: control.tipoControl as "eliminacion" | "sustitucion" | "ingenieria" | "administrativo" | "epp",
      descripcion: texto(control.descripcion, "La medida de control", 1000),
      responsableTrabajadorId: control.responsableTrabajadorId || null,
      fechaCompromiso: control.fechaCompromiso ? fecha(control.fechaCompromiso) : null,
      estado: control.estado as "pendiente" | "implementado" | "en_revision" | "descartado",
      orden: index + 1, creadoPorId: usuarioId, actualizadoPorId: usuarioId,
    }));
  });
  await prisma.$transaction(async (tx) => {
    await tx.ds44MiperControl.deleteMany({ where: { empresaId, miperItemId: { in: items.map((item) => item.id) } } });
    if (controles.length > 0) await tx.ds44MiperControl.createMany({ data: controles });
    await tx.ds44Miper.update({ where: { id: input.miperId }, data: { asistentePaso: miperActivo.modoCreacion === "asistente_simplificado" ? 4 : 7, actualizadoPorId: usuarioId } });
  });
}

export async function finalizarMiperAsistente(input: { miperId: string }): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  const miperActivo = await validarMiperAsistente(input.miperId, empresaId);
  const confirmados = await prisma.ds44MiperItem.count({ where: { miperId: input.miperId, empresaId, tareaId: { not: null }, confirmadoPorUsuario: true } });
  if (confirmados < 1) throw new Error("Confirma al menos un riesgo antes de finalizar el borrador.");
  const vepPendientes = await prisma.ds44MiperItem.count({
    where: {
      miperId: input.miperId,
      empresaId,
      tareaId: { not: null },
      confirmadoPorUsuario: true,
      metodologiaEvaluacion: "vep_isp",
      OR: [{ probabilidad: null }, { severidad: null }],
    },
  });
  if (vepPendientes > 0) {
    throw new Error("Existen riesgos VEP confirmados con evaluación pendiente. Completa probabilidad y consecuencia antes de finalizar.");
  }
  await prisma.ds44Miper.update({ where: { id: input.miperId }, data: { asistentePaso: miperActivo.modoCreacion === "asistente_simplificado" ? 4 : 8, actualizadoPorId: usuarioId } });
  revalidatePath("/dicaprev/ds44/miper");
  revalidatePath(`/dicaprev/ds44/miper/${input.miperId}`);
  return { id: input.miperId };
}
