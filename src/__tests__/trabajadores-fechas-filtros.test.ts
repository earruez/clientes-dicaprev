import { describe, expect, it } from "vitest";
import { applyFilters, formatDate, formatMonthYear, type Worker } from "@/components/trabajadores-v2/types";

const worker: Worker = {
  id: "worker-1",
  nombre: "Persona",
  apellido: "Prueba",
  rut: "11.111.111-1",
  cargo: "Instalador",
  area: "Logística",
  centroTrabajo: "Casa Matriz / Bodega J4 y J5",
  email: "",
  telefono: "",
  estado: "Activo",
  fechaIngreso: "2002-09-01",
  fechaNacimiento: "1980-01-04",
  tipoContrato: "Indefinido",
  documentosPendientes: 3,
  capacitacionesPendientes: 0,
};

describe("fechas y filtros del listado de trabajadores", () => {
  it("no resta un día a las fechas guardadas sin hora", () => {
    expect(formatDate("1980-01-04")).toBe("04-01-1980");
    expect(formatDate("2002-09-01")).toBe("01-09-2002");
  });

  it("no cambia el día de fechas serializadas en UTC", () => {
    expect(formatDate("1980-01-04T00:00:00.000Z")).toBe("04-01-1980");
    expect(formatDate("2002-09-01T00:00:00.000Z")).toBe("01-09-2002");
    expect(formatMonthYear("2002-09-01")).toContain("2002");
  });

  it("filtra por centros y áreas persistidos en la empresa", () => {
    const filters = {
      search: "",
      area: "Logística",
      estado: "",
      tipoContrato: "",
      centroTrabajo: "Casa Matriz / Bodega J4 y J5",
      soloDs44: false,
      conPendientes: false,
    };
    expect(applyFilters([worker], filters)).toHaveLength(1);
    expect(applyFilters([worker], { ...filters, centroTrabajo: "Otro centro" })).toHaveLength(0);
  });

  it("considera pendientes de la evaluación documental en el filtro", () => {
    expect(applyFilters([worker], {
      search: "", area: "", estado: "", tipoContrato: "", centroTrabajo: "",
      soloDs44: false, conPendientes: true,
    })).toHaveLength(1);
  });
});
