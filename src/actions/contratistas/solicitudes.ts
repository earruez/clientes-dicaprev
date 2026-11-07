"use server";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send-email";
import { generarTokenPortal, hashTokenPortal, origenNextPrev } from "@/lib/contratistas/portal";
import { documentoPendienteRevisionMandante, documentoAprobadoConRevision, estadoEfectivo, vigenciaMesesRequisito, REQUISITOS_RECURSO } from "@/lib/contratistas/requisitos";
import { CATALOGO_CONTRATISTAS, CLAVES_PLANTILLA_INTEGRAL_CONTRATISTAS } from "@/lib/contratistas/catalogo";
import { PLANTILLA_ACREDITACION_TRABAJADORES } from "@/lib/contratistas/plantilla-acreditacion-trabajadores";
import { requirePermission } from "@/server/auth/permissions";
import { normalizarNombreRequisitoContratista } from "@/lib/contratistas/estandarizar-requisitos";
import { generarInformeContratista } from "@/lib/contratistas/informe-acreditacion";
import { claveDocumentoRevision } from "@/lib/contratistas/organizacion-revision";
import { claveAgrupacionCargoContratista } from "@/lib/contratistas/cargos";

const DIAS_ENLACE = 60;

function fecha(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value + "T12:00:00.000Z");
  if (Number.isNaN(parsed.getTime())) throw new Error("Fecha no válida");
  return parsed;
}

function escapar(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}

export async function listarSolicitudesContratistas() {
  const { empresaId } = await requirePermission("canReadDocumentacion");
  const solicitudes = await prisma.contratistaSolicitud.findMany({
    where: { empresaId },
    orderBy: { createdAt: "desc" },
    include: {
      contratista: { select: { nombre: true, rut: true, razonSocial: true } },
      centroTrabajo: { select: { id: true, nombre: true } },
      recursos: { orderBy: { createdAt: "asc" } },
      reglasTrabajadores: { orderBy: { createdAt: "asc" }, include: { _count: { select: { requisitos: true } } } },
      requisitos: {
        orderBy: [{ categoria: "asc" }, { createdAt: "asc" }],
        include: { documentoBase: { select: { id: true, nombre: true, estado: true } }, recurso: { select: { nombre: true, identificador: true, patente: true } }, versiones: { orderBy: { version: "desc" }, select: { id: true, version: true, subidoAt: true, archivoNombre: true, archivoOriginal: true } } },
      },
    },
  });
  return solicitudes.map((s) => {
    const total = s.requisitos.filter((r) => r.obligatorio).length;
    const aprobados = s.requisitos.filter((r) => r.obligatorio && documentoAprobadoConRevision(r)).length;
    const documentosAprobados = s.requisitos.filter((r) => documentoAprobadoConRevision(r)).length;
    const pendientesValidacion = s.requisitos.filter((r) => documentoPendienteRevisionMandante(r)).length;
    const documentosObservados = s.requisitos.filter((r) => r.estado === "observado" || r.estado === "rechazado").length;
    const pendientesCarga = s.requisitos.filter((r) => r.obligatorio && !r.archivoNombre).length;
    return {
      ...s, totalObligatorios: total, aprobados,
      porcentaje: total ? Math.round((aprobados / total) * 100) : 0,
      documentosAprobados, pendientesValidacion, documentosObservados, pendientesCarga,
    };
  });
}

export async function crearSolicitudContratista(input: {
  contratistaId: string;
  nombre: string;
  faena?: string;
  centroTrabajoId?: string;
  servicio?: string;
  contactoEmail: string;
  responsable?: string;
  dotacionEstimada?: number;
  fechaInicio?: string;
  fechaTermino?: string;
  requisitos?: string[];
}) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const contratista = await prisma.contratista.findFirst({
    where: { id: input.contratistaId, empresaId, activo: true },
    select: { id: true },
  });
  if (!contratista) throw new Error("Contratista no encontrado");
  if (!input.nombre?.trim()) throw new Error("Indica el nombre del contrato o servicio");
  const email = input.contactoEmail?.trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Correo de contacto inválido");
  const personalizados = await prisma.contratistaCatalogoRequisito.findMany({ where: { empresaId, activo: true, categoria: "empresa" } });
  const catalogo = [
    ...CATALOGO_CONTRATISTAS.filter((r) => r.categoria === "empresa"),
    ...personalizados.map((r) => ({
      clave: r.clave, nombre: r.nombre, alcance: r.alcance,
      categoria: "empresa" as const, grupo: r.grupo, obligatorio: r.obligatorio,
      requiereVencimiento: r.requiereVencimiento,
    })),
  ];
  const selected = catalogo.filter((r) => input.requisitos === undefined
    ? (CLAVES_PLANTILLA_INTEGRAL_CONTRATISTAS as readonly string[]).includes(r.clave)
    : input.requisitos.includes(r.clave));
  const centro = input.centroTrabajoId
    ? await prisma.centroTrabajo.findFirst({ where: { id: input.centroTrabajoId, empresaId }, select: { id: true, nombre: true } })
    : null;
  if (input.centroTrabajoId && !centro) throw new Error("Centro de trabajo no válido para esta empresa");
  const solicitud = await prisma.contratistaSolicitud.create({
    data: {
      empresaId,
      contratista: { connect: { id: contratista.id } },
      nombre: input.nombre.trim().slice(0, 180),
      faena: input.faena?.trim().slice(0, 180) || centro?.nombre || null,
      ...(centro ? { centroTrabajo: { connect: { id: centro.id } } } : {}),
      servicio: input.servicio?.trim().slice(0, 300) || null,
      contactoEmail: email,
      responsable: input.responsable?.trim().slice(0, 160) || null,
      dotacionEstimada: input.dotacionEstimada && input.dotacionEstimada > 0 ? Math.floor(input.dotacionEstimada) : null,
      fechaInicio: fecha(input.fechaInicio),
      fechaTermino: fecha(input.fechaTermino),
      requisitos: { create: selected.map((r) => ({
        empresaId, nombre: r.nombre, categoria: r.categoria, alcance: r.alcance, obligatorio: r.obligatorio,
      })) },
      // La pauta se crea antes de incorporar trabajadores: se asignará a todos los futuros.
      reglasTrabajadores: { create: PLANTILLA_ACREDITACION_TRABAJADORES.map((r) => ({
        empresaId, nombre: r.nombre, obligatorio: r.obligatorio,
        // La plantilla general no inventa una vigencia legal uniforme:
        // períodos específicos se configuran por faena/mandante cuando correspondan.
        condicional: r.condicional, vigenciaMeses: null,
      })) },
    },
    select: { id: true },
  });
  return solicitud;
}

export async function agregarRequisitoContratista(input: {
  solicitudId: string;
  nombre: string;
  categoria: "empresa" | "trabajador" | "vehiculo" | "equipo";
  alcance?: "empresa" | "faena";
  recursoId?: string;
  obligatorio?: boolean;
  aplicaATodosTrabajadores?: boolean;
  vigenciaMeses?: number | null;
  condicional?: boolean;
}) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const solicitud = await prisma.contratistaSolicitud.findFirst({ where: { id: input.solicitudId, empresaId, estado: { not: "cerrada" } }, select: { id: true } });
  if (!solicitud) throw new Error("Expediente no encontrado o cerrado");
  if (!input.nombre?.trim()) throw new Error("Nombre del requisito obligatorio");
  const nombre = normalizarNombreRequisitoContratista(input.nombre, input.categoria).slice(0, 220);
  if (input.aplicaATodosTrabajadores) {
    if (input.categoria !== "trabajador" || input.recursoId) throw new Error("El alcance general es exclusivo de trabajadores");
    await prisma.$transaction(async (tx) => {
      const duplicado = await tx.contratistaRequisitoRegla.findFirst({
        where: { empresaId, solicitudId: solicitud.id, activo: true, nombre: { equals: nombre, mode: "insensitive" } },
        select: { id: true },
      });
      if (duplicado) throw new Error("Este requisito ya está configurado para todos los trabajadores");
      const regla = await tx.contratistaRequisitoRegla.create({
        data: { empresaId, solicitudId: solicitud.id, nombre,
          obligatorio: input.obligatorio !== false, vigenciaMeses: input.vigenciaMeses ?? null,
          condicional: input.condicional === true },
      });
      const trabajadores = await tx.contratistaRecurso.findMany({
        where: { empresaId, solicitudId: solicitud.id, tipo: "trabajador" },
        select: { id: true },
      });
      if (trabajadores.length) {
        const existentes = await tx.contratistaRequisito.findMany({
          where: { empresaId, solicitudId: solicitud.id, categoria: "trabajador", recursoId: { in: trabajadores.map((t) => t.id) } },
          select: { recursoId: true, nombre: true },
        });
        const yaTienen = new Set(existentes.filter((d) => d.nombre.trim().toLocaleLowerCase("es") === nombre.toLocaleLowerCase("es")).map((d) => d.recursoId));
        await tx.contratistaRequisito.createMany({
          data: trabajadores.filter((t) => !yaTienen.has(t.id)).map((t) => ({
            empresaId, solicitudId: solicitud.id, recursoId: t.id, nombre,
            categoria: "trabajador", obligatorio: input.obligatorio !== false, reglaTrabajadorId: regla.id,
            vigenciaMeses: input.vigenciaMeses ?? null, condicional: input.condicional === true,
          })),
          skipDuplicates: true,
        });
      }
    });
  } else {
    if (input.recursoId) {
      const recurso = await prisma.contratistaRecurso.findFirst({ where: { id: input.recursoId, solicitudId: solicitud.id, empresaId } });
      if (!recurso || recurso.tipo !== input.categoria) throw new Error("Recurso no válido para este requisito");
    } else if (input.categoria !== "empresa") {
      throw new Error("Selecciona un trabajador, vehículo o equipo para este requisito");
    }
    if (input.categoria === "empresa") {
      const existentes = await prisma.contratistaRequisito.findMany({
        where: { empresaId, solicitudId: solicitud.id, categoria: "empresa" },
        select: { nombre: true },
      });
      if (existentes.some((r) => claveDocumentoRevision(r.nombre) === claveDocumentoRevision(nombre))) {
        throw new Error("Ya existe este requisito de empresa (o un equivalente con distinta puntuación). Revisa el documento existente.");
      }
    }
    await prisma.contratistaRequisito.create({
      data: { empresaId, solicitudId: solicitud.id, recursoId: input.recursoId || null, nombre, categoria: input.categoria, alcance: input.categoria === "empresa" && input.alcance === "empresa" ? "empresa" : "faena", obligatorio: input.obligatorio !== false },
    });
  }
  await recalcularEstado(solicitud.id, empresaId);
  return { ok: true };
}

/** Aplica la pauta del mandante solo al expediente seleccionado; es idempotente y no borra evidencia. */
export async function aplicarPlantillaAcreditacionTrabajadores(solicitudId: string) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const resultado = await prisma.$transaction(async (tx) => {
    const expediente = await tx.contratistaSolicitud.findFirst({
      where: { id: solicitudId, empresaId, estado: { not: "cerrada" } },
      select: { id: true },
    });
    if (!expediente) throw new Error("Expediente no encontrado o cerrado");
    const trabajadores = await tx.contratistaRecurso.findMany({
      where: { solicitudId, empresaId, tipo: "trabajador" }, select: { id: true },
    });
    const reglas = await tx.contratistaRequisitoRegla.findMany({
      where: { solicitudId, empresaId, activo: true },
    });
    const existentes = await tx.contratistaRequisito.findMany({
      where: { solicitudId, empresaId, categoria: "trabajador", recursoId: { not: null } },
      select: { id: true, recursoId: true, nombre: true, reglaTrabajadorId: true, obligatorio: true },
    });
    const normalizar = (nombre: string) => nombre.trim().toLocaleLowerCase("es");
    let creadas = 0;
    let asignados = 0;
    for (const item of PLANTILLA_ACREDITACION_TRABAJADORES) {
      let regla = reglas.find((r) => normalizar(r.nombre) === normalizar(item.nombre));
      if (!regla) {
        regla = await tx.contratistaRequisitoRegla.create({
          data: {
            empresaId, solicitudId, nombre: item.nombre,
            obligatorio: item.obligatorio, condicional: item.condicional,
            vigenciaMeses: item.vigenciaMeses,
          },
        });
        reglas.push(regla);
        creadas++;
      }
      const encontrados = existentes.filter((r) => normalizar(r.nombre) === normalizar(item.nombre));
      const asignadosPrevios = new Set(encontrados.map((r) => r.recursoId));
      const sinRegla = encontrados.filter((r) => !r.reglaTrabajadorId).map((r) => r.id);
      if (sinRegla.length) {
        // Enlazar documentos estándar sin reemplazar archivos ni versiones.
        const actualizados = await tx.contratistaRequisito.updateMany({
          where: { id: { in: sinRegla }, reglaTrabajadorId: null },
          data: { reglaTrabajadorId: regla.id, vigenciaMeses: item.vigenciaMeses,
            condicional: item.condicional, obligatorio: item.obligatorio },
        });
        asignados += actualizados.count;
        for (const existente of encontrados) {
          if (sinRegla.includes(existente.id)) existente.reglaTrabajadorId = regla.id;
        }
      }
      const nuevos = trabajadores.filter((r) => !asignadosPrevios.has(r.id)).map((r) => ({
        empresaId, solicitudId, recursoId: r.id, nombre: item.nombre,
        categoria: "trabajador", reglaTrabajadorId: regla.id,
        obligatorio: regla.obligatorio, vigenciaMeses: regla.vigenciaMeses,
        condicional: regla.condicional,
      }));
      if (nuevos.length) {
        const creados = await tx.contratistaRequisito.createMany({ data: nuevos, skipDuplicates: true });
        asignados += creados.count;
      }
    }
    return { creadas, asignados };
  }, { timeout: 20000 });
  await recalcularEstado(solicitudId, empresaId);
  return resultado;
}

/** No se elimina ningún requisito que tenga archivo, versión o evidencia de revisión. */
function tieneEvidencia(r: {
  archivoNombre: string | null; documentoBaseId: string | null; version: number;
  revisadoAt: Date | null; observacionRevision: string | null; estado: string;
  versiones: { id: string }[];
}) {
  return !!(r.archivoNombre || r.documentoBaseId || r.version > 0 || r.revisadoAt ||
    r.observacionRevision || r.estado !== "pendiente" || r.versiones.length);
}

export async function eliminarRequisitoContratista(requisitoId: string) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const requisito = await prisma.contratistaRequisito.findFirst({
    where: { id: requisitoId, empresaId, solicitud: { estado: { not: "cerrada" } } },
    include: { versiones: { take: 1, select: { id: true } } },
  });
  if (!requisito) throw new Error("Requisito no encontrado o expediente cerrado");
  if (requisito.reglaTrabajadorId) throw new Error("Este requisito pertenece a una regla general. Gestiona su eliminación desde la regla para todos los trabajadores.");
  if (tieneEvidencia(requisito)) throw new Error("No se puede eliminar un requisito con archivos, versiones o revisión. Conserva su trazabilidad.");
  const eliminado = await prisma.contratistaRequisito.deleteMany({
    where: {
      id: requisito.id, empresaId, reglaTrabajadorId: null,
      archivoNombre: null, documentoBaseId: null, version: 0, revisadoAt: null,
      observacionRevision: null, estado: "pendiente", versiones: { none: {} },
    },
  });
  if (!eliminado.count) throw new Error("El requisito cambió o recibió documentos. Actualiza la pantalla antes de intentar eliminarlo.");
  await recalcularEstado(requisito.solicitudId, empresaId);
  return { ok: true };
}

export async function eliminarReglaRequisitosTrabajadores(reglaId: string) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const solicitudId = await prisma.$transaction(async (tx) => {
    const regla = await tx.contratistaRequisitoRegla.findFirst({
      where: { id: reglaId, empresaId, solicitud: { estado: { not: "cerrada" } } },
      include: { requisitos: { include: { versiones: { take: 1, select: { id: true } } } } },
    });
    if (!regla) throw new Error("Regla no encontrada o expediente cerrado");
    if (regla.requisitos.some(tieneEvidencia)) {
      throw new Error("No se puede eliminar la regla porque al menos un trabajador tiene archivos o historial de revisión.");
    }
    const estandar = REQUISITOS_RECURSO.trabajador.find((doc) => doc.nombre.trim().toLowerCase() === regla.nombre.trim().toLowerCase());
    if (estandar) {
      // IRL y EPP pueden ser requisitos base: restaurarlos al eliminar la pauta específica.
      await tx.contratistaRequisito.updateMany({
        where: { empresaId, reglaTrabajadorId: regla.id },
        data: { reglaTrabajadorId: null, vigenciaMeses: null, condicional: false, obligatorio: estandar.obligatorio },
      });
    } else {
      await tx.contratistaRequisito.deleteMany({ where: { empresaId, reglaTrabajadorId: regla.id } });
    }
    await tx.contratistaRequisitoRegla.delete({ where: { id: regla.id } });
    return regla.solicitudId;
  });
  await recalcularEstado(solicitudId, empresaId);
  return { ok: true };
}

/**
 * Marca requisitos obligatorios/condicionales de forma masiva para todo un cargo
 * en esta faena. No altera archivos, versiones ni revisiones ya realizadas.
 */
export async function configurarRequisitoPorCargoContratista(input: {
  solicitudId: string;
  reglaId: string;
  cargo: string;
  obligatorio: boolean;
}) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const cargo = input.cargo?.trim().slice(0, 160);
  if (!cargo) throw new Error("Selecciona un cargo.");
  return prisma.$transaction(async (tx) => {
    const regla = await tx.contratistaRequisitoRegla.findFirst({
      where: { id: input.reglaId, solicitudId: input.solicitudId, empresaId, activo: true,
        solicitud: { estado: { not: "cerrada" } } },
      select: { id: true, nombre: true },
    });
    if (!regla) throw new Error("Requisito no encontrado en la faena.");
    const candidatos = await tx.contratistaRecurso.findMany({
      where: { solicitudId: input.solicitudId, empresaId, tipo: "trabajador" },
      select: { id: true, cargo: true },
    });
    // Incluye variantes previas como "maestro eléctrico" y "electricista".
    const grupo = claveAgrupacionCargoContratista(cargo);
    const personas = candidatos.filter((p) => claveAgrupacionCargoContratista(p.cargo || "") === grupo);
    if (!personas.length) throw new Error("No hay trabajadores con ese cargo.");
    const actualizados = await tx.contratistaRequisito.updateMany({
      where: { solicitudId: input.solicitudId, empresaId, reglaTrabajadorId: regla.id,
        recursoId: { in: personas.map((p) => p.id) } },
      data: { obligatorio: input.obligatorio },
    });
    return { trabajadores: personas.length, requisitos: actualizados.count, nombre: regla.nombre };
  });
}

export async function cambiarObligatoriedadContratista(requisitoId: string, obligatorio: boolean) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const r = await prisma.contratistaRequisito.findFirst({ where: { id: requisitoId, empresaId, solicitud: { estado: { not: "cerrada" } } }, select: { id: true, solicitudId: true } });
  if (!r) throw new Error("Requisito no encontrado");
  await prisma.contratistaRequisito.update({ where: { id: r.id }, data: { obligatorio } });
  await recalcularEstado(r.solicitudId, empresaId);
  return { ok: true };
}

/**
 * Genera un acceso temporal para enviar por WhatsApp o copiar.
 * Solo la mandante puede emitirlo. El enlace se devuelve una sola vez:
 * en la base únicamente se conserva su hash, nunca el token en claro.
 * Crear otro acceso invalida el anterior, incluidos los enviados por email.
 */
export async function generarEnlaceCargaContratista(solicitudId: string) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const solicitud = await prisma.contratistaSolicitud.findFirst({
    where: { id: solicitudId, empresaId, estado: { not: "cerrada" }, contratista: { activo: true } },
    select: { id: true, estado: true, nombre: true, faena: true },
  });
  if (!solicitud) throw new Error("Expediente no disponible o cerrado");
  if (!solicitud.contactoEmail?.trim()) throw new Error("No hay correo electrónico registrado. Utiliza 'Generar enlace' y compártelo por WhatsApp.");
  const token = generarTokenPortal();
  const url = `${origenNextPrev()}/contratistas/portal/${token}`;
  const expira = new Date(Date.now() + DIAS_ENLACE * 86400000);
  const actualizacion = await prisma.contratistaSolicitud.updateMany({
    where: { id: solicitud.id, empresaId, estado: { not: "cerrada" } },
    data: {
      tokenHash: hashTokenPortal(token),
      tokenExpiraAt: expira,
      invitadoAt: new Date(),
      ...(solicitud.estado === "borrador" ? { estado: "enviada" } : {}),
    },
  });
  if (!actualizacion.count) throw new Error("El expediente fue cerrado; no se generó el acceso.");
  return { url, expira: expira.toISOString(), diasVigencia: DIAS_ENLACE };
}

export async function invitarContratista(solicitudId: string) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const solicitud = await prisma.contratistaSolicitud.findFirst({
    where: { id: solicitudId, empresaId, estado: { not: "cerrada" } },
    include: { contratista: { select: { nombre: true } } },
  });
  if (!solicitud) throw new Error("Expediente no encontrado o cerrado");
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { nombre: true } });
  const token = generarTokenPortal();
  const url = `${origenNextPrev()}/contratistas/portal/${token}`;
  const expira = new Date(Date.now() + DIAS_ENLACE * 86400000);
  await prisma.contratistaSolicitud.update({
    where: { id: solicitud.id },
    data: { tokenHash: hashTokenPortal(token), tokenExpiraAt: expira, invitadoAt: new Date(), estado: "enviada" },
  });
  try {
    await sendEmail({
      to: solicitud.contactoEmail,
      subject: `NextPrev · Solicitud de documentos: ${solicitud.nombre}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden"><header style="background:#0f172a;color:white;padding:24px"><strong style="font-size:22px">NextPrev</strong><p style="margin:8px 0 0">Carpeta documental de contratista</p></header><main style="padding:26px"><h2 style="color:#0f172a">Solicitud de antecedentes</h2><p>${escapar(empresa?.nombre || "Empresa mandante")} ha solicitado antecedentes para <strong>${escapar(solicitud.nombre)}</strong>.</p><p>Empresa destinataria: ${escapar(solicitud.contratista.nombre)}</p><p>Revisa los requisitos, incorpora trabajadores y equipos y carga tus archivos desde el siguiente enlace:</p><p><a style="display:inline-block;background:#0284c7;color:#fff;padding:14px 20px;text-decoration:none;border-radius:10px" href="${url}">Completar carpeta documental</a></p><p style="color:#64748b;font-size:12px">Enlace personal vigente por 60 días. No lo compartas con terceros.</p></main><footer style="padding:16px 26px;color:#94a3b8;background:#f8fafc;font-size:12px">Generado por NextPrev</footer></div>`,
      text: `${empresa?.nombre || "Empresa mandante"} solicita antecedentes para ${solicitud.nombre}. Accede a tu carpeta: ${url}. Enlace válido por 60 días.`,
    });
  } catch (error) {
    // Se conserva la invitación para poder reintentar el envío desde la mandante.
    throw new Error(`No se pudo entregar el correo. Reintenta la invitación: ${error instanceof Error ? error.message : "error de envío"}`);
  }
  return { ok: true };
}

async function recalcularEstado(solicitudId: string, empresaId: string) {
  const solicitud = await prisma.contratistaSolicitud.findFirst({
    where: { id: solicitudId, empresaId },
    include: { requisitos: true },
  });
  if (!solicitud || solicitud.estado === "cerrada") return;
  const requeridos = solicitud.requisitos.filter((r) => r.obligatorio);
  let estado: string;
  if (!solicitud.invitadoAt) estado = "borrador";
  else if (requeridos.some((r) => ["observado", "rechazado"].includes(r.estado))) estado = "observada";
  else if (requeridos.length > 0 && requeridos.every((r) => documentoAprobadoConRevision(r))) estado = "aprobada";
  else if (solicitud.requisitos.some((r) => documentoPendienteRevisionMandante(r) || documentoAprobadoConRevision(r))) estado = "en_revision";
  else estado = "enviada";
  await prisma.contratistaSolicitud.update({ where: { id: solicitudId }, data: { estado } });
}

export async function revisarRequisitoContratista(input: {
  requisitoId: string;
  estado: "aprobado" | "observado" | "rechazado";
  observacion?: string;
}) {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const requisito = await prisma.contratistaRequisito.findFirst({
    where: { id: input.requisitoId, empresaId, solicitud: { estado: { not: "cerrada" } } },
    include: { solicitud: { select: { contactoEmail: true, nombre: true, estado: true, contratistaId: true } } },
  });
  if (!requisito || !requisito.archivoNombre) throw new Error("Documento no cargado");
  if (!documentoPendienteRevisionMandante(requisito)) throw new Error("Este documento ya fue revisado. Carga una nueva versión para volver a validarlo.");
  if (input.estado === "aprobado" && estadoEfectivo("aprobado", requisito.fechaVencimiento, requisito.fechaEmision, vigenciaMesesRequisito(requisito)) === "vencido") throw new Error("No se puede aprobar un documento vencido");
  if (input.estado !== "aprobado" && !input.observacion?.trim()) throw new Error("Indica el motivo de la observación o rechazo");
  // Documentos de ámbito empresa aprobados desde una faena pasan a la carpeta
  // maestra: no es necesario volver a subirlos para una obra futura.
  await prisma.$transaction(async (tx) => {
    let documentoBaseId = requisito.documentoBaseId;
    if (input.estado === "aprobado" && requisito.alcance === "empresa" && !documentoBaseId) {
      const where = { empresaId, contratistaId: requisito.solicitud.contratistaId };
      const anterior = await tx.contratistaDocumento.findFirst({
        where: { ...where, nombre: { equals: requisito.nombre, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
      });
      const datos = {
        archivoNombre: requisito.archivoNombre,
        archivoOriginal: requisito.archivoOriginal,
        archivoTipo: requisito.archivoTipo,
        archivoPeso: requisito.archivoPeso,
        fechaEmision: requisito.fechaEmision,
        fechaVencimiento: requisito.fechaVencimiento,
      };
      const base = anterior ? await tx.contratistaDocumento.update({
        where: { id: anterior.id },
        data: { ...datos, archivoUrl: null, estado: "aprobado", version: { increment: 1 }, revisadoPorId: usuarioId, revisadoAt: new Date() },
      }) : await tx.contratistaDocumento.create({
        data: { ...where, nombre: requisito.nombre, ...datos, estado: "aprobado", version: 1, revisadoPorId: usuarioId, revisadoAt: new Date() },
      });
      await tx.contratistaDocumentoBaseVersion.create({
        data: {
          documentoId: base.id, version: base.version, archivoNombre: requisito.archivoNombre as string,
          archivoOriginal: requisito.archivoOriginal, archivoTipo: requisito.archivoTipo, archivoPeso: requisito.archivoPeso,
          fechaEmision: requisito.fechaEmision, fechaVencimiento: requisito.fechaVencimiento,
        },
      });
      documentoBaseId = base.id;
    }
    await tx.contratistaRequisito.update({
      where: { id: requisito.id },
      data: {
        estado: input.estado,
        ...(documentoBaseId ? { documentoBaseId } : {}),
        observacionRevision: input.observacion?.trim().slice(0, 1200) || null,
        revisadoPorId: usuarioId, revisadoAt: new Date(),
      },
    });
  });
  await recalcularEstado(requisito.solicitudId, empresaId);
  // No enviar avisos por cada revisión. El responsable de la mandante puede
  // generar y enviar un único informe consolidado cuando lo estime oportuno.
  return { ok: true };
}

export async function cerrarExpedienteContratista(solicitudId: string) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const r = await prisma.contratistaSolicitud.updateMany({ where: { id: solicitudId, empresaId }, data: { estado: "cerrada", tokenHash: null, tokenExpiraAt: null } });
  if (!r.count) throw new Error("Expediente no encontrado");
  return { ok: true };
}


/**
 * Envío manual de UN informe consolidado por obra, no un correo por documento.
 * Incluye la situación documental de empresa y cada trabajador al momento del envío.
 */
export async function enviarInformeAcreditacionContratista(solicitudId: string) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const { data, pdf } = await generarInformeContratista(empresaId, solicitudId);
  const correo = data.contactoEmail?.trim().toLowerCase();
  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error("La empresa contratista no tiene un correo de contacto válido.");
  const resumen = data.resumen;
  const result = await sendEmail({
    to: correo,
    subject: "NextPrev · Informe de acreditación documental · " + data.empresa + " · " + data.faena,
    html: '<div style="font-family:Arial,sans-serif;max-width:640px;padding:25px;color:#0f172a">' +
      '<h2>Informe de acreditación documental</h2>' +
      '<p>Empresa: <strong>' + escapar(data.empresa) + '</strong></p>' +
      '<p>Obra: <strong>' + escapar(data.faena) + '</strong></p>' +
      '<p>Se adjunta el informe consolidado del estado de la documentación de empresa y trabajadores.</p>' +
      '<p><strong>Subidos:</strong> ' + resumen.cargados + '/' + resumen.total +
      ' · <strong>Aprobados:</strong> ' + resumen.aprobados +
      ' · <strong>Por validar:</strong> ' + resumen.porValidar +
      ' · <strong>Sin cargar:</strong> ' + resumen.sinArchivo +
      ' · <strong>Observados:</strong> ' + resumen.observados + '</p>' +
      '<p>Revisa las observaciones y completa los documentos pendientes en tu portal de contratistas.</p>' +
      '<p style="font-size:12px;color:#64748b">Este mensaje se envía por decisión del responsable de la mandante, no por cada aprobación individual. La conformidad documental no autoriza el ingreso a faena.</p>' +
      '<p style="font-size:12px;color:#64748b">Generado por NextPrev</p></div>',
    text: "Informe de acreditación documental de " + data.empresa + " para " + data.faena +
      ". Subidos " + resumen.cargados + "/" + resumen.total + ", aprobados " + resumen.aprobados +
      ", por validar " + resumen.porValidar + ", sin cargar " + resumen.sinArchivo +
      ". Se adjunta informe PDF con pendientes por trabajador. Generado por NextPrev.",
    attachments: [{
      filename: "NextPrev_Informe_Acreditacion_Contratista.pdf",
      content: pdf.toString("base64"),
      contentType: "application/pdf",
    }],
  });
  return { ok: true, correo, messageId: result.messageId || null };
}
