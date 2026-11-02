import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send-email";
import { generarCorreoHallazgo } from "@/lib/email/templates/hallazgo-aviso";
import { generarCorreoResumenSemanalHallazgos } from "@/lib/email/templates/hallazgos-resumen-semanal";
import { periodoResumenSemanalHallazgos } from "@/lib/hallazgos/resumen-semanal";
import {
  agruparDestinatariosHallazgo,
  fechaHoyChile, type DestinatarioAvisoHallazgo,
} from "@/lib/hallazgos/avisos-utils";

const DAY_MS = 86_400_000;
const FRECUENCIA_REAVISO_MS = 7 * DAY_MS;
const seleccionHallazgo = {
  id: true, empresaId: true, descripcion: true, prioridad: true, estado: true,
  fechaCompromiso: true, createdAt: true,
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
  // Las notificaciones rutinarias se consolidan por semana. Las críticas
  // siguen generando un aviso inmediato, por tratarse de riesgos prioritarios.
  if (!hallazgo || hallazgo.prioridad.toLowerCase() !== "critica") {
    return { enviados: 0, omitidos: 0, errores: 0, intentos: 0, sinCorreo: false };
  }
  return notificarHallazgo(hallazgo, "nuevo", new Date(), 15);
}

export type ResultadoAvisosHallazgo = {
  revisados: number;
  enviados: number;
  omitidos: number;
  sinDestinatarios: number;
  errores: number;
};

/**
 * Un único correo por empresa y destinatario para la última semana completa.
 * El cron actual sigue siendo diario: la clave semanal evita reenvíos y
 * permite recuperar correos si falló el cron del lunes.
 * No necesita migración: ActivacionEvento ya registra la entrega.
 */
export async function procesarResumenSemanalHallazgos(): Promise<ResultadoAvisosHallazgo> {
  const ahora = new Date();
  const periodo = periodoResumenSemanalHallazgos(ahora);
  const resultado: ResultadoAvisosHallazgo = {
    revisados: 0, enviados: 0, omitidos: 0, sinDestinatarios: 0, errores: 0,
  };
  // Envío principal cada lunes. Martes y miércoles sirven para reintentar
  // fallos sin duplicar correos confirmados. El resto de días no hay consultas.
  const diaSemana = new Date(periodo.hoy + "T12:00:00Z").getUTCDay();
  if (diaSemana < 1 || diaSemana > 3) return resultado;
  const inicioConsulta = new Date(periodo.desde + "T00:00:00Z");
  const cache = new Map<string, AdminsEmpresa>();
  const destinatarios = new Map<string, {
    email: string;
    nombre: string;
    empresaId: string;
    empresaNombre: string;
    hallazgos: Map<string, HallazgoAviso>;
  }>();

  let cursor: string | undefined;
  while (true) {
    const batch = await prisma.hallazgoCumplimiento.findMany({
      where: {
        empresa: { activa: true },
        OR: [
          { estado: { notIn: ["cerrado", "resuelto"] } },
          { createdAt: { gte: inicioConsulta } },
        ],
      },
      select: seleccionHallazgo,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 200,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (!batch.length) break;

    for (const hallazgo of batch) {
      resultado.revisados++;
      const creadoFecha = fechaHoyChile(hallazgo.createdAt);
      const nuevoSemanaAnterior = creadoFecha >= periodo.desde && creadoFecha <= periodo.hasta;
      const pendiente = !["resuelto", "cerrado"].includes(hallazgo.estado);
      if (!nuevoSemanaAnterior && !pendiente) continue;
      const receptores = await obtenerDestinatarios(hallazgo, cache);
      if (!receptores.length) resultado.sinDestinatarios++;
      for (const receptor of receptores) {
        const clave = hallazgo.empresaId + ":" + receptor.email;
        let registro = destinatarios.get(clave);
        if (!registro) {
          registro = {
            empresaId: hallazgo.empresaId,
            empresaNombre: hallazgo.empresa.nombre,
            email: receptor.email, nombre: receptor.nombre,
            hallazgos: new Map(),
          };
          destinatarios.set(clave, registro);
        }
        registro.hallazgos.set(hallazgo.id, hallazgo);
      }
    }
    cursor = batch[batch.length - 1].id;
    if (batch.length < 200) break;
  }

  // Hasta 35 envíos por ejecución para respetar el tiempo límite del cron.
  // Destinatarios restantes se procesarán al siguiente día sin duplicar éxitos.
  let intentos = 0;
  for (const registro of destinatarios.values()) {
    if (intentos >= 35) break;
    const emailHash = createHash("sha256").update(registro.email).digest("hex").slice(0, 20);
    const evento = ["hallazgo_resumen_semanal", periodo.desde, emailHash].join(":");
    const yaEnviado = await prisma.activacionEvento.findFirst({
      where: { empresaId: registro.empresaId, evento },
      select: { id: true },
    });
    if (yaEnviado) {
      resultado.omitidos++;
      continue;
    }

    const correo = generarCorreoResumenSemanalHallazgos({
      nombreEmpresa: registro.empresaNombre,
      destinatarioNombre: registro.nombre,
      hallazgos: Array.from(registro.hallazgos.values()).map((hallazgo) => ({
        id: hallazgo.id,
        descripcion: hallazgo.descripcion,
        prioridad: hallazgo.prioridad,
        estado: hallazgo.estado,
        fechaCompromiso: hallazgo.fechaCompromiso,
        createdAt: hallazgo.createdAt,
        centro: hallazgo.centroTrabajo?.nombre || "No asignado",
        responsable: hallazgo.responsableTrabajador
          ? [hallazgo.responsableTrabajador.nombres, hallazgo.responsableTrabajador.apellidos].join(" ").trim()
          : "Por asignar",
      })),
      periodo,
      appUrl: appUrl(),
    });

    intentos++;
    try {
      await sendEmail({ to: registro.email, ...correo });
      await prisma.activacionEvento.create({
        data: {
          empresaId: registro.empresaId,
          usuarioId: null,
          evento,
          metadata: {
            tipo: "resumen_semanal", desde: periodo.desde, hasta: periodo.hasta,
            destinatarioHash: emailHash, totalHallazgos: registro.hallazgos.size,
            enviadoEn: ahora.toISOString(),
          },
        },
      });
      resultado.enviados++;
    } catch (error) {
      resultado.errores++;
      console.error("[hallazgos-email] Falló resumen semanal", {
        empresaId: registro.empresaId, semana: periodo.desde,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return resultado;
}
