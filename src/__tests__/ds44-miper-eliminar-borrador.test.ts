import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePermissionMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  empresa: { findFirst: vi.fn() },
  ds44Miper: { findFirst: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock("@/server/auth/permissions", () => ({ requirePermission: requirePermissionMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

import { eliminarDs44MiperBorrador } from "@/app/dicaprev/ds44/miper/actions";

describe("eliminarDs44MiperBorrador", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermissionMock.mockResolvedValue({ empresaId: "empresa-1", usuarioId: "usuario-1" });
    prismaMock.empresa.findFirst.mockResolvedValue({ id: "empresa-1" });
    prismaMock.ds44Miper.findFirst.mockResolvedValue({ id: "miper-1", estado: "borrador" });
    prismaMock.ds44Miper.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("elimina un borrador acotado a la empresa activa", async () => {
    await eliminarDs44MiperBorrador("miper-1");

    expect(requirePermissionMock).toHaveBeenCalledWith("canManageCumplimiento");
    expect(prismaMock.ds44Miper.findFirst).toHaveBeenCalledWith({
      where: { id: "miper-1", empresaId: "empresa-1" },
      select: { id: true, estado: true },
    });
    expect(prismaMock.ds44Miper.deleteMany).toHaveBeenCalledWith({
      where: { id: "miper-1", empresaId: "empresa-1", estado: "borrador" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dicaprev/ds44/miper");
  });

  it.each(["en_revision", "vigente", "archivado"])("protege una matriz en estado %s", async (estado) => {
    prismaMock.ds44Miper.findFirst.mockResolvedValue({ id: "miper-1", estado });

    await expect(eliminarDs44MiperBorrador("miper-1")).rejects.toThrow(
      "Solo se pueden eliminar matrices MIPER en borrador.",
    );
    expect(prismaMock.ds44Miper.deleteMany).not.toHaveBeenCalled();
  });

  it("rechaza una matriz de otra empresa", async () => {
    prismaMock.ds44Miper.findFirst.mockResolvedValue(null);

    await expect(eliminarDs44MiperBorrador("miper-ajena")).rejects.toThrow(
      "La matriz MIPER no existe o no pertenece a la empresa activa.",
    );
    expect(prismaMock.ds44Miper.deleteMany).not.toHaveBeenCalled();
  });

  it("evita eliminar si el estado cambia durante la operación", async () => {
    prismaMock.ds44Miper.deleteMany.mockResolvedValue({ count: 0 });

    await expect(eliminarDs44MiperBorrador("miper-1")).rejects.toThrow(
      "La matriz cambió de estado y ya no puede eliminarse.",
    );
  });
});
