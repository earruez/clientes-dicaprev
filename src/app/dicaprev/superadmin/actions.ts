"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { COMPANY_MODULES, type CompanyModuleKey } from "@/lib/company-modules";
import { requireRole } from "@/server/auth/permissions";
import { bootstrapEmpresaOperativa } from "@/server/bootstrap/empresa-operativa";
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
