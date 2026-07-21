import { beforeEach, describe, expect, it, vi } from "vitest";

const txMock = vi.hoisted(() => ({
  ds44MiperExposicionRespuesta: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  ds44MiperItem: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
  },
  ds44MiperControl: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  ds44Miper: {
    update: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  ds44Miper: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  ds44MiperTarea: {
    findMany: vi.fn(),
  },
  ds44MiperItem: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  ds44MiperRiesgoCatalogo: {
    createMany: vi.fn(),
    findMany: vi.fn(),
  },
  trabajador: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const requirePermissionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/auth/permissions", () => ({ requirePermission: requirePermissionMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  guardarControlesAsistente,
  guardarEvaluacionesAsistente,
  guardarExposicionesAsistente,
  guardarRiesgosAsistente,
} from "@/app/dicaprev/ds44/miper/asistente/actions";

describe("persistencia de exposiciones del asistente MIPER", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermissionMock.mockResolvedValue({ empresaId: "empresa-1", usuarioId: "usuario-1" });
    prismaMock.ds44Miper.findFirst.mockResolvedValue({ id: "miper-1" });
    prismaMock.ds44MiperTarea.findMany.mockResolvedValue([{ id: "tarea-1" }, { id: "tarea-2" }]);
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof txMock) => Promise<void>) => callback(txMock));
  });

  it("reemplaza en bloque las respuestas de varias tareas y avanza el asistente", async () => {
    const respuestas = ["tarea-1", "tarea-2"].flatMap((tareaId) =>
      Array.from({ length: 11 }, (_, index) => ({
        tareaId,
        grupo: "Exposición",
        clave: `pregunta-${index + 1}`,
        pregunta: `Pregunta ${index + 1}`,
        respuesta: index === 0 ? ("no_se" as const) : ("no_aplica" as const),
      })),
    );

    await guardarExposicionesAsistente({ miperId: "miper-1", respuestas });

    expect(txMock.ds44MiperExposicionRespuesta.deleteMany).toHaveBeenCalledOnce();
    expect(txMock.ds44MiperExposicionRespuesta.createMany).toHaveBeenCalledOnce();
    expect(txMock.ds44MiperExposicionRespuesta.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ tareaId: "tarea-1", clave: "pregunta-1", revisionTecnicaPendiente: true }),
        expect.objectContaining({ tareaId: "tarea-2", clave: "pregunta-11", revisionTecnicaPendiente: false }),
      ]),
    });
    expect(txMock.ds44MiperExposicionRespuesta.createMany.mock.calls[0][0].data).toHaveLength(22);
    expect(txMock.ds44Miper.update).toHaveBeenCalledWith({
      where: { id: "miper-1" },
      data: { asistentePaso: 4, actualizadoPorId: "usuario-1" },
    });
  });

  it("rechaza preguntas duplicadas antes de iniciar la transacción", async () => {
    const respuesta = {
      tareaId: "tarea-1",
      grupo: "Exposición",
      clave: "misma-clave",
      pregunta: "Pregunta repetida",
      respuesta: "aplica" as const,
    };

    await expect(guardarExposicionesAsistente({ miperId: "miper-1", respuestas: [respuesta, respuesta] })).rejects.toThrow(
      "Las respuestas de exposición contienen preguntas duplicadas.",
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("persistencia de pasos posteriores del asistente MIPER", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermissionMock.mockResolvedValue({ empresaId: "empresa-1", usuarioId: "usuario-1" });
    prismaMock.ds44Miper.findFirst.mockResolvedValue({ id: "miper-1" });
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock));
  });

  it("crea todos los riesgos mediante una única inserción masiva", async () => {
    prismaMock.ds44MiperTarea.findMany.mockResolvedValue([
      { id: "tarea-1", nombre: "Tarea 1", asistenteCargo: { centroTrabajoId: "centro-1", areaId: "area-1", cargoId: "cargo-1" } },
      { id: "tarea-2", nombre: "Tarea 2", asistenteCargo: { centroTrabajoId: "centro-1", areaId: "area-1", cargoId: "cargo-1" } },
    ]);
    prismaMock.trabajador.findMany.mockResolvedValue([{ id: "responsable-1" }]);
    prismaMock.ds44MiperRiesgoCatalogo.findMany.mockResolvedValue([
      { id: "catalogo-a1", codigoIsp: "A1", familia: "Caídas", riesgoEspecifico: "Caída al mismo nivel", categoria: "seguridad", metodologiaEvaluacion: "vep_isp", protocoloAplicable: null },
      { id: "catalogo-p1", codigoIsp: "P1", familia: "Ruido", riesgoEspecifico: "Exposición a ruido", categoria: "higiene", metodologiaEvaluacion: "evaluacion_especifica", protocoloAplicable: "PREXOR" },
    ]);
    const items = Array.from({ length: 20 }, (_, index) => ({
      tareaId: index % 2 === 0 ? "tarea-1" : "tarea-2",
      codigoIsp: index % 2 === 0 ? "A1" : "P1",
      confirmado: true,
      consecuencia: `Consecuencia ${index + 1}`,
      responsableTrabajadorId: "responsable-1",
      motivoSugerencia: `Motivo ${index + 1}`,
    }));
    txMock.ds44MiperItem.findMany.mockResolvedValue([]);

    await guardarRiesgosAsistente({ miperId: "miper-1", items });

    expect(txMock.ds44MiperItem.deleteMany).toHaveBeenCalledOnce();
    expect(txMock.ds44MiperItem.createMany).toHaveBeenCalledOnce();
    expect(txMock.ds44MiperItem.createMany.mock.calls[0][0].data).toHaveLength(20);
    expect(txMock.ds44Miper.update).toHaveBeenCalledWith({
      where: { id: "miper-1" },
      data: { asistentePaso: 5, actualizadoPorId: "usuario-1" },
    });
  });

  it("actualiza evaluaciones en lotes sin una transacción interactiva extensa", async () => {
    const items = Array.from({ length: 25 }, (_, index) => ({
      id: `item-${index + 1}`,
      consecuencia: `Consecuencia ${index + 1}`,
      probabilidad: 2,
      severidad: 2,
    }));
    prismaMock.ds44MiperItem.findMany.mockResolvedValue(items.map((item) => ({ id: item.id, metodologiaEvaluacion: "vep_isp" })));
    prismaMock.ds44MiperItem.update.mockResolvedValue({});

    await guardarEvaluacionesAsistente({ miperId: "miper-1", items });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.ds44MiperItem.update).toHaveBeenCalledTimes(25);
    expect(prismaMock.ds44Miper.update).toHaveBeenCalledWith({
      where: { id: "miper-1" },
      data: { asistentePaso: 6, actualizadoPorId: "usuario-1" },
    });
  });

  it("crea los controles de todos los riesgos mediante una única inserción masiva", async () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      id: `item-${index + 1}`,
      controles: [{
        tipoControl: "administrativo",
        descripcion: `Control ${index + 1}`,
        responsableTrabajadorId: "responsable-1",
        fechaCompromiso: "2026-08-20",
        estado: "pendiente",
      }],
    }));
    prismaMock.ds44MiperItem.findMany.mockResolvedValue(items.map((item) => ({ id: item.id })));
    prismaMock.trabajador.findMany.mockResolvedValue([{ id: "responsable-1" }]);

    await guardarControlesAsistente({ miperId: "miper-1", items });

    expect(txMock.ds44MiperControl.deleteMany).toHaveBeenCalledOnce();
    expect(txMock.ds44MiperControl.createMany).toHaveBeenCalledOnce();
    expect(txMock.ds44MiperControl.createMany.mock.calls[0][0].data).toHaveLength(12);
    expect(txMock.ds44Miper.update).toHaveBeenCalledWith({
      where: { id: "miper-1" },
      data: { asistentePaso: 7, actualizadoPorId: "usuario-1" },
    });
  });
});
