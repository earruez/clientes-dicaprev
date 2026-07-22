import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { construirIdentificacionPeligros, generarExcelMiperIsp, generarWorkbookMiperIsp } from "@/lib/ds44/miper-export-excel";

describe("exportacion excel MIPER ISP", () => {
  it("genera documento formal, formulas VEP, estilos y configuracion de impresion", async () => {
    const input: Parameters<typeof generarWorkbookMiperIsp>[0] = {
      miper: {
        codigo: "MIPER-001",
        version: 3,
        nombre: "Matriz demo",
        estado: "borrador",
        versionAnterior: "MIPER-001-V2",
        procesoNombre: "Operacion mina",
        procesoTipo: "operacional",
        procesoResponsable: "Camila Soto",
        responsableElaboracion: "Ana Perez",
        responsableRevision: null,
        responsableAprobacion: null,
        fechaElaboracion: "2026-07-20T00:00:00.000Z",
        fechaRevision: null,
        fechaAprobacion: null,
        fechaProximaRevision: "2027-07-20T00:00:00.000Z",
        fechaDescarga: "2026-07-21T00:00:00.000Z",
        empresaNombre: "Empresa Demo",
        empresaRut: "76.000.000-1",
        empresaDireccion: "Av. Principal 123",
        empresaComuna: "Santiago",
        empresaCorreo: "sst@demo.cl",
        centroNombre: "Centro Norte",
        centroTipo: null,
        centroDireccion: null,
        areaNombre: "Operaciones",
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
          cargoNombre: "Operador",
          peligro: "Riesgo de atropello",
          riesgo: "Atropello",
          consecuencia: "Lesion grave",
          categoriaRiesgo: "seguridad",
          codigoIsp: "I1",
          metodologiaEvaluacion: "vep_isp",
          probabilidad: 2,
          severidad: 2,
          magnitudExposicion: null,
          nivelRiesgoEspecifico: null,
          responsableNombre: "Juan Soto",
          observacionTecnica: "",
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
    };
    const workbook = generarWorkbookMiperIsp(input);

    expect(workbook.SheetNames).toEqual(["MIPER", "LEVANTAMIENTO", "CONTROLES", "CATALOGO ISP", "TRAZABILIDAD"]);

    const miper = workbook.Sheets.MIPER;
    expect(miper.A1?.v).toBe("NEXTPREV");
    expect(miper.D1?.v).toContain("Matriz de");
    expect(miper.A3?.v).toContain("BORRADOR");
    expect(miper.H14?.f).toBe("F14*G14");
    expect(String(miper.I14?.f)).toContain("Moderado");
    expect(miper["!merges"]?.length).toBeGreaterThanOrEqual(20);
    expect(miper["!cols"]?.length).toBe(16);
    expect((miper as { "!pageSetup"?: { orientation?: string } })["!pageSetup"]?.orientation).toBe("landscape");
    expect(miper["!autofilter"]?.ref).toBe("A13:P14");

    const archivo = await generarExcelMiperIsp(input);
    const zip = await JSZip.loadAsync(Buffer.from(archivo.base64, "base64"));
    const styles = await zip.file("xl/styles.xml")!.async("string");
    const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    const workbookXml = await zip.file("xl/workbook.xml")!.async("string");
    expect(styles).toContain("FF0B1F3A");
    const dxfs = styles.match(/<dxf>[\s\S]*?<\/dxf>/g) ?? [];
    expect(dxfs).toHaveLength(5);
    for (const dxf of dxfs.filter((bloque) => bloque.includes("<font>"))) {
      expect(dxf.indexOf("<font>")).toBeLessThan(dxf.indexOf("<fill>"));
    }
    expect(sheet).toContain("conditionalFormatting");
    expect(sheet).toContain("orientation=\"landscape\"");
    expect(sheet).toContain("state=\"frozen\"");
    expect(sheet).not.toContain("ignoredErrors");
    expect(sheet.indexOf("conditionalFormatting")).toBeLessThan(sheet.indexOf("printOptions"));
    expect(workbookXml).toContain("_xlnm.Print_Titles");
  });

  it("deja celdas vacias para categorias no aplicables y mantiene legacy sin reinterpretar", () => {
    const workbook = generarWorkbookMiperIsp({
      miper: {
        codigo: "MIPER-002",
        version: 1,
        nombre: "Matriz demo 2",
        estado: "borrador",
        versionAnterior: null,
        procesoNombre: null,
        procesoTipo: null,
        procesoResponsable: null,
        responsableElaboracion: null,
        responsableRevision: null,
        responsableAprobacion: null,
        fechaElaboracion: null,
        fechaRevision: null,
        fechaAprobacion: null,
        fechaProximaRevision: null,
        fechaDescarga: "2026-07-21T00:00:00.000Z",
        empresaNombre: null,
        empresaRut: null,
        empresaDireccion: null,
        empresaComuna: null,
        empresaCorreo: null,
        centroNombre: null,
        centroTipo: null,
        centroDireccion: null,
        areaNombre: null,
      },
      tareas: [],
      items: [
        {
          id: "i-2",
          tareaId: null,
          actividad: "Actividad legacy",
          cargoNombre: null,
          peligro: "Peligro legado",
          riesgo: "Riesgo legado",
          consecuencia: "Normal",
          categoriaRiesgo: "seguridad",
          codigoIsp: "A1",
          metodologiaEvaluacion: "legacy_5x5",
          probabilidad: 1,
          severidad: 1,
          magnitudExposicion: null,
          nivelRiesgoEspecifico: null,
          responsableNombre: null,
          observacionTecnica: null,
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

    const miper = workbook.Sheets.MIPER;
    expect(miper.F14?.v ?? "").toBe("");
    expect(miper.H14?.v ?? "").toBe("");
    expect(miper.I14?.v ?? "").toBe("");
    expect(miper.P14?.v ?? "").toBe("");

    const trazabilidad = workbook.Sheets.TRAZABILIDAD;
    expect(String(trazabilidad.F3?.v ?? "")).toContain("legacy_5x5");
    expect(trazabilidad.B4?.v).toBe("Pendiente");
    expect(trazabilidad.D4?.v).toBe("Pendiente");
    expect(trazabilidad.F4?.v).toBe("Pendiente");
  });

  it("sanitiza texto para prevenir formulas y limita catalogo a codigos usados", () => {
    const workbook = generarWorkbookMiperIsp({
      miper: {
        codigo: "MIPER-003",
        version: 1,
        nombre: "Matriz demo 3",
        estado: "borrador",
        versionAnterior: null,
        procesoNombre: null,
        procesoTipo: null,
        procesoResponsable: null,
        responsableElaboracion: null,
        responsableRevision: null,
        responsableAprobacion: null,
        fechaElaboracion: null,
        fechaRevision: null,
        fechaAprobacion: null,
        fechaProximaRevision: null,
        fechaDescarga: "2026-07-21T00:00:00.000Z",
        empresaNombre: null,
        empresaRut: null,
        empresaDireccion: null,
        empresaComuna: null,
        empresaCorreo: null,
        centroNombre: null,
        centroTipo: null,
        centroDireccion: null,
        areaNombre: null,
      },
      tareas: [],
      items: [
        {
          id: "i-3",
          tareaId: null,
          actividad: "=HYPERLINK(\"http://x\")",
          cargoNombre: null,
          peligro: "+SUM(A1:A2)",
          riesgo: "@A",
          consecuencia: "Normal",
          categoriaRiesgo: "seguridad",
          codigoIsp: "A1",
          metodologiaEvaluacion: "legacy_5x5",
          probabilidad: 1,
          severidad: 1,
          magnitudExposicion: null,
          nivelRiesgoEspecifico: null,
          responsableNombre: null,
          observacionTecnica: null,
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

    const miper = workbook.Sheets.MIPER;
    expect(String(miper.C14?.v)).toMatch(/^'/);
    expect(String(miper.D14?.v)).toMatch(/^'/);
    expect(String(miper.E14?.v)).toContain("@A");

    const catalogo = workbook.Sheets["CATALOGO ISP"];
    expect(catalogo.A3?.v).toBe("A1");
    expect(catalogo.A4).toBeUndefined();
  });

  it("exporta una evaluación VEP pendiente sin P, C, VEP ni clasificación", () => {
    const base: Parameters<typeof generarWorkbookMiperIsp>[0] = {
      miper: {
        codigo: "MIPER-PEND", version: 1, nombre: "Pendiente", estado: "borrador", versionAnterior: null,
        procesoNombre: "Proceso", procesoTipo: "operacional", procesoResponsable: null,
        responsableElaboracion: null, responsableRevision: null, responsableAprobacion: null,
        fechaElaboracion: null, fechaRevision: null, fechaAprobacion: null, fechaProximaRevision: null,
        fechaDescarga: "2026-07-21T00:00:00.000Z", empresaNombre: "Empresa", empresaRut: "1-9",
        empresaDireccion: null, empresaComuna: null, empresaCorreo: null, centroNombre: null,
        centroTipo: null, centroDireccion: null, areaNombre: null,
      },
      tareas: [],
      items: [{
        id: "pend-1", tareaId: null, actividad: "Tarea", cargoNombre: "Cargo", peligro: "Peligro",
        riesgo: "Riesgo", consecuencia: "Pendiente", categoriaRiesgo: "seguridad", codigoIsp: "A1",
        metodologiaEvaluacion: "vep_isp", probabilidad: null, severidad: null, magnitudExposicion: null,
        nivelRiesgoEspecifico: null, responsableNombre: null, observacionTecnica: null, motivoSugerencia: null,
        peligroGente: null, peligroEquipos: null, peligroMateriales: null, peligroAmbiente: null,
        peligroDescripcion: null, controles: [],
      }],
    };

    const miper = generarWorkbookMiperIsp(base).Sheets.MIPER;
    for (const ref of ["F14", "G14", "H14", "I14"]) expect(miper[ref]?.v ?? "").toBe("");
    expect(miper.H14?.f).toBeUndefined();
    expect(miper.I14?.f).toBeUndefined();
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
