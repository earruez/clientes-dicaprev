import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  capacitacionAsignacion: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  capacitacionHistorial: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const requirePermissionMock = vi.hoisted(() => vi.fn());
const sendEmailMock = vi.hoisted(() => vi.fn());

class MockEmailConfigurationError extends Error {
  code = "EMAIL_CONFIG_MISSING" as const;

  constructor(message: string) {
    super(message);
    this.name = "EmailConfigurationError";
  }
}

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/server/auth/permissions", () => ({
  requirePermission: requirePermissionMock,
}));

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: sendEmailMock,
  EmailConfigurationError: MockEmailConfigurationError,
}));

vi.mock("@/actions/documentos-generados", () => ({
  registrarDocumentoGenerado: vi.fn(),
}));

type TxMock = {
  capacitacionAsignacion: {
    update: ReturnType<typeof vi.fn>;
  };
  capacitacionHistorial: {
    create: ReturnType<typeof vi.fn>;
  };
};

function buildTx(updatedEstado: string = "enviada"): TxMock {
  return {
    capacitacionAsignacion: {
      update: vi.fn().mockResolvedValue({
        id: "asig-1",
        trabajadorId: "trab-1",
        capacitacionId: "cap-1",
        sesionId: null,
        estado: updatedEstado,
        fechaVencimiento: null,
        trabajador: { nombres: "Ana", apellidos: "Pérez" },
        capacitacion: {
          nombre: "Uso correcto de EPP",
          categoria: "SST",
          modalidad: "presencial",
          generaCertificado: true,
        },
        origen: "manual",
        fechaAsignacion: new Date("2026-07-01T00:00:00.000Z"),
        fechaEnvio: new Date("2026-07-02T00:00:00.000Z"),
        fechaInicio: null,
        fechaCompletada: null,
        fechaCancelacion: null,
        token: "token-123",
        observacion: null,
        nota: null,
        aprobado: null,
        evidenciaDocumentoId: null,
        certificadoDocumentoId: null,
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        updatedAt: new Date("2026-07-02T00:00:00.000Z"),
      }),
    },
    capacitacionHistorial: {
      create: vi.fn().mockResolvedValue(undefined),
    },
  };
}

function buildAsignacion(overrides: Record<string, unknown> = {}) {
  return {
    id: "asig-1",
    empresaId: "emp-a",
    trabajadorId: "trab-1",
    capacitacionId: "cap-1",
    sesionId: null,
    estado: "pendiente",
    token: "token-123",
    fechaVencimiento: null,
    trabajador: {
      nombres: "Ana",
      apellidos: "Pérez",
      email: "ana@empresa.cl",
    },
    empresa: { nombre: "Empresa A" },
    capacitacion: {
      nombre: "Uso correcto de EPP",
      codigo: "CAP-EPP-01",
      modalidad: "presencial",
      categoria: "SST",
      generaCertificado: true,
      activa: true,
    },
    ...overrides,
  };
}

function buildPublicAsignacionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "asig-1",
    empresaId: "emp-a",
    trabajadorId: "trab-1",
    capacitacionId: "cap-1",
    sesionId: null,
    origen: "manual",
    estado: "enviada",
    fechaAsignacion: new Date("2026-07-01T00:00:00.000Z"),
    fechaEnvio: new Date("2026-07-02T00:00:00.000Z"),
    fechaInicio: null,
    fechaCompletada: null,
    fechaVencimiento: null,
    fechaCancelacion: null,
    token: "token-123",
    observacion: null,
    nota: null,
    aprobado: null,
    evidenciaDocumentoId: null,
    certificadoDocumentoId: null,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-02T00:00:00.000Z"),
    trabajador: { nombres: "Ana", apellidos: "Pérez" },
    capacitacion: {
      id: "cap-1",
      empresaId: "emp-a",
      codigo: "CAP-EPP-01",
      nombre: "Uso correcto de EPP",
      descripcion: null,
      categoria: "SST",
      modalidad: "presencial",
      duracionHoras: 2,
      vigenciaMeses: 12,
      requiereEvaluacion: true,
      requiereFirma: true,
      generaCertificado: true,
      esObligatoria: false,
      activa: true,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-02T00:00:00.000Z"),
    },
    sesion: null,
    ...overrides,
  };
}

describe("Capacitaciones: envio real y seguimiento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermissionMock.mockResolvedValue({
      empresaId: "emp-a",
      usuarioId: "user-1",
      email: "admin@empresa.cl",
    });
    sendEmailMock.mockResolvedValue({ provider: "resend", messageId: "mail-1" });
    prismaMock.capacitacionHistorial.findMany.mockResolvedValue([]);
  });

  it("envio exitoso registra correo_enviado", async () => {
    prismaMock.capacitacionAsignacion.findFirst.mockResolvedValue(buildAsignacion());
    const tx = buildTx("enviada");
    prismaMock.$transaction.mockImplementation(async (cb: (txInput: TxMock) => Promise<unknown>) => cb(tx));

    const { enviarCapacitacionAsignacion } = await import("@/actions/capacitaciones");

    await enviarCapacitacionAsignacion("asig-1");

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(tx.capacitacionHistorial.create).toHaveBeenCalledTimes(2);

    const eventos = tx.capacitacionHistorial.create.mock.calls.map((c) => c[0].data.tipoEvento);
    expect(eventos).toContain("correo_enviado");
    expect(eventos).toContain("asignacion_enviada_email");
  });

  it("envio fallido registra correo_fallido", async () => {
    prismaMock.capacitacionAsignacion.findFirst.mockResolvedValue(buildAsignacion());
    sendEmailMock.mockRejectedValue(new Error("fallo proveedor"));

    const { enviarCapacitacionAsignacion } = await import("@/actions/capacitaciones");

    await expect(enviarCapacitacionAsignacion("asig-1")).rejects.toThrow(
      "No se pudo enviar el correo. Revisa la configuración de email o el correo del trabajador.",
    );

    expect(prismaMock.capacitacionHistorial.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.capacitacionHistorial.create.mock.calls[0][0].data.tipoEvento).toBe("correo_fallido");
  });

  it("no permite enviar si el trabajador no tiene correo", async () => {
    prismaMock.capacitacionAsignacion.findFirst.mockResolvedValue(
      buildAsignacion({ trabajador: { nombres: "Ana", apellidos: "Pérez", email: null } }),
    );

    const { enviarCapacitacionAsignacion } = await import("@/actions/capacitaciones");

    await expect(enviarCapacitacionAsignacion("asig-1")).rejects.toThrow(
      "El trabajador no tiene correo válido para recibir la capacitación",
    );
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("no permite enviar una asignacion de otra empresa", async () => {
    prismaMock.capacitacionAsignacion.findFirst.mockResolvedValue(null);

    const { enviarCapacitacionAsignacion } = await import("@/actions/capacitaciones");

    await expect(enviarCapacitacionAsignacion("asig-otra")).rejects.toThrow("Asignacion no encontrada");
  });

  it("reenvio registra evento y no crea nueva asignacion", async () => {
    prismaMock.capacitacionAsignacion.findFirst.mockResolvedValue(
      buildAsignacion({ estado: "enviada" }),
    );
    const tx = buildTx("enviada");
    prismaMock.$transaction.mockImplementation(async (cb: (txInput: TxMock) => Promise<unknown>) => cb(tx));

    const { enviarCapacitacionAsignacion } = await import("@/actions/capacitaciones");

    await enviarCapacitacionAsignacion("asig-1", { reenviar: true });

    const eventos = tx.capacitacionHistorial.create.mock.calls.map((c) => c[0].data.tipoEvento);
    expect(eventos).toContain("correo_reenviado");
    expect(eventos).toContain("asignacion_reenviada_email");
    expect(tx.capacitacionAsignacion.update).toHaveBeenCalledTimes(1);
  });

  it("apertura del link registra trabajador_abre_link", async () => {
    prismaMock.capacitacionAsignacion.findFirst.mockResolvedValue(buildPublicAsignacionRow());
    prismaMock.capacitacionHistorial.findFirst.mockResolvedValue(null);

    const { getCapacitacionAsignacionPublica } = await import("@/actions/capacitaciones");

    const result = await getCapacitacionAsignacionPublica("token-123");
    expect(result).not.toBeNull();
    expect(prismaMock.capacitacionHistorial.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.capacitacionHistorial.create.mock.calls[0][0].data.tipoEvento).toBe("trabajador_abre_link");
  });

  it("recargar el link no duplica trabajador_abre_link", async () => {
    prismaMock.capacitacionAsignacion.findFirst.mockResolvedValue(buildPublicAsignacionRow());
    prismaMock.capacitacionHistorial.findFirst.mockResolvedValue({ id: "h-1" });

    const { getCapacitacionAsignacionPublica } = await import("@/actions/capacitaciones");

    const result = await getCapacitacionAsignacionPublica("token-123");
    expect(result).not.toBeNull();
    expect(prismaMock.capacitacionHistorial.create).not.toHaveBeenCalled();
  });

  it("si falta configuracion de proveedor no simula exito", async () => {
    prismaMock.capacitacionAsignacion.findFirst.mockResolvedValue(buildAsignacion());
    sendEmailMock.mockRejectedValue(new MockEmailConfigurationError("config faltante"));

    const { enviarCapacitacionAsignacion } = await import("@/actions/capacitaciones");

    await expect(enviarCapacitacionAsignacion("asig-1")).rejects.toThrow(
      "No se pudo enviar el correo. Revisa la configuración de email o el correo del trabajador.",
    );

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
