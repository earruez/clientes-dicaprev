import { describe, it, expect } from "vitest";
import {
  calcularTamañoEmpresa,
  clasificarFecha,
  evaluarObligacion,
  evaluarObligaciones,
  calcularResultadoEntidad,
  porcentajeGlobal,
  generarHallazgosDesdeEvaluaciones,
  toEstadoObligacion,
  deriveEstadosObligacion,
  type ObligacionInput,
  type DocumentoEvaluable,
  type EntidadInput,
  type EvaluacionCumplimiento,
} from "@/lib/cumplimiento/cumplimiento-engine";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const HOY = new Date("2026-06-11T12:00:00Z");
const FECHA_FUTURA = "2026-12-31";
const FECHA_PASADA = "2025-01-01";
const FECHA_HOY = "2026-06-11";

const EMPRESA: EntidadInput = { id: "emp-1", tipo: "empresa" };

const OBL_BASE: ObligacionInput = {
  id: "obl-1",
  nombre: "Plan de Prevención de Riesgos",
  tipo: "plan_prevencion",
};

const DOC_VIGENTE: DocumentoEvaluable = {
  id: "doc-1",
  nombre: "Plan de Prevención de Riesgos 2026",
  tipo: "plan_prevencion",
  entidadId: "emp-1",
  entidadTipo: "empresa",
  fechaVencimiento: FECHA_FUTURA,
};

const DOC_VENCIDO: DocumentoEvaluable = {
  id: "doc-2",
  nombre: "Plan de Prevención de Riesgos 2024",
  tipo: "plan_prevencion",
  entidadId: "emp-1",
  entidadTipo: "empresa",
  fechaVencimiento: FECHA_PASADA,
};

// ── calcularTamañoEmpresa ─────────────────────────────────────────────────────

describe("calcularTamañoEmpresa", () => {
  it("clasifica correctamente empresa micro (< 10 trabajadores)", () => {
    expect(calcularTamañoEmpresa(1)).toBe("micro");
    expect(calcularTamañoEmpresa(9)).toBe("micro");
  });

  it("clasifica correctamente empresa pequena (10-49 trabajadores)", () => {
    expect(calcularTamañoEmpresa(10)).toBe("pequena");
    expect(calcularTamañoEmpresa(49)).toBe("pequena");
  });

  it("clasifica correctamente empresa mediana (50-199 trabajadores)", () => {
    expect(calcularTamañoEmpresa(50)).toBe("mediana");
    expect(calcularTamañoEmpresa(199)).toBe("mediana");
  });

  it("clasifica correctamente empresa grande (>= 200 trabajadores)", () => {
    expect(calcularTamañoEmpresa(200)).toBe("grande");
    expect(calcularTamañoEmpresa(1000)).toBe("grande");
  });
});

// ── clasificarFecha ───────────────────────────────────────────────────────────

describe("clasificarFecha", () => {
  it("retorna cumplido cuando no hay fecha de vencimiento", () => {
    expect(clasificarFecha(undefined, HOY)).toBe("cumplido");
  });

  it("retorna cumplido para fecha futura", () => {
    expect(clasificarFecha(FECHA_FUTURA, HOY)).toBe("cumplido");
  });

  it("retorna cumplido para fecha igual a hoy", () => {
    expect(clasificarFecha(FECHA_HOY, HOY)).toBe("cumplido");
  });

  it("retorna vencido para fecha pasada", () => {
    expect(clasificarFecha(FECHA_PASADA, HOY)).toBe("vencido");
  });
});

// ── evaluarObligacion ─────────────────────────────────────────────────────────

describe("evaluarObligacion", () => {
  it("retorna pendiente cuando no hay documentos", () => {
    const resultado = evaluarObligacion(OBL_BASE, [], EMPRESA, HOY);
    expect(resultado.estado).toBe("pendiente");
    expect(resultado.fuenteTipo).toBe("manual");
    expect(resultado.fuenteId).toBeUndefined();
  });

  it("retorna cumplido cuando hay documento vigente", () => {
    const resultado = evaluarObligacion(OBL_BASE, [DOC_VIGENTE], EMPRESA, HOY);
    expect(resultado.estado).toBe("cumplido");
    expect(resultado.fuenteId).toBe("doc-1");
    expect(resultado.fuenteTipo).toBe("documento");
  });

  it("retorna vencido cuando todos los documentos están vencidos", () => {
    const resultado = evaluarObligacion(OBL_BASE, [DOC_VENCIDO], EMPRESA, HOY);
    expect(resultado.estado).toBe("vencido");
    expect(resultado.fuenteId).toBe("doc-2");
  });

  it("prefiere el documento vigente sobre el vencido", () => {
    const resultado = evaluarObligacion(
      OBL_BASE,
      [DOC_VENCIDO, DOC_VIGENTE],
      EMPRESA,
      HOY
    );
    expect(resultado.estado).toBe("cumplido");
    expect(resultado.fuenteId).toBe("doc-1");
  });

  it("prioriza el vínculo explícito por obligacionId", () => {
    const docVinculado: DocumentoEvaluable = {
      id: "doc-vinculado",
      nombre: "Documento vinculado directamente",
      entidadId: "emp-1",
      entidadTipo: "empresa",
      obligacionId: "obl-1",
      fechaVencimiento: FECHA_FUTURA,
    };
    // Hay otro doc que coincide por tipo pero el vinculado debe ganar
    const resultado = evaluarObligacion(
      OBL_BASE,
      [DOC_VIGENTE, docVinculado],
      EMPRESA,
      HOY
    );
    expect(resultado.fuenteId).toBe("doc-vinculado");
  });

  it("marca como vencido si la obligacion global está vencida aunque el documento este vigente", () => {
    const oblVencida: ObligacionInput = {
      ...OBL_BASE,
      vencimiento: FECHA_PASADA,
    };
    const resultado = evaluarObligacion(oblVencida, [DOC_VIGENTE], EMPRESA, HOY);
    expect(resultado.estado).toBe("vencido");
  });

  it("ignora documentos de otra entidad", () => {
    const docOtraEntidad: DocumentoEvaluable = {
      ...DOC_VIGENTE,
      entidadId: "emp-otro",
    };
    const resultado = evaluarObligacion(
      OBL_BASE,
      [docOtraEntidad],
      EMPRESA,
      HOY
    );
    expect(resultado.estado).toBe("pendiente");
  });
});

// ── evaluarObligaciones (filtro por tamanio y umbral) ─────────────────────────

describe("evaluarObligaciones - filtros", () => {
  const oblSoloGrandes: ObligacionInput = {
    id: "obl-comite",
    nombre: "Comite Paritario",
    tamañosAplica: ["grande", "mediana"],
  };

  it("incluye obligacion cuando el tamanio de empresa coincide", () => {
    const resultados = evaluarObligaciones(
      [oblSoloGrandes],
      [],
      [EMPRESA],
      HOY,
      "grande"
    );
    expect(resultados).toHaveLength(1);
  });

  it("excluye obligacion cuando el tamanio de empresa no coincide", () => {
    const resultados = evaluarObligaciones(
      [oblSoloGrandes],
      [],
      [EMPRESA],
      HOY,
      "micro"
    );
    expect(resultados).toHaveLength(0);
  });

  it("incluye obligacion sin tamañosAplica para cualquier tamanio", () => {
    const resultados = evaluarObligaciones(
      [OBL_BASE],
      [],
      [EMPRESA],
      HOY,
      "micro"
    );
    expect(resultados).toHaveLength(1);
  });

  it("filtra por umbral numerico aplicaDesdeTrabajadores", () => {
    const oblDesde50: ObligacionInput = {
      id: "obl-50",
      nombre: "Obligacion desde 50 trabajadores",
      aplicaDesdeTrabajadores: 50,
    };
    const conMenos = evaluarObligaciones(
      [oblDesde50],
      [],
      [EMPRESA],
      HOY,
      undefined,
      30
    );
    const conMas = evaluarObligaciones(
      [oblDesde50],
      [],
      [EMPRESA],
      HOY,
      undefined,
      75
    );
    expect(conMenos).toHaveLength(0);
    expect(conMas).toHaveLength(1);
  });
});

// ── calcularResultadoEntidad ──────────────────────────────────────────────────

describe("calcularResultadoEntidad", () => {
  it("calcula 0% de cumplimiento cuando no hay evaluaciones", () => {
    const resultado = calcularResultadoEntidad(EMPRESA, []);
    expect(resultado.porcentajeCumplimiento).toBe(0);
    expect(resultado.totalObligaciones).toBe(0);
  });

  it("calcula 100% cuando todas las evaluaciones son cumplidas", () => {
    const evals: EvaluacionCumplimiento[] = [
      {
        obligacionId: "obl-1",
        obligacionNombre: "A",
        entidadId: "emp-1",
        entidadTipo: "empresa",
        estado: "cumplido",
        fuenteTipo: "documento",
        evaluadoEl: HOY.toISOString(),
      },
      {
        obligacionId: "obl-2",
        obligacionNombre: "B",
        entidadId: "emp-1",
        entidadTipo: "empresa",
        estado: "cumplido",
        fuenteTipo: "documento",
        evaluadoEl: HOY.toISOString(),
      },
    ];
    const resultado = calcularResultadoEntidad(EMPRESA, evals);
    expect(resultado.porcentajeCumplimiento).toBe(100);
    expect(resultado.cumplidas).toBe(2);
    expect(resultado.vencidas).toBe(0);
    expect(resultado.pendientes).toBe(0);
  });

  it("calcula 50% cuando la mitad esta cumplida", () => {
    const evals: EvaluacionCumplimiento[] = [
      {
        obligacionId: "obl-1",
        obligacionNombre: "A",
        entidadId: "emp-1",
        entidadTipo: "empresa",
        estado: "cumplido",
        fuenteTipo: "documento",
        evaluadoEl: HOY.toISOString(),
      },
      {
        obligacionId: "obl-2",
        obligacionNombre: "B",
        entidadId: "emp-1",
        entidadTipo: "empresa",
        estado: "pendiente",
        fuenteTipo: "manual",
        evaluadoEl: HOY.toISOString(),
      },
    ];
    const resultado = calcularResultadoEntidad(EMPRESA, evals);
    expect(resultado.porcentajeCumplimiento).toBe(50);
    expect(resultado.cumplidas).toBe(1);
    expect(resultado.pendientes).toBe(1);
  });

  it("no incluye evaluaciones de otra entidad", () => {
    const evOtraEntidad: EvaluacionCumplimiento = {
      obligacionId: "obl-3",
      obligacionNombre: "C",
      entidadId: "emp-otro",
      entidadTipo: "empresa",
      estado: "cumplido",
      fuenteTipo: "documento",
      evaluadoEl: HOY.toISOString(),
    };
    const resultado = calcularResultadoEntidad(EMPRESA, [evOtraEntidad]);
    expect(resultado.totalObligaciones).toBe(0);
    expect(resultado.porcentajeCumplimiento).toBe(0);
  });
});

// ── porcentajeGlobal ─────────────────────────────────────────────────────────

describe("porcentajeGlobal", () => {
  it("retorna 0 para array vacio", () => {
    expect(porcentajeGlobal([])).toBe(0);
  });

  it("calcula correctamente con todas cumplidas", () => {
    const evals: EvaluacionCumplimiento[] = Array.from({ length: 4 }, (_, i) => ({
      obligacionId: `obl-${i}`,
      obligacionNombre: `Obligacion ${i}`,
      entidadId: "emp-1",
      entidadTipo: "empresa" as const,
      estado: "cumplido" as const,
      fuenteTipo: "documento" as const,
      evaluadoEl: HOY.toISOString(),
    }));
    expect(porcentajeGlobal(evals)).toBe(100);
  });

  it("calcula correctamente con mezcla de estados", () => {
    const evals: EvaluacionCumplimiento[] = [
      {
        obligacionId: "o1",
        obligacionNombre: "A",
        entidadId: "e1",
        entidadTipo: "empresa",
        estado: "cumplido",
        fuenteTipo: "documento",
        evaluadoEl: HOY.toISOString(),
      },
      {
        obligacionId: "o2",
        obligacionNombre: "B",
        entidadId: "e1",
        entidadTipo: "empresa",
        estado: "vencido",
        fuenteTipo: "documento",
        evaluadoEl: HOY.toISOString(),
      },
      {
        obligacionId: "o3",
        obligacionNombre: "C",
        entidadId: "e1",
        entidadTipo: "empresa",
        estado: "pendiente",
        fuenteTipo: "manual",
        evaluadoEl: HOY.toISOString(),
      },
      {
        obligacionId: "o4",
        obligacionNombre: "D",
        entidadId: "e1",
        entidadTipo: "empresa",
        estado: "pendiente",
        fuenteTipo: "manual",
        evaluadoEl: HOY.toISOString(),
      },
    ];
    expect(porcentajeGlobal(evals)).toBe(25); // 1 de 4
  });
});

// ── generarHallazgosDesdeEvaluaciones ─────────────────────────────────────────

describe("generarHallazgosDesdeEvaluaciones", () => {
  it("no genera hallazgos cuando todo está cumplido", () => {
    const evals: EvaluacionCumplimiento[] = [
      {
        obligacionId: "obl-1",
        obligacionNombre: "A",
        entidadId: "emp-1",
        entidadTipo: "empresa",
        estado: "cumplido",
        fuenteTipo: "documento",
        evaluadoEl: HOY.toISOString(),
      },
    ];
    const hallazgos = generarHallazgosDesdeEvaluaciones(evals);
    expect(hallazgos).toHaveLength(0);
  });

  it("genera hallazgo tipo faltante con prioridad media para estado pendiente", () => {
    const evals: EvaluacionCumplimiento[] = [
      {
        obligacionId: "obl-1",
        obligacionNombre: "Plan de Emergencia",
        entidadId: "emp-1",
        entidadTipo: "empresa",
        estado: "pendiente",
        fuenteTipo: "manual",
        evaluadoEl: HOY.toISOString(),
      },
    ];
    const hallazgos = generarHallazgosDesdeEvaluaciones(evals);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].tipo).toBe("faltante");
    expect(hallazgos[0].prioridad).toBe("media");
    expect(hallazgos[0].id).toBe("auto-obl-1-emp-1");
    expect(hallazgos[0].titulo).toContain("Sin evidencia documental");
  });

  it("genera hallazgo tipo vencido con prioridad alta para estado vencido", () => {
    const evals: EvaluacionCumplimiento[] = [
      {
        obligacionId: "obl-2",
        obligacionNombre: "Certificado ACHS",
        entidadId: "emp-1",
        entidadTipo: "empresa",
        estado: "vencido",
        fuenteTipo: "documento",
        fuenteId: "doc-99",
        evaluadoEl: HOY.toISOString(),
      },
    ];
    const hallazgos = generarHallazgosDesdeEvaluaciones(evals);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].tipo).toBe("vencido");
    expect(hallazgos[0].prioridad).toBe("alta");
    expect(hallazgos[0].titulo).toContain("Documento vencido");
    expect(hallazgos[0].descripcion).toContain("doc-99");
  });

  it("los hallazgos vencidos tienen prioridad mayor que los faltantes", () => {
    const evals: EvaluacionCumplimiento[] = [
      {
        obligacionId: "obl-a",
        obligacionNombre: "A",
        entidadId: "emp-1",
        entidadTipo: "empresa",
        estado: "pendiente",
        fuenteTipo: "manual",
        evaluadoEl: HOY.toISOString(),
      },
      {
        obligacionId: "obl-b",
        obligacionNombre: "B",
        entidadId: "emp-1",
        entidadTipo: "empresa",
        estado: "vencido",
        fuenteTipo: "documento",
        evaluadoEl: HOY.toISOString(),
      },
    ];
    const hallazgos = generarHallazgosDesdeEvaluaciones(evals);
    const vencido = hallazgos.find((h) => h.tipo === "vencido");
    const faltante = hallazgos.find((h) => h.tipo === "faltante");
    expect(vencido?.prioridad).toBe("alta");
    expect(faltante?.prioridad).toBe("media");
  });
});

// ── toEstadoObligacion ────────────────────────────────────────────────────────

describe("toEstadoObligacion", () => {
  it("mapea cumplido -> cumplida", () => {
    expect(toEstadoObligacion("cumplido")).toBe("cumplida");
  });

  it("mapea vencido -> con_brechas", () => {
    expect(toEstadoObligacion("vencido")).toBe("con_brechas");
  });

  it("mapea pendiente -> no_cumplida", () => {
    expect(toEstadoObligacion("pendiente")).toBe("no_cumplida");
  });
});

// ── deriveEstadosObligacion ───────────────────────────────────────────────────

describe("deriveEstadosObligacion", () => {
  it("retorna cumplimientoGlobal 0 cuando no hay evaluaciones", () => {
    const { cumplimientoGlobal, estadosPorCentro } = deriveEstadosObligacion(
      "obl-inexistente",
      []
    );
    expect(cumplimientoGlobal).toBe(0);
    expect(Object.keys(estadosPorCentro)).toHaveLength(0);
  });

  it("calcula cumplimientoGlobal correcto con multiples entidades", () => {
    const evals: EvaluacionCumplimiento[] = [
      {
        obligacionId: "obl-1",
        obligacionNombre: "A",
        entidadId: "centro-1",
        entidadTipo: "centro",
        estado: "cumplido",
        fuenteTipo: "documento",
        evaluadoEl: HOY.toISOString(),
      },
      {
        obligacionId: "obl-1",
        obligacionNombre: "A",
        entidadId: "centro-2",
        entidadTipo: "centro",
        estado: "pendiente",
        fuenteTipo: "manual",
        evaluadoEl: HOY.toISOString(),
      },
    ];
    const { cumplimientoGlobal, estadosPorCentro } = deriveEstadosObligacion(
      "obl-1",
      evals
    );
    expect(cumplimientoGlobal).toBe(50);
    expect(estadosPorCentro["centro-1"]).toBe("cumplida");
    expect(estadosPorCentro["centro-2"]).toBe("no_cumplida");
  });
});
