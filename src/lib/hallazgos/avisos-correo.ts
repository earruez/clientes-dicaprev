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

async function obtenerDestinatarios(hallazgo: HallazgoAviso): Promise<DestinatarioAvisoHallazgo[]> {
  const admins = await administradoresEmpresa(hallazgo.empresaId);
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
  hallazgo: HallazgoAviso, tipo: TipoAviso, ahora: Date, maxEmails: number,
): Promise<{ enviados: number; omitidos: number; errores: number; sinCorreo: boolean }> {
  const candidatos = await obtenerDestinatarios(hallazgo);
  const resultado = { enviados: 0, omitidos: 0, errores: 0, sinCorreo: candidatos.length === 0 };
  const cutoff = tipo === "nuevo" ? new Date(0) : new Date(ahora.getTime() - FRECUENCIA_REAVISO_MS);
  const responsable = hallazgo.responsableTrabajador;
  for (const destinatario of candidatos) {
    if (resultado.enviados >= maxEmails) break;
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
  if (!hallazgo) return { enviados: 0, omitidos: 0, errores: 0, sinCorreo: true };
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
  const hallazgos = await prisma.hallazgoCumplimiento.findMany({
    where: { estado: { not: "cerrado" }, fechaCompromiso: { lte: hasta }, empresa: { activa: true } },
    select: seleccionHallazgo,
    orderBy: [{ fechaCompromiso: "asc" }, { id: "asc" }],
    take: 500,
  });
  const resultado: ResultadoAvisosHallazgo = {
    revisados: hallazgos.length, enviados: 0, omitidos: 0, sinDestinatarios: 0, errores: 0,
  };
  // Límite operativo de correos por ejecución para evitar timeouts en serverless.
  const maxEmailsPorEjecucion = 60;
  for (const hallazgo of hallazgos) {
    if (resultado.enviados >= maxEmailsPorEjecucion) break;
    if (!correspondeAvisarHallazgo(hallazgo.estado, hallazgo.fechaCompromiso, hoy)) continue;
    const aviso = await notificarHallazgo(hallazgo, "vencimiento", ahora, maxEmailsPorEjecucion - resultado.enviados);
    resultado.enviados += aviso.enviados;
    resultado.omitidos += aviso.omitidos;
    resultado.errores += aviso.errores;
    if (aviso.sinCorreo) resultado.sinDestinatarios += 1;
  }
  return resultado;
}
