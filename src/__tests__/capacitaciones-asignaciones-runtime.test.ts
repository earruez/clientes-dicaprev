import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadTabAsignacionesData,
  normalizeAvanceEstado,
  normalizeEnvioEstado,
} from "@/lib/capacitacion/asignaciones-ui";

const prismaMock = vi.hoisted(() => ({
  trabajador: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const requirePermissionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/server/auth/permissions", () => ({
  requirePermission: requirePermissionMock,
}));

describe("Capacitaciones Asignaciones runtime safeguards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normaliza estados de envio y avance desconocidos", () => {
    expect(normalizeEnvioEstado(undefined)).toBe("no_enviado");
    expect(normalizeEnvioEstado("estado_inexistente")).toBe("no_enviado");
    expect(normalizeEnvioEstado("enviado")).toBe("enviado");

    expect(normalizeAvanceEstado(undefined)).toBe("pendiente");
    expect(normalizeAvanceEstado("otro_estado")).toBe("pendiente");
    expect(normalizeAvanceEstado("completada")).toBe("completada");
  });

  it("carga datos base aunque fallen trabajadores", async () => {
    const result = await loadTabAsignacionesData({
      getAsignaciones: async () => [{ id: "a1" }],
      getCatalogo: async () => [{ id: "c1" }],
      getTrabajadoresAsignables: async () => {
        throw new Error("sin permiso trabajadores");
      },
    });

    expect(result.asignaciones).toEqual([{ id: "a1" }]);
    expect(result.catalogo).toEqual([{ id: "c1" }]);
    expect(result.trabajadores).toEqual([]);
    expect(result.asignacionesError).toBeNull();
    expect(result.catalogoError).toBeNull();
    expect(result.trabajadoresError).toBe("No se pudieron cargar trabajadores asignables.");
  });

  it("obtiene trabajadores asignables con permisos de capacitaciones", async () => {
    requirePermissionMock.mockResolvedValue({ empresaId: "emp-1" });
    prismaMock.trabajador.findMany.mockResolvedValue([
      {
        id: "t1",
        nombres: "Ana",
        apellidos: "Perez",
        rut: "11.111.111-1",
        email: "ana@empresa.cl",
        estado: "activo",
        cargo: { nombre: "Prevencionista" },
        area: { nombre: "SST" },
        centroTrabajo: { nombre: "Planta Norte" },
      },
      {
        id: "t2",
        nombres: "Luis",
        apellidos: "Diaz",
        rut: null,
        email: null,
        estado: "Inactivo",
        cargo: null,
        area: null,
        centroTrabajo: null,
      },
    ]);

    const { getTrabajadoresAsignablesCapacitacion } = await import("@/actions/capacitaciones");

    const rows = await getTrabajadoresAsignablesCapacitacion();

    expect(requirePermissionMock).toHaveBeenCalledWith("canReadCapacitaciones");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "t1",
      nombre: "Ana",
      apellido: "Perez",
      cargo: "Prevencionista",
      area: "SST",
      centroTrabajo: "Planta Norte",
    });
  });

  it("bloquea asignacion cuando el trabajador esta inactivo", async () => {
    requirePermissionMock.mockResolvedValue({
      empresaId: "emp-1",
      usuarioId: "user-1",
    });

    const tx = {
      trabajador: {
        findFirst: vi.fn().mockResolvedValue({ id: "t1", estado: "inactivo" }),
      },
      capacitacion: {
        findFirst: vi.fn(),
      },
      capacitacionAsignacion: {
        findFirst: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      capacitacionHistorial: {
        create: vi.fn(),
      },
    };

    prismaMock.$transaction.mockImplementation(async (cb: (txInput: typeof tx) => Promise<unknown>) => cb(tx));

    const { createCapacitacionAsignacion } = await import("@/actions/capacitaciones");

    await expect(
      createCapacitacionAsignacion({
        trabajadorId: "t1",
        capacitacionId: "cap-1",
      }),
    ).rejects.toThrow("El trabajador seleccionado está inactivo y no puede recibir capacitaciones");

    expect(tx.capacitacion.findFirst).not.toHaveBeenCalled();
  });

  it("expone error claro cuando no se puede resolver empresa activa", async () => {
    requirePermissionMock.mockRejectedValue(new Error("El usuario autenticado no tiene empresa asignada"));

    const { getCapacitacionAsignaciones } = await import("@/actions/capacitaciones");

    await expect(getCapacitacionAsignaciones()).rejects.toThrow(
      "No se pudo resolver la empresa activa para cargar capacitaciones.",
    );
  });

  it("registra error runtime sanitizado en produccion", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      requirePermissionMock.mockResolvedValue({
        empresaId: "emp-1",
        usuarioId: "user-1",
        rol: "ADMIN_EMPRESA",
        email: "admin@empresa.cl",
      });

      prismaMock.trabajador.findMany.mockRejectedValue(
        Object.assign(new Error("db-down"), { code: "P1001" }),
      );

      const { getTrabajadoresAsignablesCapacitacion } = await import("@/actions/capacitaciones");

      await expect(getTrabajadoresAsignablesCapacitacion()).rejects.toThrow(
        "No se pudieron cargar trabajadores asignables.",
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      const payload = consoleErrorSpy.mock.calls[0]?.[1] as { actionName?: string; errorCode?: string; stack?: string };
      expect(payload?.actionName).toBe("getTrabajadoresAsignablesCapacitacion.read");
      expect(payload?.errorCode).toBe("P1001");
      expect(payload?.stack).toBeUndefined();
    } finally {
      consoleErrorSpy.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});
