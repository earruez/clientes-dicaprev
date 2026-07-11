import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSessionMock = vi.hoisted(() => vi.fn());
const cookiesMock = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
  usuario: {
    findUnique: vi.fn(),
  },
  empresa: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  usuarioEmpresa: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/auth", () => ({
  authOptions: {},
}));

describe("getCurrentAppContext empresa activa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });
  });

  it("rehidrata relacion usuarioEmpresa cuando usuario tiene empresaId legacy", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { email: "legacy@empresa.cl" },
    });

    prismaMock.usuario.findUnique.mockResolvedValue({
      id: "user-1",
      email: "legacy@empresa.cl",
      rol: "ADMIN_EMPRESA",
      activo: true,
      empresaId: "emp-legacy",
    });

    prismaMock.usuarioEmpresa.findMany.mockResolvedValue([]);
    prismaMock.empresa.findFirst.mockResolvedValue({ id: "emp-legacy" });
    prismaMock.usuarioEmpresa.upsert.mockResolvedValue({ id: "ue-1" });
    prismaMock.usuarioEmpresa.findFirst.mockResolvedValue({ rol: "ADMIN_EMPRESA" });

    const { getCurrentAppContext } = await import("@/server/context");
    const context = await getCurrentAppContext();

    expect(context.empresaId).toBe("emp-legacy");
    expect(context.rol).toBe("ADMIN_EMPRESA");
    expect(prismaMock.usuarioEmpresa.upsert).toHaveBeenCalledTimes(1);
  });

  it("mantiene error explicito cuando no existe empresa activa resoluble", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { email: "sinempresa@empresa.cl" },
    });

    prismaMock.usuario.findUnique.mockResolvedValue({
      id: "user-2",
      email: "sinempresa@empresa.cl",
      rol: "PREVENCIONISTA",
      activo: true,
      empresaId: null,
    });

    prismaMock.usuarioEmpresa.findMany.mockResolvedValue([]);
    prismaMock.empresa.findMany.mockResolvedValue([{ id: "emp-a" }, { id: "emp-b" }]);

    const { getCurrentAppContext } = await import("@/server/context");

    await expect(getCurrentAppContext()).rejects.toThrow("El usuario autenticado no tiene empresa asignada");
  });
});
