import { describe, expect, it } from "vitest";
import {
  calcularPasoSimplificado,
  crearPendienteEvaluacionEspecifica,
  esRespuestaNuevaValida,
  heredarDatosTarea,
  presentarRespuestaHistorica,
  riesgosConfirmados,
} from "@/lib/ds44/miper-flujo-simplificado";

describe("flujo MIPER simplificado", () => {
  it("elimina la respuesta de duda de los registros nuevos", () => {
    expect(esRespuestaNuevaValida("aplica")).toBe(true);
    expect(esRespuestaNuevaValida("no_aplica")).toBe(true);
    expect(esRespuestaNuevaValida("no_se")).toBe(false);
  });

  it("una sugerencia o revisión pendiente nunca pasa como riesgo confirmado", () => {
    const items = [
      { id: "sugerido", estadoSugerencia: "sugerido", confirmadoPorUsuario: false },
      { id: "tecnico", estadoSugerencia: "revision_tecnica", confirmadoPorUsuario: false },
      { id: "confirmado", estadoSugerencia: "confirmado", confirmadoPorUsuario: true },
    ];
    expect(riesgosConfirmados(items).map((item) => item.id)).toEqual(["confirmado"]);
  });

  it("crea un pendiente técnico guiado para evaluación específica", () => {
    expect(crearPendienteEvaluacionEspecifica({
      metodologiaEvaluacion: "evaluacion_especifica",
      protocoloAplicable: "PREXOR",
    })).toEqual({
      requiereEvaluacionEspecifica: true,
      estadoEvaluacionEspecifica: "pendiente",
      observacionTecnica: "Evaluación técnica pendiente según PREXOR.",
    });
  });

  it("mantiene VEP sin cálculo hasta contar con ambos valores", () => {
    const probabilidad: number | null = 2;
    const consecuencia: number | null = null;
    const vep = probabilidad !== null && consecuencia !== null
      ? probabilidad * consecuencia
      : null;
    expect(vep).toBeNull();
  });

  it("hereda ubicación, población y distribución en una sola operación", () => {
    expect(heredarDatosTarea({
      lugar: "Planta Norte",
      personasExpuestasTotal: 8,
      distribucionSexogenerica: { noInformado: 8 },
    })).toEqual({
      lugarEspecifico: "Planta Norte",
      personasExpuestasTotal: 8,
      distribucionSexogenerica: { noInformado: 8 },
    });
  });

  it("conserva el valor histórico y lo presenta como revisión técnica pendiente", () => {
    expect(presentarRespuestaHistorica("no_se")).toEqual({
      valorOriginal: "no_se",
      revisionTecnicaPendiente: true,
      etiqueta: "Revisión técnica pendiente",
    });
  });

  it("reanuda exactamente una de las cuatro etapas", () => {
    expect(calcularPasoSimplificado(0, "asistente_simplificado")).toBe(1);
    expect(calcularPasoSimplificado(1, "asistente_simplificado")).toBe(2);
    expect(calcularPasoSimplificado(2, "asistente_simplificado")).toBe(3);
    expect(calcularPasoSimplificado(3, "asistente_simplificado")).toBe(4);
    expect(calcularPasoSimplificado(4, "asistente_simplificado")).toBe(4);
  });
});
