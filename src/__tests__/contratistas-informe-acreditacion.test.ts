import { describe, expect, it } from "vitest";
import {
  estadoAcreditacionDocumental, estadoInformeDocumento, resumenDocumentosInforme,
  etiquetaInformeDocumento, type RequisitoInforme,
} from "@/lib/contratistas/resumen-informe";
import { agruparDocumentosRevision } from "@/lib/contratistas/organizacion-revision";

const revisor = { revisadoAt: new Date("2026-11-05T12:00:00Z"), revisadoPorId: "mandante-1" };
const doc = (extra: Partial<RequisitoInforme> = {}): RequisitoInforme => ({
  nombre: "IRL", categoria: "trabajador", recursoId: "persona1",
  obligatorio: true, estado: "pendiente",
  archivoNombre: null, archivoOriginal: null, fechaEmision: null,
  fechaVencimiento: null, vigenciaMeses: null, observacionRevision: null, ...extra,
});

describe("Acreditación contratistas · estado documental", () => {
  it("distingue cargados, aprobados, por validar, sin subir y observados", () => {
    const docs = [
      doc({ nombre: "IRL", archivoNombre: "irl.pdf", estado: "aprobado", ...revisor }),
      doc({ nombre: "Contrato", archivoNombre: "c.pdf", estado: "en_revision" }),
      doc({ nombre: "MIPER" }),
      doc({ nombre: "EPP", archivoNombre: "e.pdf", estado: "observado", observacionRevision: "Falta firma" }),
      doc({ nombre: "Otro", estado: "aprobado", obligatorio: false }), // inconsistencia: no archivo
    ];
    expect(resumenDocumentosInforme(docs)).toMatchObject({
      total: 5, cargados: 3, aprobados: 1, porValidar: 1,
      observados: 1, sinArchivo: 2, obligatorios: 4, obligatoriosAprobados: 1,
    });
    expect(etiquetaInformeDocumento(docs[2])).toBe("Sin cargar");
  });
  it("solo declara conforme al aprobar todos los requisitos obligatorios", () => {
    expect(estadoAcreditacionDocumental([doc({ nombre: "a", estado: "aprobado", archivoNombre: "a.pdf", ...revisor })])).toBe("Conforme documentalmente");
    expect(estadoAcreditacionDocumental([doc({ nombre: "a", estado: "en_revision", archivoNombre: "a.pdf" })])).toBe("Pendiente de validación");
    expect(estadoAcreditacionDocumental([doc({ nombre: "a" })])).toBe("Documentación incompleta");
    expect(estadoAcreditacionDocumental([doc({ nombre: "a", estado: "rechazado", archivoNombre: "a.pdf" })])).toBe("Con observaciones");
    expect(estadoAcreditacionDocumental([doc({ nombre: "opcional", obligatorio: false, archivoNombre: "x.pdf", estado: "aprobado" })])).toBe("Documentación incompleta");
  });
  it("considera documentos corporativos obligatorios al acreditar al trabajador", () => {
    const trabajador = doc({ estado: "aprobado", archivoNombre: "irl.pdf", ...revisor });
    const empresa = doc({ categoria: "empresa", recursoId: null, nombre: "Reglamento", estado: "pendiente" });
    expect(estadoAcreditacionDocumental([empresa, trabajador])).toBe("Documentación incompleta");
    expect(estadoAcreditacionDocumental([trabajador])).toBe("Conforme documentalmente");
  });
  it("una aprobación sin evidencia de revisor no suma ni da conformidad", () => {
    const legado = doc({ estado: "aprobado", archivoNombre: "legado.pdf" });
    expect(resumenDocumentosInforme([legado])).toMatchObject({ aprobados: 0, porValidar: 1, obligatoriosAprobados: 0 });
    expect(estadoInformeDocumento(legado)).toBe("en_revision");
    expect(estadoAcreditacionDocumental([legado])).toBe("Pendiente de validación");
  });
  it("permite distinguir cargado pendiente de validación de un archivo no presentado", () => {
    expect(estadoInformeDocumento(doc({ archivoNombre: "a.pdf", estado: "pendiente" }))).toBe("en_revision");
    expect(etiquetaInformeDocumento(doc({ archivoNombre: "a.pdf", estado: "pendiente" }))).toBe("Por validar");
  });
});

describe("Documentos corporativos repetidos", () => {
  it("agrupa por nombre normalizado sin perder originales ni su estado individual", () => {
    const requisitos = [
      { id: "1", nombre: "e-RUT / identificación tributaria de la empresa", estado: "aprobado" },
      { id: "2", nombre: "E RUT identificación tributaria de la empresa", estado: "en_revision" },
      { id: "3", nombre: "Reglamento", estado: "pendiente" },
    ];
    const grupos = agruparDocumentosRevision(requisitos);
    expect(grupos.map((g) => g.length)).toEqual([2, 1]);
    expect(grupos[0].map((d) => d.id)).toEqual(["1", "2"]);
  });
});
