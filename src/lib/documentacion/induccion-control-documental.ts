import { Prisma, PrismaClient } from "@prisma/client";
import { mapCodigoDocumentoInduccionACodigoControl } from "@/lib/documentacion/induccion-control-codes";

type TxClient = Prisma.TransactionClient | PrismaClient;

type SincronizarDocumentoInduccionInput = {
  empresaId: string;
  trabajadorId: string;
  tipoInduccion: string;
  tituloDocumento: string;
  contenidoMarkdown: string;
  estado: string;
  firmadoPor?: string | null;
  firmadoEn?: Date | null;
  actorUsuarioId?: string | null;
  documentoInduccionId?: string | null;
  origenEvento: "generacion_induccion" | "firma_induccion" | "backfill_induccion";
};

type SincronizarDocumentoInduccionResultado = {
  sincronizado: boolean;
  operacion: "creado" | "actualizado" | "omitido";
  motivo?: string;
  documentoTrabajadorId: string | null;
  tipoControl: string | null;
};

function mapEstadoInduccionAEstadoDocumentoTrabajador(
  estado: string,
): "enviado_firma" | "firmado" | "rechazado" {
  const normalized = estado.trim().toLowerCase();
  if (normalized === "firmado") return "firmado";
  if (normalized === "rechazado" || normalized === "expirado") return "rechazado";
  return "enviado_firma";
}

function sameDocumentState(
  documento: {
    estado: string;
    firmadoPor: string | null;
    firmadoEn: Date | null;
    observaciones: string | null;
  },
  input: SincronizarDocumentoInduccionInput,
  estadoDocumento: string,
): boolean {
  return (
    documento.estado === estadoDocumento &&
    documento.firmadoPor === (input.firmadoPor ?? null) &&
    (documento.firmadoEn?.getTime() ?? null) === (input.firmadoEn?.getTime() ?? null) &&
    documento.observaciones === input.contenidoMarkdown
  );
}

export async function sincronizarDocumentoInduccionEnCarpetaTrabajadorTx(
  tx: TxClient,
  input: SincronizarDocumentoInduccionInput,
): Promise<SincronizarDocumentoInduccionResultado> {
  const tipoControl = mapCodigoDocumentoInduccionACodigoControl(input.tipoInduccion);
  if (!tipoControl) {
    return {
      sincronizado: false,
      operacion: "omitido",
      motivo: "codigo_induccion_no_mapeado",
      documentoTrabajadorId: null,
      tipoControl: null,
    };
  }

  const tipoDocumento = await tx.documentoTipoTrabajador.findFirst({
    where: {
      empresaId: input.empresaId,
      codigo: tipoControl,
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
      codigo: true,
      requiereVencimiento: true,
    },
  });

  if (!tipoDocumento) {
    return {
      sincronizado: false,
      operacion: "omitido",
      motivo: "tipo_control_no_encontrado",
      documentoTrabajadorId: null,
      tipoControl,
    };
  }

  const estadoDocumento = mapEstadoInduccionAEstadoDocumentoTrabajador(input.estado);

  const documentoExistente = await tx.trabajadorDocumento.findFirst({
    where: {
      empresaId: input.empresaId,
      trabajadorId: input.trabajadorId,
      tipo: tipoDocumento.codigo,
      origen: "induccion",
      esVigente: true,
    },
    select: {
      id: true,
      estado: true,
      firmadoPor: true,
      firmadoEn: true,
      observaciones: true,
    },
  });

  if (documentoExistente && sameDocumentState(documentoExistente, input, estadoDocumento)) {
    return {
      sincronizado: false,
      operacion: "omitido",
      motivo: "sin_cambios",
      documentoTrabajadorId: documentoExistente.id,
      tipoControl,
    };
  }

  const now = input.firmadoEn ?? new Date();
  const documentData = {
    trabajadorId: input.trabajadorId,
    empresaId: input.empresaId,
    nombre: tipoDocumento.nombre,
    tipo: tipoDocumento.codigo,
    categoria: "trabajador" as const,
    estado: estadoDocumento,
    version: "1.0",
    esVigente: true,
    versionNumero: 1,
    origen: "induccion" as const,
    archivoNombre: null,
    archivoNombreOriginal: null,
    archivoUrl: null,
    archivoTipo: null,
    archivoPeso: null,
    tieneVencimiento: tipoDocumento.requiereVencimiento,
    fechaEmision: now,
    fechaVencimiento: null,
    observaciones: input.contenidoMarkdown,
    subidoPorId: input.actorUsuarioId ?? null,
    creadoPorEmail: "Sistema",
    firmado: estadoDocumento === "firmado",
    firmadoPor: input.firmadoPor?.trim() || null,
    firmadoEn: input.firmadoEn ?? null,
  };

  const operacion = documentoExistente ? "actualizado" : "creado";

  const documentoTrabajador = documentoExistente
    ? await tx.trabajadorDocumento.update({
        where: { id: documentoExistente.id },
        data: documentData,
        select: { id: true },
      })
    : await tx.trabajadorDocumento.create({
        data: documentData,
        select: { id: true },
      });

  await tx.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: documentoTrabajador.id,
      usuarioId: input.actorUsuarioId ?? null,
      accion: estadoDocumento === "firmado" ? "INDUCCION_DOCUMENTO_FIRMADO" : "INDUCCION_DOCUMENTO_SINCRONIZADO",
      detalle: input.documentoInduccionId
        ? `Sincronizado (${operacion}) desde inducción ${input.documentoInduccionId} (${input.origenEvento})`
        : `Sincronizado (${operacion}) desde ${input.origenEvento}`,
      version: "1.0",
      origen: "sistema",
      contenidoSnapshot: input.contenidoMarkdown,
    },
  });

  return {
    sincronizado: true,
    operacion,
    documentoTrabajadorId: documentoTrabajador.id,
    tipoControl,
  };
}