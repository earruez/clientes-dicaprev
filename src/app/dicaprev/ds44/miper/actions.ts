"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluarRiesgoMiper } from "@/lib/ds44/miper-evaluacion";
import { requirePermission } from "@/server/auth/permissions";
import type {
  CrearMiperInput,
  GuardarMiperControlInput,
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
        items: { select: { clasificacionRiesgo: true } },
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
      riesgosCriticos: miper.items.filter((item) => item.clasificacionRiesgo === "critico").length,
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
      creadoPor: miper.creadoPor.nombre,
      actualizadoPor: miper.actualizadoPor.nombre,
      aprobadoPor: miper.aprobadoPor?.nombre ?? null,
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
      responsableTrabajadorId: item.responsableTrabajadorId,
      responsableNombre: item.responsableTrabajador
        ? `${item.responsableTrabajador.nombres} ${item.responsableTrabajador.apellidos}`.replace(/\s+/g, " ").trim()
        : null,
      observaciones: item.observaciones,
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
}): Promise<void> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  await validarEmpresaActiva(empresaId);
  await obtenerMiperEditable(input.miperId, empresaId);
  await prisma.ds44Miper.update({
    where: { id: input.miperId },
    data: {
      nombre: textoRequerido(input.nombre, "El nombre", 160),
      fechaProximaRevision: fechaOpcional(input.fechaProximaRevision, "La fecha de próxima revisión"),
      observaciones: textoOpcional(input.observaciones),
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
  const evaluacion = evaluarRiesgoMiper(Number(input.probabilidad), Number(input.severidad));
  const data = {
    centroTrabajoId: input.centroTrabajoId,
    areaId: input.areaId,
    cargoId: input.cargoId,
    actividad: textoRequerido(input.actividad, "La actividad", 300),
    peligro: textoRequerido(input.peligro, "El peligro", 500),
    riesgo: textoRequerido(input.riesgo, "El riesgo", 500),
    consecuencia: textoRequerido(input.consecuencia, "La consecuencia", 500),
    ...evaluacion,
    responsableTrabajadorId: input.responsableTrabajadorId,
    observaciones: textoOpcional(input.observaciones),
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
    select: { id: true, estado: true, items: { select: { id: true }, take: 1 } },
  });
  if (!miper) throw new Error("La matriz MIPER no pertenece a la empresa activa.");

  const transiciones: Record<MiperEstado, MiperEstado[]> = {
    borrador: ["en_revision", "vigente", "archivado"],
    en_revision: ["borrador", "vigente", "archivado"],
    vigente: ["archivado"],
    archivado: [],
  };
  if (!transiciones[miper.estado].includes(input.estado)) throw new Error("La transición de estado solicitada no está permitida.");
  if (input.estado === "vigente") {
    if (!ROLES_APROBADORES.has(context.rol)) throw new Error("Solo administración o prevención puede declarar vigente una matriz.");
    if (miper.items.length === 0) throw new Error("La matriz debe tener al menos un ítem antes de declararse vigente.");
  }

  await prisma.ds44Miper.update({
    where: { id: miper.id },
    data: {
      estado: input.estado,
      actualizadoPorId: context.usuarioId,
      ...(input.estado === "vigente" ? { vigenteDesde: new Date(), aprobadoPorId: context.usuarioId } : {}),
    },
  });
  revalidatePath(`/dicaprev/ds44/miper/${miper.id}`);
  revalidatePath("/dicaprev/ds44/miper");
}
