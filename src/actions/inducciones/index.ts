"use server";

import { prisma } from "@/lib/prisma";
import { generarTokenFirma } from "@/lib/firmas/tokens";
import { requirePermission } from "@/server/auth/permissions";

export type CrearInduccionTrabajadorInput = {
  empresaId: string;
  trabajadorId: string;
  observaciones?: string;
};

export type InduccionListItem = {
  id: string;
  token: string;
  estado: string;
  trabajador: {
    nombres: string;
    apellidos: string;
    rut: string | null;
    cargo: string | null;
  };
  firmasTotales: number;
  firmasFirmadas: number;
  fechaInicio: string | null;
  fechaTermino: string | null;
  createdAt: string;
};

export type InduccionPublicaView = {
  id: string;
  token: string;
  estado: string;
  nombreTrabajador: string;
  rutTrabajador: string | null;
  cargoTrabajador: string | null;
  fechaInicio: string | null;
  fechaTermino: string | null;
  firmas: {
    id: string;
    token: string;
    tituloDocumento: string;
    descripcion: string | null;
    estado: string;
    firmadoAt: string | null;
    expiresAt: string | null;
  }[];
};

export async function crearInduccionTrabajador(input: CrearInduccionTrabajadorInput) {
  const { empresaId: empresaActivaId, usuarioId } = await requirePermission("canManageDocumentacion");

  if (empresaActivaId !== input.empresaId) {
    throw new Error("Empresa inválida para crear inducción");
  }

  const trabajador = await prisma.trabajador.findFirst({
    where: { id: input.trabajadorId, empresaId: input.empresaId },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      rut: true,
      cargo: { select: { nombre: true } },
    },
  });

  if (!trabajador) throw new Error("Trabajador no encontrado");

  // Documentos con archivo que aún no están firmados
  const documentosPendientes = await prisma.trabajadorDocumento.findMany({
    where: {
      trabajadorId: input.trabajadorId,
      empresaId: input.empresaId,
      esVigente: true,
      archivoUrl: { not: null },
      firmado: false,
    },
    select: { id: true, nombre: true, tipo: true },
  });

  const token = generarTokenFirma();

  const induccion = await prisma.induccionTrabajador.create({
    data: {
      empresaId: input.empresaId,
      trabajadorId: input.trabajadorId,
      token,
      estado: "pendiente",
      creadoPorId: usuarioId,
      observaciones: input.observaciones?.trim() || null,
    },
    select: { id: true, token: true },
  });

  // Crear FirmaDocumento para cada documento pendiente
  if (documentosPendientes.length > 0) {
    await prisma.firmaDocumento.createMany({
      data: documentosPendientes.map((doc) => ({
        empresaId: input.empresaId,
        trabajadorId: input.trabajadorId,
        documentoId: doc.id,
        documentoOrigen: "induccion" as const,
        token: generarTokenFirma(),
        estado: "pendiente" as const,
        tituloDocumento: doc.nombre,
        descripcion: `Inducción digital — ${doc.tipo}`,
        nombreFirmante: `${trabajador.nombres} ${trabajador.apellidos}`.trim(),
        rutFirmante: trabajador.rut ?? null,
        induccionId: induccion.id,
      })),
    });
  }

  return {
    id: induccion.id,
    token: induccion.token,
    link: `/induccion/${induccion.token}`,
    firmasCreadas: documentosPendientes.length,
  };
}

export async function getInduccionesTrabajador(trabajadorId?: string): Promise<InduccionListItem[]> {
  const { empresaId } = await requirePermission("canReadDocumentacion");

  const inducciones = await prisma.induccionTrabajador.findMany({
    where: {
      empresaId,
      ...(trabajadorId ? { trabajadorId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      estado: true,
      fechaInicio: true,
      fechaTermino: true,
      createdAt: true,
      trabajador: {
        select: {
          nombres: true,
          apellidos: true,
          rut: true,
          cargo: { select: { nombre: true } },
        },
      },
      firmas: {
        select: {
          id: true,
          estado: true,
        },
      },
    },
  });

  return inducciones.map((ind) => ({
    id: ind.id,
    token: ind.token,
    estado: ind.estado,
    trabajador: {
      nombres: ind.trabajador.nombres,
      apellidos: ind.trabajador.apellidos,
      rut: ind.trabajador.rut,
      cargo: ind.trabajador.cargo?.nombre ?? null,
    },
    firmasTotales: ind.firmas.length,
    firmasFirmadas: ind.firmas.filter((f) => f.estado === "firmado").length,
    fechaInicio: ind.fechaInicio?.toISOString() ?? null,
    fechaTermino: ind.fechaTermino?.toISOString() ?? null,
    createdAt: ind.createdAt.toISOString(),
  }));
}

export async function getInduccionPorToken(token: string): Promise<InduccionPublicaView | null> {
  const induccion = await prisma.induccionTrabajador.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      estado: true,
      fechaInicio: true,
      fechaTermino: true,
      trabajador: {
        select: {
          nombres: true,
          apellidos: true,
          rut: true,
          cargo: { select: { nombre: true } },
        },
      },
      firmas: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          token: true,
          tituloDocumento: true,
          descripcion: true,
          estado: true,
          firmadoAt: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!induccion) return null;

  // Auto-computar estado efectivo
  const todasFirmadas =
    induccion.firmas.length > 0 && induccion.firmas.every((f) => f.estado === "firmado");

  return {
    id: induccion.id,
    token: induccion.token,
    estado: todasFirmadas ? "completada" : induccion.estado,
    nombreTrabajador: `${induccion.trabajador.nombres} ${induccion.trabajador.apellidos}`.trim(),
    rutTrabajador: induccion.trabajador.rut,
    cargoTrabajador: induccion.trabajador.cargo?.nombre ?? null,
    fechaInicio: induccion.fechaInicio?.toISOString() ?? null,
    fechaTermino: induccion.fechaTermino?.toISOString() ?? null,
    firmas: induccion.firmas.map((f) => ({
      id: f.id,
      token: f.token,
      tituloDocumento: f.tituloDocumento,
      descripcion: f.descripcion,
      estado: f.estado,
      firmadoAt: f.firmadoAt?.toISOString() ?? null,
      expiresAt: f.expiresAt?.toISOString() ?? null,
    })),
  };
}

export async function actualizarEstadoInduccion(
  id: string,
  estado: "pendiente" | "en_progreso" | "completada" | "cancelada",
) {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const induccion = await prisma.induccionTrabajador.findFirst({
    where: { id, empresaId },
    select: { id: true },
  });

  if (!induccion) throw new Error("Inducción no encontrada");

  const data: {
    estado: "pendiente" | "en_progreso" | "completada" | "cancelada";
    fechaInicio?: Date;
    fechaTermino?: Date;
  } = { estado };

  if (estado === "en_progreso") {
    data.fechaInicio = new Date();
  } else if (estado === "completada") {
    data.fechaTermino = new Date();
  }

  await prisma.induccionTrabajador.update({
    where: { id },
    data,
  });

  return { ok: true };
}
