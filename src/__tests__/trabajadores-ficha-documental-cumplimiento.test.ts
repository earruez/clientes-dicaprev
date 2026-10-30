import { describe, expect, it } from "vitest";
import { getWorkerDocSummary, type DocTrabajadorView } from "@/components/trabajadores-v2/documental/types";

const tipo: DocTrabajadorView["tipo"] = {
  id: "tipo", nombre: "Prueba", categoria: "Contratación", descripcion: "",
  requiereVencimiento: false, vencimientoMeses: null, esCritico: false,
};
const doc = (estado: DocTrabajadorView["estado"], extra: Partial<DocTrabajadorView> = {}): DocTrabajadorView =>
  ({ tipo, estado, ...extra });

describe("Ficha documental de trabajadores", () => {
  it("cuenta validado, firmado y completo como conformes, sin penalizar no aplica", () => {
    const resumen = getWorkerDocSummary([
      doc("validado"), doc("firmado"), doc("completo"),
      doc("en_revision", { archivoNombre: "cargado.pdf" }),
      doc("no_aplica"),
    ]);
    expect(resumen.total).toBe(4);
    expect(resumen.cargados).toBe(3);
    expect(resumen.pct).toBe(75);
    expect(resumen.enRevision).toBe(1);
  });

  it("diferencia entregados de aprobados y muestra pendientes de firma", () => {
    const resumen = getWorkerDocSummary([
      doc("pendiente"),
      doc("en_revision", { archivoUrl: "/api/dicaprev/documentacion/archivo/revision.pdf" }),
      doc("enviado_firma", { contenidoMarkdown: "Inducción pendiente de firma" }),
      doc("validado"),
    ]);
    expect(resumen.total).toBe(4);
    expect(resumen.entregados).toBe(3);
    expect(resumen.cargados).toBe(1);
    expect(resumen.pendientes).toBe(3);
    expect(resumen.pct).toBe(25);
  });

  it("no infla cumplimiento con documentos rechazados o vencidos", () => {
    const resumen = getWorkerDocSummary([doc("rechazado"), doc("vencido"), doc("pendiente")]);
    expect(resumen.cargados).toBe(0);
    expect(resumen.rechazados).toBe(1);
    expect(resumen.vencidos).toBe(1);
    expect(resumen.pct).toBe(0);
  });
});
