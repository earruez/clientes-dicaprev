"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { COMPANY_MODULES, type CompanyModuleKey } from "@/lib/company-modules";
import { requireRole } from "@/server/auth/permissions";
import { bootstrapEmpresaOperativa } from "@/server/bootstrap/empresa-operativa";
import { verifyPassword } from "@/lib/password-hash";
import { Prisma } from "@prisma/client";
import type { Rol } from "@prisma/client";

const SUPERADMIN_ROLES: Rol[] = [
  "SUPERADMIN",
  "ADMIN_EMPRESA",
  "PREVENCIONISTA",
  "SUPERVISOR",
  "TRABAJADOR",
  "AUDITOR",
  "LECTURA",
];

type EmpresaSummary = {
  id: string;
  nombre: string;
  rut: string | null;
  activa: boolean;
  createdAt: Date;
};

type UsuarioSummary = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
};

type UsuarioEmpresaSummary = {
  id: string;
  usuarioId: string;
  empresaId: string;
  rol: Rol;
  activo: boolean;
  usuarioNombre: string;
  usuarioEmail: string;
  empresaNombre: string;
};

type EmpresaModuloSummary = {
  id: string;
  empresaId: string;
  modulo: CompanyModuleKey;
  activo: boolean;
};

type EmpresaDeletionCounts = {
  trabajadores: number;
  documentosEmpresa: number;
  documentosTrabajadores: number;
  capacitaciones: number;
  asignaciones: number;
  contratistas: number;
  acreditaciones: number;
  checklists: number;
  hallazgos: number;
  usuariosAsociados: number;
};

type DeleteDependenciasStats = {
  usuarioEmpresa: number;
  usuarioEmpresaIdNull: number;
  evidenciaCumplimiento: number;
  hallazgoCumplimiento: number;
  obligacionEmpresaEstado: number;
  documentoEmpresa: number;
  trabajadorDocumento: number;
  capacitacionAsistencia: number;
  capacitacionEvaluacion: number;
  capacitacionHistorial: number;
  capacitacionAsignacion: number;
  capacitacionSesion: number;
  reglaCapacitacionCargo: number;
  planCapacitacion: number;
  plantillaPlanCapacitacion: number;
  capacitacion: number;
  entregaEpp: number;
  eppItem: number;
  acreditacion: number;
  plantillaAcreditacion: number;
  mandanteAcreditacion: number;
  contratista: number;
  checklistEjecucion: number;
  checklistTemplate: number;
  accidenteAccionCorrectiva: number;
  accidenteInvestigacion: number;
  induccionTrabajador: number;
  firmaDocumento: number;
  planTrabajo: number;
  vehiculo: number;
  trabajador: number;
  posicionDotacion: number;
  reglaDocumentoTrabajador: number;
  documentoTipoTrabajador: number;
  documentoTipoVehiculo: number;
  cargo: number;
  area: number;
  centroTrabajo: number;
  plantillaDocumentoEmpresa: number;
  activacionEvento: number;
  empresaModulo: number;
  generacionDocumentosLog: number;
};

type DeleteEmpresaActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type EmpresaDeletionPreview = {
  empresaId: string;
  nombre: string;
  rut: string | null;
  protegida: boolean;
  protegidaMotivo: string | null;
  esEmpresaActivaUsuario: boolean;
  canDelete: boolean;
  counts: EmpresaDeletionCounts;
};

export type SuperadminData = {
  totals: {
    empresas: number;
    usuarios: number;
    empresasActivas: number;
    usuariosActivos: number;
  };
  empresas: EmpresaSummary[];
  usuarios: UsuarioSummary[];
  asignaciones: UsuarioEmpresaSummary[];
  modulos: EmpresaModuloSummary[];
};

const CONFIRM_DELETE_EMPRESA_TEXT = "ELIMINAR EMPRESA";
const PROTECTED_DICAPREV_NAME = "dicaprev spa";
const PROTECTED_CENTROS_NAME = "centros comerciales spa";
const ALLOW_DELETE_CENTROS_COMERCIALES = false;

function parseBooleanFromFormData(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  if (typeof value !== "string") return false;
  return value === "1" || value === "true" || value === "on";
}

function parseString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCompanyName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getProtectedCompanyReason(nombre: string): string | null {
  const normalizedName = normalizeCompanyName(nombre);

  if (normalizedName === PROTECTED_DICAPREV_NAME) {
    return "La empresa DICAPREV SpA está protegida y no puede eliminarse.";
  }

  if (normalizedName === PROTECTED_CENTROS_NAME && !ALLOW_DELETE_CENTROS_COMERCIALES) {
    return "La empresa Centros Comerciales SpA está protegida por configuración y no puede eliminarse.";
  }

  return null;
}

function normalizeRut(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/[^0-9kK]/g, "").toLowerCase();
}

async function findEmpresaDuplicada(input: {
  nombreNormalizado: string;
  rutNormalizado: string;
  excludeEmpresaId?: string;
}) {
  const empresas = await prisma.empresa.findMany({
    select: {
      id: true,
      nombre: true,
      rut: true,
    },
  });

  return empresas.find((empresa) => {
    if (input.excludeEmpresaId && empresa.id === input.excludeEmpresaId) {
      return false;
    }

    const sameName = normalizeCompanyName(empresa.nombre) === input.nombreNormalizado;
    const sameRut = input.rutNormalizado.length > 0 && normalizeRut(empresa.rut) === input.rutNormalizado;
    return sameName || sameRut;
  });
}

async function ensureEmpresaModules(empresaId: string) {
  await prisma.$transaction(
    COMPANY_MODULES.map((modulo) =>
      prisma.empresaModulo.upsert({
        where: {
          empresaId_modulo: {
            empresaId,
            modulo,
          },
        },
        update: {},
        create: {
          empresaId,
          modulo,
          activo: true,
        },
      })
    )
  );
}

async function getEmpresaDeletionCounts(empresaId: string): Promise<EmpresaDeletionCounts> {
  const [
    trabajadores,
    documentosEmpresa,
    documentosTrabajadores,
    capacitaciones,
    asignaciones,
    contratistas,
    acreditaciones,
    checklistTemplates,
    checklistEjecuciones,
    hallazgos,
    usuariosAsociados,
  ] = await Promise.all([
    prisma.trabajador.count({ where: { empresaId } }),
    prisma.documentoEmpresa.count({ where: { empresaId } }),
    prisma.trabajadorDocumento.count({ where: { empresaId } }),
    prisma.capacitacion.count({ where: { empresaId } }),
    prisma.capacitacionAsignacion.count({ where: { empresaId } }),
    prisma.contratista.count({ where: { empresaId } }),
    prisma.acreditacion.count({ where: { empresaId } }),
    prisma.checklistTemplate.count({ where: { empresaId } }),
    prisma.checklistEjecucion.count({ where: { empresaId } }),
    prisma.hallazgoCumplimiento.count({ where: { empresaId } }),
    prisma.usuarioEmpresa.count({ where: { empresaId } }),
  ]);

  return {
    trabajadores,
    documentosEmpresa,
    documentosTrabajadores,
    capacitaciones,
    asignaciones,
    contratistas,
    acreditaciones,
    checklists: checklistTemplates + checklistEjecuciones,
    hallazgos,
    usuariosAsociados,
  };
}

async function deleteEmpresaDependenciasTx(tx: Prisma.TransactionClient, empresaId: string) {
  const stats: DeleteDependenciasStats = {
    usuarioEmpresa: 0,
    usuarioEmpresaIdNull: 0,
    evidenciaCumplimiento: 0,
    hallazgoCumplimiento: 0,
    obligacionEmpresaEstado: 0,
    documentoEmpresa: 0,
    trabajadorDocumento: 0,
    capacitacionAsistencia: 0,
    capacitacionEvaluacion: 0,
    capacitacionHistorial: 0,
    capacitacionAsignacion: 0,
    capacitacionSesion: 0,
    reglaCapacitacionCargo: 0,
    planCapacitacion: 0,
    plantillaPlanCapacitacion: 0,
    capacitacion: 0,
    entregaEpp: 0,
    eppItem: 0,
    acreditacion: 0,
    plantillaAcreditacion: 0,
    mandanteAcreditacion: 0,
    contratista: 0,
    checklistEjecucion: 0,
    checklistTemplate: 0,
    accidenteAccionCorrectiva: 0,
    accidenteInvestigacion: 0,
    induccionTrabajador: 0,
    firmaDocumento: 0,
    planTrabajo: 0,
    vehiculo: 0,
    trabajador: 0,
    posicionDotacion: 0,
    reglaDocumentoTrabajador: 0,
    documentoTipoTrabajador: 0,
    documentoTipoVehiculo: 0,
    cargo: 0,
    area: 0,
    centroTrabajo: 0,
    plantillaDocumentoEmpresa: 0,
    activacionEvento: 0,
    empresaModulo: 0,
    generacionDocumentosLog: 0,
  };

  stats.usuarioEmpresa = (await tx.usuarioEmpresa.deleteMany({ where: { empresaId } })).count;
  stats.usuarioEmpresaIdNull = (await tx.usuario.updateMany({ where: { empresaId }, data: { empresaId: null } })).count;

  stats.evidenciaCumplimiento = (await tx.evidenciaCumplimiento.deleteMany({ where: { empresaId } })).count;
  stats.hallazgoCumplimiento = (await tx.hallazgoCumplimiento.deleteMany({ where: { empresaId } })).count;
  stats.obligacionEmpresaEstado = (await tx.obligacionEmpresaEstado.deleteMany({ where: { empresaId } })).count;

  stats.documentoEmpresa = (await tx.documentoEmpresa.deleteMany({ where: { empresaId } })).count;
  stats.trabajadorDocumento = (await tx.trabajadorDocumento.deleteMany({ where: { empresaId } })).count;

  stats.capacitacionAsistencia = (await tx.capacitacionAsistencia.deleteMany({ where: { empresaId } })).count;
  stats.capacitacionEvaluacion = (await tx.capacitacionEvaluacion.deleteMany({ where: { empresaId } })).count;
  stats.capacitacionHistorial = (await tx.capacitacionHistorial.deleteMany({ where: { empresaId } })).count;
  stats.capacitacionAsignacion = (await tx.capacitacionAsignacion.deleteMany({ where: { empresaId } })).count;
  stats.capacitacionSesion = (await tx.capacitacionSesion.deleteMany({ where: { empresaId } })).count;
  stats.reglaCapacitacionCargo = (await tx.reglaCapacitacionCargo.deleteMany({ where: { empresaId } })).count;
  stats.planCapacitacion = (await tx.planCapacitacion.deleteMany({ where: { empresaId } })).count;
  stats.plantillaPlanCapacitacion = (await tx.plantillaPlanCapacitacion.deleteMany({ where: { empresaId } })).count;
  stats.capacitacion = (await tx.capacitacion.deleteMany({ where: { empresaId } })).count;

  stats.entregaEpp = (await tx.entregaEpp.deleteMany({ where: { empresaId } })).count;
  stats.eppItem = (await tx.eppItem.deleteMany({ where: { empresaId } })).count;

  stats.acreditacion = (await tx.acreditacion.deleteMany({ where: { empresaId } })).count;
  stats.plantillaAcreditacion = (await tx.plantillaAcreditacion.deleteMany({ where: { empresaId } })).count;
  stats.mandanteAcreditacion = (await tx.mandanteAcreditacion.deleteMany({ where: { empresaId } })).count;
  stats.contratista = (await tx.contratista.deleteMany({ where: { empresaId } })).count;

  stats.checklistEjecucion = (await tx.checklistEjecucion.deleteMany({ where: { empresaId } })).count;
  stats.checklistTemplate = (await tx.checklistTemplate.deleteMany({ where: { empresaId } })).count;

  stats.accidenteAccionCorrectiva = (await tx.accidenteAccionCorrectiva.deleteMany({ where: { empresaId } })).count;
  stats.accidenteInvestigacion = (await tx.accidenteInvestigacion.deleteMany({ where: { empresaId } })).count;

  stats.induccionTrabajador = (await tx.induccionTrabajador.deleteMany({ where: { empresaId } })).count;
  stats.firmaDocumento = (await tx.firmaDocumento.deleteMany({ where: { empresaId } })).count;

  stats.planTrabajo = (await tx.planTrabajo.deleteMany({ where: { empresaId } })).count;

  stats.vehiculo = (await tx.vehiculo.deleteMany({ where: { empresaId } })).count;
  stats.trabajador = (await tx.trabajador.deleteMany({ where: { empresaId } })).count;
  stats.posicionDotacion = (await tx.posicionDotacion.deleteMany({ where: { empresaId } })).count;
  stats.reglaDocumentoTrabajador = (await tx.reglaDocumentoTrabajador.deleteMany({ where: { empresaId } })).count;
  stats.documentoTipoTrabajador = (await tx.documentoTipoTrabajador.deleteMany({ where: { empresaId } })).count;
  stats.documentoTipoVehiculo = (await tx.documentoTipoVehiculo.deleteMany({ where: { empresaId } })).count;
  stats.cargo = (await tx.cargo.deleteMany({ where: { empresaId } })).count;
  stats.area = (await tx.area.deleteMany({ where: { empresaId } })).count;
  stats.centroTrabajo = (await tx.centroTrabajo.deleteMany({ where: { empresaId } })).count;

  stats.plantillaDocumentoEmpresa = (await tx.plantillaDocumentoEmpresa.deleteMany({ where: { empresaId } })).count;
  stats.activacionEvento = (await tx.activacionEvento.deleteMany({ where: { empresaId } })).count;
  stats.empresaModulo = (await tx.empresaModulo.deleteMany({ where: { empresaId } })).count;
  stats.generacionDocumentosLog = (await tx.generacionDocumentosLog.deleteMany({ where: { empresaId } })).count;

  return stats;
}

function extractDependentModelFromPrismaError(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  if (error.code !== "P2003") {
    return null;
  }

  const meta = error.meta as { field_name?: string } | undefined;
  const fieldName = meta?.field_name;
  if (!fieldName || typeof fieldName !== "string") {
    return "relación referencial";
  }

  const constraint = fieldName.toLowerCase();
  if (constraint.includes("acredita")) return "Acreditación";
  if (constraint.includes("contratista")) return "Contratista";
  if (constraint.includes("checklist")) return "Checklist";
  if (constraint.includes("capacit")) return "Capacitación";
  if (constraint.includes("trabajador")) return "Trabajador";
  if (constraint.includes("vehiculo")) return "Vehículo";
  if (constraint.includes("documento")) return "Documento";
  if (constraint.includes("plan")) return "Plan de trabajo";

  return fieldName;
}

export async function getSuperadminData(): Promise<SuperadminData> {
  await requireRole("SUPERADMIN");

  const [empresas, usuarios, asignaciones, modulos, empresasActivas, usuariosActivos] = await Promise.all([
    prisma.empresa.findMany({
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        rut: true,
        activa: true,
        createdAt: true,
      },
    }),
    prisma.usuario.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
      },
      take: 100,
    }),
    prisma.usuarioEmpresa.findMany({
      orderBy: [{ empresa: { nombre: "asc" } }, { usuario: { email: "asc" } }],
      select: {
        id: true,
        usuarioId: true,
        empresaId: true,
        rol: true,
        activo: true,
        usuario: { select: { nombre: true, email: true } },
        empresa: { select: { nombre: true } },
      },
    }),
    prisma.empresaModulo.findMany({
      orderBy: [{ empresaId: "asc" }, { modulo: "asc" }],
      select: {
        id: true,
        empresaId: true,
        modulo: true,
        activo: true,
      },
    }),
    prisma.empresa.count({ where: { activa: true } }),
    prisma.usuario.count({ where: { activo: true } }),
  ]);

  return {
    totals: {
      empresas: empresas.length,
      usuarios: usuarios.length,
      empresasActivas,
      usuariosActivos,
    },
    empresas,
    usuarios,
    asignaciones: asignaciones.map((row) => ({
      id: row.id,
      usuarioId: row.usuarioId,
      empresaId: row.empresaId,
      rol: row.rol,
      activo: row.activo,
      usuarioNombre: row.usuario.nombre,
      usuarioEmail: row.usuario.email,
      empresaNombre: row.empresa.nombre,
    })),
    modulos: modulos
      .filter((row) => COMPANY_MODULES.includes(row.modulo as CompanyModuleKey))
      .map((row) => ({
        id: row.id,
        empresaId: row.empresaId,
        modulo: row.modulo as CompanyModuleKey,
        activo: row.activo,
      })),
  };
}

export async function createEmpresaAction(formData: FormData) {
  await requireRole("SUPERADMIN");

  const nombre = parseString(formData, "nombre");
  const rut = parseString(formData, "rut");
  const nombreNormalizado = normalizeCompanyName(nombre);
  const rutNormalizado = normalizeRut(rut);

  if (!nombre) {
    throw new Error("Nombre de empresa es requerido");
  }

  if (nombre.length < 2) {
    throw new Error("Nombre debe tener al menos 2 caracteres");
  }

  const existing = await findEmpresaDuplicada({
    nombreNormalizado,
    rutNormalizado,
  });

  if (existing) {
    throw new Error(`Ya existe una empresa con nombre o RUT duplicado: "${existing.nombre}"`);
  }

  const empresa = await prisma.empresa.create({
    data: {
      nombre,
      rut: rut || null,
      razonSocial: nombre,
      activa: true,
    },
    select: { id: true, nombre: true },
  });

  try {
    const bootstrap = await bootstrapEmpresaOperativa(empresa.id);
    revalidatePath("/dicaprev/superadmin");
    return {
      empresa,
      bootstrap,
    };
  } catch (bootstrapError) {
    // Clean up empresa if bootstrap fails
    await prisma.empresa.delete({ where: { id: empresa.id } });
    throw new Error(`Error al preparar empresa: ${bootstrapError instanceof Error ? bootstrapError.message : "Error desconocido"}`);
  }
}

export async function prepararEmpresaAction(formData: FormData) {
  await requireRole("SUPERADMIN");

  const empresaId = parseString(formData, "empresaId");

  if (!empresaId) {
    throw new Error("Empresa es requerida");
  }

  // Verify empresa exists
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  try {
    const bootstrap = await bootstrapEmpresaOperativa(empresaId);
    revalidatePath("/dicaprev/superadmin");
    return bootstrap;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Error desconocido en bootstrap";
    throw new Error(`Error al preparar empresa: ${errorMsg}`);
  }
}

export async function updateEmpresaAction(formData: FormData) {
  await requireRole("SUPERADMIN");

  const id = parseString(formData, "empresaId");
  const nombre = parseString(formData, "nombre");
  const rut = parseString(formData, "rut");
  const nombreNormalizado = normalizeCompanyName(nombre);
  const rutNormalizado = normalizeRut(rut);

  if (!id) {
    throw new Error("ID de empresa es requerido");
  }

  if (!nombre) {
    throw new Error("Nombre de empresa es requerido");
  }

  if (nombre.length < 2) {
    throw new Error("Nombre debe tener al menos 2 caracteres");
  }

  // Verify empresa exists
  const empresa = await prisma.empresa.findUnique({ where: { id } });
  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  const existing = await findEmpresaDuplicada({
    nombreNormalizado,
    rutNormalizado,
    excludeEmpresaId: id,
  });

  if (existing) {
    throw new Error(`Ya existe una empresa con nombre o RUT duplicado: "${existing.nombre}"`);
  }

  await prisma.empresa.update({
    where: { id },
    data: {
      nombre,
      rut: rut || null,
    },
  });

  revalidatePath("/dicaprev/superadmin");
}

export async function toggleEmpresaActivaAction(formData: FormData) {
  await requireRole("SUPERADMIN");

  const empresaId = parseString(formData, "empresaId");
  const activa = parseBooleanFromFormData(formData, "activa");

  if (!empresaId) {
    throw new Error("Empresa es requerida");
  }

  // Verify empresa exists
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  await prisma.empresa.update({
    where: { id: empresaId },
    data: { activa },
  });

  revalidatePath("/dicaprev/superadmin");
}

export async function createUsuarioAction(formData: FormData) {
  await requireRole("SUPERADMIN");

  const nombre = parseString(formData, "nombre");
  const email = parseString(formData, "email").toLowerCase();
  const rol = parseString(formData, "rol") as Rol;

  if (!nombre) {
    throw new Error("Nombre de usuario es requerido");
  }

  if (nombre.length < 2) {
    throw new Error("Nombre debe tener al menos 2 caracteres");
  }

  if (!email || !email.includes("@")) {
    throw new Error("Email válido es requerido");
  }

  if (!SUPERADMIN_ROLES.includes(rol)) {
    throw new Error("Rol inválido");
  }

  // Check for duplicate email
  const existing = await prisma.usuario.findFirst({
    where: { email: { mode: "insensitive", equals: email } },
  });

  if (existing) {
    throw new Error(`Un usuario con el email "${email}" ya existe`);
  }

  await prisma.usuario.create({
    data: {
      nombre,
      email,
      rol,
      activo: true,
    },
  });

  revalidatePath("/dicaprev/superadmin");
}

export async function toggleUsuarioActivoAction(formData: FormData) {
  await requireRole("SUPERADMIN");

  const usuarioId = parseString(formData, "usuarioId");
  const activo = parseBooleanFromFormData(formData, "activo");

  if (!usuarioId) {
    throw new Error("Usuario es requerido");
  }

  // Verify usuario exists
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) {
    throw new Error("Usuario no encontrado");
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { activo },
  });

  revalidatePath("/dicaprev/superadmin");
}

export async function upsertUsuarioEmpresaAction(formData: FormData) {
  await requireRole("SUPERADMIN");

  const usuarioId = parseString(formData, "usuarioId");
  const empresaId = parseString(formData, "empresaId");
  const rol = parseString(formData, "rol") as Rol;
  const activo = parseBooleanFromFormData(formData, "activo");

  if (!usuarioId) {
    throw new Error("Usuario es requerido");
  }

  if (!empresaId) {
    throw new Error("Empresa es requerida");
  }

  if (!SUPERADMIN_ROLES.includes(rol)) {
    throw new Error("Rol es requerido");
  }

  // Verify usuario exists
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) {
    throw new Error("Usuario no encontrado");
  }

  // Verify empresa exists
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  await prisma.usuarioEmpresa.upsert({
    where: {
      usuarioId_empresaId: {
        usuarioId,
        empresaId,
      },
    },
    update: {
      rol,
      activo,
    },
    create: {
      usuarioId,
      empresaId,
      rol,
      activo,
    },
  });

  revalidatePath("/dicaprev/superadmin");
}

export async function toggleUsuarioEmpresaActivoAction(formData: FormData) {
  await requireRole("SUPERADMIN");

  const id = parseString(formData, "id");
  const activo = parseBooleanFromFormData(formData, "activo");

  if (!id) {
    throw new Error("Asignación es requerida");
  }

  // Verify assignment exists
  const assignment = await prisma.usuarioEmpresa.findUnique({ where: { id } });
  if (!assignment) {
    throw new Error("Asignación no encontrada");
  }

  await prisma.usuarioEmpresa.update({
    where: { id },
    data: { activo },
  });

  revalidatePath("/dicaprev/superadmin");
}

export async function toggleEmpresaModuloAction(formData: FormData) {
  await requireRole("SUPERADMIN");

  const empresaId = parseString(formData, "empresaId");
  const modulo = parseString(formData, "modulo") as CompanyModuleKey;
  const activo = parseBooleanFromFormData(formData, "activo");

  if (!empresaId) {
    throw new Error("Empresa es requerida");
  }

  if (!COMPANY_MODULES.includes(modulo)) {
    throw new Error("Módulo inválido");
  }

  // Verify empresa exists
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  await prisma.empresaModulo.upsert({
    where: {
      empresaId_modulo: {
        empresaId,
        modulo,
      },
    },
    update: { activo },
    create: {
      empresaId,
      modulo,
      activo,
    },
  });

  revalidatePath("/dicaprev/superadmin");
}

export async function ensureBackfillAction() {
  await requireRole("SUPERADMIN");

  try {
    // Backfill usuarios a usuarioEmpresa
    const usuarios = await prisma.usuario.findMany({
      where: { empresaId: { not: null } },
      select: {
        id: true,
        empresaId: true,
        rol: true,
        activo: true,
      },
    });

    for (const usuario of usuarios) {
      if (!usuario.empresaId) continue;
      await prisma.usuarioEmpresa.upsert({
        where: {
          usuarioId_empresaId: {
            usuarioId: usuario.id,
            empresaId: usuario.empresaId,
          },
        },
        update: {
          activo: usuario.activo,
        },
        create: {
          usuarioId: usuario.id,
          empresaId: usuario.empresaId,
          rol: usuario.rol,
          activo: usuario.activo,
        },
      });
    }

    // Ensure all empresas have all modules
    const empresas = await prisma.empresa.findMany({ select: { id: true } });
    for (const empresa of empresas) {
      await ensureEmpresaModules(empresa.id);
    }

    revalidatePath("/dicaprev/superadmin");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Error desconocido en backfill";
    throw new Error(`Error en backfill idempotente: ${errorMsg}`);
  }
}

export async function getEmpresaDeletionPreviewAction(formData: FormData): Promise<EmpresaDeletionPreview> {
  const context = await requireRole("SUPERADMIN");

  const empresaId = parseString(formData, "empresaId");
  if (!empresaId) {
    throw new Error("Empresa es requerida");
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      nombre: true,
      rut: true,
    },
  });

  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  const protectedReason = getProtectedCompanyReason(empresa.nombre);
  const esEmpresaActivaUsuario = context.empresaId === empresa.id;
  const counts = await getEmpresaDeletionCounts(empresa.id);

  return {
    empresaId: empresa.id,
    nombre: empresa.nombre,
    rut: empresa.rut,
    protegida: Boolean(protectedReason),
    protegidaMotivo: protectedReason,
    esEmpresaActivaUsuario,
    canDelete: !protectedReason && !esEmpresaActivaUsuario,
    counts,
  };
}

export async function eliminarEmpresaDefinitivamenteAction(formData: FormData): Promise<DeleteEmpresaActionResult> {
  let empresaId = parseString(formData, "empresaId");
  const confirmacionTexto = parseString(formData, "confirmacionTexto");
  const currentPassword = parseString(formData, "currentPassword");

  const fail = (error: string): DeleteEmpresaActionResult => ({ ok: false, error });

  try {
    if (!empresaId) {
      return fail("Empresa es requerida");
    }

    const context = await requireRole("SUPERADMIN");

    if (confirmacionTexto !== CONFIRM_DELETE_EMPRESA_TEXT) {
      return fail("Texto de confirmación inválido");
    }

    if (!currentPassword) {
      return fail("Debe ingresar su clave de SUPERADMIN");
    }

    const usuarioActual = await prisma.usuario.findUnique({
      where: { id: context.usuarioId },
      select: {
        id: true,
        passwordHash: true,
        activo: true,
      },
    });

    if (!usuarioActual || !usuarioActual.activo) {
      return fail("Permisos insuficientes");
    }

    if (!usuarioActual.passwordHash || !verifyPassword(currentPassword, usuarioActual.passwordHash)) {
      return fail("Clave incorrecta");
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        nombre: true,
        activa: true,
      },
    });

    if (!empresa) {
      return fail("Empresa no encontrada");
    }

    empresaId = empresa.id;
    const protectedReason = getProtectedCompanyReason(empresa.nombre);
    if (protectedReason) {
      return fail(protectedReason);
    }

    if (context.empresaId === empresa.id) {
      return fail("No puede eliminar su empresa activa actual. Cambie primero la empresa activa.");
    }

    console.info("[superadmin][eliminar_empresa] inicio", {
      empresaId: empresa.id,
      empresaNombre: empresa.nombre,
      empresaActiva: empresa.activa,
      paso: "inicio_transaccion",
    });

    await prisma.$transaction(async (tx) => {
      console.info("[superadmin][eliminar_empresa] paso", {
        empresaId: empresa.id,
        empresaNombre: empresa.nombre,
        paso: "eliminar_dependencias",
      });

      const deletedStats = await deleteEmpresaDependenciasTx(tx, empresa.id);

      console.info("[superadmin][eliminar_empresa] conteos", {
        empresaId: empresa.id,
        empresaNombre: empresa.nombre,
        paso: "dependencias_eliminadas",
        deletedStats,
      });

      // No existe un modelo de auditoría específico para eliminación definitiva de empresa.
      // Se deja advertencia técnica sin datos sensibles.
      console.warn("[superadmin][eliminar_empresa] sin tabla auditoria dedicada", {
        empresaId: empresa.id,
        empresaNombre: empresa.nombre,
      });

      await tx.empresa.delete({ where: { id: empresa.id } });

      console.info("[superadmin][eliminar_empresa] paso", {
        empresaId: empresa.id,
        empresaNombre: empresa.nombre,
        paso: "empresa_eliminada",
      });
    });

    revalidatePath("/dicaprev/superadmin");

    return {
      ok: true,
      message: `Empresa \"${empresa.nombre}\" eliminada definitivamente`,
    };
  } catch (error) {
    const dependentModel = extractDependentModelFromPrismaError(error);
    const controlledMessage = dependentModel
      ? `No se pudo eliminar porque existen registros dependientes no contemplados: ${dependentModel}`
      : "No se pudo eliminar la empresa por un error interno controlado.";

    console.error("[superadmin][eliminar_empresa] error", {
      empresaId,
      paso: "error",
      errorType: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
      prismaCode: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
      dependentModel,
    });

    return fail(controlledMessage);
  }
}
