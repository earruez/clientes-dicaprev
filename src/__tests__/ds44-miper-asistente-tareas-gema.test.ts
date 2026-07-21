import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePermissionMock = vi.hoisted(() => vi.fn());

const txMock = vi.hoisted(() => ({
  ds44MiperTarea: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
  },
  ds44MiperItem: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
  },
  ds44Miper: {
    update: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  centroTrabajo: { findMany: vi.fn() },
  area: { findMany: vi.fn() },
  cargo: { findMany: vi.fn() },
  trabajador: { findMany: vi.fn() },
  ds44Miper: { findFirst: vi.fn() },
  ds44MiperAsistenteCargo: { findMany: vi.fn() },
  ds44MiperTarea: { findMany: vi.fn() },
  ds44MiperRiesgoCatalogo: { createMany: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/auth/permissions", () => ({ requirePermission: requirePermissionMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { getMiperAsistenteData, guardarRiesgosAsistente, guardarTareasAsistente } from "@/app/dicaprev/ds44/miper/asistente/actions";

describe("asistente miper tareas y GEMA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock));
  });

  it("guarda y devuelve metadatos de tarea para reanudacion", async () => {
    requirePermissionMock.mockResolvedValue({ empresaId: "empresa-1", usuarioId: "user-1" });
    prismaMock.ds44Miper.findFirst.mockResolvedValue({ id: "miper-1" });
    prismaMock.ds44MiperAsistenteCargo.findMany.mockResolvedValue([{ id: "ac-1" }]);
    txMock.ds44MiperTarea.findMany.mockResolvedValue([
      {
        id: "t-1",
        asistenteCargoId: "ac-1",
        nombre: "Inspeccion diaria",
        esRutinaria: true,
        lugarEspecifico: "Patio Norte",
        personasExpuestasTotal: 5,
        distribucionSexogenerica: { hombre: 3, mujer: 2, noBinario: 0 },
        observaciones: "Turno AM",
      },
    ]);

    const result = await guardarTareasAsistente({
      miperId: "miper-1",
      cargos: [
        {
          asistenteCargoId: "ac-1",
          tareas: [
            {
              nombre: "Inspeccion diaria",
              esRutinaria: true,
              lugarEspecifico: "Patio Norte",
              personasExpuestasTotal: 5,
              distribucionSexogenerica: { hombre: 3, mujer: 2, noBinario: 0 },
              observaciones: "Turno AM",
            },
          ],
        },
      ],
    });

    expect(txMock.ds44MiperTarea.createMany).toHaveBeenCalledOnce();
    expect(txMock.ds44MiperTarea.createMany.mock.calls[0][0].data[0]).toMatchObject({
      nombre: "Inspeccion diaria",
      esRutinaria: true,
      lugarEspecifico: "Patio Norte",
      personasExpuestasTotal: 5,
      observaciones: "Turno AM",
    });
    expect(result[0]).toMatchObject({
      id: "t-1",
      asistenteCargoId: "ac-1",
      nombre: "Inspeccion diaria",
      esRutinaria: true,
      lugarEspecifico: "Patio Norte",
      personasExpuestasTotal: 5,
      observaciones: "Turno AM",
    });
  });

  it("hidrata borrador con tareas y campos GEMA al reanudar", async () => {
    requirePermissionMock.mockResolvedValue({ empresaId: "empresa-1" });
    prismaMock.centroTrabajo.findMany.mockResolvedValue([{ id: "centro-1", nombre: "Centro" }]);
    prismaMock.area.findMany.mockResolvedValue([{ id: "area-1", nombre: "Area" }]);
    prismaMock.cargo.findMany.mockResolvedValue([{ id: "cargo-1", nombre: "Operador", areaId: "area-1", descripcion: null, perfilSST: null, riesgosClave: null }]);
    prismaMock.trabajador.findMany.mockResolvedValue([{ id: "trab-1", nombres: "Ana", apellidos: "Perez", cargo: { nombre: "Prevencionista" } }]);
    prismaMock.ds44Miper.findFirst.mockResolvedValue({
      id: "miper-1",
      asistentePaso: 5,
      codigo: "MIPER-1",
      nombre: "Matriz",
      procesoNombre: "Proceso",
      procesoTipo: "operacional",
      procesoResponsable: "Jefatura",
      responsableElaboracionId: "trab-1",
      fechaProximaRevision: new Date("2027-01-01T00:00:00.000Z"),
      observaciones: "Obs",
      asistenteCargos: [
        {
          id: "ac-1",
          cargoId: "cargo-1",
          centroTrabajoId: "centro-1",
          areaId: "area-1",
          cargo: { nombre: "Operador" },
          descripcionTrabajo: "Trabajo",
          tareas: [
            {
              id: "t-1",
              nombre: "Inspeccion",
              esRutinaria: false,
              lugarEspecifico: "Patio",
              personasExpuestasTotal: 2,
              distribucionSexogenerica: { hombre: 1, mujer: 1 },
              observaciones: "Detalle",
              exposiciones: [],
            },
          ],
        },
      ],
      items: [
        {
          id: "i-1",
          tareaId: "t-1",
          codigoIsp: "A1",
          confirmadoPorUsuario: true,
          consecuencia: "Golpe",
          probabilidad: 1,
          severidad: 2,
          magnitudExposicion: null,
          nivelRiesgoEspecifico: null,
          estadoEvaluacionEspecifica: null,
          observacionTecnica: null,
          motivoSugerencia: "Motivo",
          peligroGente: "Fatiga",
          peligroEquipos: "Camion",
          peligroMateriales: null,
          peligroAmbiente: "Piso mojado",
          peligroDescripcion: "Cruce",
          controles: [],
        },
      ],
    });

    const data = await getMiperAsistenteData("miper-1");

    expect(data.borrador?.cargos[0].tareasTexto).toContain("Inspeccion");
    expect(data.borrador?.tareas[0]).toMatchObject({
      id: "t-1",
      esRutinaria: false,
      lugarEspecifico: "Patio",
      personasExpuestasTotal: 2,
    });
    expect(data.borrador?.riesgos[0]).toMatchObject({
      id: "i-1",
      tareaId: "t-1",
      codigoIsp: "A1",
      peligroGente: "Fatiga",
      peligroEquipos: "Camion",
      peligroAmbiente: "Piso mojado",
      peligroDescripcion: "Cruce",
    });
  });

  it("persiste GEMA en riesgos y construye peligro consolidado", async () => {
    requirePermissionMock.mockResolvedValue({ empresaId: "empresa-1", usuarioId: "user-1" });
    prismaMock.ds44Miper.findFirst.mockResolvedValue({ id: "miper-1" });
    prismaMock.ds44MiperTarea.findMany.mockResolvedValue([
      {
        id: "t-1",
        nombre: "Tarea",
        asistenteCargo: { centroTrabajoId: "centro-1", areaId: "area-1", cargoId: "cargo-1" },
      },
    ]);
    prismaMock.trabajador.findMany.mockResolvedValue([{ id: "trab-1" }]);
    prismaMock.ds44MiperRiesgoCatalogo.findMany.mockResolvedValue([
      {
        id: "cat-1",
        codigoIsp: "A1",
        familia: "Caidas",
        riesgoEspecifico: "Caida al mismo nivel",
        categoria: "seguridad",
        metodologiaEvaluacion: "vep_isp",
        protocoloAplicable: null,
      },
    ]);
    txMock.ds44MiperItem.findMany.mockResolvedValue([{ id: "item-1", tareaId: "t-1", codigoIsp: "A1" }]);

    await guardarRiesgosAsistente({
      miperId: "miper-1",
      items: [
        {
          tareaId: "t-1",
          codigoIsp: "A1",
          confirmado: true,
          consecuencia: "Lesion",
          responsableTrabajadorId: "trab-1",
          motivoSugerencia: "Mapeo",
          peligroGente: "Fatiga",
          peligroEquipos: "Transpaleta",
          peligroAmbiente: "Piso humedo",
          peligroDescripcion: "Zona con pendiente",
        },
      ],
    });

    const payload = txMock.ds44MiperItem.createMany.mock.calls[0][0].data[0];
    expect(payload.peligroGente).toBe("Fatiga");
    expect(payload.peligroEquipos).toBe("Transpaleta");
    expect(payload.peligroAmbiente).toBe("Piso humedo");
    expect(payload.peligroDescripcion).toBe("Zona con pendiente");
    expect(String(payload.peligro)).toContain("Gente: Fatiga");
    expect(String(payload.peligro)).toContain("Detalle: Zona con pendiente");
  });
});
