import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePermissionMock = vi.hoisted(() => vi.fn());
const generarExcelMiperIspMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  empresa: { findFirst: vi.fn() },
  ds44Miper: { findFirst: vi.fn() },
}));

vi.mock("@/server/auth/permissions", () => ({ requirePermission: requirePermissionMock }));
vi.mock("@/lib/ds44/miper-export-excel", () => ({ generarExcelMiperIsp: generarExcelMiperIspMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { descargarExcelDs44Miper } from "@/app/dicaprev/ds44/miper/actions";

describe("descargarExcelDs44Miper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermissionMock.mockResolvedValue({ empresaId: "empresa-1" });
    prismaMock.empresa.findFirst.mockResolvedValue({ id: "empresa-1" });
    prismaMock.ds44Miper.findFirst.mockResolvedValue({
      id: "miper-1",
      codigo: "MIPER-01",
      version: 1,
      nombre: "Matriz",
      estado: "borrador",
      versionAnterior: null,
      createdAt: new Date("2026-07-21T00:00:00.000Z"),
      vigenteDesde: null,
      fechaProximaRevision: null,
      procesoNombre: null,
      procesoTipo: null,
      procesoResponsable: "Texto histórico",
      procesoResponsableTrabajador: { nombres: "Camila", apellidos: "Soto" },
      responsableElaboracion: null,
      empresa: {
        nombre: "Empresa Demo",
        rut: "76.000.000-1",
        direccion: "Av. Demo 1",
        ciudad: "Santiago",
        correo: "demo@empresa.cl",
      },
      tareas: [],
      items: [],
    });
    generarExcelMiperIspMock.mockReturnValue({ nombre: "archivo.xlsx", base64: "abc" });
  });

  it("consulta todos los estados para trazabilidad y filtra confirmados dentro del exportador", async () => {
    const result = await descargarExcelDs44Miper("miper-1");

    expect(result).toEqual({ nombre: "archivo.xlsx", base64: "abc" });
    expect(prismaMock.ds44Miper.findFirst).toHaveBeenCalledOnce();
    expect(prismaMock.ds44Miper.findFirst.mock.calls[0][0]).toMatchObject({
      where: { id: "miper-1", empresaId: "empresa-1" },
      include: {
        items: {
          orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
        },
      },
    });
    expect(generarExcelMiperIspMock.mock.calls[0][0].miper.procesoResponsable).toBe("Camila Soto");
  });
});
