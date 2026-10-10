"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import { CATALOGO_CONTRATISTAS, normalizarClaveDocumento, type AlcanceDocumento } from "@/lib/contratistas/catalogo";
import { estadoEfectivo } from "@/lib/contratistas/requisitos";

export async function obtenerCatalogoContratistas() {
  const { empresaId } = await requirePermission("canReadDocumentacion");
  const personalizados = await prisma.contratistaCatalogoRequisito.findMany({
    where: { empresaId, activo: true }, orderBy: [{ alcance: "asc" }, { grupo: "asc" }, { nombre: "asc" }],
  });
  return [
    ...CATALOGO_CONTRATISTAS.map((r) => ({ ...r, id: "base:" + r.clave, personalizado: false })),
    ...personalizados.map((r) => ({
      id: r.id, clave: r.clave, nombre: r.nombre, alcance: r.alcance as AlcanceDocumento,
      categoria: r.categoria as "empresa" | "trabajador" | "vehiculo" | "equipo",
      grupo: r.grupo, obligatorio: r.obligatorio, requiereVencimiento: r.requiereVencimiento,
      personalizado: true,
    })),
  ];
}

export async function crearCatalogoContratista(input: {
  nombre: string;
  alcance: "empresa" | "faena";
  categoria: "empresa" | "trabajador" | "vehiculo" | "equipo";
  obligatorio?: boolean;
  requiereVencimiento?: boolean;
  grupo?: string;
}) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const nombre = input.nombre?.trim().slice(0, 220);
  if (!nombre || nombre.length < 4) throw new Error("Ingresa un nombre de documento válido");
  if (!["empresa", "faena"].includes(input.alcance)) throw new Error("Ámbito no válido");
  if (!["empresa", "trabajador", "vehiculo", "equipo"].includes(input.categoria)) throw new Error("Categoría no válida");
  if (input.alcance === "empresa" && input.categoria !== "empresa") throw new Error("Los requisitos permanentes corresponden a la empresa contratista");
  const clave = normalizarClaveDocumento(nombre);
  if (!clave) throw new Error("Nombre de documento no válido");
  if (CATALOGO_CONTRATISTAS.some((r) => r.clave === clave && r.alcance === input.alcance)) {
    throw new Error("Este documento ya está en el catálogo estándar");
  }
  const encontrado = await prisma.contratistaCatalogoRequisito.findUnique({
    where: { empresaId_clave_alcance: { empresaId, clave, alcance: input.alcance } },
  });
  if (encontrado && encontrado.activo) throw new Error("Ya existe un requisito personalizado con este nombre");
  return prisma.contratistaCatalogoRequisito.upsert({
    where: { empresaId_clave_alcance: { empresaId, clave, alcance: input.alcance } },
    update: {
      nombre, categoria: input.categoria, grupo: input.grupo?.trim().slice(0, 80) || "Personalizados",
      obligatorio: input.obligatorio ?? false, requiereVencimiento: input.requiereVencimiento ?? false, activo: true,
    },
    create: {
      empresaId, nombre, clave, alcance: input.alcance, categoria: input.categoria,
      grupo: input.grupo?.trim().slice(0, 80) || "Personalizados",
      obligatorio: input.obligatorio ?? false, requiereVencimiento: input.requiereVencimiento ?? false,
    },
    select: { id: true, nombre: true },
  });
}

export async function listarCentrosMandante() {
  const { empresaId } = await requirePermission("canReadDocumentacion");
  return prisma.centroTrabajo.findMany({
    where: { empresaId }, select: { id: true, nombre: true, direccion: true, estado: true },
    orderBy: { nombre: "asc" },
  });
}

export async function listarDocumentosBaseContratista(contratistaId: string) {
  const { empresaId } = await requirePermission("canReadDocumentacion");
  const contratista = await prisma.contratista.findFirst({ where: { id: contratistaId, empresaId }, select: { id: true } });
  if (!contratista) throw new Error("Contratista no encontrado");
  const docs = await prisma.contratistaDocumento.findMany({
    where: { empresaId, contratistaId }, orderBy: { createdAt: "desc" },
    select: { id: true, nombre: true, tipo: true, estado: true, archivoNombre: true, fechaVencimiento: true },
  });
  return docs.map((d) => ({
    ...d, estadoEfectivo: estadoEfectivo(d.estado, d.fechaVencimiento),
    reutilizable: d.estado === "aprobado" && estadoEfectivo(d.estado, d.fechaVencimiento) === "aprobado"
      && Boolean(d.archivoNombre && /^[a-f0-9-]{36}\.(pdf|doc|docx|xlsx|jpg|jpeg|png)$/i.test(d.archivoNombre)),
  }));
}

export async function reutilizarDocumentoContratista(input: { requisitoId: string; documentoBaseId: string }) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const req = await prisma.contratistaRequisito.findFirst({
    where: { id: input.requisitoId, empresaId, categoria: "empresa", recursoId: null, solicitud: { estado: { not: "cerrada" } } },
    include: { solicitud: { select: { id: true, contratistaId: true } } },
  });
  if (!req) throw new Error("Requisito no válido");
  const doc = await prisma.contratistaDocumento.findFirst({
    where: { id: input.documentoBaseId, empresaId, contratistaId: req.solicitud.contratistaId },
  });
  if (!doc || doc.estado !== "aprobado" || estadoEfectivo(doc.estado, doc.fechaVencimiento) !== "aprobado"
      || !doc.archivoNombre || !/^[a-f0-9-]{36}\.(pdf|doc|docx|xlsx|jpg|jpeg|png)$/i.test(doc.archivoNombre)) {
    throw new Error("Solo se pueden reutilizar documentos aprobados, vigentes y almacenados en forma privada");
  }
  const archivoNombre = doc.archivoNombre;
  await prisma.$transaction(async (tx) => {
    const updated = await tx.contratistaRequisito.updateMany({
      where: { id: req.id, empresaId, version: req.version },
      data: {
        documentoBaseId: doc.id, archivoNombre, archivoOriginal: doc.nombre,
        archivoTipo: null, archivoPeso: null, fechaEmision: doc.fechaEmision, fechaVencimiento: doc.fechaVencimiento,
        version: { increment: 1 }, estado: "pendiente", revisadoAt: null, revisadoPorId: null,
        observacionRevision: null, aviso30At: null, aviso15At: null, aviso5At: null,
      },
    });
    if (!updated.count) throw new Error("El requisito cambió; vuelve a intentarlo");
    await tx.contratistaDocumentoVersion.create({
      data: {
        requisitoId: req.id, version: req.version + 1, archivoNombre: doc.archivoNombre,
        archivoOriginal: doc.nombre, archivoTipo: doc.archivoTipo, archivoPeso: doc.archivoPeso ?? 0,
        fechaEmision: doc.fechaEmision, fechaVencimiento: doc.fechaVencimiento,
      },
    });
    await tx.contratistaSolicitud.update({ where: { id: req.solicitud.id }, data: { estado: "enviada" } });
  });
  return { ok: true };
}
