import { describe, expect, it } from "vitest";
import { enlaceWhatsAppContratista, mensajeAccesoContratista } from "@/lib/contratistas/compartir-enlace";
import { validarFechasPortal } from "@/lib/contratistas/validacion-carga";
import { documentoAprobadoConRevision, faltaVerificarVigencia } from "@/lib/contratistas/requisitos";
import { PLANTILLA_ACREDITACION_TRABAJADORES } from "@/lib/contratistas/plantilla-acreditacion-trabajadores";

describe("Contratistas: enlace por WhatsApp", () => {
  it("compone el mensaje con link, obra y vencimiento en horario chileno", () => {
    const mensaje = mensajeAccesoContratista({
      nombreEmpresa: "Climarte", obra: "BCI Vitacura",
      url: "https://app.nextprev.cl/contratistas/portal/abc123",
      vencimiento: "2026-12-31T18:00:00Z",
    });
    expect(mensaje).toContain("Climarte");
    expect(mensaje).toContain("BCI Vitacura");
    expect(mensaje).toContain("31/12/2026");
    expect(mensaje).toContain("abc123");
    expect(enlaceWhatsAppContratista(mensaje, "+56 9 1234 5678")).toContain("phone=56912345678");
    expect(enlaceWhatsAppContratista(mensaje)).toContain("text=");
  });
  it("la pauta establece 12 documentos y las vigencias solicitadas", () => {
    expect(PLANTILLA_ACREDITACION_TRABAJADORES).toHaveLength(12);
    const epp = PLANTILLA_ACREDITACION_TRABAJADORES.find((r) => r.clave === "epp");
    const riohs = PLANTILLA_ACREDITACION_TRABAJADORES.find((r) => r.clave === "reglamento-interno");
    expect(epp?.vigenciaMeses).toBe(24);
    expect(riohs?.vigenciaMeses).toBe(12);
  });
});

describe("Contratistas: vencimientos reales", () => {
  it("exige tipo de contrato, fecha solo en plazo fijo e identidad/exámenes", () => {
    const contrato = { emision: "", vencimiento: "", vigenciaMeses: null, nombreRequisito: "Contrato de trabajo vigente", categoria: "trabajador" };
    expect(validarFechasPortal(contrato)).toContain("modalidad");
    expect(validarFechasPortal({ ...contrato, tipoContrato: "indefinido" })).toBeNull();
    expect(validarFechasPortal({ ...contrato, tipoContrato: "plazo_fijo" })).toContain("vencimiento");
    expect(validarFechasPortal({ ...contrato, tipoContrato: "plazo_fijo", vencimiento: "2027-01-07" })).toBeNull();
    expect(validarFechasPortal({ ...contrato, nombreRequisito: "Copia de cédula de identidad", tipoContrato: "" })).toContain("vencimiento");
    expect(validarFechasPortal({ ...contrato, nombreRequisito: "Examen ocupacional", tipoContrato: "" })).toContain("vencimiento");
  });
  it("no declara aprobado un documento con vigencia desconocida", () => {
    const base = {
      nombre: "Copia de cédula de identidad", categoria: "trabajador",
      archivoNombre: "cedula.pdf", estado: "aprobado",
      revisadoAt: "2026-11-07T02:00:00Z", revisadoPorId: "usuario1", fechaVencimiento: null,
      fechaEmision: null, vigenciaMeses: null,
    };
    expect(faltaVerificarVigencia(base)).toBe(true);
    expect(documentoAprobadoConRevision(base)).toBe(false);
    expect(documentoAprobadoConRevision({ ...base, fechaVencimiento: "2027-01-01T12:00:00Z" })).toBe(true);
  });
});
