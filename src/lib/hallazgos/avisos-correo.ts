import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send-email";
import { generarCorreoHallazgo } from "@/lib/email/templates/hallazgo-aviso";
import {
  agruparDestinatariosHallazgo, correspondeAvisarHallazgo,
  fechaHoyChile, type DestinatarioAvisoHallazgo,
} from "@/lib/hallazgos/avisos-utils";

const DAY_MS = 86_400_000;
const FRECUENCIA_REAVISO_MS = 7 * DAY_MS;
const seleccionHallazgo = {
  id: true, empresaId: true, descripcion: true, prioridad: true, estado: true,
  fechaCompromiso: true,
  empresa: { select: { nombre: true } },
  creadoPor: { select: { nombre: true, email: true, activo: true } },
  responsableTrabajador: { select: { nombres: true, apellidos: true, email: true, estado: true } },
  centroTrabajo: { select: { nombre: true } },
} as const satisfies Prisma.HallazgoCumplimientoSelect;

type HallazgoAviso = Prisma.HallazgoCumplimientoGetPayload<{ select: typeof seleccionHallazgo }>;

function appUrl() {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://app.nextprev.cl";
}

async function administradoresEmpresa(empresaId: string) {
  // No reenviar datos de la empresa a todos los SUPERADMIN globales;
  // únicamente administradores con asignación explícita a esta empresa.
  return prisma.usuario.findMany({
    where: {
      activo: true,
      OR: [
        { empresaId, rol: { in: ["ADMIN_EMPRESA", "SUPERADMIN"] } },
        { empresas: { some: { empresaId, activo: true, rol: { in: ["ADMIN_EMPRESA", "SUPERADMIN"] } } } },
      ],
    },
    select: { nombre: true, email: true },
  });
}

type AdminsEmpresa = Awaited<ReturnType<typeof administradoresEmpresa>>;
async function obtenerDestinatarios(hallazgo: HallazgoAviso, cache?: Map<string, AdminsEmpresa>): Promise<DestinatarioAvisoHallazgo[]> {
  let admins = cache?.get(hallazgo.empresaId);
  if (!admins) {
    admins = await administradoresEmpresa(hallazgo.empresaId);
    cache?.set(hallazgo.empresaId, admins);
  }
  const responsable = hallazgo.responsableTrabajador;
  return agruparDestinatariosHallazgo([
    ...(responsable && responsable.estado === "activo"
      ? [{ email: responsable.email, nombre: [responsable.nombres, responsable.apellidos].join(" ").trim(), rol: "responsable" as const }]
      : []),
    ...(hallazgo.creadoPor.activo
      ? [{ email: hallazgo.creadoPor.email, nombre: hallazgo.creadoPor.nombre, rol: "creador" as const }]
      : []),
    ...admins.map((admin) => ({ email: admin.email, nombre: admin.nombre, rol: "administrador" as const })),
  ]);
}

type TipoAviso = "nuevo" | "vencimiento";

function claveAviso(hallazgoId: string, tipo: TipoAviso, email: string) {
  const hash = createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 20);
  return ["hallazgo_email", tipo, hallazgoId, hash].join(":");
}

async function notificarHallazgo(
  hallazgo: HallazgoAviso, tipo: TipoAviso, ahora: Date, maxEmails: number, cache?: Map<string, AdminsEmpresa>,
): Promise<{ enviados: number; omitidos: number; errores: number; intentos: number; sinCorreo: boolean }> {
  const candidatos = await obtenerDestinatarios(hallazgo, cache);
  const resultado = { enviados: 0, omitidos: 0, errores: 0, intentos: 0, sinCorreo: candidatos.length === 0 };
  const cutoff = tipo === "nuevo" ? new Date(0) : new Date(ahora.getTime() - FRECUENCIA_REAVISO_MS);
  const responsable = hallazgo.responsableTrabajador;
  for (const destinatario of candidatos) {
    if (resultado.intentos >= maxEmails) break;
    const evento = claveAviso(hallazgo.id, tipo, destinatario.email);
    const yaEnviado = await prisma.activacionEvento.findFirst({
      where: { empresaId: hallazgo.empresaId, evento, createdAt: { gte: cutoff } },
      select: { id: true },
    });
    if (yaEnviado) { resultado.omitidos += 1; continue; }

    const correo = generarCorreoHallazgo({
      id: hallazgo.id,
      asunto: tipo,
      nombreEmpresa: hallazgo.empresa.nombre,
      creadorNombre: hallazgo.creadoPor.nombre,
      descripcion: hallazgo.descripcion,
      prioridad: hallazgo.prioridad,
      estado: hallazgo.estado,
      centro: hallazgo.centroTrabajo?.nombre || "No asignado",
      responsable: responsable ? [responsable.nombres, responsable.apellidos].join(" ").trim() : "Por asignar",
      fechaCompromiso: hallazgo.fechaCompromiso,
      destinatario,
      appUrl: appUrl(),
    });
    try {
      resultado.intentos += 1;
      await sendEmail({ to: destinatario.email, ...correo });
      await prisma.activacionEvento.create({
        data: {
          empresaId: hallazgo.empresaId, usuarioId: null,
          evento, metadata: { hallazgoId: hallazgo.id, tipo, roles: destinatario.roles, enviadoEn: ahora.toISOString() },
        },
      });
      resultado.enviados += 1;
    } catch (error) {
      resultado.errores += 1;
      console.error("[hallazgos-email] Falló un aviso", {
        hallazgoId: hallazgo.id, tipo, error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return resultado;
}

/** Notificación inmediata después de crear el hallazgo; nunca revierte su creación. */
export async function avisarNuevoHallazgo(id: string, empresaId: string) {
  const hallazgo = await prisma.hallazgoCumplimiento.findFirst({
    where: { id, empresaId }, select: seleccionHallazgo,
  });
  if (!hallazgo) return { enviados: 0, omitidos: 0, errores: 0, intentos: 0, sinCorreo: true };
  return notificarHallazgo(hallazgo, "nuevo", new Date(), 15);
}

export type ResultadoAvisosHallazgo = {
  revisados: number;
  enviados: number;
  omitidos: number;
  sinDestinatarios: number;
  errores: number;
};

/** Cron diario: primer aviso al vencer y repetición semanal mientras continúe sin cerrar. */
export async function procesarAvisosVencimientoHallazgos(): Promise<ResultadoAvisosHallazgo> {
  const ahora = new Date();
  const hoy = fechaHoyChile(ahora);
  const hasta = new Date(hoy + "T23:59:59.999Z");
  const resultado: ResultadoAvisosHallazgo = {
    revisados: 0, enviados: 0, omitidos: 0, sinDestinatarios: 0, errores: 0,
  };
  const maxEmailsPorEjecucion = 60;
  const cache = new Map<string, AdminsEmpresa>();
  let intentos = 0;
  let cursor: string | undefined;
  // Paginar por compromiso e id: evitar que 500 vencidos antiguos impidan
  // notificar los siguientes. Mantener un límite de correos por cron.
  while (intentos < maxEmailsPorEjecucion) {
    const batch = await prisma.hallazgoCumplimiento.findMany({
      where: { estado: { not: "cerrado" }, fechaCompromiso: { lte: hasta }, empresa: { activa: true } },
      select: seleccionHallazgo,
      orderBy: [{ fechaCompromiso: "asc" }, { id: "asc" }],
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (!batch.length) break;
    for (const hallazgo of batch) {
      resultado.revisados += 1;
      if (!correspondeAvisarHallazgo(hallazgo.estado, hallazgo.fechaCompromiso, hoy)) continue;
      if (intentos >= maxEmailsPorEjecucion) break;
      const aviso = await notificarHallazgo(hallazgo, "vencimiento", ahora, maxEmailsPorEjecucion - intentos, cache);
      intentos += aviso.intentos;
      resultado.enviados += aviso.enviados;
      resultado.omitidos += aviso.omitidos;
      resultado.errores += aviso.errores;
      if (aviso.sinCorreo) resultado.sinDestinatarios += 1;
    }
    cursor = batch[batch.length - 1].id;
    if (batch.length < 100) break;
  }
  return resultado;
}
