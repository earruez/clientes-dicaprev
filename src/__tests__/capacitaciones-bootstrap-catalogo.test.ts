import { beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOGO_CAPACITACIONES_SST } from "@/lib/capacitacion/catalogo-capacitaciones-sst";

type CapRow = {
  id: string;
  empresaId: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  modalidad: string;
  duracionHoras: number | null;
  vigenciaMeses: number | null;
  requiereEvaluacion: boolean;
  requiereFirma: boolean;
  generaCertificado: boolean;
  esObligatoria: boolean;
  activa: boolean;
  createdAt: Date;
};

type ReglaRow = {
  id: string;
  empresaId: string;
  capacitacionId: string;
  cargoId: string | null;
  areaId: string | null;
  centroTrabajoId: string | null;
  tipoContrato: string | null;
  obligatorio: boolean;
  periodicidad: string;
  activo: boolean;
};

const prismaMock = vi.hoisted(() => ({
  empresa: {
    findFirst: vi.fn(),
  },
  capacitacion: {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  cargo: {
    findMany: vi.fn(),
  },
  area: {
    findMany: vi.fn(),
  },
  trabajador: {
    count: vi.fn(),
  },
  reglaCapacitacionCargo: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

const requirePermissionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/server/auth/permissions", () => ({
  requirePermission: requirePermissionMock,
}));

function buildCap(input: Partial<CapRow> & { codigo: string; empresaId?: string }): CapRow {
  return {
    id: input.id ?? `cap-${input.codigo}`,
    empresaId: input.empresaId ?? "emp-1",
    codigo: input.codigo,
    nombre: input.nombre ?? `Nombre ${input.codigo}`,
    descripcion: input.descripcion ?? "desc",
    categoria: input.categoria ?? "sst",
    modalidad: input.modalidad ?? "presencial",
    duracionHoras: input.duracionHoras ?? 2,
    vigenciaMeses: input.vigenciaMeses ?? 12,
    requiereEvaluacion: input.requiereEvaluacion ?? false,
    requiereFirma: input.requiereFirma ?? true,
    generaCertificado: input.generaCertificado ?? false,
    esObligatoria: input.esObligatoria ?? true,
    activa: input.activa ?? true,
    createdAt: input.createdAt ?? new Date("2026-01-01T00:00:00.000Z"),
  };
}

function setupInMemoryDb(params?: {
  empresaId?: string;
  cantidadTrabajadores?: number;
  caps?: CapRow[];
  reglas?: ReglaRow[];
  failReglas?: boolean;
  cargos?: Array<{ id: string; nombre: string; areaId: string | null }>;
  areas?: Array<{ id: string; nombre: string }>;
}) {
  const empresaId = params?.empresaId ?? "emp-1";
  let seq = 1;
  const caps: CapRow[] = [...(params?.caps ?? [])];
  const reglas: ReglaRow[] = [...(params?.reglas ?? [])];
  const cargos = [...(params?.cargos ?? [])];
  const areas = [...(params?.areas ?? [])];

  requirePermissionMock.mockResolvedValue({ empresaId, usuarioId: "user-1" });

  prismaMock.empresa.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => {
    if (where.id !== empresaId) return null;
    return {
      id: empresaId,
      cantidadTrabajadores: params?.cantidadTrabajadores ?? 40,
    };
  });

  prismaMock.capacitacion.findMany.mockImplementation(async ({ where }: { where: { empresaId: string; codigo?: { in: string[] } } }) => {
    return caps.filter((cap) => {
      if (cap.empresaId !== where.empresaId) return false;
      if (where.codigo?.in && !where.codigo.in.includes(cap.codigo)) return false;
      return true;
    });
  });

  prismaMock.capacitacion.create.mockImplementation(async ({ data }: { data: Omit<CapRow, "id" | "createdAt"> }) => {
    const created = buildCap({
      id: `cap-new-${seq++}`,
      empresaId: data.empresaId,
      codigo: data.codigo,
      nombre: data.nombre,
      descripcion: data.descripcion,
      categoria: data.categoria,
      modalidad: data.modalidad,
      duracionHoras: data.duracionHoras,
      vigenciaMeses: data.vigenciaMeses,
      requiereEvaluacion: data.requiereEvaluacion,
      requiereFirma: data.requiereFirma,
      generaCertificado: data.generaCertificado,
      esObligatoria: data.esObligatoria,
      activa: data.activa,
    });
    caps.push(created);
    return { id: created.id, codigo: created.codigo };
  });

  prismaMock.capacitacion.count.mockImplementation(async ({ where }: { where: { empresaId: string } }) => {
    return caps.filter((cap) => cap.empresaId === where.empresaId).length;
  });

  prismaMock.trabajador.count.mockResolvedValue(params?.cantidadTrabajadores ?? 40);

  prismaMock.cargo.findMany.mockResolvedValue(cargos);
  prismaMock.area.findMany.mockResolvedValue(areas);

  prismaMock.reglaCapacitacionCargo.findMany.mockImplementation(async ({ where }: { where: { empresaId: string; capacitacionId: string } }) => {
    return reglas.filter(
      (regla) => regla.empresaId === where.empresaId && regla.capacitacionId === where.capacitacionId,
    );
  });

  prismaMock.reglaCapacitacionCargo.create.mockImplementation(async ({ data }: { data: Omit<ReglaRow, "id"> }) => {
    if (params?.failReglas) {
      throw Object.assign(new Error("regla-fail"), { code: "P2022" });
    }
    const created: ReglaRow = {
      ...data,
      id: `reg-${seq++}`,
    };
    reglas.push(created);
    return created;
  });

  return {
    caps,
    reglas,
  };
}

function countBaseCaps(caps: CapRow[], empresaId: string): number {
  const baseCodes = new Set(CATALOGO_CAPACITACIONES_SST.map((item) => item.codigo));
  return caps.filter((cap) => cap.empresaId === empresaId && baseCodes.has(cap.codigo)).length;
}

describe("Bootstrap catálogo base de Capacitaciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("empresa sin catálogo ejecuta bootstrap y crea capacitaciones base", async () => {
    const db = setupInMemoryDb();
    const { getCapacitaciones } = await import("@/actions/capacitaciones");

    const rows = await getCapacitaciones();

    expect(rows.length).toBeGreaterThan(0);
    expect(countBaseCaps(db.caps, "emp-1")).toBe(CATALOGO_CAPACITACIONES_SST.length);
  });

  it("empresa con catálogo parcial crea solo faltantes", async () => {
    const parcial = [buildCap({ codigo: "CAP-SST-001" }), buildCap({ codigo: "CAP-SST-002" })];
    const db = setupInMemoryDb({ caps: parcial });

    const { __testAsegurarCatalogoCapacitacionesBase } = await import("@/actions/capacitaciones");
    await __testAsegurarCatalogoCapacitacionesBase("emp-1");

    expect(countBaseCaps(db.caps, "emp-1")).toBe(CATALOGO_CAPACITACIONES_SST.length);
  });

  it("ejecutar dos veces no duplica catálogo ni reglas", async () => {
    const db = setupInMemoryDb({
      cargos: [{ id: "cargo-1", nombre: "conductor", areaId: null }],
      areas: [{ id: "area-1", nombre: "transporte" }],
    });

    const { __testAsegurarCatalogoCapacitacionesBase } = await import("@/actions/capacitaciones");

    await __testAsegurarCatalogoCapacitacionesBase("emp-1");
    const capsPrimera = db.caps.length;
    const reglasPrimera = db.reglas.length;

    await __testAsegurarCatalogoCapacitacionesBase("emp-1");

    expect(db.caps.length).toBe(capsPrimera);
    expect(db.reglas.length).toBe(reglasPrimera);
  });

  it("no sobrescribe capacitaciones base modificadas manualmente", async () => {
    const db = setupInMemoryDb({
      caps: [
        buildCap({
          codigo: "CAP-SST-003",
          nombre: "Nombre personalizado por empresa",
          descripcion: "descripcion custom",
        }),
      ],
    });

    const { __testAsegurarCatalogoCapacitacionesBase } = await import("@/actions/capacitaciones");
    await __testAsegurarCatalogoCapacitacionesBase("emp-1");

    const cap = db.caps.find((item) => item.codigo === "CAP-SST-003");
    expect(cap?.nombre).toBe("Nombre personalizado por empresa");
    expect(cap?.descripcion).toBe("descripcion custom");
  });

  it("no crea datos en otra empresa", async () => {
    const db = setupInMemoryDb({
      caps: [
        buildCap({ codigo: "CAP-SST-001", empresaId: "emp-2" }),
      ],
    });

    const { __testAsegurarCatalogoCapacitacionesBase } = await import("@/actions/capacitaciones");
    await __testAsegurarCatalogoCapacitacionesBase("emp-1");

    const capsEmp2 = db.caps.filter((cap) => cap.empresaId === "emp-2");
    expect(capsEmp2).toHaveLength(1);
    expect(capsEmp2[0].codigo).toBe("CAP-SST-001");
  });

  it("getCapacitaciones devuelve catálogo después del bootstrap", async () => {
    setupInMemoryDb({ caps: [] });

    const { getCapacitaciones } = await import("@/actions/capacitaciones");
    const rows = await getCapacitaciones();

    expect(rows.some((row) => row.codigo === "CAP-SST-001")).toBe(true);
  });

  it("reglas base no se duplican", async () => {
    const db = setupInMemoryDb({
      cargos: [{ id: "cargo-1", nombre: "electricista", areaId: "area-1" }],
      areas: [{ id: "area-1", nombre: "mantenimiento electrica" }],
    });

    const { __testAsegurarCatalogoCapacitacionesBase } = await import("@/actions/capacitaciones");
    await __testAsegurarCatalogoCapacitacionesBase("emp-1");
    await __testAsegurarCatalogoCapacitacionesBase("emp-1");

    const keys = new Set(
      db.reglas.map((regla) =>
        [
          regla.empresaId,
          regla.capacitacionId,
          regla.cargoId ?? "",
          regla.areaId ?? "",
          regla.periodicidad,
          regla.obligatorio ? "1" : "0",
        ].join("|"),
      ),
    );

    expect(keys.size).toBe(db.reglas.length);
  });

  it("si faltan cargos o áreas igual crea catálogo base", async () => {
    const db = setupInMemoryDb({
      cargos: [],
      areas: [],
      caps: [],
    });

    const { __testAsegurarCatalogoCapacitacionesBase } = await import("@/actions/capacitaciones");
    const result = await __testAsegurarCatalogoCapacitacionesBase("emp-1");

    expect(result.capacitacionesCreadas).toBe(CATALOGO_CAPACITACIONES_SST.length);
    expect(countBaseCaps(db.caps, "emp-1")).toBe(CATALOGO_CAPACITACIONES_SST.length);
  });

  it("si falla creacion de reglas el catalogo igual se crea", async () => {
    const db = setupInMemoryDb({
      caps: [],
      failReglas: true,
    });

    const { __testAsegurarCatalogoCapacitacionesBase } = await import("@/actions/capacitaciones");
    const result = await __testAsegurarCatalogoCapacitacionesBase("emp-1");

    expect(result.capacitacionesCreadas).toBe(CATALOGO_CAPACITACIONES_SST.length);
    expect(result.reglasCreadas).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(countBaseCaps(db.caps, "emp-1")).toBe(CATALOGO_CAPACITACIONES_SST.length);
  });

  it("getCapacitaciones devuelve catalogo aunque fallen reglas", async () => {
    const db = setupInMemoryDb({
      caps: [],
      failReglas: true,
    });

    const { getCapacitaciones } = await import("@/actions/capacitaciones");
    const rows = await getCapacitaciones();

    expect(rows.length).toBeGreaterThan(0);
    expect(countBaseCaps(db.caps, "emp-1")).toBe(CATALOGO_CAPACITACIONES_SST.length);
  });

  it("accion manual protegida inicializa catalogo por empresa activa", async () => {
    setupInMemoryDb({ caps: [] });

    const { inicializarCatalogoCapacitacionesEmpresa } = await import("@/actions/capacitaciones");
    const result = await inicializarCatalogoCapacitacionesEmpresa();

    expect(requirePermissionMock).toHaveBeenCalledWith("canManageCapacitaciones");
    expect(result.capacitacionesCreadas).toBeGreaterThan(0);
  });

  it("logs de bootstrap no exponen stack en produccion", async () => {
    setupInMemoryDb({ caps: [], failReglas: true });
    vi.stubEnv("NODE_ENV", "production");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const { __testAsegurarCatalogoCapacitacionesBase } = await import("@/actions/capacitaciones");
      await __testAsegurarCatalogoCapacitacionesBase("emp-1");

      const bootstrapCall = consoleErrorSpy.mock.calls.find((call) => call[0] === "[capacitaciones][bootstrap]");
      expect(bootstrapCall).toBeDefined();
      const payload = bootstrapCall?.[1] as Record<string, unknown>;
      expect(payload.stack).toBeUndefined();
      expect(payload.password).toBeUndefined();
      expect(payload.token).toBeUndefined();
    } finally {
      consoleErrorSpy.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});
