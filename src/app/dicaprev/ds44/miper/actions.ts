"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generarExcelMiperIsp } from "@/lib/ds44/miper-export-excel";
import { evaluarVepIsp } from "@/lib/ds44/miper-vep-isp";
import { controlPrioritarioValido, evaluacionEspecificaTieneRespaldo, puedeTransicionarMiper, validarAprobacionMiper, validarVepCompletoParaTransicion } from "@/lib/ds44/miper-reglas";
import { requirePermission } from "@/server/auth/permissions";
import type {
  CrearMiperInput,
  GuardarMiperControlInput,
  DescargarMiperExcelResult,
  GuardarMiperItemInput,
  MiperControlEstado,
  MiperDetalleData,
  MiperEstado,
  MiperListadoData,
} from "./types";
import { MIPER_CONTROL_ESTADOS, MIPER_CONTROL_TIPOS, MIPER_ESTADOS } from "./types";

const ESTADOS_EDITABLES = new Set<MiperEstado>(["borrador", "en_revision"]);
const ROLES_APROBADORES = new Set(["SUPERADMIN", "ADMIN_EMPRESA", "PREVENCIONISTA"]);

function textoRequerido(value: string, nombre: string, max = 500): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error(`${nombre} es obligatorio.`);
  if (normalized.length > max) throw new Error(`${nombre} no puede superar ${max} caracteres.`);
  return normalized;
}

function textoOpcional(value: string | undefined, max = 2000): string | null {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  if (normalized.length > max) throw new Error(`El texto no puede superar ${max} caracteres.`);
  return normalized;
}

function fechaOpcional(value: string | undefined, nombre: string): Date | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  const parsed = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${nombre} no es válida.`);
  return parsed;
}

function fechaIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function construirPeligroConsolidado(input: {
  peligro: string;
  peligroGente?: string;
  peligroEquipos?: string;
  peligroMateriales?: string;
  peligroAmbiente?: string;
  peligroDescripcion?: string;
}): string {
  const partes = [
    input.peligroGente?.trim() ? `Gente: ${input.peligroGente.trim()}` : null,
    input.peligroEquipos?.trim() ? `Equipos: ${input.peligroEquipos.trim()}` : null,
    input.peligroMateriales?.trim() ? `Materiales: ${input.peligroMateriales.trim()}` : null,
    input.peligroAmbiente?.trim() ? `Ambiente: ${input.peligroAmbiente.trim()}` : null,
  ].filter(Boolean) as string[];
  const descripcion = input.peligroDescripcion?.trim() ?? "";
  if (partes.length === 0 && !descripcion) return input.peligro;
  return `${partes.join(" | ")}${descripcion ? `${partes.length > 0 ? " | " : ""}Detalle: ${descripcion}` : ""}`;
}

function isPersistenceUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const prismaError = error as Error & { code?: string };
  return prismaError.code === "P2021" || prismaError.code === "P2022";
}

async function validarEmpresaActiva(empresaId: string): Promise<void> {
  const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, activa: true }, select: { id: true } });
  if (!empresa) throw new Error("La empresa activa no está disponible.");
}

async function obtenerMiperEditable(miperId: string, empresaId: string) {
  const miper = await prisma.ds44Miper.findFirst({
    where: { id: miperId, empresaId },
    select: { id: true, estado: true },
  });
  if (!miper) throw new Error("La matriz MIPER no existe o no pertenece a la empresa activa.");
  if (!ESTADOS_EDITABLES.has(miper.estado)) {
    throw new Error("Una matriz vigente no puede modificarse directamente. Crea una nueva revisión para actualizarla.");
  }
  return miper;
}

async function validarAlcanceOrganizacional(input: {
  empresaId: string;
  centroTrabajoId: string;
  areaId: string;
  cargoId: string;
  responsableTrabajadorId: string;
}): Promise<void> {
  const [centro, area, cargo, responsable] = await Promise.all([
    prisma.centroTrabajo.findFirst({ where: { id: input.centroTrabajoId, empresaId: input.empresaId }, select: { id: true } }),
    prisma.area.findFirst({ where: { id: input.areaId, empresaId: input.empresaId, estado: "activa" }, select: { id: true } }),
    prisma.cargo.findFirst({ where: { id: input.cargoId, empresaId: input.empresaId, estado: "activo" }, select: { id: true, areaId: true } }),
    prisma.trabajador.findFirst({
      where: { id: input.responsableTrabajadorId, empresaId: input.empresaId, estado: "activo" },
      select: { id: true },
    }),
  ]);

  if (!centro) throw new Error("El centro de trabajo no pertenece a la empresa activa.");
  if (!area) throw new Error("El área no pertenece a la empresa activa o está inactiva.");
  if (!cargo) throw new Error("El cargo no pertenece a la empresa activa o está inactivo.");
  if (cargo.areaId && cargo.areaId !== input.areaId) throw new Error("El cargo no pertenece al área seleccionada.");
  if (!responsable) throw new Error("El responsable debe ser un trabajador activo de la empresa.");
}

async function validarResponsable(empresaId: string, trabajadorId: string): Promise<void> {
  const responsable = await prisma.trabajador.findFirst({
    where: { id: trabajadorId, empresaId, estado: "activo" },
    select: { id: true },
  });
  if (!responsable) throw new Error("El responsable debe ser un trabajador activo de la empresa.");
}

export async function getDs44MiperListadoData(): Promise<MiperListadoData> {
  const { empresaId } = await requirePermission("canReadCumplimiento");
  await validarEmpresaActiva(empresaId);

  try {
    const matrices = await prisma.ds44Miper.findMany({
      where: { empresaId },
      orderBy: [{ updatedAt: "desc" }, { codigo: "asc" }],
      include: {
        items: { where: { confirmadoPorUsuario: true }, select: { clasificacionRiesgo: true } },
      },
    });

    const rows = matrices.map((miper) => ({
      id: miper.id,
      codigo: miper.codigo,
      nombre: miper.nombre,
      version: miper.version,
      estado: miper.estado,
      vigenteDesde: fechaIso(miper.vigenteDesde),
      fechaProximaRevision: fechaIso(miper.fechaProximaRevision),
      cantidadItems: miper.items.length,
      riesgosCriticos: miper.items.filter((item) => item.clasificacionRiesgo === "critico" || item.clasificacionRiesgo === "intolerable").length,
      modoCreacion: miper.modoCreacion,
      asistentePaso: miper.asistentePaso,
    }));

    return {
      databaseUpdateRequired: false,
      resumen: {
        matrices: rows.length,
        vigentes: rows.filter((item) => item.estado === "vigente").length,
        itemsEvaluados: rows.reduce((total, item) => total + item.cantidadItems, 0),
        riesgosCriticos: rows.reduce((total, item) => total + item.riesgosCriticos, 0),
      },
      matrices: rows,
    };
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
    return {
      databaseUpdateRequired: true,
      resumen: { matrices: 0, vigentes: 0, itemsEvaluados: 0, riesgosCriticos: 0 },
      matrices: [],
    };
  }
}

export async function crearDs44Miper(input: CrearMiperInput): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  await validarEmpresaActiva(empresaId);
  const codigo = textoRequerido(input.codigo, "El código", 40).toUpperCase();
  const nombre = textoRequerido(input.nombre, "El nombre", 160);

  try {
    const miper = await prisma.ds44Miper.create({
      data: {
        empresaId,
        codigo,
        nombre,
        procesoNombre: textoOpcional(input.procesoNombre, 160),
        procesoTipo: input.procesoTipo ?? null,
        procesoResponsable: textoOpcional(input.procesoResponsable, 160),
        fechaProximaRevision: fechaOpcional(input.fechaProximaRevision, "La fecha de próxima revisión"),
        observaciones: textoOpcional(input.observaciones),
        creadoPorId: usuarioId,
        actualizadoPorId: usuarioId,
      },
      select: { id: true },
    });
    revalidatePath("/dicaprev/ds44/miper");
    return miper;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Ya existe una matriz con ese código y versión.");
    }
    throw error;
  }
}

export async function eliminarDs44MiperBorrador(miperId: string): Promise<void> {
  const { empresaId } = await requirePermission("canManageCumplimiento");
  await validarEmpresaActiva(empresaId);

  const miper = await prisma.ds44Miper.findFirst({
    where: { id: miperId, empresaId },
    select: { id: true, estado: true },
  });
  if (!miper) throw new Error("La matriz MIPER no existe o no pertenece a la empresa activa.");
  if (miper.estado !== "borrador") {
    throw new Error("Solo se pueden eliminar matrices MIPER en borrador.");
  }

  const eliminada = await prisma.ds44Miper.deleteMany({
    where: { id: miper.id, empresaId, estado: "borrador" },
  });
  if (eliminada.count !== 1) {
    throw new Error("La matriz cambió de estado y ya no puede eliminarse.");
  }

  revalidatePath("/dicaprev/ds44/miper");
}

export async function getDs44MiperDetalleData(miperId: string): Promise<MiperDetalleData> {
  const { empresaId, rol } = await requirePermission("canReadCumplimiento");
  await validarEmpresaActiva(empresaId);

  const [miper, centros, areas, cargos, responsables] = await Promise.all([
    prisma.ds44Miper.findFirst({
      where: { id: miperId, empresaId },
      include: {
        creadoPor: { select: { nombre: true } },
        actualizadoPor: { select: { nombre: true } },
        aprobadoPor: { select: { nombre: true } },
        items: {
          where: { confirmadoPorUsuario: true },
          orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
          include: {
            centroTrabajo: { select: { nombre: true } },
            area: { select: { nombre: true } },
            cargo: { select: { nombre: true } },
            responsableTrabajador: { select: { nombres: true, apellidos: true } },
            controles: {
              orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
              include: { responsableTrabajador: { select: { nombres: true, apellidos: true } } },
            },
          },
        },
      },
    }),
    prisma.centroTrabajo.findMany({ where: { empresaId, estado: "activo" }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.area.findMany({ where: { empresaId, estado: "activa" }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.cargo.findMany({ where: { empresaId, estado: "activo" }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, areaId: true } }),
    prisma.trabajador.findMany({
      where: { empresaId, estado: "activo" },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      select: { id: true, nombres: true, apellidos: true, cargo: { select: { nombre: true } }, area: { select: { nombre: true } } },
    }),
  ]);

  if (!miper) throw new Error("La matriz MIPER no existe o no pertenece a la empresa activa.");

  return {
    miper: {
      id: miper.id,
      codigo: miper.codigo,
      nombre: miper.nombre,
      version: miper.version,
      estado: miper.estado,
      vigenteDesde: fechaIso(miper.vigenteDesde),
      fechaProximaRevision: fechaIso(miper.fechaProximaRevision),
      observaciones: miper.observaciones,
      procesoNombre: miper.procesoNombre,
      procesoTipo: miper.procesoTipo,
      procesoResponsable: miper.procesoResponsable,
      creadoPor: miper.creadoPor.nombre,
      actualizadoPor: miper.actualizadoPor.nombre,
      aprobadoPor: miper.aprobadoPor?.nombre ?? null,
      responsableElaboracionId: miper.responsableElaboracionId,
      createdAt: miper.createdAt.toISOString(),
      updatedAt: miper.updatedAt.toISOString(),
    },
    editable: ESTADOS_EDITABLES.has(miper.estado),
    puedeAprobar: ROLES_APROBADORES.has(rol),
    centros,
    areas,
    cargos,
    responsables: responsables.map((trabajador) => ({
      id: trabajador.id,
      nombre: `${trabajador.nombres} ${trabajador.apellidos}`.replace(/\s+/g, " ").trim(),
      cargo: trabajador.cargo?.nombre ?? null,
      area: trabajador.area?.nombre ?? null,
    })),
    items: miper.items.map((item) => ({
      id: item.id,
      centroTrabajoId: item.centroTrabajoId,
      centroTrabajoNombre: item.centroTrabajo?.nombre ?? null,
      areaId: item.areaId,
      areaNombre: item.area?.nombre ?? null,
      cargoId: item.cargoId,
      cargoNombre: item.cargo?.nombre ?? null,
      actividad: item.actividad,
      peligro: item.peligro,
      riesgo: item.riesgo,
      consecuencia: item.consecuencia,
      probabilidad: item.probabilidad,
      severidad: item.severidad,
      nivelRiesgo: item.nivelRiesgo,
      clasificacionRiesgo: item.clasificacionRiesgo as MiperDetalleData["items"][number]["clasificacionRiesgo"],
      categoriaRiesgo: item.categoriaRiesgo,
      metodologiaEvaluacion: item.metodologiaEvaluacion,
      codigoIsp: item.codigoIsp,
      requiereEvaluacionEspecifica: item.requiereEvaluacionEspecifica,
      magnitudExposicion: item.magnitudExposicion,
      nivelRiesgoEspecifico: item.nivelRiesgoEspecifico,
      protocoloAplicable: item.protocoloAplicable,
      estadoEvaluacionEspecifica: item.estadoEvaluacionEspecifica,
      observacionTecnica: item.observacionTecnica,
      responsableTrabajadorId: item.responsableTrabajadorId,
      responsableNombre: item.responsableTrabajador
        ? `${item.responsableTrabajador.nombres} ${item.responsableTrabajador.apellidos}`.replace(/\s+/g, " ").trim()
        : null,
      observaciones: item.observaciones,
      peligroGente: item.peligroGente,
      peligroEquipos: item.peligroEquipos,
      peligroMateriales: item.peligroMateriales,
      peligroAmbiente: item.peligroAmbiente,
      peligroDescripcion: item.peligroDescripcion,
      orden: item.orden,
      controles: item.controles.map((control) => ({
        id: control.id,
        tipoControl: control.tipoControl,
        descripcion: control.descripcion,
        responsableTrabajadorId: control.responsableTrabajadorId,
        responsableNombre: control.responsableTrabajador
          ? `${control.responsableTrabajador.nombres} ${control.responsableTrabajador.apellidos}`.replace(/\s+/g, " ").trim()
          : null,
        fechaCompromiso: fechaIso(control.fechaCompromiso),
        estado: control.estado,
        orden: control.orden,
      })),
    })),
  };
}

export async function actualizarCabeceraDs44Miper(input: {
  miperId: string;
  nombre: string;
  fechaProximaRevision?: string;
  observaciones?: string;
  responsableElaboracionId: string;
}): Promise<void> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  await validarEmpresaActiva(empresaId);
  await obtenerMiperEditable(input.miperId, empresaId);
  await validarResponsable(empresaId, input.responsableElaboracionId);
  await prisma.ds44Miper.update({
    where: { id: input.miperId },
    data: {
      nombre: textoRequerido(input.nombre, "El nombre", 160),
      fechaProximaRevision: fechaOpcional(input.fechaProximaRevision, "La fecha de próxima revisión"),
      observaciones: textoOpcional(input.observaciones),
      responsableElaboracionId: input.responsableElaboracionId,
      actualizadoPorId: usuarioId,
    },
  });
  revalidatePath(`/dicaprev/ds44/miper/${input.miperId}`);
  revalidatePath("/dicaprev/ds44/miper");
}

export async function guardarDs44MiperItem(input: GuardarMiperItemInput): Promise<void> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  await validarEmpresaActiva(empresaId);
  await obtenerMiperEditable(input.miperId, empresaId);
  await validarAlcanceOrganizacional({ ...input, empresaId });
  const usaVep = input.categoriaRiesgo === "seguridad" || input.categoriaRiesgo === "emergencia";
  const evaluacion = usaVep ? evaluarVepIsp(Number(input.probabilidad), Number(input.severidad)) : null;
  const data = {
    centroTrabajoId: input.centroTrabajoId,
    areaId: input.areaId,
    cargoId: input.cargoId,
    actividad: textoRequerido(input.actividad, "La actividad", 300),
    peligro: construirPeligroConsolidado({
      peligro: textoRequerido(input.peligro, "El peligro", 500),
      peligroGente: input.peligroGente,
      peligroEquipos: input.peligroEquipos,
      peligroMateriales: input.peligroMateriales,
      peligroAmbiente: input.peligroAmbiente,
      peligroDescripcion: input.peligroDescripcion,
    }),
    riesgo: textoRequerido(input.riesgo, "El riesgo", 500),
    consecuencia: textoRequerido(input.consecuencia, "La consecuencia", 500),
    categoriaRiesgo: input.categoriaRiesgo,
    metodologiaEvaluacion: usaVep ? "vep_isp" as const : "evaluacion_especifica" as const,
    probabilidad: evaluacion?.probabilidad ?? null,
    severidad: evaluacion?.severidad ?? null,
    nivelRiesgo: evaluacion?.nivelRiesgo ?? null,
    clasificacionRiesgo: evaluacion?.clasificacionRiesgo ?? null,
    requiereEvaluacionEspecifica: !usaVep,
    magnitudExposicion: usaVep ? null : textoOpcional(input.magnitudExposicion, 200),
    nivelRiesgoEspecifico: usaVep ? null : textoOpcional(input.nivelRiesgoEspecifico, 200),
    protocoloAplicable: usaVep ? null : textoOpcional(input.protocoloAplicable, 500),
    estadoEvaluacionEspecifica: usaVep ? null : (input.estadoEvaluacionEspecifica ?? "pendiente"),
    observacionTecnica: usaVep ? null : textoOpcional(input.observacionTecnica, 2000),
    responsableTrabajadorId: input.responsableTrabajadorId,
    observaciones: textoOpcional(input.observaciones),
    peligroGente: textoOpcional(input.peligroGente, 500),
    peligroEquipos: textoOpcional(input.peligroEquipos, 500),
    peligroMateriales: textoOpcional(input.peligroMateriales, 500),
    peligroAmbiente: textoOpcional(input.peligroAmbiente, 500),
    peligroDescripcion: textoOpcional(input.peligroDescripcion, 1000),
    actualizadoPorId: usuarioId,
  };

  if (input.itemId) {
    const item = await prisma.ds44MiperItem.findFirst({ where: { id: input.itemId, miperId: input.miperId, empresaId }, select: { id: true } });
    if (!item) throw new Error("El ítem no pertenece a la matriz y empresa activas.");
    await prisma.ds44MiperItem.update({ where: { id: item.id }, data });
  } else {
    const count = await prisma.ds44MiperItem.count({ where: { miperId: input.miperId, empresaId } });
    await prisma.ds44MiperItem.create({
      data: { ...data, empresaId, miperId: input.miperId, orden: count + 1, creadoPorId: usuarioId },
    });
  }
  revalidatePath(`/dicaprev/ds44/miper/${input.miperId}`);
  revalidatePath("/dicaprev/ds44/miper");
}

export async function guardarDs44MiperControl(input: GuardarMiperControlInput): Promise<void> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  await validarEmpresaActiva(empresaId);
  const item = await prisma.ds44MiperItem.findFirst({
    where: { id: input.miperItemId, empresaId },
    select: { id: true, miperId: true },
  });
  if (!item) throw new Error("El ítem MIPER no pertenece a la empresa activa.");
  await obtenerMiperEditable(item.miperId, empresaId);
  if (!(MIPER_CONTROL_TIPOS as readonly string[]).includes(input.tipoControl)) throw new Error("El tipo de control no es válido.");
  const estado: MiperControlEstado = input.estado ?? "pendiente";
  if (!(MIPER_CONTROL_ESTADOS as readonly string[]).includes(estado)) throw new Error("El estado del control no es válido.");
  await validarResponsable(empresaId, input.responsableTrabajadorId);

  const data = {
    tipoControl: input.tipoControl,
    descripcion: textoRequerido(input.descripcion, "La medida de control", 1000),
    responsableTrabajadorId: input.responsableTrabajadorId,
    fechaCompromiso: fechaOpcional(input.fechaCompromiso, "La fecha de compromiso"),
    estado,
    actualizadoPorId: usuarioId,
  };

  if (input.controlId) {
    const control = await prisma.ds44MiperControl.findFirst({
      where: { id: input.controlId, miperItemId: item.id, empresaId },
      select: { id: true },
    });
    if (!control) throw new Error("El control no pertenece al ítem y empresa activos.");
    await prisma.ds44MiperControl.update({ where: { id: control.id }, data });
  } else {
    const count = await prisma.ds44MiperControl.count({ where: { miperItemId: item.id, empresaId } });
    await prisma.ds44MiperControl.create({
      data: { ...data, empresaId, miperItemId: item.id, orden: count + 1, creadoPorId: usuarioId },
    });
  }
  revalidatePath(`/dicaprev/ds44/miper/${item.miperId}`);
}

export async function cambiarEstadoDs44Miper(input: { miperId: string; estado: MiperEstado }): Promise<void> {
  const context = await requirePermission("canManageCumplimiento");
  await validarEmpresaActiva(context.empresaId);
  if (!(MIPER_ESTADOS as readonly string[]).includes(input.estado)) throw new Error("El estado de la matriz no es válido.");
  const miper = await prisma.ds44Miper.findFirst({
    where: { id: input.miperId, empresaId: context.empresaId },
    select: {
      id: true, estado: true, responsableElaboracionId: true,
      asistenteCargos: { select: { tareas: { select: { exposiciones: { where: { revisionTecnicaPendiente: true }, select: { id: true }, take: 1 } } } } },
      items: {
        where: { confirmadoPorUsuario: true },
        select: {
          actividad: true, peligro: true, riesgo: true, consecuencia: true, responsableTrabajadorId: true,
          clasificacionRiesgo: true, metodologiaEvaluacion: true, estadoEvaluacionEspecifica: true,
          probabilidad: true, severidad: true,
          magnitudExposicion: true, nivelRiesgoEspecifico: true, observacionTecnica: true,
          controles: { select: { estado: true, descripcion: true, responsableTrabajadorId: true, fechaCompromiso: true } },
        },
      },
    },
  });
  if (!miper) throw new Error("La matriz MIPER no pertenece a la empresa activa.");

  if (!puedeTransicionarMiper(miper.estado, input.estado)) throw new Error("La transición de estado solicitada no está permitida.");
  const evaluacionesVepPendientes = miper.items.filter((item) => item.metodologiaEvaluacion === "vep_isp" && (item.probabilidad === null || item.severidad === null)).length;
  if (input.estado === "en_revision") validarVepCompletoParaTransicion(evaluacionesVepPendientes, "en_revision");
  if (input.estado === "vigente") {
    validarVepCompletoParaTransicion(evaluacionesVepPendientes, "vigente");
    validarAprobacionMiper({
      estado: miper.estado, cantidadItems: miper.items.length, rol: context.rol,
      responsableRegistrado: Boolean(miper.responsableElaboracionId),
      respuestasNoSePendientes: miper.asistenteCargos.filter((cargo) => cargo.tareas.some((tarea) => tarea.exposiciones.length > 0)).length,
      itemsIncompletos: miper.items.filter((item) => !item.actividad.trim() || !item.peligro.trim() || !item.riesgo.trim() || !item.consecuencia.trim() || !item.responsableTrabajadorId).length,
      riesgosPrioritariosSinControl: miper.items.filter((item) => ["importante", "intolerable"].includes(item.clasificacionRiesgo ?? "") && !item.controles.some(controlPrioritarioValido)).length,
      evaluacionesEspecificasSinRespaldo: miper.items.filter((item) => item.metodologiaEvaluacion === "evaluacion_especifica" && !evaluacionEspecificaTieneRespaldo(item)).length,
      evaluacionesVepPendientes,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.ds44Miper.update({
      where: { id: miper.id },
      data: {
        estado: input.estado,
        actualizadoPorId: context.usuarioId,
        ...(input.estado === "vigente" ? { vigenteDesde: new Date(), aprobadoPorId: context.usuarioId } : {}),
      },
    });
    if (input.estado === "vigente") {
      const version = await tx.ds44Miper.findUnique({ where: { id: miper.id }, select: { versionAnteriorId: true } });
      if (version?.versionAnteriorId) {
        await tx.ds44Miper.update({ where: { id: version.versionAnteriorId }, data: { estado: "archivado", actualizadoPorId: context.usuarioId } });
      }
    }
  });
  revalidatePath(`/dicaprev/ds44/miper/${miper.id}`);
  revalidatePath("/dicaprev/ds44/miper");
}

export async function crearNuevaRevisionDs44Miper(miperId: string): Promise<{ id: string }> {
  const context = await requirePermission("canManageCumplimiento");
  await validarEmpresaActiva(context.empresaId);
  const origen = await prisma.ds44Miper.findFirst({
    where: { id: miperId, empresaId: context.empresaId, estado: "vigente" },
    include: {
      items: { include: { controles: true } },
      asistenteCargos: { orderBy: { orden: "asc" }, include: { tareas: { orderBy: { orden: "asc" }, include: { exposiciones: true } } } },
      versionSiguiente: { select: { id: true } },
    },
  });
  if (!origen) throw new Error("Solo una matriz vigente puede originar una nueva revisión.");
  if (origen.versionSiguiente) return { id: origen.versionSiguiente.id };

  const revision = await prisma.$transaction(async (tx) => {
    const creada = await tx.ds44Miper.create({
      data: {
        empresaId: context.empresaId,
        codigo: origen.codigo,
        nombre: origen.nombre,
        procesoNombre: origen.procesoNombre,
        procesoTipo: origen.procesoTipo,
        procesoResponsable: origen.procesoResponsable,
        version: origen.version + 1,
        estado: "borrador",
        fechaProximaRevision: origen.fechaProximaRevision,
        observaciones: origen.observaciones,
        versionAnteriorId: origen.id,
        responsableElaboracionId: origen.responsableElaboracionId,
        modoCreacion: origen.modoCreacion,
        asistentePaso: origen.asistentePaso,
        creadoPorId: context.usuarioId,
        actualizadoPorId: context.usuarioId,
      },
    });
    const tareasNuevas = new Map<string, string>();
    for (const alcance of origen.asistenteCargos) {
      const alcanceNuevo = await tx.ds44MiperAsistenteCargo.create({ data: {
        empresaId: context.empresaId, miperId: creada.id, cargoId: alcance.cargoId,
        centroTrabajoId: alcance.centroTrabajoId, areaId: alcance.areaId,
        descripcionTrabajo: alcance.descripcionTrabajo, orden: alcance.orden,
      } });
      for (const tarea of alcance.tareas) {
        const tareaNueva = await tx.ds44MiperTarea.create({ data: {
          empresaId: context.empresaId, miperId: creada.id, asistenteCargoId: alcanceNuevo.id,
          nombre: tarea.nombre, origen: tarea.origen, confirmada: tarea.confirmada, orden: tarea.orden,
        } });
        tareasNuevas.set(tarea.id, tareaNueva.id);
        if (tarea.exposiciones.length) await tx.ds44MiperExposicionRespuesta.createMany({ data: tarea.exposiciones.map((respuesta) => ({
          empresaId: context.empresaId, tareaId: tareaNueva.id, grupo: respuesta.grupo, clave: respuesta.clave,
          pregunta: respuesta.pregunta, respuesta: respuesta.respuesta,
          revisionTecnicaPendiente: respuesta.revisionTecnicaPendiente, observacion: respuesta.observacion,
        })) });
      }
    }
    for (const item of origen.items) {
      const tareaId = item.tareaId ? tareasNuevas.get(item.tareaId) : undefined;
      if (item.tareaId && !tareaId) throw new Error("No fue posible reconectar una tarea del asistente en la nueva revisión.");
      const copia = await tx.ds44MiperItem.create({
        data: {
          empresaId: context.empresaId, miperId: creada.id,
          tareaId,
          centroTrabajoId: item.centroTrabajoId, areaId: item.areaId, cargoId: item.cargoId,
          actividad: item.actividad, peligro: item.peligro, riesgo: item.riesgo, consecuencia: item.consecuencia,
          probabilidad: item.probabilidad, severidad: item.severidad, nivelRiesgo: item.nivelRiesgo,
          clasificacionRiesgo: item.clasificacionRiesgo, categoriaRiesgo: item.categoriaRiesgo,
          metodologiaEvaluacion: item.metodologiaEvaluacion, catalogoRiesgoId: item.catalogoRiesgoId,
          codigoIsp: item.codigoIsp, requiereEvaluacionEspecifica: item.requiereEvaluacionEspecifica,
          magnitudExposicion: item.magnitudExposicion, protocoloAplicable: item.protocoloAplicable,
          nivelRiesgoEspecifico: item.nivelRiesgoEspecifico,
          estadoEvaluacionEspecifica: item.estadoEvaluacionEspecifica, observacionTecnica: item.observacionTecnica,
          motivoSugerencia: item.motivoSugerencia, confirmadoPorUsuario: item.confirmadoPorUsuario,
          responsableTrabajadorId: item.responsableTrabajadorId, observaciones: item.observaciones,
          peligroGente: item.peligroGente, peligroEquipos: item.peligroEquipos,
          peligroMateriales: item.peligroMateriales, peligroAmbiente: item.peligroAmbiente,
          peligroDescripcion: item.peligroDescripcion,
          orden: item.orden, creadoPorId: context.usuarioId, actualizadoPorId: context.usuarioId,
        },
      });
      if (item.controles.length) await tx.ds44MiperControl.createMany({ data: item.controles.map((control) => ({
        empresaId: context.empresaId, miperItemId: copia.id, tipoControl: control.tipoControl,
        descripcion: control.descripcion, responsableTrabajadorId: control.responsableTrabajadorId,
        fechaCompromiso: control.fechaCompromiso, estado: control.estado, orden: control.orden,
        creadoPorId: context.usuarioId, actualizadoPorId: context.usuarioId,
      })) });
    }
    return creada;
  });
  revalidatePath("/dicaprev/ds44/miper");
  return { id: revision.id };
}

export async function descargarExcelDs44Miper(miperId: string): Promise<DescargarMiperExcelResult> {
  const { empresaId } = await requirePermission("canReadCumplimiento");
  await validarEmpresaActiva(empresaId);

  const miper = await prisma.ds44Miper.findFirst({
    where: { id: miperId, empresaId },
    include: {
      empresa: { select: { nombre: true, rut: true, direccion: true, ciudad: true, correo: true } },
      responsableElaboracion: { select: { nombres: true, apellidos: true } },
      aprobadoPor: { select: { nombre: true } },
      versionAnterior: { select: { codigo: true, version: true } },
      tareas: {
        orderBy: [{ orden: "asc" }],
        include: {
          asistenteCargo: { include: { cargo: { select: { nombre: true } } } },
        },
      },
      items: {
        where: { confirmadoPorUsuario: true },
        orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
        include: {
          centroTrabajo: { select: { nombre: true } },
          area: { select: { nombre: true } },
          cargo: { select: { nombre: true } },
          responsableTrabajador: { select: { nombres: true, apellidos: true } },
          controles: {
            orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
            include: { responsableTrabajador: { select: { nombres: true, apellidos: true } } },
          },
        },
      },
    },
  });

  if (!miper) throw new Error("La matriz MIPER no existe o no pertenece a la empresa activa.");

  return generarExcelMiperIsp({
    miper: {
      codigo: miper.codigo,
      version: miper.version,
      nombre: miper.nombre,
      estado: miper.estado,
      versionAnterior: miper.versionAnterior ? `${miper.versionAnterior.codigo}-V${miper.versionAnterior.version}` : null,
      procesoNombre: miper.procesoNombre,
      procesoTipo: miper.procesoTipo,
      procesoResponsable: miper.procesoResponsable,
      responsableElaboracion: miper.responsableElaboracion
        ? `${miper.responsableElaboracion.nombres} ${miper.responsableElaboracion.apellidos}`.replace(/\s+/g, " ").trim()
        : null,
      responsableRevision: null,
      responsableAprobacion: miper.aprobadoPor?.nombre ?? null,
      fechaElaboracion: miper.createdAt.toISOString(),
      fechaRevision: null,
      fechaAprobacion: miper.vigenteDesde?.toISOString() ?? null,
      fechaProximaRevision: miper.fechaProximaRevision?.toISOString() ?? null,
      fechaDescarga: new Date().toISOString(),
      empresaNombre: miper.empresa.nombre,
      empresaRut: miper.empresa.rut,
      empresaDireccion: miper.empresa.direccion,
      empresaComuna: miper.empresa.ciudad,
      empresaCorreo: miper.empresa.correo,
      centroNombre: miper.items[0]?.centroTrabajo?.nombre ?? null,
      centroTipo: null,
      centroDireccion: null,
      areaNombre: miper.items[0]?.area?.nombre ?? null,
    },
    tareas: miper.tareas.map((tarea) => ({
      id: tarea.id,
      cargoNombre: tarea.asistenteCargo.cargo.nombre,
      nombre: tarea.nombre,
      esRutinaria: tarea.esRutinaria,
      lugarEspecifico: tarea.lugarEspecifico,
      personasExpuestasTotal: tarea.personasExpuestasTotal,
      distribucionSexogenerica: (tarea.distribucionSexogenerica ?? null) as Record<string, unknown> | null,
      observaciones: tarea.observaciones,
      origen: tarea.origen,
    })),
    items: miper.items.map((item) => ({
      id: item.id,
      tareaId: item.tareaId,
      actividad: item.actividad,
      centroTrabajoNombre: item.centroTrabajo?.nombre ?? null,
      areaNombre: item.area?.nombre ?? null,
      cargoNombre: item.cargo?.nombre ?? null,
      peligro: item.peligro,
      riesgo: item.riesgo,
      consecuencia: item.consecuencia,
      categoriaRiesgo: item.categoriaRiesgo,
      codigoIsp: item.codigoIsp,
      metodologiaEvaluacion: item.metodologiaEvaluacion,
      probabilidad: item.probabilidad,
      severidad: item.severidad,
      nivelRiesgo: item.nivelRiesgo,
      clasificacionRiesgo: item.clasificacionRiesgo,
      magnitudExposicion: item.magnitudExposicion,
      nivelRiesgoEspecifico: item.nivelRiesgoEspecifico,
      protocoloAplicable: item.protocoloAplicable,
      estadoEvaluacionEspecifica: item.estadoEvaluacionEspecifica,
      observacionTecnica: item.observacionTecnica,
      responsableNombre: item.responsableTrabajador
        ? `${item.responsableTrabajador.nombres} ${item.responsableTrabajador.apellidos}`.replace(/\s+/g, " ").trim()
        : null,
      observaciones: item.observaciones,
      motivoSugerencia: item.motivoSugerencia,
      peligroGente: item.peligroGente,
      peligroEquipos: item.peligroEquipos,
      peligroMateriales: item.peligroMateriales,
      peligroAmbiente: item.peligroAmbiente,
      peligroDescripcion: item.peligroDescripcion,
      controles: item.controles.map((control) => ({
        tipoControl: control.tipoControl,
        descripcion: control.descripcion,
        responsableNombre: control.responsableTrabajador
          ? `${control.responsableTrabajador.nombres} ${control.responsableTrabajador.apellidos}`.replace(/\s+/g, " ").trim()
          : null,
        fechaCompromiso: fechaIso(control.fechaCompromiso),
        estado: control.estado,
      })),
    })),
  });
}
