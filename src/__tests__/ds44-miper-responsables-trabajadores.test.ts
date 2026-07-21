import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePermissionMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  empresa: { findFirst: vi.fn() },
  trabajador: { findFirst: vi.fn() },
  ds44Miper: { findFirst: vi.fn(), update: vi.fn() },
}));

vi.mock("@/server/auth/permissions", () => ({ requirePermission: requirePermissionMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { actualizarCabeceraDs44Miper } from "@/app/dicaprev/ds44/miper/actions";

describe("responsables trabajadores MIPER", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermissionMock.mockResolvedValue({ empresaId: "empresa-1", usuarioId: "usuario-1" });
    prismaMock.empresa.findFirst.mockResolvedValue({ id: "empresa-1" });
    prismaMock.ds44Miper.findFirst.mockResolvedValue({ id: "miper-1", estado: "borrador" });
    prismaMock.trabajador.findFirst.mockResolvedValue({ id: "trabajador-activo" });
    prismaMock.ds44Miper.update.mockResolvedValue({ id: "miper-1" });
  });

  it("guarda responsable del proceso y elaboración mediante ids validados", async () => {
    await actualizarCabeceraDs44Miper({
      miperId: "miper-1",
      nombre: "Matriz actualizada",
      responsableElaboracionId: "trab-elabora",
      procesoResponsableId: "trab-proceso",
    });

    expect(prismaMock.trabajador.findFirst).toHaveBeenCalledTimes(2);
    expect(prismaMock.trabajador.findFirst).toHaveBeenCalledWith({
      where: { id: "trab-proceso", empresaId: "empresa-1", estado: "activo" },
      select: { id: true },
    });
    expect(prismaMock.ds44Miper.update.mock.calls[0][0].data).toMatchObject({
      responsableElaboracionId: "trab-elabora",
      procesoResponsableId: "trab-proceso",
    });
  });

  it("rechaza un responsable que no sea trabajador activo de la empresa", async () => {
    prismaMock.trabajador.findFirst
      .mockResolvedValueOnce({ id: "trab-elabora" })
      .mockResolvedValueOnce(null);

    await expect(actualizarCabeceraDs44Miper({
      miperId: "miper-1",
      nombre: "Matriz actualizada",
      responsableElaboracionId: "trab-elabora",
      procesoResponsableId: "trab-ajeno",
    })).rejects.toThrow("El responsable debe ser un trabajador activo de la empresa.");
    expect(prismaMock.ds44Miper.update).not.toHaveBeenCalled();
  });
});
