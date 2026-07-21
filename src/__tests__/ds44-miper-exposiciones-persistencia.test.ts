import { beforeEach, describe, expect, it, vi } from "vitest";

const txMock = vi.hoisted(() => ({
  ds44MiperExposicionRespuesta: {
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
  },
  ds44MiperTarea: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const requirePermissionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/auth/permissions", () => ({ requirePermission: requirePermissionMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { guardarExposicionesAsistente } from "@/app/dicaprev/ds44/miper/asistente/actions";

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
