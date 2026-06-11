"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

export type EstadoContratistaDocumentoInput =
  | "pendiente"
  | "en_revision"
  | "aprobado"
  | "rechazado"
  | "vencido";

export type CrearContratistaInput = {
  nombre: string;
  rut?: string;
  razonSocial?: string;
  email?: string;
  telefono?: string;
  observaciones?: string;
};

export type CrearContratistaDocumentoInput = {
  contratistaId: string;
  nombre: string;
  tipo?: string;
  archivoUrl?: string;
  archivoNombre?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  observaciones?: string;
};

export type ContratistaDocumentoRow = {
  id: string;
  nombre: string;
  tipo: string | null;
  estado: EstadoContratistaDocumentoInput;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  observaciones: string | null;
  archivoUrl: string | null;
  archivoNombre: string | null;
};

export type ContratistaRow = {
  id: string;
  nombre: string;
  rut: string | null;
  razonSocial: string | null;
  email: string | null;
  telefono: string | null;
  estadoGlobal: "pendiente" | "en_revision" | "aprobado" | "rechazado" | "vencido";
  totalDocumentos: number;
  documentosVencidos: number;
  proximoVencimiento: string | null;
  acreditacionesActivas: number;
  trabajadoresVinculados: number;
  documentos: ContratistaDocumentoRow[];
};

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function normalizeEstadoDocumento(
  estado: EstadoContratistaDocumentoInput,
  fechaVencimiento: Date | null,
): EstadoContratistaDocumentoInput {
  if (!fechaVencimiento) return estado;
  if (fechaVencimiento.getTime() < Date.now() && estado !== "rechazado") return "vencido";
  return estado;
}

function calcularEstadoGlobal(documentos: ContratistaDocumentoRow[]): ContratistaRow["estadoGlobal"] {
  if (documentos.length === 0) return "pendiente";

  const estados = documentos.map((d) => d.estado);

  if (estados.includes("rechazado")) return "rechazado";
  if (estados.includes("vencido")) return "vencido";
  if (estados.includes("en_revision")) return "en_revision";
  if (estados.every((e) => e === "aprobado")) return "aprobado";
  return "pendiente";
}

export async function crearContratista(input: CrearContratistaInput) {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const nombre = input.nombre.trim();
  if (!nombre) throw new Error("El nombre del contratista es obligatorio");

  const contratista = await prisma.contratista.create({
    data: {
      empresaId,
      nombre,
      rut: input.rut?.trim() || null,
      razonSocial: input.razonSocial?.trim() || null,
      email: input.email?.trim() || null,
      telefono: input.telefono?.trim() || null,
      observaciones: input.observaciones?.trim() || null,
      activo: true,
    },
    select: { id: true },
  });

  return { id: contratista.id };
}

export async function crearContratistaDocumento(input: CrearContratistaDocumentoInput) {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const contratista = await prisma.contratista.findFirst({
    where: { id: input.contratistaId, empresaId },
    select: { id: true },
  });

  if (!contratista) throw new Error("Contratista no encontrado");

  const nombre = input.nombre.trim();
  if (!nombre) throw new Error("El nombre del documento es obligatorio");

  const fechaEmision = parseDate(input.fechaEmision);
  const fechaVencimiento = parseDate(input.fechaVencimiento);

  const estado = normalizeEstadoDocumento("pendiente", fechaVencimiento);

  const doc = await prisma.contratistaDocumento.create({
    data: {
      contratistaId: input.contratistaId,
      empresaId,
      nombre,
      tipo: input.tipo?.trim() || null,
      estado,
      archivoUrl: input.archivoUrl?.trim() || null,
      archivoNombre: input.archivoNombre?.trim() || null,
      fechaEmision,
      fechaVencimiento,
      observaciones: input.observaciones?.trim() || null,
    },
    select: { id: true },
  });

  return { id: doc.id };
}

export async function actualizarEstadoContratistaDocumento(
  documentoId: string,
  estado: EstadoContratistaDocumentoInput,
) {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");

  const doc = await prisma.contratistaDocumento.findFirst({
    where: { id: documentoId, empresaId },
    select: {
      id: true,
      fechaVencimiento: true,
    },
  });

  if (!doc) throw new Error("Documento de contratista no encontrado");

  const estadoFinal = normalizeEstadoDocumento(estado, doc.fechaVencimiento);

  await prisma.contratistaDocumento.update({
    where: { id: documentoId },
    data: {
      estado: estadoFinal,
      revisadoPorId: usuarioId,
      revisadoAt: new Date(),
    },
  });

  return { ok: true };
}

export async function vincularContratistaTrabajador(contratistaId: string, trabajadorId: string) {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const [contratista, trabajador] = await Promise.all([
    prisma.contratista.findFirst({
      where: { id: contratistaId, empresaId },
      select: { id: true },
    }),
    prisma.trabajador.findFirst({
      where: { id: trabajadorId, empresaId },
      select: { id: true },
    }),
  ]);

  if (!contratista) throw new Error("Contratista no encontrado");
  if (!trabajador) throw new Error("Trabajador no encontrado");

  await prisma.contratistaTrabajador.upsert({
    where: {
      contratistaId_trabajadorId: {
        contratistaId,
        trabajadorId,
      },
    },
    update: {},
    create: {
      empresaId,
      contratistaId,
      trabajadorId,
    },
  });

  return { ok: true };
}

export async function getOpcionesContratistas() {
  const { empresaId } = await requirePermission("canReadDocumentacion");

  const [trabajadores, acreditaciones] = await Promise.all([
    prisma.trabajador.findMany({
      where: { empresaId, estado: { not: "inactivo" } },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        rut: true,
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    prisma.acreditacion.findMany({
      where: { empresaId },
      select: {
        id: true,
        nombreProyecto: true,
        obraFaena: true,
        estado: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    trabajadores: trabajadores.map((t) => ({
      id: t.id,
      nombre: `${t.apellidos} ${t.nombres}`.trim(),
      rut: t.rut,
    })),
    acreditaciones: acreditaciones.map((a) => ({
      id: a.id,
      nombre: a.nombreProyecto || a.obraFaena || "Acreditación sin nombre",
      estado: a.estado,
    })),
  };
}

export async function asignarAcreditacionAContratista(contratistaId: string, acreditacionId: string) {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const [contratista, acreditacion] = await Promise.all([
    prisma.contratista.findFirst({ where: { id: contratistaId, empresaId }, select: { id: true } }),
    prisma.acreditacion.findFirst({ where: { id: acreditacionId, empresaId }, select: { id: true } }),
  ]);

  if (!contratista) throw new Error("Contratista no encontrado");
  if (!acreditacion) throw new Error("Acreditación no encontrada");

  await prisma.acreditacion.update({
    where: { id: acreditacionId },
    data: { contratistaId },
  });

  return { ok: true };
}

export async function getContratistas(): Promise<ContratistaRow[]> {
  const { empresaId } = await requirePermission("canReadDocumentacion");

  const rows = await prisma.contratista.findMany({
    where: { empresaId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nombre: true,
      rut: true,
      razonSocial: true,
      email: true,
      telefono: true,
      documentos: {
        select: {
          id: true,
          nombre: true,
          tipo: true,
          estado: true,
          fechaEmision: true,
          fechaVencimiento: true,
          observaciones: true,
          archivoUrl: true,
          archivoNombre: true,
        },
        orderBy: { createdAt: "desc" },
      },
      trabajadores: { select: { id: true } },
      acreditaciones: {
        where: {
          estado: {
            in: ["en_preparacion", "listo_para_enviar", "enviado", "observada", "aprobado"],
          },
        },
        select: { id: true },
      },
    },
  });

  return rows.map((c) => {
    const docs: ContratistaDocumentoRow[] = c.documentos.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      tipo: d.tipo,
      estado: normalizeEstadoDocumento(d.estado, d.fechaVencimiento),
      fechaEmision: toIso(d.fechaEmision),
      fechaVencimiento: toIso(d.fechaVencimiento),
      observaciones: d.observaciones,
      archivoUrl: d.archivoUrl,
      archivoNombre: d.archivoNombre,
    }));

    const vencidos = docs.filter((d) => d.estado === "vencido").length;
    const proximos = docs
      .filter((d) => Boolean(d.fechaVencimiento))
      .map((d) => new Date(d.fechaVencimiento as string))
      .filter((dt) => !Number.isNaN(dt.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      id: c.id,
      nombre: c.nombre,
      rut: c.rut,
      razonSocial: c.razonSocial,
      email: c.email,
      telefono: c.telefono,
      estadoGlobal: calcularEstadoGlobal(docs),
      totalDocumentos: docs.length,
      documentosVencidos: vencidos,
      proximoVencimiento: proximos[0] ? proximos[0].toISOString() : null,
      acreditacionesActivas: c.acreditaciones.length,
      trabajadoresVinculados: c.trabajadores.length,
      documentos: docs,
    };
  });
}
