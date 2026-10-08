import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send-email";
import { generarEmailVencimientoDocumentoVehiculo } from "@/lib/email/templates/vehiculo-documento-vencimiento";

const DAY_MS = 86_400_000;

function startOfToday(): Date {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now;
}

function diasRestantes(fecha: Date, today: Date): number {
  const d = new Date(fecha);
  d.setUTCHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / DAY_MS);
}

function appUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://app.nextprev.cl"
  );
}

export type ResultadoAvisosVehiculo = {
  revisados: number;
  enviados: number;
  omitidosSinResponsable: number;
  omitidosSinCorreo: number;
  errores: number;
};

export async function procesarAvisosVencimientoVehiculos(): Promise<ResultadoAvisosVehiculo> {
  const today = startOfToday();
  const hasta = new Date(today.getTime() + 20 * DAY_MS + DAY_MS - 1);

  const documentos = await prisma.vehiculoDocumento.findMany({
    where: {
      fechaVencimiento: {
        gte: today,
        lte: hasta,
      },
      estado: { not: "no_aplica" },
      subido: true,
    },
    select: {
      id: true,
      tipo: true,
      fechaVencimiento: true,
      aviso20EnviadoAt: true,
      aviso15EnviadoAt: true,
      tipoDocumento: { select: { nombre: true } },
      vehiculo: {
        select: {
          patente: true,
          marca: true,
          modelo: true,
          responsableTrabajador: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              email: true,
            },
          },
          empresa: {
            select: { nombre: true },
          },
        },
      },
    },
  });

  const resultado: ResultadoAvisosVehiculo = {
    revisados: documentos.length,
    enviados: 0,
    omitidosSinResponsable: 0,
    omitidosSinCorreo: 0,
    errores: 0,
  };

  for (const documento of documentos) {
    if (!documento.fechaVencimiento) continue;

    const dias = diasRestantes(documento.fechaVencimiento, today);
    if (dias < 0 || dias > 20) continue;

    const responsable = documento.vehiculo.responsableTrabajador;
    if (!responsable) {
      resultado.omitidosSinResponsable += 1;
      continue;
    }

    const email = responsable.email?.trim();
    if (!email) {
      resultado.omitidosSinCorreo += 1;
      continue;
    }

    let hito: 20 | 15 | null = null;
    if (dias <= 15 && !documento.aviso15EnviadoAt) {
      hito = 15;
    } else if (dias <= 20 && dias > 15 && !documento.aviso20EnviadoAt) {
      hito = 20;
    }

    if (!hito) continue;

    const nombre = `${responsable.nombres} ${responsable.apellidos}`.trim();
    const documentoNombre = documento.tipoDocumento?.nombre ?? documento.tipo;
    const vehiculoNombre = `${documento.vehiculo.marca} ${documento.vehiculo.modelo}`.trim();
    const fechaIso = documento.fechaVencimiento.toISOString().slice(0, 10);

    const emailPayload = generarEmailVencimientoDocumentoVehiculo({
      responsableNombre: nombre,
      empresaNombre: documento.vehiculo.empresa.nombre,
      vehiculoNombre,
      patente: documento.vehiculo.patente,
      documentoNombre,
      fechaVencimiento: fechaIso,
      diasRestantes: dias,
      appUrl: appUrl(),
    });

    try {
      await sendEmail({
        to: email,
        subject: emailPayload.subject,
        html: emailPayload.html,
        text: emailPayload.text,
      });

      const now = new Date();
      await prisma.vehiculoDocumento.update({
        where: { id: documento.id },
        data:
          hito === 15
            ? {
                aviso15EnviadoAt: now,
                ...(documento.aviso20EnviadoAt ? {} : { aviso20EnviadoAt: now }),
              }
            : { aviso20EnviadoAt: now },
      });

      resultado.enviados += 1;
    } catch (error) {
      resultado.errores += 1;
      console.error("[vehiculos-vencimientos] No se pudo enviar aviso", {
        documentoId: documento.id,
        hito,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return resultado;
}

export async function enviarPruebaVencimientoVehiculo(to: string) {
  const target = to.trim();
  if (!target) {
    throw new Error("Correo de prueba requerido.");
  }

  const today = startOfToday();
  const vencimiento = new Date(today.getTime() + 20 * DAY_MS);
  const payload = generarEmailVencimientoDocumentoVehiculo({
    responsableNombre: "Responsable de flota",
    empresaNombre: "Empresa Demo NextPrev",
    vehiculoNombre: "Hyundai Porter",
    patente: "PRUEBA-01",
    documentoNombre: "Revisión técnica",
    fechaVencimiento: vencimiento.toISOString().slice(0, 10),
    diasRestantes: 20,
    appUrl: appUrl(),
  });

  return sendEmail({
    to: target,
    subject: `[PRUEBA] ${payload.subject}`,
    html: payload.html,
    text: payload.text,
  });
}
