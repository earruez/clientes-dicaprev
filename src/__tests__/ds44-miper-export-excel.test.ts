import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { construirIdentificacionPeligros, generarExcelMiperIsp } from "@/lib/ds44/miper-export-excel";

describe("exportacion excel MIPER ISP", () => {
  it("genera las cinco hojas esperadas", () => {
    const archivo = generarExcelMiperIsp({
      miper: {
        codigo: "MIPER-001",
        version: 3,
        nombre: "Matriz demo",
        procesoNombre: "Operacion mina",
        procesoTipo: "operacional",
        procesoResponsable: "Jefatura operativa",
        responsableElaboracion: "Ana Perez",
      },
      tareas: [
        {
          id: "t-1",
          cargoNombre: "Operador",
          nombre: "Traslado interno",
          esRutinaria: true,
          lugarEspecifico: "Patio A",
          personasExpuestasTotal: 3,
          distribucionSexogenerica: { hombre: 2, mujer: 1 },
          observaciones: "Ruta principal",
          origen: "manual",
        },
      ],
      items: [
        {
          id: "i-1",
          tareaId: "t-1",
          actividad: "Traslado interno",
          centroTrabajoNombre: "Centro Norte",
          areaNombre: "Operaciones",
          cargoNombre: "Operador",
          peligro: "Riesgo de atropello",
          riesgo: "Atropello",
          consecuencia: "Lesion grave",
          categoriaRiesgo: "seguridad",
          codigoIsp: "I1",
          metodologiaEvaluacion: "legacy_5x5",
          probabilidad: 2,
          severidad: 2,
          nivelRiesgo: 4,
          clasificacionRiesgo: "moderado",
          magnitudExposicion: null,
          nivelRiesgoEspecifico: null,
          protocoloAplicable: null,
          estadoEvaluacionEspecifica: null,
          observacionTecnica: null,
          responsableNombre: "Juan Soto",
          observaciones: null,
          motivoSugerencia: "Mapeo por exposicion",
          peligroGente: "Conductor fatigado",
          peligroEquipos: "Camioneta en maniobra",
          peligroMateriales: null,
          peligroAmbiente: null,
          peligroDescripcion: "Cruce sin demarcacion",
          controles: [
            {
              tipoControl: "administrativo",
              descripcion: "Control de velocidad",
              responsableNombre: "Juan Soto",
              fechaCompromiso: "2026-07-20T00:00:00.000Z",
              estado: "pendiente",
            },
          ],
        },
      ],
    });

    const workbook = XLSX.read(archivo.base64, { type: "base64" });
    expect(workbook.SheetNames).toEqual(["MIPER", "LEVANTAMIENTO", "CONTROLES", "CATALOGO ISP", "TRAZABILIDAD"]);
  });

  it("sanitiza formulas y agrega nota legacy_5x5 en trazabilidad", () => {
    const archivo = generarExcelMiperIsp({
      miper: {
        codigo: "MIPER-002",
        version: 1,
        nombre: "Matriz demo 2",
        procesoNombre: null,
        procesoTipo: null,
        procesoResponsable: null,
        responsableElaboracion: null,
      },
      tareas: [],
      items: [
        {
          id: "i-2",
          tareaId: null,
          actividad: "Actividad",
          centroTrabajoNombre: null,
          areaNombre: null,
          cargoNombre: null,
          peligro: "=HYPERLINK(\"http://x\")",
          riesgo: "+SUM(A1:A2)",
          consecuencia: "Normal",
          categoriaRiesgo: "seguridad",
          codigoIsp: "A1",
          metodologiaEvaluacion: "legacy_5x5",
          probabilidad: 1,
          severidad: 1,
          nivelRiesgo: 1,
          clasificacionRiesgo: "tolerable",
          magnitudExposicion: null,
          nivelRiesgoEspecifico: null,
          protocoloAplicable: null,
          estadoEvaluacionEspecifica: null,
          observacionTecnica: null,
          responsableNombre: null,
          observaciones: null,
          motivoSugerencia: "manual",
          peligroGente: null,
          peligroEquipos: null,
          peligroMateriales: null,
          peligroAmbiente: null,
          peligroDescripcion: null,
          controles: [],
        },
      ],
    });

    const workbook = XLSX.read(archivo.base64, { type: "base64" });
    const miperRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.MIPER, { defval: "" });
    const trazabilidadRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.TRAZABILIDAD, { defval: "" });

    expect(String(miperRows[0]["Identificacion de peligros/factores de riesgo"])).toMatch(/^'/);
    expect(String(miperRows[0]["Riesgo"])).toMatch(/^'/);
    expect(String(trazabilidadRows[0]["Nota legado"])).toContain("no reinterpretar");
  });

  it("construye identificacion GEMA consolidada", () => {
    const texto = construirIdentificacionPeligros({
      peligro: "Fallback",
      peligroGente: "Fatiga",
      peligroEquipos: "Montacargas",
      peligroMateriales: null,
      peligroAmbiente: "Piso humedo",
      peligroDescripcion: "Cruce de peatones",
    });

    expect(texto).toContain("Gente: Fatiga");
    expect(texto).toContain("Equipos: Montacargas");
    expect(texto).toContain("Ambiente: Piso humedo");
    expect(texto).toContain("Detalle: Cruce de peatones");
  });
});
