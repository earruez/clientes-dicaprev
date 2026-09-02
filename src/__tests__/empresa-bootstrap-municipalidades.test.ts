import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  empresa: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  empresaModulo: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  centroTrabajo: {
    count: vi.fn(),
    create: vi.fn(),
  },
  area: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  cargo: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  documentoRequeridoEmpresa: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  documentoTipoTrabajador: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  reglaDocumentoTrabajador: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  documentoTipoVehiculo: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  capacitacion: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  permisoOrganismo: {
    count: vi.fn(),
    findMany: vi.fn(),
    createMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/company-modules", () => ({ COMPANY_MODULES: ["permisos"] }));
vi.mock("@/lib/empresa/domain", () => ({
  AREA_REFS: [{ id: "area-1", nombre: "Administracion" }],
  CARGO_REFS: [{ id: "cargo-1", nombre: "Administrativo", areaId: "area-1", requiereDS44: false, riesgos: "" }],
}));

describe("bootstrapEmpresaOperativa municipalidades", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.empresa.findUnique.mockResolvedValue({
      id: "emp-1",
      tipoEmpresa: "Construccion",
      giro: "Construccion",
    });
    prismaMock.empresa.findMany.mockResolvedValue([]);

    prismaMock.empresaModulo.findUnique.mockResolvedValue(null);
    prismaMock.empresaModulo.create.mockResolvedValue({ id: "mod-1" });

    prismaMock.centroTrabajo.count.mockResolvedValue(0);
    prismaMock.centroTrabajo.create.mockResolvedValue({ id: "centro-1" });

    prismaMock.area.findFirst.mockResolvedValue(null);
    prismaMock.area.create.mockResolvedValue({ id: "area-1" });

    prismaMock.cargo.findFirst.mockResolvedValue(null);
    prismaMock.cargo.create.mockResolvedValue({ id: "cargo-1" });

    prismaMock.documentoRequeridoEmpresa.findUnique.mockResolvedValue(null);
    prismaMock.documentoRequeridoEmpresa.create.mockResolvedValue({ id: "doc-emp-1" });

    prismaMock.documentoTipoTrabajador.findUnique.mockResolvedValue(null);
    prismaMock.documentoTipoTrabajador.findMany.mockResolvedValue([{ id: "doc-trab-1", codigo: "CONTRATO_TRABAJO" }]);
    prismaMock.documentoTipoTrabajador.create.mockResolvedValue({ id: "doc-trab-1" });

    prismaMock.reglaDocumentoTrabajador.findFirst.mockResolvedValue(null);
    prismaMock.reglaDocumentoTrabajador.create.mockResolvedValue({ id: "regla-1" });

    prismaMock.documentoTipoVehiculo.findUnique.mockResolvedValue(null);
    prismaMock.documentoTipoVehiculo.create.mockResolvedValue({ id: "doc-veh-1" });

    prismaMock.capacitacion.findUnique.mockResolvedValue(null);
    prismaMock.capacitacion.create.mockResolvedValue({ id: "cap-1" });

    prismaMock.permisoOrganismo.count.mockResolvedValue(0);
    prismaMock.permisoOrganismo.findMany.mockResolvedValue([]);
    prismaMock.permisoOrganismo.createMany.mockResolvedValue({ count: 2 });
  });

  it("crea municipalidades base cuando no hay catálogo importado", async () => {
    const { bootstrapEmpresaOperativa } = await import("@/server/bootstrap/empresa-operativa");

    const result = await bootstrapEmpresaOperativa("emp-1");

    expect(result.municipalidadesCreadas).toBe(2);
    expect(prismaMock.permisoOrganismo.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ empresaId: "emp-1", tipo: "MUNICIPAL", nombre: "Municipalidad de Coyhaique" }),
        ]),
      }),
    );
  });
});
