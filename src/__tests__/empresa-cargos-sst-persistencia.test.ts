import { beforeEach, describe, expect, it, vi } from "vitest";

type CargoRow = {
  id: string;
  empresaId: string;
  areaId: string | null;
  nombre: string;
  descripcion: string | null;
  perfilSST: string | null;
  perfilSstRequerido: string | null;
  riesgosClave: string[];
  documentosBase: string[];
  capacitacionesBase: string[];
  estado: string;
  esCritico: boolean;
  createdAt: Date;
  area: { id: string; nombre: string } | null;
};

type CargoCreateData = {
  empresaId: string;
  areaId?: string | null;
  nombre: string;
  descripcion?: string | null;
  perfilSST?: string | null;
  perfilSstRequerido?: string | null;
  riesgosClave?: string[];
  documentosBase?: string[];
  capacitacionesBase?: string[];
  estado: string;
  esCritico: boolean;
};

type CargoSstResult = {
  perfilSST: string | null;
  riesgosClave: string[];
  documentosBase: string[];
  capacitacionesBase: string[];
};

const prismaMock = vi.hoisted(() => ({
  area: {
    findFirst: vi.fn(),
  },
  cargo: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    findFirstOrThrow: vi.fn(),
  },
  trabajador: { count: vi.fn() },
  posicionDotacion: { count: vi.fn() },
  reglaDocumentoTrabajador: { count: vi.fn() },
  planCapacitacionItem: { count: vi.fn() },
  reglaCapacitacionCargo: { count: vi.fn() },
}));

const requirePermissionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/auth/permissions", () => ({ requirePermission: requirePermissionMock }));

describe("Persistencia SST de cargos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea y consulta cargo conservando perfil/riesgos/documentos/capacitaciones", async () => {
    const empresaId = "emp-1";
    const rows: CargoRow[] = [];

    requirePermissionMock.mockResolvedValue({ empresaId, usuarioId: "user-1" });
    prismaMock.area.findFirst.mockResolvedValue(null);

    prismaMock.cargo.create.mockImplementation(async ({ data }: { data: CargoCreateData }) => {
      const created: CargoRow = {
        id: "cargo-1",
        empresaId: data.empresaId,
        areaId: data.areaId ?? null,
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        perfilSST: data.perfilSST ?? null,
        perfilSstRequerido: data.perfilSstRequerido ?? null,
        riesgosClave: (data.riesgosClave ?? []) as string[],
        documentosBase: (data.documentosBase ?? []) as string[],
        capacitacionesBase: (data.capacitacionesBase ?? []) as string[],
        estado: data.estado,
        esCritico: data.esCritico,
        createdAt: new Date("2026-07-14T00:00:00.000Z"),
        area: null,
      };
      rows.push(created);
      return created;
    });

    prismaMock.cargo.findMany.mockImplementation(async ({ where }: { where: { empresaId: string } }) => {
      return rows.filter((row) => row.empresaId === where.empresaId);
    });

    const { crearCargo, getCargos } = await import("@/app/dicaprev/empresa/cargos/actions");

    await crearCargo({
      nombre: "Supervisor SST",
      descripcion: "  Lidera seguridad operativa  ",
      perfilSstRequerido: "  Prevencionista con experiencia  ",
      riesgosClave: [" Trabajo en altura ", "Trabajo en altura", "  ", "Riesgo eléctrico"],
      documentosBase: [" Credencial ", "Credencial", ""],
      capacitacionesBase: [" Inducción SST ", "Inducción SST", "Primeros auxilios"],
      estado: "activo",
      esCritico: true,
    });

    const cargos = await getCargos();
    expect(cargos).toHaveLength(1);

    const cargo = cargos[0] as CargoSstResult;
    expect(cargo.perfilSST).toBe("Prevencionista con experiencia");
    expect(cargo.riesgosClave).toEqual(["Trabajo en altura", "Riesgo eléctrico"]);
    expect(cargo.documentosBase).toEqual(["Credencial"]);
    expect(cargo.capacitacionesBase).toEqual(["Inducción SST", "Primeros auxilios"]);
  });
});
