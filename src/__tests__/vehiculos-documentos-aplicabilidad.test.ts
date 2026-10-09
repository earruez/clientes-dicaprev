import { describe, expect, it } from "vitest";
import {
  esDocumentoBaseVehiculo, ordenarDocumentosVehiculo,
  isDocumentoPendiente, isDocumentoVencido, isDocumentoProximoVencer,
  estadoDocumentalFromDocumentos,
} from "../lib/vehiculos/documentos-estado";

describe("aplicabilidad documental de vehículos", () => {
  it("excluye un adicional no cargado de pendientes", () => {
    const doc = { estado: "no_aplica", subido: false };
    expect(isDocumentoPendiente(doc)).toBe(false);
    expect(estadoDocumentalFromDocumentos([doc])).toBe("en_regla");
  });

  it("excluye No aplica aunque conserve un archivo vencido", () => {
    const doc = { estado: "no_aplica", subido: true, fechaVencimiento: "2020-01-01" };
    expect(isDocumentoVencido(doc)).toBe(false);
    expect(estadoDocumentalFromDocumentos([doc])).toBe("en_regla");
  });

  it("excluye No aplica de próximos vencimientos", () => {
    const fechaVencimiento = new Date(Date.now() + 10 * 86400000).toISOString();
    expect(isDocumentoProximoVencer({ estado: "no_aplica", subido: true, fechaVencimiento })).toBe(false);
  });

  it("vuelve a contar un adicional pendiente cuando se reactiva", () => {
    expect(isDocumentoPendiente({ estado: "pendiente", subido: false })).toBe(true);
    expect(estadoDocumentalFromDocumentos([
      { estado: "no_aplica", subido: false },
      { estado: "pendiente", subido: false },
    ])).toBe("fuera_de_regla");
  });

  it("vuelve a considerar el vencimiento conservado al aplicar", () => {
    expect(isDocumentoVencido({ estado: "completo", subido: true, fechaVencimiento: "2020-01-01" })).toBe(true);
  });

  it("ordena los cinco documentos base y deja revisión y gases consecutivos", () => {
    const docs = ["SEGURO_VEHICULO", "GASES", "REVISION_TECNICA", "SOAP", "PADRON", "PERMISO_CIRCULACION"].map((tipo) => ({ tipo }));
    expect(ordenarDocumentosVehiculo(docs).map((doc) => doc.tipo)).toEqual([
      "PADRON", "SOAP", "PERMISO_CIRCULACION", "REVISION_TECNICA", "GASES", "SEGURO_VEHICULO",
    ]);
    expect(esDocumentoBaseVehiculo(" soap ")).toBe(true);
    expect(esDocumentoBaseVehiculo("SEGURO_VEHICULO")).toBe(false);
    expect(docs[0].tipo).toBe("SEGURO_VEHICULO");
  });
});
