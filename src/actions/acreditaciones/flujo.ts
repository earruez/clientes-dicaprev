"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import { construirArchivoSeguroUrl } from "@/lib/documentacion/archivo-seguro";
import { generarDocumentosAcreditacion } from "@/actions/acreditaciones";

async function contexto() {
  return requirePermission("canManageDocumentacion");
}

async function exigirExpediente(id: string, empresaId: string) {
  const a = await prisma.acreditacion.findFirst({
    where: { id, empresaId },
    select: { id: true, estado: true, mandanteId: true },
  });
  if (!a) throw new Error("Acreditación no encontrada en la empresa actual");
  if (a.estado === "cerrada") throw new Error("La acreditación está cerrada");
  return a;
}

const REQUISITOS_BASE = [
  { nombre: "Contrato vigente y anexo de vinculación a la obra", obligatorio: true },
  { nombre: "Copia de cédula de identidad", obligatorio: true },
  { nombre: "Información de riesgos laborales (IRL)", obligatorio: true },
  { nombre: "Recepción de Reglamento Interno", obligatorio: true },
  { nombre: "Registro de entrega de EPP (si aplica)", obligatorio: false },
  { nombre: "Capacitación en manejo y uso de extintores", obligatorio: true },
  { nombre: "Capacitación en matriz de riesgos y procedimientos", obligatorio: true },
  { nombre: "Examen ocupacional del OAL (si aplica)", obligatorio: false },
  { nombre: "Certificaciones por cargo (si aplica)", obligatorio: false },
] as const;

/** Acción de alta sencilla; los mandantes están aislados por empresa. */
export async function crearMandanteAcreditacionRapido(nombre: string, rut?: string) {
  const { empresaId } = await contexto();
  const limpio = nombre.trim().slice(0, 160);
  if (limpio.length < 3) throw new Error("Ingresa el nombre de la empresa mandante");
  const existente = await prisma.mandanteAcreditacion.findFirst({
    where: { empresaId, nombre: { equals: limpio, mode: "insensitive" } },
  });
  if (existente) {
    if (!existente.activo) await prisma.mandanteAcreditacion.update({ where: { id: existente.id }, data: { activo: true } });
    return { id: existente.id, nombre: existente.nombre, creado: false };
  }
  const nuevo = await prisma.mandanteAcreditacion.create({
    data: { empresaId, nombre: limpio, rut: rut?.trim().slice(0, 20) || null, tipo: "privado" },
  });
  return { id: nuevo.id, nombre: nuevo.nombre, creado: true };
}

/** Plantilla de partida editable, no constituye requisitos legales universales. */
export async function crearPlantillaAcreditacionBase(mandanteId: string) {
  const { empresaId } = await contexto();
  const mandante = await prisma.mandanteAcreditacion.findFirst({
    where: { id: mandanteId, empresaId, activo: true }, select: { id: true, nombre: true },
  });
  if (!mandante) throw new Error("Selecciona una mandante válida");
  const existente = await prisma.plantillaAcreditacion.findFirst({
    where: { empresaId, mandanteId, activa: true }, select: { id: true, nombre: true },
  });
  if (existente) return existente;
  const plantilla = await prisma.plantillaAcreditacion.create({
    data: {
      empresaId, mandanteId, nombre: `Acreditación de trabajadores · ${mandante.nombre}`,
      tipo: "ingreso_faena", descripcion: "Pauta inicial sugerida. Revisar y ajustar según el mandante antes de usar.",
      activa: true, origen: "nextprev",
      requisitos: {
        create: REQUISITOS_BASE.map((r, i) => ({
          nombreDocumento: r.nombre, codigoDocumento: `BASE_TRAB_${i + 1}`,
          categoria: "trabajador", aplicaA: "trabajador",
          obligatorio: r.obligatorio, orden: i + 1, activo: true,
        })),
      },
    }, select: { id: true, nombre: true },
  });
  return plantilla;
}

export async function getPersonalDisponibleAcreditacion() {
  const { empresaId } = await contexto();
  const [trabajadores, vehiculos] = await Promise.all([
    prisma.trabajador.findMany({
      where: { empresaId },
      select: { id: true, nombres: true, apellidos: true, rut: true, cargo: { select: { nombre: true } } },
      orderBy: { nombres: "asc" }, take: 1500,
    }),
    prisma.vehiculo.findMany({
      where: { empresaId }, select: { id: true, patente: true, marca: true, modelo: true },
      orderBy: { patente: "asc" }, take: 400,
    }),
  ]);
  return {
    trabajadores: trabajadores.map((t) => ({
      id: t.id, nombre: `${t.nombres} ${t.apellidos}`.trim(),
      rut: t.rut, cargo: t.cargo?.nombre ?? "Sin cargo",
    })),
    vehiculos: vehiculos.map((v) => ({
      id: v.id, nombre: `${v.patente} · ${v.marca} ${v.modelo}`.trim(),
    })),
  };
}

/** Conserva siempre la documentación existente al editar la nómina. */
export async function actualizarPersonalAcreditacion(
  acreditacionId: string, trabajadorIds: string[], vehiculoIds: string[],
) {
  const { empresaId, usuarioId } = await contexto();
  const a = await exigirExpediente(acreditacionId, empresaId);
  if (["enviado", "aprobado"].includes(a.estado)) {
    throw new Error("Para cambiar la nómina de un expediente enviado o aprobado, primero registra su nueva revisión.");
  }
  const idsT = [...new Set(trabajadorIds)];
  const idsV = [...new Set(vehiculoIds)];
  const [countT, countV, actualT, actualV] = await Promise.all([
    prisma.trabajador.count({ where: { empresaId, id: { in: idsT } } }),
    prisma.vehiculo.count({ where: { empresaId, id: { in: idsV } } }),
    prisma.acreditacionTrabajador.findMany({ where: { acreditacionId }, select: { trabajadorId: true } }),
    prisma.acreditacionVehiculo.findMany({ where: { acreditacionId }, select: { vehiculoId: true } }),
  ]);
  if (countT !== idsT.length || countV !== idsV.length) throw new Error("La nómina contiene recursos de otra empresa.");
  const sacarT = actualT.map((x) => x.trabajadorId).filter((id) => !idsT.includes(id));
  const sacarV = actualV.map((x) => x.vehiculoId).filter((id) => !idsV.includes(id));
  if (sacarT.length || sacarV.length) {
    const evidencia = await prisma.documentoAcreditacion.findFirst({
      where: {
        acreditacionId,
        OR: [
          { titularTipo: "trabajador", titularId: { in: sacarT } },
          { titularTipo: "vehiculo", titularId: { in: sacarV } },
        ],
        AND: [{
          OR: [
            { archivoNombre: { not: null } }, { archivoUrl: { not: null } },
            { estado: { in: ["completo", "en_revision", "rechazado", "vencido"] } },
          ],
        }],
      }, select: { nombreDocumento: true, titularNombre: true },
    });
    if (evidencia) {
      throw new Error(`No puedes quitar a ${evidencia.titularNombre ?? "este recurso"} porque tiene documentación o revisiones. Conserva el historial.`);
    }
  }
  await prisma.$transaction(async (tx) => {
    if (sacarT.length) {
      await tx.documentoAcreditacion.deleteMany({
        where: { acreditacionId, titularTipo: "trabajador", titularId: { in: sacarT }, estado: "faltante",
          archivoNombre: null, archivoUrl: null },
      });
      await tx.acreditacionTrabajador.deleteMany({ where: { acreditacionId, trabajadorId: { in: sacarT } } });
    }
    if (sacarV.length) {
      await tx.documentoAcreditacion.deleteMany({
        where: { acreditacionId, titularTipo: "vehiculo", titularId: { in: sacarV }, estado: "faltante",
          archivoNombre: null, archivoUrl: null },
      });
      await tx.acreditacionVehiculo.deleteMany({ where: { acreditacionId, vehiculoId: { in: sacarV } } });
    }
    const anadirT = idsT.filter((id) => !actualT.some((x) => x.trabajadorId === id));
    const anadirV = idsV.filter((id) => !actualV.some((x) => x.vehiculoId === id));
    if (anadirT.length) await tx.acreditacionTrabajador.createMany({
      data: anadirT.map((trabajadorId) => ({ acreditacionId, trabajadorId })), skipDuplicates: true,
    });
    if (anadirV.length) await tx.acreditacionVehiculo.createMany({
      data: anadirV.map((vehiculoId) => ({ acreditacionId, vehiculoId })), skipDuplicates: true,
    });
    await tx.historialAcreditacion.create({
      data: { acreditacionId, usuarioId, accion: "actualizar_nomina",
        detalle: `Nómina: ${idsT.length} trabajadores y ${idsV.length} vehículos` },
    });
    if (a.estado === "listo_para_enviar") {
      await tx.acreditacion.update({ where: { id: acreditacionId }, data: { estado: "en_preparacion" } });
    }
  });
  return generarDocumentosAcreditacion(acreditacionId);
}

function fechaInput(fecha?: string | null) {
  if (!fecha) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("Fecha inválida");
  const result = new Date(`${fecha}T12:00:00Z`);
  if (Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== fecha) throw new Error("Fecha inválida");
  return result;
}

export async function adjuntarDocumentoAcreditacion(data: {
  documentoId: string; archivoNombre: string; nombreOriginal: string;
  fechaEmision?: string; fechaVencimiento?: string;
}) {
  const { empresaId, usuarioId } = await contexto();
  const documento = await prisma.documentoAcreditacion.findFirst({
    where: { id: data.documentoId, acreditacion: { empresaId } },
    include: { acreditacion: { select: { id: true, estado: true } } },
  });
  if (!documento) throw new Error("Documento de acreditación no encontrado");
  if (["cerrada", "aprobado"].includes(documento.acreditacion.estado)) throw new Error("Este expediente no acepta cambios documentales");
  if (!/^[0-9a-f-]{36}\.[a-z0-9]{1,8}$/i.test(data.archivoNombre)) {
    throw new Error("El archivo debe cargarse desde NextPrev");
  }
  const vencimiento = fechaInput(data.fechaVencimiento);
  const emision = fechaInput(data.fechaEmision);
  if (emision && vencimiento && vencimiento < emision) throw new Error("El vencimiento no puede ser anterior a la emisión");
  await prisma.$transaction(async (tx) => {
    await tx.documentoAcreditacion.update({
      where: { id: documento.id }, data: {
        estado: vencimiento && vencimiento.getTime() < Date.now() ? "vencido" : "completo",
        archivoUrl: construirArchivoSeguroUrl(data.archivoNombre),
        archivoNombre: data.archivoNombre,
        fechaEmision: emision, fechaVencimiento: vencimiento,
        fuenteTipo: "manual", fuenteId: null, observaciones: null,
      },
    });
    await tx.historialAcreditacion.create({ data: {
      acreditacionId: documento.acreditacionId, usuarioId, accion: "adjuntar_documento",
      detalle: `${documento.nombreDocumento} · ${documento.titularNombre ?? "Empresa"} · ${data.nombreOriginal.slice(0, 140)}`,
    } });
    if (documento.acreditacion.estado === "listo_para_enviar") {
      await tx.acreditacion.update({ where: { id: documento.acreditacionId }, data: { estado: "en_preparacion" } });
    }
  });
  return { ok: true };
}

export async function revisarDocumentoAcreditacion(
  documentoId: string, estado: "faltante" | "rechazado" | "en_revision" | "no_aplica" | "completo",
  comentario?: string,
) {
  const { empresaId, usuarioId } = await contexto();
  const documento = await prisma.documentoAcreditacion.findFirst({
    where: { id: documentoId, acreditacion: { empresaId } },
    include: { acreditacion: { select: { estado: true } } },
  });
  if (!documento || documento.acreditacion.estado === "cerrada") throw new Error("Documento no disponible");
  if (estado === "no_aplica" && documento.obligatorio) {
    throw new Error("Este requisito es obligatorio. Ajusta la plantilla del mandante antes de marcarlo No aplica.");
  }
  if (estado === "completo" && !(documento.archivoNombre || documento.archivoUrl)) throw new Error("Adjunta primero el archivo");
  if ((estado === "rechazado" || estado === "en_revision") && !comentario?.trim()) throw new Error("Indica la observación del mandante");
  await prisma.$transaction([
    prisma.documentoAcreditacion.update({ where: { id: documento.id }, data: {
      estado, observaciones: comentario?.trim().slice(0, 1000) || null,
      ...(estado === "no_aplica" ? { fuenteTipo: "manual" } : {}),
    } }),
    prisma.historialAcreditacion.create({ data: {
      acreditacionId: documento.acreditacionId, usuarioId, accion: "revisar_documento",
      detalle: `${documento.nombreDocumento}: ${estado}${comentario ? " · " + comentario.slice(0, 800) : ""}`,
    } }),
  ]);
  return { ok: true };
}

/** Registra entrega externa comprobable. No afirma enviar correos ni subir a portales terceros. */
export async function registrarEntregaAcreditacion(
  acreditacionId: string, detalle: { medio: "correo" | "portal" | "presencial" | "otro"; destinatario: string; referencia: string },
) {
  const { empresaId, usuarioId } = await contexto();
  const a = await prisma.acreditacion.findFirst({
    where: { id: acreditacionId, empresaId },
    include: { documentos: true },
  });
  if (!a) throw new Error("Acreditación no encontrada");
  if (!["en_preparacion", "listo_para_enviar", "observada", "rechazado"].includes(a.estado)) throw new Error("No puedes registrar un envío desde este estado");
  const docs = a.documentos.filter((d) => d.obligatorio && d.estado !== "no_aplica");
  if (!docs.length || docs.some((d) =>
    d.estado !== "completo" || !(d.archivoNombre || d.archivoUrl) ||
    (d.fechaVencimiento && d.fechaVencimiento.getTime() < Date.now()) ||
    d.archivoUrl?.startsWith("/demo/") || d.archivoNombre?.includes("demo-")
  )) throw new Error("Completa primero los requisitos obligatorios con archivos reales y vigentes.");
  if (!detalle.destinatario.trim() || !detalle.referencia.trim()) throw new Error("Ingresa destinatario y comprobante o referencia del envío");
  const comentario = `Envío externo por ${detalle.medio}. Destinatario: ${detalle.destinatario.trim().slice(0, 150)}. Referencia: ${detalle.referencia.trim().slice(0, 450)}`;
  return prisma.acreditacion.update({
    where: { id: a.id },
    data: {
      estado: "enviado", fechaEnvio: new Date(), fechaRespuesta: null, observaciones: comentario,
      historial: { create: {
        usuarioId, accion: "cambiar_estado", estadoAnterior: a.estado, estadoNuevo: "enviado",
        detalle: comentario,
      } },
    }, select: { id: true, estado: true, fechaEnvio: true },
  });
}
