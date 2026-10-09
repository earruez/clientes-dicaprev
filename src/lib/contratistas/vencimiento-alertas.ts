import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send-email";
import { origenNextPrev } from "@/lib/contratistas/portal";

const MS_DIA = 86_400_000;

function hoyUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function htmlSeguro(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}

export async function procesarAvisosContratistas() {
  const hoy = hoyUtc();
  const hasta = new Date(hoy.getTime() + 31 * MS_DIA);
  const requisitos = await prisma.contratistaRequisito.findMany({
    where: {
      fechaVencimiento: { gte: hoy, lt: hasta },
      archivoNombre: { not: null },
      solicitud: { estado: { not: "cerrada" } },
    },
    include: {
      solicitud: {
        select: {
          nombre: true, contactoEmail: true, empresaId: true,
          contratista: { select: { nombre: true } },
        },
      },
    },
  });
  let enviados = 0;
  let errores = 0;
  for (const r of requisitos) {
    if (!r.fechaVencimiento) continue;
    const vence = new Date(r.fechaVencimiento);
    vence.setUTCHours(0, 0, 0, 0);
    const dias = Math.round((vence.getTime() - hoy.getTime()) / MS_DIA);
    const tramo: 30 | 15 | 5 = dias <= 5 ? 5 : dias <= 15 ? 15 : 30;
    if ((tramo === 30 && r.aviso30At) || (tramo === 15 && r.aviso15At) || (tramo === 5 && r.aviso5At)) continue;
    const mandante = await prisma.empresa.findUnique({ where: { id: r.solicitud.empresaId }, select: { nombre: true } });
    try {
      await sendEmail({
        to: r.solicitud.contactoEmail,
        subject: `NextPrev · Documento por vencer: ${r.nombre}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden"><header style="padding:22px;background:#0f172a;color:#fff"><strong style="font-size:22px">NextPrev</strong><p>Control documental de contratistas</p></header><main style="padding:24px"><h2>Documento por vencer</h2><p>Hola, <b>${htmlSeguro(r.solicitud.contratista.nombre)}</b>.</p><p>El documento <b>${htmlSeguro(r.nombre)}</b> de <b>${htmlSeguro(r.solicitud.nombre)}</b> vence en ${dias} días.</p><p>Solicitado por: ${htmlSeguro(mandante?.nombre || "Empresa mandante")}.</p><p>Ingresa al enlace de tu invitación NextPrev para cargar una versión actualizada.</p><p><a href="${origenNextPrev()}" style="color:#0284c7">NextPrev</a></p></main><footer style="background:#f8fafc;padding:16px;color:#64748b;font-size:12px">Generado por NextPrev</footer></div>`,
        text: `El documento ${r.nombre} del expediente ${r.solicitud.nombre} vence en ${dias} días. Ingresa con tu invitación NextPrev para actualizarlo.`,
      });
      await prisma.contratistaRequisito.update({
        where: { id: r.id },
        data: tramo === 30 ? { aviso30At: new Date() } : tramo === 15 ? { aviso15At: new Date() } : { aviso5At: new Date() },
      });
      enviados++;
    } catch (error) {
      console.error("[contratistas-vencimientos] envío fallido", { documentoId: r.id, error: error instanceof Error ? error.message : "Error" });
      errores++;
    }
  }
  return { revisados: requisitos.length, enviados, errores };
}
