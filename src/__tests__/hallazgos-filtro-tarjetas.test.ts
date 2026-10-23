import { describe, expect, it } from "vitest";
import type { EstadoHallazgo } from "@/app/dicaprev/cumplimiento/types";
import { coincideTarjetaHallazgo, coincideFiltroEstadoHallazgo } from "@/lib/hallazgos/filtro-tarjetas";

describe("Tarjetas de estado - Hallazgos DS44", () => {
  const estados: EstadoHallazgo[] = ["abierto", "abierto", "en_proceso", "en_seguimiento", "resuelto", "cerrado"];
  it("vista principal excluye cerrados sin eliminarlos", () => {
    expect(estados.filter((x) => coincideFiltroEstadoHallazgo(x, "activos"))).toEqual(
      ["abierto", "abierto", "en_proceso", "en_seguimiento", "resuelto"]
    );
    expect(estados.filter((x) => coincideFiltroEstadoHallazgo(x, "todos"))).toHaveLength(6);
  });
  it("tarjeta Cerrados accede al histórico sin depender de la vista por defecto", () => {
    const cerrados = estados.filter((estado) =>
      coincideFiltroEstadoHallazgo(estado, "todos") && coincideTarjetaHallazgo(estado, "cerrado")
    );
    expect(cerrados).toEqual(["cerrado"]);
  });
  it("la tarjeta Abiertos muestra solamente abiertos", () => {
    expect(estados.filter((x) => coincideTarjetaHallazgo(x, "abierto"))).toHaveLength(2);
  });
  it("En proceso incluye seguimiento y proceso, igual que el KPI", () => {
    expect(estados.filter((x) => coincideTarjetaHallazgo(x, "en_proceso"))).toEqual(["en_proceso", "en_seguimiento"]);
  });
  it("Resueltos y Cerrados se filtran por separado", () => {
    expect(estados.filter((x) => coincideTarjetaHallazgo(x, "resuelto"))).toEqual(["resuelto"]);
    expect(estados.filter((x) => coincideTarjetaHallazgo(x, "cerrado"))).toEqual(["cerrado"]);
  });
  it("Mostrar todos deja ver todos los estados", () => {
    expect(estados.filter((x) => coincideTarjetaHallazgo(x, "todos"))).toHaveLength(estados.length);
  });
});