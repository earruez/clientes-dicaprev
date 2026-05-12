"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

export type EstadoEvidenciaDerivada = "valida" | "pendiente" | "rechazada";

export type EvidenciaDerivada = {
  id: string;
  titulo: string;
  tipo: string;
  fecha: string;
  estado: EstadoEvidenciaDerivada;
  obligacionNombre: string | null;
  centroNombre: string | null;
  archivoNombre: string | null;
  archivoUrl: string | null;
  hallazgoAbiertoRelacionado: string | null;
};

export type EvidenciasCumplimientoView = {
  rows: EvidenciaDerivada[];
  totalValidas: number;
  totalPendientes: number;
  totalRechazadas: number;
  totalHallazgosAbiertos: number;
  totalDocumentos: number;
  todoModelo: string;
};

function normalizarEstadoEvidencia(estado: string | null): EstadoEvidenciaDerivada {
  const value = (estado ?? "").toLowerCase();
  if (value === "vigente") return "valida";
  if (value === "por_vencer" || value === "por vencer" || value === "pendiente_carga" || value === "pendiente de carga") {
    return "pendiente";
  }
  if (value === "vencido" || value === "rechazado") return "rechazada";
  return "pendiente";
}

export async function getEvidenciasCumplimientoView(): Promise<EvidenciasCumplimientoView> {
  const { empresaId } = await requirePermission("canReadCumplimiento");

  const [documentos, hallazgosAbiertos] = await Promise.all([
    prisma.documentoEmpresa.findMany({
      where: { empresaId },
      include: {
        documentoRequerido: {
          select: {
            id: true,
            nombre: true,
            categoria: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma.hallazgoCumplimiento.findMany({
      where: {
        empresaId,
        estado: {
          in: ["abierto", "en_seguimiento", "en_proceso"],
        },
      },
      select: {
        id: true,
        descripcion: true,
        obligacionClave: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const hallazgosPorObligacion = new Map<string, string>();
  for (const hallazgo of hallazgosAbiertos) {
    if (!hallazgo.obligacionClave) continue;
    if (!hallazgosPorObligacion.has(hallazgo.obligacionClave)) {
      hallazgosPorObligacion.set(hallazgo.obligacionClave, hallazgo.descripcion);
    }
  }

  const rows: EvidenciaDerivada[] = documentos.map((doc) => ({
    id: doc.id,
    titulo: doc.documentoRequerido?.nombre ?? doc.archivoNombre ?? "Documento de cumplimiento",
    tipo: "documento",
    fecha: doc.updatedAt.toISOString().slice(0, 10),
    estado: normalizarEstadoEvidencia(doc.estado),
    obligacionNombre: doc.documentoRequerido?.nombre ?? null,
    centroNombre: null,
    archivoNombre: doc.archivoNombre,
    archivoUrl: doc.archivoUrl,
    hallazgoAbiertoRelacionado: doc.documentoRequeridoId
      ? hallazgosPorObligacion.get(doc.documentoRequeridoId) ?? null
      : null,
  }));

  const totalValidas = rows.filter((r) => r.estado === "valida").length;
  const totalPendientes = rows.filter((r) => r.estado === "pendiente").length;
  const totalRechazadas = rows.filter((r) => r.estado === "rechazada").length;

  return {
    rows,
    totalValidas,
    totalPendientes,
    totalRechazadas,
    totalHallazgosAbiertos: hallazgosAbiertos.length,
    totalDocumentos: rows.length,
    // TODO(Fase 19.5): crear modelo Prisma dedicado EvidenciaCumplimiento para
    // trazabilidad uno-a-uno entre evidencia, hallazgo, obligacion y accion correctiva.
    todoModelo:
      "TODO(Fase 19.5): Modelar EvidenciaCumplimiento en Prisma para relacion explicita evidencia-hallazgo-obligacion y flujo de validacion.",
  };
}
