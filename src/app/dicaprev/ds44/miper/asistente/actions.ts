"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CATALOGO_RIESGOS_ISP } from "@/lib/ds44/miper-catalogo-isp";
import { sugerirTareasMiperConIa } from "@/lib/ds44/miper-asistente-ia";
import { obtenerProveedorTareasMiperOpenAI } from "@/lib/ds44/miper-asistente-openai.server";
import { evaluarVepIsp } from "@/lib/ds44/miper-vep-isp";
import { calcularPasoReanudacion } from "@/lib/ds44/miper-reglas";
import { requirePermission } from "@/server/auth/permissions";

const RESPUESTAS = new Set(["aplica", "no_aplica", "no_se"]);
const TIPOS_CONTROL = new Set(["eliminacion", "sustitucion", "ingenieria", "administrativo", "epp"]);
const ESTADOS_CONTROL = new Set(["pendiente", "implementado", "en_revision", "descartado"]);
const TAMANO_LOTE_ACTUALIZACION = 20;

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
  const miper = await prisma.ds44Miper.findFirst({ where: { id: miperId, empresaId, estado: "borrador", modoCreacion: "asistente" }, select: { id: true } });
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
  const [centros, areas, cargos, responsables, borrador] = await Promise.all([
    prisma.centroTrabajo.findMany({ where: { empresaId, estado: "activo" }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.area.findMany({ where: { empresaId, estado: "activa" }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.cargo.findMany({ where: { empresaId, estado: "activo" }, select: { id: true, nombre: true, areaId: true, descripcion: true, perfilSST: true, riesgosClave: true }, orderBy: { nombre: "asc" } }),
    prisma.trabajador.findMany({ where: { empresaId, estado: "activo" }, select: { id: true, nombres: true, apellidos: true, cargo: { select: { nombre: true } } }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }] }),
    miperId ? prisma.ds44Miper.findFirst({
      where: { id: miperId, empresaId, estado: "borrador", modoCreacion: "asistente" },
      include: {
        asistenteCargos: { include: { cargo: { select: { nombre: true } }, tareas: { orderBy: { orden: "asc" }, include: { exposiciones: true } } }, orderBy: { orden: "asc" } },
        items: { where: { tareaId: { not: null } }, orderBy: { orden: "asc" }, include: { controles: { orderBy: { orden: "asc" } } } },
      },
    }) : null,
  ]);
  return {
    centros,
    areas,
    cargos,
    responsables: responsables.map((item) => ({ id: item.id, nombre: `${item.nombres} ${item.apellidos}`.replace(/\s+/g, " ").trim(), cargo: item.cargo?.nombre ?? null })),
    catalogo: CATALOGO_RIESGOS_ISP,
    borrador: borrador ? {
      id: borrador.id,
      paso: calcularPasoReanudacion(borrador.asistentePaso),
      cabecera: {
        codigo: borrador.codigo, nombre: borrador.nombre,
        centroTrabajoId: borrador.asistenteCargos[0]?.centroTrabajoId ?? "",
        areaId: borrador.asistenteCargos[0]?.areaId ?? "",
        cargoIds: borrador.asistenteCargos.map((item) => item.cargoId),
        responsableElaboracionId: borrador.responsableElaboracionId ?? "",
        fechaProximaRevision: borrador.fechaProximaRevision?.toISOString().slice(0, 10) ?? "",
        observaciones: borrador.observaciones ?? "",
      },
      cargos: borrador.asistenteCargos.map((item) => ({ id: item.id, cargoId: item.cargoId, nombre: item.cargo.nombre, descripcionTrabajo: item.descripcionTrabajo ?? "", tareasTexto: item.tareas.map((tarea) => tarea.nombre).join("\n") })),
      tareas: borrador.asistenteCargos.flatMap((item) => item.tareas.map((tarea) => ({ id: tarea.id, asistenteCargoId: item.id, nombre: tarea.nombre }))),
      respuestas: borrador.asistenteCargos.flatMap((item) => item.tareas.flatMap((tarea) => tarea.exposiciones.map((respuesta) => ({ clave: `${tarea.id}:${respuesta.clave}`, respuesta: respuesta.respuesta })))),
      riesgos: borrador.items.map((item) => ({
        id: item.id, tareaId: item.tareaId!, codigoIsp: item.codigoIsp!, confirmado: item.confirmadoPorUsuario,
        consecuencia: item.consecuencia, probabilidad: item.probabilidad ?? 1, severidad: item.severidad ?? 1,
        magnitudExposicion: item.magnitudExposicion ?? "", nivelRiesgoEspecifico: item.nivelRiesgoEspecifico ?? "",
        estadoEvaluacionEspecifica: item.estadoEvaluacionEspecifica ?? "pendiente", observacionTecnica: item.observacionTecnica ?? "",
        motivoSugerencia: item.motivoSugerencia ?? "Sugerencia determinística desde exposición confirmada.",
        control: item.controles[0]?.descripcion ?? "", controlTipo: item.controles[0]?.tipoControl ?? "administrativo",
        controlResponsableId: item.controles[0]?.responsableTrabajadorId ?? borrador.responsableElaboracionId ?? "",
        controlFecha: item.controles[0]?.fechaCompromiso?.toISOString().slice(0, 10) ?? "",
        controlEstado: item.controles[0]?.estado ?? "pendiente",
      })),
    } : null,
  };
}

export async function iniciarMiperAsistente(input: {
  codigo: string; nombre: string; centroTrabajoId: string; areaId: string; cargoIds: string[];
  responsableElaboracionId: string; fechaProximaRevision: string; observaciones?: string;
}): Promise<{ id: string; cargos: { id: string; cargoId: string; nombre: string; descripcionTrabajo: string }[] }> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  if (input.cargoIds.length < 1 || input.cargoIds.length > 30) throw new Error("Selecciona entre 1 y 30 cargos.");
  const [centro, area, cargos, responsable] = await Promise.all([
    prisma.centroTrabajo.findFirst({ where: { id: input.centroTrabajoId, empresaId, estado: "activo" }, select: { id: true } }),
    prisma.area.findFirst({ where: { id: input.areaId, empresaId, estado: "activa" }, select: { id: true } }),
    prisma.cargo.findMany({ where: { id: { in: input.cargoIds }, empresaId, estado: "activo" }, select: { id: true, nombre: true, descripcion: true, areaId: true } }),
    prisma.trabajador.findFirst({ where: { id: input.responsableElaboracionId, empresaId, estado: "activo" }, select: { id: true } }),
  ]);
  if (!centro || !area || !responsable || cargos.length !== new Set(input.cargoIds).size) throw new Error("El alcance contiene registros inactivos o ajenos a la empresa.");
  if (cargos.some((cargo) => cargo.areaId && cargo.areaId !== area.id)) throw new Error("Todos los cargos deben pertenecer al área seleccionada.");
  await asegurarCatalogoIsp();

  const miper = await prisma.ds44Miper.create({
    data: {
      empresaId, codigo: texto(input.codigo, "El código", 40).toUpperCase(), nombre: texto(input.nombre, "El nombre", 160),
      fechaProximaRevision: fecha(input.fechaProximaRevision), observaciones: opcional(input.observaciones),
      responsableElaboracionId: responsable.id, modoCreacion: "asistente", asistentePaso: 1,
      creadoPorId: usuarioId, actualizadoPorId: usuarioId,
      asistenteCargos: { create: cargos.map((cargo, index) => ({ empresaId, cargoId: cargo.id, centroTrabajoId: centro.id, areaId: area.id, descripcionTrabajo: cargo.descripcion, orden: index + 1 })) },
    },
    include: { asistenteCargos: { include: { cargo: { select: { nombre: true } } }, orderBy: { orden: "asc" } } },
  });
  return { id: miper.id, cargos: miper.asistenteCargos.map((item) => ({ id: item.id, cargoId: item.cargoId, nombre: item.cargo.nombre, descripcionTrabajo: item.descripcionTrabajo ?? "" })) };
}

export async function guardarDescripcionesAsistente(input: { miperId: string; cargos: { id: string; descripcionTrabajo: string }[] }): Promise<void> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  await validarMiperAsistente(input.miperId, empresaId);
  const existentes = await prisma.ds44MiperAsistenteCargo.findMany({ where: { miperId: input.miperId, empresaId }, select: { id: true } });
  const permitidos = new Set(existentes.map((item) => item.id));
  if (input.cargos.some((item) => !permitidos.has(item.id))) throw new Error("Uno de los cargos no pertenece al asistente activo.");
  await prisma.$transaction([
    ...input.cargos.map((item) => prisma.ds44MiperAsistenteCargo.update({ where: { id: item.id }, data: { descripcionTrabajo: texto(item.descripcionTrabajo, "La descripción del trabajo", 2000) } })),
    prisma.ds44Miper.update({ where: { id: input.miperId }, data: { asistentePaso: 2, actualizadoPorId: usuarioId } }),
  ]);
}

export async function obtenerSugerenciasTareasIa(input: { miperId: string; asistenteCargoId: string }) {
  const { empresaId } = await requirePermission("canManageCumplimiento");
  await validarMiperAsistente(input.miperId, empresaId);
  const alcance = await prisma.ds44MiperAsistenteCargo.findFirst({ where: { id: input.asistenteCargoId, miperId: input.miperId, empresaId }, include: { cargo: { select: { id: true, nombre: true, descripcion: true, perfilSST: true, riesgosClave: true } } } });
  if (!alcance) throw new Error("El cargo no pertenece al asistente activo.");
  return sugerirTareasMiperConIa(
    { cargoId: alcance.cargo.id, nombre: alcance.cargo.nombre, descripcion: [alcance.cargo.descripcion, alcance.descripcionTrabajo].filter(Boolean).join("\n\n") || null, perfilSst: alcance.cargo.perfilSST, riesgosClave: alcance.cargo.riesgosClave },
    obtenerProveedorTareasMiperOpenAI(),
  );
}

export async function guardarTareasAsistente(input: { miperId: string; cargos: { asistenteCargoId: string; tareas: { nombre: string; origen?: "manual" | "ia" }[] }[] }) {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  await validarMiperAsistente(input.miperId, empresaId);
  const cargos = await prisma.ds44MiperAsistenteCargo.findMany({ where: { miperId: input.miperId, empresaId }, select: { id: true } });
  const permitidos = new Set(cargos.map((item) => item.id));
  if (input.cargos.some((item) => !permitidos.has(item.asistenteCargoId))) throw new Error("Uno de los cargos no pertenece al asistente activo.");
  const result = await prisma.$transaction(async (tx) => {
    await tx.ds44MiperTarea.deleteMany({ where: { miperId: input.miperId, empresaId } });
    for (const cargo of input.cargos) {
      if (cargo.tareas.length < 1 || cargo.tareas.length > 30) throw new Error("Cada cargo debe tener entre 1 y 30 tareas confirmadas.");
      await tx.ds44MiperTarea.createMany({ data: cargo.tareas.map((tarea, index) => ({ empresaId, miperId: input.miperId, asistenteCargoId: cargo.asistenteCargoId, nombre: texto(tarea.nombre, "La tarea", 300), origen: tarea.origen ?? "manual", confirmada: true, orden: index + 1 })) });
    }
    await tx.ds44Miper.update({ where: { id: input.miperId }, data: { asistentePaso: 3, actualizadoPorId: usuarioId } });
    return tx.ds44MiperTarea.findMany({ where: { miperId: input.miperId, empresaId }, select: { id: true, asistenteCargoId: true, nombre: true }, orderBy: [{ asistenteCargoId: "asc" }, { orden: "asc" }] });
  });
  return result;
}

export async function guardarExposicionesAsistente(input: { miperId: string; respuestas: { tareaId: string; grupo: string; clave: string; pregunta: string; respuesta: "aplica" | "no_aplica" | "no_se" }[] }): Promise<void> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  await validarMiperAsistente(input.miperId, empresaId);
  const tareas = await prisma.ds44MiperTarea.findMany({ where: { miperId: input.miperId, empresaId }, select: { id: true } });
  const permitidas = new Set(tareas.map((item) => item.id));
  if (input.respuestas.some((item) => !permitidas.has(item.tareaId) || !RESPUESTAS.has(item.respuesta))) throw new Error("Las respuestas de exposición no son válidas para este borrador.");
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
  items: { tareaId: string; codigoIsp: string; confirmado: boolean; consecuencia: string; responsableTrabajadorId: string; motivoSugerencia: string }[];
}) {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  await validarMiperAsistente(input.miperId, empresaId);
  if (input.items.length < 1 || input.items.length > 200) throw new Error("El paso debe contener entre 1 y 200 sugerencias de riesgo.");
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
    return {
      empresaId, miperId: input.miperId, tareaId: tarea.id, catalogoRiesgoId: riesgo.id,
      centroTrabajoId: tarea.asistenteCargo.centroTrabajoId, areaId: tarea.asistenteCargo.areaId, cargoId: tarea.asistenteCargo.cargoId,
      actividad: tarea.nombre, peligro: riesgo.familia, riesgo: riesgo.riesgoEspecifico, consecuencia: texto(item.consecuencia, "La consecuencia", 500),
      categoriaRiesgo: riesgo.categoria, metodologiaEvaluacion: riesgo.metodologiaEvaluacion, codigoIsp: riesgo.codigoIsp,
      requiereEvaluacionEspecifica: riesgo.metodologiaEvaluacion === "evaluacion_especifica",
      protocoloAplicable: riesgo.protocoloAplicable,
      estadoEvaluacionEspecifica: riesgo.metodologiaEvaluacion === "evaluacion_especifica" ? "pendiente" as const : null,
      motivoSugerencia: texto(item.motivoSugerencia, "El motivo de sugerencia", 500), confirmadoPorUsuario: item.confirmado,
      responsableTrabajadorId: item.responsableTrabajadorId, orden: index + 1, creadoPorId: usuarioId, actualizadoPorId: usuarioId,
    };
  });

  const guardados = await prisma.$transaction(async (tx) => {
    await tx.ds44MiperItem.deleteMany({ where: { miperId: input.miperId, empresaId, tareaId: { not: null } } });
    await tx.ds44MiperItem.createMany({ data: items });
    await tx.ds44Miper.update({ where: { id: input.miperId }, data: { asistentePaso: 5, actualizadoPorId: usuarioId } });
    return tx.ds44MiperItem.findMany({ where: { miperId: input.miperId, empresaId, tareaId: { not: null } }, select: { id: true, tareaId: true, codigoIsp: true }, orderBy: { orden: "asc" } });
  });
  return guardados;
}

export async function guardarEvaluacionesAsistente(input: {
  miperId: string;
  items: { id: string; consecuencia: string; probabilidad?: number; severidad?: number; magnitudExposicion?: string; nivelRiesgoEspecifico?: string; estadoEvaluacionEspecifica?: "pendiente" | "en_evaluacion" | "evaluado"; observacionTecnica?: string }[];
}): Promise<void> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  await validarMiperAsistente(input.miperId, empresaId);
  const existentes = await prisma.ds44MiperItem.findMany({ where: { id: { in: input.items.map((item) => item.id) }, miperId: input.miperId, empresaId, tareaId: { not: null } }, select: { id: true, metodologiaEvaluacion: true } });
  if (existentes.length !== new Set(input.items.map((item) => item.id)).size) throw new Error("Una evaluación no pertenece al borrador activo.");
  const metodologias = new Map(existentes.map((item) => [item.id, item.metodologiaEvaluacion]));
  const evaluaciones = input.items.map((item) => {
    const usaVep = metodologias.get(item.id) === "vep_isp";
    const evaluacion = usaVep ? evaluarVepIsp(Number(item.probabilidad), Number(item.severidad)) : null;
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
  await prisma.ds44Miper.update({ where: { id: input.miperId }, data: { asistentePaso: 6, actualizadoPorId: usuarioId } });
}

export async function guardarControlesAsistente(input: {
  miperId: string;
  items: { id: string; controles: { tipoControl: string; descripcion: string; responsableTrabajadorId: string; fechaCompromiso?: string; estado: string }[] }[];
}): Promise<void> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  await validarMiperAsistente(input.miperId, empresaId);
  const items = await prisma.ds44MiperItem.findMany({ where: { id: { in: input.items.map((item) => item.id) }, miperId: input.miperId, empresaId, tareaId: { not: null } }, select: { id: true } });
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
    await tx.ds44Miper.update({ where: { id: input.miperId }, data: { asistentePaso: 7, actualizadoPorId: usuarioId } });
  });
}

export async function finalizarMiperAsistente(input: { miperId: string }): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  await validarMiperAsistente(input.miperId, empresaId);
  const confirmados = await prisma.ds44MiperItem.count({ where: { miperId: input.miperId, empresaId, tareaId: { not: null }, confirmadoPorUsuario: true } });
  if (confirmados < 1) throw new Error("Confirma al menos un riesgo antes de finalizar el borrador.");
  await prisma.ds44Miper.update({ where: { id: input.miperId }, data: { asistentePaso: 8, actualizadoPorId: usuarioId } });
  revalidatePath("/dicaprev/ds44/miper");
  revalidatePath(`/dicaprev/ds44/miper/${input.miperId}`);
  return { id: input.miperId };
}
