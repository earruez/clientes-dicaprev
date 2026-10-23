import { describe, expect, it } from "vitest";
import type { Hallazgo } from "@/app/dicaprev/cumplimiento/types";
import {
  rangoInformeHallazgos, fechaChile, filtrarHallazgosInforme,
  agruparHallazgosPorEstado, estaVencidoInforme,
} from "@/lib/hallazgos/informe-periodico";
import { construirInformeHallazgosPdf } from "@/lib/hallazgos/generar-informe-hallazgos-pdf";

const base: Omit<Hallazgo, "estado"> = {
  id: "h-00000001", tipo: "condicion_insegura", descripcion: "Zona de acopio de cilindros obstruida",
  centroId: "c-1", centroNombre: "Casa Matriz / Bodega J5", responsableNombre: "Responsable de faena",
  creadoPor: "Usuario NextPrev", prioridad: "alta", fechaCompromiso: "2026-10-22",
  fechaCreacion: "2026-10-23T15:00:00.000Z", historial: [], evidenciaIds: [],
};
const fila = (estado: Hallazgo["estado"], idx: number): Hallazgo => ({
  ...base, id: "hallazgo-" + idx, estado,
  descripcion: base.descripcion + " (" + idx + ")",
});

describe("Informes NextPrev de hallazgos", () => {
  it("obtiene rangos diario, semanal de lunes a domingo y mensual", () => {
    expect(rangoInformeHallazgos("diario", "2026-10-23")).toMatchObject({
      desde: "2026-10-23", hasta: "2026-10-23",
    });
    expect(rangoInformeHallazgos("semanal", "2026-10-23")).toMatchObject({
      desde: "2026-10-19", hasta: "2026-10-25",
    });
    expect(rangoInformeHallazgos("mensual", "2026-10-23")).toMatchObject({
      desde: "2026-10-01", hasta: "2026-10-31",
    });
  });

  it("filtra por fecha del hallazgo en Chile, no por fecha de compromiso", () => {
    const h1 = fila("abierto", 1);
    const h2 = { ...fila("cerrado", 2), fechaCreacion: "2026-10-22T01:40:00Z" };
    expect(fechaChile(h2.fechaCreacion)).toBe("2026-10-21");
    expect(filtrarHallazgosInforme([h1, h2], "diario", "2026-10-23")).toHaveLength(1);
    expect(filtrarHallazgosInforme([h1, h2], "semanal", "2026-10-23")).toHaveLength(2);
  });

  it("separa las cinco categorías reales y marca vencidos sin cambiar el estado", () => {
    const rows = ["abierto", "en_seguimiento", "en_proceso", "resuelto", "cerrado"].map(
      (key, idx) => fila(key as Hallazgo["estado"], idx),
    );
    const grupos = agruparHallazgosPorEstado(rows);
    expect(grupos).toHaveLength(5);
    expect(grupos.map((g) => g.hallazgos.length)).toEqual([1, 1, 1, 1, 1]);
    expect(estaVencidoInforme(rows[0], "2026-10-23")).toBe(true);
    expect(estaVencidoInforme(rows[4], "2026-10-23")).toBe(false);
  });

  it("pagina sin recortar una descripción excesivamente larga", () => {
    const item = { ...fila("abierto", 123), descripcion: ("Descripción de riesgo y acción correctiva extensa con detalles técnicos. ").repeat(260) };
    const doc = construirInformeHallazgosPdf({
      empresaNombre: "Empresa de pruebas", tipo: "seleccion",
      referencia: "2026-10-23", hallazgos: [item],
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1_000);
  });

  it("incluye ambos logos sin desbordar el encabezado en informes multipágina", () => {
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFUlEQVR4nGNkiNrynwEJMDGgAcICAIX8AhXDjxzgAAAAAElFTkSuQmCC";
    const items = Array.from({ length: 35 }, (_, i) => fila("abierto", i));
    const basePdf = construirInformeHallazgosPdf({ empresaNombre: "Empresa demo", tipo: "seleccion", referencia: "2026-10-23", hallazgos: items });
    const conLogos = construirInformeHallazgosPdf({ empresaNombre: "Empresa demo", tipo: "seleccion", referencia: "2026-10-23", hallazgos: items, nextprevLogoDataUrl: png, empresaLogoDataUrl: png });
    expect(conLogos.getNumberOfPages()).toBeGreaterThan(1);
    expect(conLogos.getNumberOfPages()).toBe(basePdf.getNumberOfPages());
    expect(conLogos.output("arraybuffer").byteLength).toBeGreaterThan(basePdf.output("arraybuffer").byteLength);
  });

  it("genera un PDF vectorial paginado y compacto con múltiples estados", () => {
    const rows: Hallazgo[] = Array.from({ length: 80 }, (_, i) =>
      fila((["abierto", "en_proceso", "resuelto", "cerrado"] as const)[i % 4], i),
    );
    const pdf = construirInformeHallazgosPdf({
      empresaNombre: "Empresa de pruebas", tipo: "semanal",
      referencia: "2026-10-23", hallazgos: rows,
    });
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
    const bytes = pdf.output("arraybuffer");
    expect(bytes.byteLength).toBeLessThan(700_000);
  });
});
