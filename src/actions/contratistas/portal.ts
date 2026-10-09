"use server";

import { prisma } from "@/lib/prisma";
import { resolverPortalContratista } from "@/lib/contratistas/portal";
import { REQUISITOS_RECURSO, estadoEfectivo, type CategoriaContratista } from "@/lib/contratistas/requisitos";

function valido(input: string) {
  return input.trim().slice(0, 160);
}

export async function obtenerPortalContratista(token: string) {
  const s = await resolverPortalContratista(token);
  if (!s) return null;
  const empresa = await prisma.empresa.findUnique({ where: { id: s.empresaId }, select: { nombre: true } });
  return {
    nombre: s.nombre, faena: s.faena, servicio: s.servicio,
    estado: s.estado, contactoEmail: s.contactoEmail, empresaMandante: empresa?.nombre || "Empresa mandante",
    contratista: s.contratista, recursos: s.recursos,
    requisitos: s.requisitos.map((r) => ({ ...r, estadoEfectivo: estadoEfectivo(r.estado, r.fechaVencimiento) })),
  };
}

export async function agregarRecursoPortal(token: string, input: {
  tipo: Exclude<CategoriaContratista, "empresa">;
  nombre: string;
  identificador?: string;
  cargo?: string;
  patente?: string;
}) {
  const s = await resolverPortalContratista(token);
  if (!s) throw new Error("Invitación inválida o vencida");
  if (!(input.tipo in REQUISITOS_RECURSO)) throw new Error("Tipo de recurso inválido");
  const nombre = valido(input.nombre || "");
  if (!nombre) throw new Error("Indica el nombre del trabajador, vehículo o equipo");
  const identificador = valido(input.identificador || "");
  const patente = valido(input.patente || "");
  if (input.tipo === "trabajador" && !identificador) throw new Error("Indica el RUT del trabajador");
  if (input.tipo === "vehiculo" && !patente) throw new Error("Indica la patente del vehículo");
  const existe = await prisma.contratistaRecurso.findFirst({
    where: {
      solicitudId: s.id, tipo: input.tipo,
      ...(input.tipo === "vehiculo" ? { patente } : { identificador: identificador || null, nombre }),
    },
    select: { id: true },
  });
  if (existe) throw new Error("Este recurso ya existe en el expediente");
  const r = await prisma.contratistaRecurso.create({
    data: {
      empresaId: s.empresaId, solicitud: { connect: { id: s.id } }, tipo: input.tipo, nombre,
      identificador: identificador || null, cargo: valido(input.cargo || "") || null, patente: patente || null,
      requisitos: { create: REQUISITOS_RECURSO[input.tipo].map((d) => ({
        empresaId: s.empresaId, nombre: d.nombre, categoria: d.categoria, obligatorio: d.obligatorio,
        solicitud: { connect: { id: s.id } },
      })) },
    },
    select: { id: true },
  });
  await prisma.contratistaSolicitud.update({ where: { id: s.id }, data: { estado: "enviada" } });
  return r;
}

export async function eliminarRecursoPortal(token: string, recursoId: string) {
  const s = await resolverPortalContratista(token);
  if (!s) throw new Error("Invitación inválida o vencida");
  const r = await prisma.contratistaRecurso.findFirst({ where: { id: recursoId, solicitudId: s.id }, include: { requisitos: { select: { archivoNombre: true } } } });
  if (!r) throw new Error("Recurso no encontrado");
  if (r.requisitos.some((d) => d.archivoNombre)) throw new Error("No puedes eliminar un recurso con documentos cargados; solicita apoyo a la mandante");
  await prisma.contratistaRecurso.delete({ where: { id: r.id } });
  return { ok: true };
}

export async function enviarCarpetaContratista(token: string) {
  const s = await resolverPortalContratista(token);
  if (!s) throw new Error("Invitación inválida o vencida");
  const pendientes = s.requisitos.filter((r) => r.obligatorio && (!r.archivoNombre || estadoEfectivo(r.estado, r.fechaVencimiento) === "vencido"));
  if (pendientes.length) throw new Error(`Faltan ${pendientes.length} documentos obligatorios o hay documentos vencidos`);
  if (!s.requisitos.some((r) => r.archivoNombre)) throw new Error("Carga al menos un documento para enviar");
  await prisma.$transaction([
    prisma.contratistaRequisito.updateMany({
      where: { solicitudId: s.id, archivoNombre: { not: null }, estado: { not: "aprobado" } },
      data: { estado: "en_revision", observacionRevision: null },
    }),
    prisma.contratistaSolicitud.update({ where: { id: s.id }, data: { estado: "en_revision" } }),
  ]);
  return { ok: true };
}
