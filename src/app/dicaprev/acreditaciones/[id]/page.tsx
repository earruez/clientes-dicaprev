import { notFound, redirect } from "next/navigation";
import { getAcreditacionById } from "@/actions/acreditaciones";
import ExpedienteClient from "./expediente-client";

type EstadoAcreditacion =
  | "en_preparacion"
  | "listo_para_enviar"
  | "enviado"
  | "observada"
  | "aprobado"
  | "rechazado"
  | "cerrada"
  | "vencido";

type CategoriaRequisito = "empresa" | "trabajador" | "sst" | "vehiculo" | "anexo";
type EstadoDocumento = "completo" | "vencido" | "faltante";
type AplicaA = "empresa" | "trabajador" | "vehiculo";

function mapCategoria(value: string | null | undefined): CategoriaRequisito {
  if (value === "empresa" || value === "trabajador" || value === "sst" || value === "vehiculo" || value === "anexo") {
    return value;
  }
  return "anexo";
}

function mapEstadoDocumento(value: string | null | undefined): EstadoDocumento {
  if (value === "completo") return "completo";
  if (value === "vencido") return "vencido";
  return "faltante";
}

function mapAplicaA(value: string | null | undefined): AplicaA {
  if (value === "trabajador" || value === "vehiculo") return value;
  return "empresa";
}

function mapEstadoAcreditacion(value: string | null | undefined): EstadoAcreditacion {
  if (
    value === "en_preparacion" ||
    value === "listo_para_enviar" ||
    value === "enviado" ||
    value === "observada" ||
    value === "aprobado" ||
    value === "rechazado" ||
    value === "cerrada" ||
    value === "vencido"
  ) {
    return value;
  }
  return "en_preparacion";
}

function mapEstadoHistorial(value: string): "generado" | "enviado" {
  const normalized = value.toLowerCase();
  if (normalized.includes("env") || normalized.includes("submit")) return "enviado";
  return "generado";
}

export default async function AcreditacionExpedientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let acreditacion: Awaited<ReturnType<typeof getAcreditacionById>>;

  try {
    acreditacion = await getAcreditacionById(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.toLowerCase().includes("sesion")) {
      redirect("/dicaprev/login");
    }

    throw error;
  }

  if (!acreditacion) {
    notFound();
  }

  const workers = acreditacion.trabajadores
    .filter((item) => Boolean(item.trabajador))
    .map((item) => ({
      id: item.trabajador.id,
      nombre: `${item.trabajador.nombres} ${item.trabajador.apellidos}`.trim(),
      rut: item.trabajador.rut,
      cargo: item.trabajador.cargo?.nombre ?? "Sin cargo",
    }));

  const vehiculos = acreditacion.vehiculos
    .filter((item) => Boolean(item.vehiculo))
    .map((item) => ({
      id: item.vehiculo.id,
      patente: item.vehiculo.patente,
      modelo: `${item.vehiculo.marca} ${item.vehiculo.modelo}`.trim(),
    }));

  const docs = acreditacion.documentos.map((doc) => ({
    id: doc.id,
    requisitoId: doc.requisitoId,
    acreditacionId: doc.acreditacionId,
    nombreDocumento: doc.nombreDocumento,
    categoria: mapCategoria(doc.categoria),
    aplicaA: mapAplicaA(doc.requisito?.aplicaA),
    titularId: doc.titularId,
    titularNombre: doc.titularNombre ?? (doc.titularTipo === "empresa" ? (acreditacion.empresa?.nombre ?? "Sin empresa") : "Sin titular"),
    obligatorio: doc.obligatorio,
    estado: mapEstadoDocumento(doc.estado),
    archivoUrl: doc.archivoUrl ?? undefined,
    archivoNombre: doc.archivoNombre ?? undefined,
    nombreArchivo: doc.archivoNombre ?? undefined,
    fechaEmision: doc.fechaEmision?.toISOString(),
    fechaVencimiento: doc.fechaVencimiento?.toISOString(),
    observaciones: doc.observaciones ?? undefined,
    fuenteBiblioteca: doc.fuenteTipo === "biblioteca",
    fuenteTipo: doc.fuenteTipo,
    fuenteId: doc.fuenteId,
    requisitoLibre:
      !doc.requisito?.documentoRequeridoEmpresaId &&
      !doc.requisito?.documentoTipoTrabajadorId &&
      !doc.requisito?.documentoTipoVehiculoId,
  }));

  const historial = acreditacion.historial
    .filter((h) => h.accion.toLowerCase().includes("env") || h.accion.toLowerCase().includes("exped") || h.accion.toLowerCase().includes("gener"))
    .map((h) => ({
      id: h.id,
      acreditacionId: h.acreditacionId,
      fecha: h.createdAt.toISOString(),
      generadoPor: h.usuario?.nombre ?? "Sistema",
      documentosIncluidos: docs.filter((d) => d.estado !== "faltante").length,
      estado: mapEstadoHistorial(h.accion),
    }));

  const historialEstados = acreditacion.historial
    .filter((h) => h.estadoNuevo)
    .map((h) => ({
      estado: mapEstadoAcreditacion(h.estadoNuevo),
      fecha: h.createdAt.toISOString(),
      usuario: h.usuario?.nombre ?? "Sistema",
      comentario: h.detalle ?? undefined,
    }));

  return (
    <ExpedienteClient
      acreditacion={{
        id: acreditacion.id,
        empresaId: acreditacion.empresa?.id ?? "",
        empresaNombre: acreditacion.empresa?.nombre ?? "Sin empresa",
        mandante: acreditacion.mandante?.nombre ?? "Sin mandante",
        tipo: acreditacion.plantilla?.tipo ?? "mandante_general",
        estado: mapEstadoAcreditacion(acreditacion.estado),
        plantillaNombre: acreditacion.plantilla?.nombre ?? "Sin plantilla",
        trabajadores: workers,
        vehiculos,
        creadoEl: acreditacion.createdAt.toISOString(),
        actualizadoEl: acreditacion.updatedAt.toISOString(),
        observaciones: acreditacion.observaciones ?? undefined,
        historialEstados,
      }}
      initialDocs={docs}
      initialHistorial={historial}
    />
  );
}
