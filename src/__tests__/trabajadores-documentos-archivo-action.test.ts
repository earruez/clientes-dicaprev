import { describe, expect, it } from "vitest";

import { obtenerAccionArchivoDocumento } from "@/components/trabajadores-v2/documental/documento-archivo-action";

describe("obtenerAccionArchivoDocumento", () => {
  it("permite ver un archivo subido mediante la ruta segura", () => {
    expect(
      obtenerAccionArchivoDocumento({
        documentoId: "doc-1",
        archivoUrl: "/uploads/documentos/reglamento.pdf",
        archivoNombreOriginal: "reglamento.pdf",
      }),
    ).toEqual({
      archivoUrlSeguro:
        "/api/dicaprev/documentacion/archivo/reglamento.pdf",
      tieneArchivo: true,
      etiquetaCarga: "Reemplazar documento",
    });
  });

  it("mantiene la carga inicial cuando todavía no existe un documento", () => {
    expect(obtenerAccionArchivoDocumento({})).toEqual({
      archivoUrlSeguro: null,
      tieneArchivo: false,
      etiquetaCarga: "Subir documento",
    });
  });

  it("ofrece reemplazo cuando existe un registro aunque no tenga URL", () => {
    expect(
      obtenerAccionArchivoDocumento({
        documentoId: "doc-1",
        archivoNombreOriginal: "irl.pdf",
      }),
    ).toEqual({
      archivoUrlSeguro: null,
      tieneArchivo: true,
      etiquetaCarga: "Reemplazar documento",
    });
  });
});
