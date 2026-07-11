import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  capacitacionAsignacion: {
    findFirst: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  documentoTipoTrabajador: {
    upsert: vi.fn(),
  },
  reglaDocumentoTrabajador: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  trabajadorDocumento: {
    findFirst: vi.fn(),
  },
  firmaUsuarioPerfil: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/actions/documentos-generados", () => ({
  registrarDocumentoGenerado: vi.fn(),
}));

vi.mock("@/server/auth/permissions", () => ({
  requirePermission: vi.fn(),
}));

type TxMock = {
  trabajadorDocumento: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  trabajadorDocumentoHistorial: {
    create: ReturnType<typeof vi.fn>;
  };
  capacitacionAsignacion: {
    update: ReturnType<typeof vi.fn>;
  };
};

function buildTxMock(): TxMock {
  return {
    trabajadorDocumento: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue({ id: "doc-1", version: "1.0" }),
    },
    trabajadorDocumentoHistorial: {
      create: vi.fn().mockResolvedValue(undefined),
    },
    capacitacionAsignacion: {
      update: vi.fn().mockResolvedValue(undefined),
    },
  };
}

function buildAsignacion(overrides: Record<string, unknown> = {}) {
  return {
    id: "asig-1",
    empresaId: "emp-a",
    trabajadorId: "trab-1",
    capacitacionId: "cap-1",
    estado: "completada",
    aprobado: true,
    nota: 6.5,
    fechaAsignacion: new Date("2026-07-01T10:00:00.000Z"),
    fechaCompletada: new Date("2026-07-02T10:00:00.000Z"),
    fechaVencimiento: null,
    updatedAt: new Date("2026-07-02T11:00:00.000Z"),
    certificadoDocumentoId: null,
    trabajador: {
      nombres: "Ana",
      apellidos: "Pérez",
      rut: "11.111.111-1",
    },
    capacitacion: {
      nombre: "Uso correcto de EPP",
      codigo: "CAP-EPP-01",
      categoria: "SST",
      modalidad: "presencial",
      vigenciaMeses: 12,
      generaCertificado: true,
    },
    certificadoDocumento: null,
    empresa: {
      nombre: "Empresa A",
      rut: "76.000.000-0",
      logoUrl: null,
    },
    ...overrides,
  };
}

const runtime = {
  buildPdf: vi.fn(async () => new Blob(["pdf"], { type: "application/pdf" })),
  persistBlobConNombre: vi.fn(async (_blob: Blob, archivoNombre: string) => ({
    archivoNombre,
    archivoUrl: `/api/dicaprev/documentacion/archivo/${archivoNombre}`,
    archivoPeso: 123,
  })),
};

describe("Integración capacitación -> control documental", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.documentoTipoTrabajador.upsert.mockResolvedValue({
      id: "tipo-cert-1",
      codigo: "CERTIFICADO_CAPACITACION",
      nombre: "Certificado de capacitación",
      requiereVencimiento: true,
    });
    prismaMock.reglaDocumentoTrabajador.findFirst.mockResolvedValue({ id: "regla-1" });
    prismaMock.reglaDocumentoTrabajador.create.mockResolvedValue(undefined);
    prismaMock.firmaUsuarioPerfil.findFirst.mockResolvedValue(null);
    prismaMock.trabajadorDocumento.findFirst.mockResolvedValue(null);
  });

  it("capacitación aprobada genera DocumentoTrabajador completo y registra historial", async () => {
    const tx = buildTxMock();
    prismaMock.$transaction.mockImplementation(async (cb: (txInput: TxMock) => Promise<unknown>) => cb(tx));
    prismaMock.capacitacionAsignacion.findFirst.mockResolvedValue(buildAsignacion());

    const { __capacitacionesTestables } = await import("@/actions/capacitaciones");

    const result = await __capacitacionesTestables.generarDocumentoCertificadoCapacitacion(
      {
        empresaId: "emp-a",
        trabajadorId: "trab-1",
        capacitacionId: "cap-1",
        asignacionId: "asig-1",
        usuarioId: "user-1",
      },
      runtime,
    );

    expect(result?.estado).toBe("creado");
    expect(tx.trabajadorDocumento.create).toHaveBeenCalledTimes(1);

    const createCall = tx.trabajadorDocumento.create.mock.calls[0][0];
    expect(createCall.data.trabajadorId).toBe("trab-1");
    expect(createCall.data.estado).toBe("completo");

    expect(tx.trabajadorDocumentoHistorial.create).toHaveBeenCalledTimes(1);
    expect(tx.capacitacionAsignacion.update).toHaveBeenCalledWith({
      where: { id: "asig-1" },
      data: { certificadoDocumentoId: "doc-1" },
    });
  });

  it("repetir el proceso no duplica documentos para la misma asignación", async () => {
    const tx = buildTxMock();
    prismaMock.$transaction.mockImplementation(async (cb: (txInput: TxMock) => Promise<unknown>) => cb(tx));

    prismaMock.capacitacionAsignacion.findFirst.mockResolvedValueOnce(buildAsignacion());

    const { __capacitacionesTestables } = await import("@/actions/capacitaciones");

    const first = await __capacitacionesTestables.generarDocumentoCertificadoCapacitacion(
      {
        empresaId: "emp-a",
        trabajadorId: "trab-1",
        capacitacionId: "cap-1",
        asignacionId: "asig-1",
        usuarioId: "user-1",
      },
      runtime,
    );

    prismaMock.capacitacionAsignacion.findFirst.mockResolvedValueOnce(
      buildAsignacion({
        certificadoDocumentoId: "doc-1",
        certificadoDocumento: {
          id: "doc-1",
          archivoNombre: first?.archivoNombre,
          archivoUrl: first?.archivoUrl,
          version: "1.0",
          versionNumero: 1,
        },
      }),
    );

    const second = await __capacitacionesTestables.generarDocumentoCertificadoCapacitacion(
      {
        empresaId: "emp-a",
        trabajadorId: "trab-1",
        capacitacionId: "cap-1",
        asignacionId: "asig-1",
        usuarioId: "user-1",
      },
      runtime,
    );

    expect(second?.estado).toBe("sin_cambios");
    expect(tx.trabajadorDocumento.create).toHaveBeenCalledTimes(1);
  });

  it("bloquea vínculo cruzado entre empresas", async () => {
    prismaMock.capacitacionAsignacion.findFirst.mockResolvedValue(null);

    const { __capacitacionesTestables } = await import("@/actions/capacitaciones");

    await expect(
      __capacitacionesTestables.generarDocumentoCertificadoCapacitacion(
        {
          empresaId: "emp-a",
          trabajadorId: "trab-otra",
          capacitacionId: "cap-otra",
          asignacionId: "asig-otra",
          usuarioId: "user-1",
        },
        runtime,
      ),
    ).rejects.toThrow("Asignación de capacitación no encontrada en la empresa");
  });
});
