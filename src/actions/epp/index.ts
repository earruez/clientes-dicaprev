"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import { generarTokenFirma } from "@/lib/firmas/tokens";

// ─── Catálogo predeterminado de EPP ───────────────────────────────────────
export const EPP_PREDETERMINADOS = [
  { nombre: "Casco de seguridad", codigo: "EPP-CASCO" },
  { nombre: "Guantes de seguridad", codigo: "EPP-GUANTES" },
  { nombre: "Lentes de seguridad", codigo: "EPP-LENTES" },
  { nombre: "Zapatos de seguridad", codigo: "EPP-ZAPATOS" },
  { nombre: "Chaleco reflectante", codigo: "EPP-CHALECO" },
  { nombre: "Arnés de seguridad", codigo: "EPP-ARNES" },
  { nombre: "Protector auditivo", codigo: "EPP-AUDITIVO" },
  { nombre: "Mascarilla / Respirador", codigo: "EPP-MASCARILLA" },
  { nombre: "Otro", codigo: "EPP-OTRO" },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────

export type EppItemView = {
  id: string;
  nombre: string;
  codigo: string | null;
};

export type DetalleInput = {
  nombre: string;
  cantidad: number;
  talla?: string;
  observacion?: string;
};

export type CrearEntregaEppInput = {
  empresaId: string;
  trabajadorId: string;
  observaciones?: string;
  detalles: DetalleInput[];
};

export type EntregaEppListItem = {
  id: string;
  trabajador: {
    nombres: string;
    apellidos: string;
    rut: string | null;
    cargo: string | null;
  };
  estado: string;
  fechaEntrega: string;
  detalles: { nombre: string; cantidad: number; talla: string | null }[];
  firmaToken: string | null;
  firmaEstado: string | null;
  createdAt: string;
};

export type EntregaEppDetalle = {
  id: string;
  nombre: string;
  cantidad: number;
  talla: string | null;
  observacion: string | null;
};

export type EntregaEppView = {
  id: string;
  estado: string;
  observaciones: string | null;
  fechaEntrega: string;
  trabajador: {
    id: string;
    nombres: string;
    apellidos: string;
    rut: string | null;
    cargo: string | null;
  };
  detalles: EntregaEppDetalle[];
  firmaToken: string | null;
  firmaEstado: string | null;
  firmaLink: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────

async function upsertEppItem(empresaId: string, nombre: string): Promise<string> {
  const existing = await prisma.eppItem.findFirst({
    where: { empresaId, nombre: { equals: nombre, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const item = await prisma.eppItem.create({
    data: { empresaId, nombre },
    select: { id: true },
  });
  return item.id;
}

// ─── Actions ──────────────────────────────────────────────────────────────

export async function getEppItems(): Promise<EppItemView[]> {
  const { empresaId } = await requirePermission("canReadDocumentacion");

  const items = await prisma.eppItem.findMany({
    where: { empresaId, activo: true },
    select: { id: true, nombre: true, codigo: true },
    orderBy: { nombre: "asc" },
  });

  return items;
}

export async function crearEntregaEpp(input: CrearEntregaEppInput) {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");

  if (empresaId !== input.empresaId) {
    throw new Error("Empresa inválida para crear entrega EPP");
  }

  if (!input.detalles.length) {
    throw new Error("Debe incluir al menos un ítem EPP en la entrega");
  }

  const trabajador = await prisma.trabajador.findFirst({
    where: { id: input.trabajadorId, empresaId },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      rut: true,
      cargo: { select: { nombre: true } },
    },
  });

  if (!trabajador) throw new Error("Trabajador no encontrado");

  // Crear la entrega
  const entrega = await prisma.entregaEpp.create({
    data: {
      empresaId,
      trabajadorId: input.trabajadorId,
      observaciones: input.observaciones?.trim() || null,
      creadoPorId: usuarioId,
      estado: "pendiente_firma",
    },
    select: { id: true },
  });

  // Crear detalles (upsert eppItem por nombre)
  for (const detalle of input.detalles) {
    const eppItemId = await upsertEppItem(empresaId, detalle.nombre);
    await prisma.entregaEppDetalle.create({
      data: {
        entregaId: entrega.id,
        eppItemId,
        nombre: detalle.nombre,
        cantidad: detalle.cantidad,
        talla: detalle.talla?.trim() || null,
        observacion: detalle.observacion?.trim() || null,
      },
    });
  }

  // Lista de ítems para el título del documento
  const listaItems = input.detalles.map((d) => `${d.cantidad}x ${d.nombre}`).join(", ");
  const nombreTrabajador = `${trabajador.nombres} ${trabajador.apellidos}`.trim();
  const token = generarTokenFirma();

  // Crear FirmaDocumento enlazada a la entrega
  await prisma.firmaDocumento.create({
    data: {
      empresaId,
      trabajadorId: input.trabajadorId,
      documentoId: entrega.id,
      documentoOrigen: "entrega_epp",
      token,
      estado: "pendiente",
      tituloDocumento: `Entrega de EPP — ${nombreTrabajador}`,
      descripcion: listaItems,
      nombreFirmante: nombreTrabajador,
      rutFirmante: trabajador.rut ?? null,
      entregaEppId: entrega.id,
    },
  });

  return {
    id: entrega.id,
    firmaToken: token,
    firmaLink: `/firma/${token}`,
  };
}

export async function getEntregasEpp(): Promise<EntregaEppListItem[]> {
  const { empresaId } = await requirePermission("canReadDocumentacion");

  const entregas = await prisma.entregaEpp.findMany({
    where: { empresaId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      estado: true,
      fechaEntrega: true,
      createdAt: true,
      trabajador: {
        select: {
          nombres: true,
          apellidos: true,
          rut: true,
          cargo: { select: { nombre: true } },
        },
      },
      detalles: {
        select: { nombre: true, cantidad: true, talla: true },
        orderBy: { createdAt: "asc" },
      },
      firmas: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { token: true, estado: true },
      },
    },
  });

  return entregas.map((e) => ({
    id: e.id,
    trabajador: {
      nombres: e.trabajador.nombres,
      apellidos: e.trabajador.apellidos,
      rut: e.trabajador.rut,
      cargo: e.trabajador.cargo?.nombre ?? null,
    },
    estado: e.estado,
    fechaEntrega: e.fechaEntrega.toISOString(),
    detalles: e.detalles,
    firmaToken: e.firmas[0]?.token ?? null,
    firmaEstado: e.firmas[0]?.estado ?? null,
    createdAt: e.createdAt.toISOString(),
  }));
}

export async function getEntregaEppById(id: string): Promise<EntregaEppView | null> {
  const { empresaId } = await requirePermission("canReadDocumentacion");

  const entrega = await prisma.entregaEpp.findFirst({
    where: { id, empresaId },
    select: {
      id: true,
      estado: true,
      observaciones: true,
      fechaEntrega: true,
      trabajador: {
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          rut: true,
          cargo: { select: { nombre: true } },
        },
      },
      detalles: {
        select: {
          id: true,
          nombre: true,
          cantidad: true,
          talla: true,
          observacion: true,
        },
        orderBy: { createdAt: "asc" },
      },
      firmas: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { token: true, estado: true },
      },
    },
  });

  if (!entrega) return null;

  const firma = entrega.firmas[0] ?? null;

  return {
    id: entrega.id,
    estado: entrega.estado,
    observaciones: entrega.observaciones,
    fechaEntrega: entrega.fechaEntrega.toISOString(),
    trabajador: {
      id: entrega.trabajador.id,
      nombres: entrega.trabajador.nombres,
      apellidos: entrega.trabajador.apellidos,
      rut: entrega.trabajador.rut,
      cargo: entrega.trabajador.cargo?.nombre ?? null,
    },
    detalles: entrega.detalles,
    firmaToken: firma?.token ?? null,
    firmaEstado: firma?.estado ?? null,
    firmaLink: firma ? `/firma/${firma.token}` : null,
  };
}

export async function getOpcionesTrabajadoresParaEpp() {
  const { empresaId } = await requirePermission("canReadDocumentacion");

  const trabajadores = await prisma.trabajador.findMany({
    where: { empresaId, estado: { not: "inactivo" } },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      rut: true,
      cargo: { select: { nombre: true } },
    },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  });

  return trabajadores.map((t) => ({
    id: t.id,
    label: `${t.apellidos} ${t.nombres}`.trim(),
    rut: t.rut ?? null,
    cargo: t.cargo?.nombre ?? null,
  }));
}
