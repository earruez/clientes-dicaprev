import { describe, expect, it } from "vitest";
import {
  documentoContratistaPendienteValidacion,
  estadoVisibleRequisitoContratista,
} from "@/lib/contratistas/requisitos";

describe("Contratistas — validación de documentos recibidos", () => {
  const archivo = "12345678-1234-1234-1234-123456789abc.pdf";

  it("un archivo cargado en la versión antigua queda habilitado para validar", () => {
    expect(documentoContratistaPendienteValidacion("pendiente", archivo)).toBe(true);
    expect(estadoVisibleRequisitoContratista("pendiente", archivo, null)).toBe("en_revision");
  });

  it("un archivo nuevo enviado a revisión mantiene el estado de validación", () => {
    expect(documentoContratistaPendienteValidacion("en_revision", archivo)).toBe(true);
    expect(estadoVisibleRequisitoContratista("en_revision", archivo, null)).toBe("en_revision");
  });

  it("un requisito sin archivo no permite revisión", () => {
    expect(documentoContratistaPendienteValidacion("pendiente", null)).toBe(false);
    expect(estadoVisibleRequisitoContratista("pendiente", null, null)).toBe("pendiente");
  });

  it("un documento ya aprobado, observado o rechazado no permite una segunda revisión sin nueva carga", () => {
    for (const estado of ["aprobado", "observado", "rechazado"]) {
      expect(documentoContratistaPendienteValidacion(estado, archivo)).toBe(false);
      expect(estadoVisibleRequisitoContratista(estado, archivo, null)).toBe(estado);
    }
  });

  it("la caducidad prevalece sobre pendiente de validación", () => {
    expect(estadoVisibleRequisitoContratista("pendiente", archivo, "2020-01-01T12:00:00Z")).toBe("vencido");
  });
});
