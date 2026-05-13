import { prisma } from "@/lib/prisma";

export const ESTADOS_DOCUMENTO_EMPRESA_ARCHIVADOS = ["Reemplazado", "reemplazado"] as const;

export type DocumentoEmpresaDuplicadoDetalle = {
  id: string;
  empresaId: string;
  documentoRequeridoId: string;
  documentoRequeridoNombre: string | null;
  nombre: string;
  estado: string;
  createdAt: string;
  updatedAt: string;
  archivoUrl: string | null;
  archivoNombre: string | null;
  fechaVencimiento: string | null;
  vigencia: "vigente" | "por_vencer" | "vencido" | "sin_vencimiento" | "sin_archivo";
  activo: null;
  tieneArchivo: boolean;
  observaciones: string | null;
};

export type DocumentoEmpresaDuplicadoGrupo = {
  empresaId: string;
  documentoRequeridoId: string;
  documentoRequeridoNombre: string | null;
  total: number;
  documentos: DocumentoEmpresaDuplicadoDetalle[];
  conservarId: string;
  archivarIds: string[];
  criterio: string;
};

export type ConsolidacionDuplicadosResultado = {
  totalGrupos: number;
  totalDocumentosDuplicados: number;
  totalArchivados: number;
  grupos: DocumentoEmpresaDuplicadoGrupo[];
  acciones: Array<{
    empresaId: string;
    documentoRequeridoId: string;
    conservarId: string;
    archivadoId: string;
    historialRelinkeado: number;
    aplicado: boolean;
  }>;
  indiceUnicoEvaluable: boolean;
};

type DocumentoEmpresaRow = Awaited<ReturnType<typeof cargarDocumentosConDocumentoRequerido>>[number];
type DocumentoEmpresaComparable = {
  estado: string;
  archivoNombre: string | null;
  archivoUrl: string | null;
  fechaVencimiento: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

async function cargarDocumentosConDocumentoRequerido(empresaId?: string) {
  return prisma.documentoEmpresa.findMany({
    where: {
      documentoRequeridoId: { not: null },
      ...(empresaId ? { empresaId } : {}),
    },
    select: {
      id: true,
      empresaId: true,
      documentoRequeridoId: true,
      nombre: true,
      estado: true,
      version: true,
      archivoUrl: true,
      archivoNombre: true,
      fechaVencimiento: true,
      observaciones: true,
      createdAt: true,
      updatedAt: true,
      documentoRequerido: {
        select: {
          nombre: true,
        },
      },
    },
    orderBy: [{ empresaId: "asc" }, { documentoRequeridoId: "asc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
  });
}

function normalizarEstado(valor: string | null | undefined) {
  return (valor ?? "").trim().toLowerCase();
}

function tieneArchivo(doc: Pick<DocumentoEmpresaComparable, "archivoNombre" | "archivoUrl">) {
  return Boolean(doc.archivoNombre || doc.archivoUrl);
}

function calcularVigencia(
  doc: Pick<DocumentoEmpresaComparable, "archivoNombre" | "archivoUrl" | "fechaVencimiento">,
): DocumentoEmpresaDuplicadoDetalle["vigencia"] {
  if (!tieneArchivo(doc)) return "sin_archivo";
  if (!doc.fechaVencimiento) return "sin_vencimiento";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(doc.fechaVencimiento);
  fecha.setHours(0, 0, 0, 0);
  const diff = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return "vencido";
  if (diff <= 30) return "por_vencer";
  return "vigente";
}

function puntuarDocumento(doc: DocumentoEmpresaComparable) {
  const estado = normalizarEstado(doc.estado);
  const conArchivo = tieneArchivo(doc);
  const vigencia = calcularVigencia(doc);

  let score = 0;
  if (conArchivo) score += 1000;
  if (vigencia === "vigente") score += 120;
  if (vigencia === "por_vencer") score += 90;
  if (vigencia === "sin_vencimiento") score += 80;
  if (vigencia === "vencido") score += 20;
  if (estado === "vigente") score += 50;
  if (estado === "por vencer" || estado === "por_vencer") score += 40;
  if (estado === "en revision" || estado === "en_revision") score += 30;
  if (estado === "pendiente de carga" || estado === "pendiente_carga" || estado === "pendiente_configuracion") score += 10;
  if (!ESTADOS_DOCUMENTO_EMPRESA_ARCHIVADOS.map((item) => item.toLowerCase()).includes(estado)) score += 5;

  return score;
}

function compararDocumentos(a: DocumentoEmpresaComparable, b: DocumentoEmpresaComparable) {
  const scoreDiff = puntuarDocumento(b) - puntuarDocumento(a);
  if (scoreDiff !== 0) return scoreDiff;

  const updatedDiff = b.updatedAt.getTime() - a.updatedAt.getTime();
  if (updatedDiff !== 0) return updatedDiff;

  return b.createdAt.getTime() - a.createdAt.getTime();
}

function detalleDocumento(doc: DocumentoEmpresaRow): DocumentoEmpresaDuplicadoDetalle {
  return {
    id: doc.id,
    empresaId: doc.empresaId,
    documentoRequeridoId: doc.documentoRequeridoId as string,
    documentoRequeridoNombre: doc.documentoRequerido?.nombre ?? null,
    nombre: doc.nombre,
    estado: doc.estado,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    archivoUrl: doc.archivoUrl,
    archivoNombre: doc.archivoNombre,
    fechaVencimiento: doc.fechaVencimiento ? doc.fechaVencimiento.toISOString() : null,
    vigencia: calcularVigencia(doc),
    activo: null,
    tieneArchivo: tieneArchivo(doc),
    observaciones: doc.observaciones,
  };
}

export async function listarDuplicadosDocumentoEmpresa(empresaId?: string): Promise<DocumentoEmpresaDuplicadoGrupo[]> {
  const documentos = await cargarDocumentosConDocumentoRequerido(empresaId);
  const grupos = new Map<string, DocumentoEmpresaRow[]>();

  for (const doc of documentos) {
    if (!doc.documentoRequeridoId) continue;
    const key = `${doc.empresaId}::${doc.documentoRequeridoId}`;
    const current = grupos.get(key) ?? [];
    current.push(doc);
    grupos.set(key, current);
  }

  return [...grupos.values()]
    .filter((docs) => docs.length > 1)
    .map((docs) => {
      const ordenados = [...docs].sort(compararDocumentos);
      const keeper = ordenados[0];
      return {
        empresaId: keeper.empresaId,
        documentoRequeridoId: keeper.documentoRequeridoId as string,
        documentoRequeridoNombre: keeper.documentoRequerido?.nombre ?? null,
        total: ordenados.length,
        documentos: ordenados.map(detalleDocumento),
        conservarId: keeper.id,
        archivarIds: ordenados.slice(1).map((doc) => doc.id),
        criterio:
          "Conservar primero el documento con archivo; si hay varios, priorizar vigente/por vencer/sin vencimiento, luego el mas reciente. Los restantes se archivan logicamente como Reemplazado.",
      } satisfies DocumentoEmpresaDuplicadoGrupo;
    })
    .sort((a, b) => a.empresaId.localeCompare(b.empresaId) || a.documentoRequeridoNombre?.localeCompare(b.documentoRequeridoNombre ?? "") || 0);
}

function mergeObservaciones(actual: string | null, keeperId: string) {
  const nota = `[duplicado-historico] Archivado logicamente. Documento canonico: ${keeperId}.`;
  if (!actual) return nota;
  if (actual.includes(nota)) return actual;
  return `${actual}\n${nota}`;
}

export async function consolidarDuplicadosDocumentoEmpresa(options?: {
  empresaId?: string;
  aplicar?: boolean;
}): Promise<ConsolidacionDuplicadosResultado> {
  const aplicar = options?.aplicar ?? false;
  const grupos = await listarDuplicadosDocumentoEmpresa(options?.empresaId);
  const acciones: ConsolidacionDuplicadosResultado["acciones"] = [];

  for (const grupo of grupos) {
    const keeperId = grupo.conservarId;

    for (const archivadoId of grupo.archivarIds) {
      if (aplicar) {
        await prisma.$transaction(async (tx) => {
          const duplicate = await tx.documentoEmpresa.findUnique({
            where: { id: archivadoId },
            select: {
              id: true,
              version: true,
              archivoNombre: true,
              archivoNombreOriginal: true,
              archivoUrl: true,
              archivoTipo: true,
              archivoPeso: true,
              observaciones: true,
              estado: true,
            },
          });

          if (!duplicate) return;

          const historialRelinkeado = await tx.documentoEmpresaHistorial.updateMany({
            where: { documentoId: archivadoId },
            data: { documentoId: keeperId },
          });

          await tx.documentoEmpresa.update({
            where: { id: archivadoId },
            data: {
              estado: "Reemplazado",
              documentoRequeridoId: null,
              observaciones: mergeObservaciones(duplicate.observaciones, keeperId),
            },
          });

          await tx.documentoEmpresaHistorial.create({
            data: {
              documentoId: keeperId,
              accion: "DUPLICADO_HISTORICO_CONSOLIDADO",
              detalle: `Se consolido el duplicado historico ${archivadoId} en el documento canonico ${keeperId}.`,
              version: duplicate.version,
              archivoNombre: duplicate.archivoNombre,
              archivoNombreOriginal: duplicate.archivoNombreOriginal,
              archivoUrl: duplicate.archivoUrl,
              archivoTipo: duplicate.archivoTipo,
              archivoPeso: duplicate.archivoPeso,
            },
          });

          await tx.documentoEmpresaHistorial.create({
            data: {
              documentoId: archivadoId,
              accion: "DOCUMENTO_ARCHIVADO_POR_DUPLICADO_HISTORICO",
              detalle: `Documento archivado logicamente por duplicidad historica. Canonico: ${keeperId}. Historial relinkeado: ${historialRelinkeado.count}.`,
              version: duplicate.version,
              archivoNombre: duplicate.archivoNombre,
              archivoNombreOriginal: duplicate.archivoNombreOriginal,
              archivoUrl: duplicate.archivoUrl,
              archivoTipo: duplicate.archivoTipo,
              archivoPeso: duplicate.archivoPeso,
            },
          });

          acciones.push({
            empresaId: grupo.empresaId,
            documentoRequeridoId: grupo.documentoRequeridoId,
            conservarId: keeperId,
            archivadoId,
            historialRelinkeado: historialRelinkeado.count,
            aplicado: true,
          });
        });
      } else {
        acciones.push({
          empresaId: grupo.empresaId,
          documentoRequeridoId: grupo.documentoRequeridoId,
          conservarId: keeperId,
          archivadoId,
          historialRelinkeado: 0,
          aplicado: false,
        });
      }
    }
  }

  const remanentes = await listarDuplicadosDocumentoEmpresa(options?.empresaId);

  return {
    totalGrupos: grupos.length,
    totalDocumentosDuplicados: grupos.reduce((acc, grupo) => acc + grupo.total, 0),
    totalArchivados: acciones.length,
    grupos,
    acciones,
    indiceUnicoEvaluable: remanentes.length === 0,
  };
}

export async function findDocumentoEmpresaCanonicoPorRequerido(params: {
  empresaId: string;
  documentoRequeridoId: string;
}) {
  const docs = await prisma.documentoEmpresa.findMany({
    where: {
      empresaId: params.empresaId,
      documentoRequeridoId: params.documentoRequeridoId,
      estado: { notIn: [...ESTADOS_DOCUMENTO_EMPRESA_ARCHIVADOS] },
    },
    select: {
      id: true,
      nombre: true,
      categoria: true,
      tipo: true,
      estado: true,
      version: true,
      archivoNombre: true,
      archivoNombreOriginal: true,
      archivoUrl: true,
      archivoTipo: true,
      archivoPeso: true,
      tieneVencimiento: true,
      fechaEmision: true,
      fechaVencimiento: true,
      observaciones: true,
      creadoPorEmail: true,
      documentoRequeridoId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return docs.sort(compararDocumentos)[0] ?? null;
}
