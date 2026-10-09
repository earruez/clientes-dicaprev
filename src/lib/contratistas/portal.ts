import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export function generarTokenPortal(): string {
  return randomBytes(32).toString("hex");
}

export function hashTokenPortal(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function resolverPortalContratista(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return prisma.contratistaSolicitud.findFirst({
    where: {
      tokenHash: hashTokenPortal(token),
      tokenExpiraAt: { gt: new Date() },
      estado: { not: "cerrada" },
      contratista: { activo: true },
    },
    include: {
      contratista: { select: { nombre: true, razonSocial: true, rut: true } },
      recursos: { orderBy: { createdAt: "asc" } },
      requisitos: {
        orderBy: [{ categoria: "asc" }, { createdAt: "asc" }],
        select: {
          id: true, nombre: true, categoria: true, recursoId: true, obligatorio: true,
          estado: true, fechaEmision: true, fechaVencimiento: true,
          archivoNombre: true, archivoOriginal: true, observacionRevision: true,
          version: true,
        },
      },
    },
  });
}

export function origenNextPrev() {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://app.nextprev.cl"
  ).replace(/\/$/, "");
}
