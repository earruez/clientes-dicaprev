import { normalizarArchivoSeguroUrl } from "@/lib/documentacion/archivo-seguro";

type DocumentoArchivoInput = {
  documentoId?: string;
  archivoUrl?: string;
  archivoNombre?: string;
  archivoNombreOriginal?: string;
};

export function obtenerAccionArchivoDocumento(documento: DocumentoArchivoInput) {
  const archivoUrlSeguro = normalizarArchivoSeguroUrl(documento.archivoUrl);
  const tieneArchivo = Boolean(
    archivoUrlSeguro ||
      documento.archivoNombre ||
      documento.archivoNombreOriginal,
  );

  return {
    archivoUrlSeguro,
    tieneArchivo,
    etiquetaCarga:
      tieneArchivo || documento.documentoId
        ? "Reemplazar documento"
        : "Subir documento",
  };
}
