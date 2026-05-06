import type { AppContext, AppRole } from "@/server/context";
import { getCurrentAppContext } from "@/server/context";

function forbidden(message: string): never {
  throw new Error(message);
}

export async function requireAuth(): Promise<AppContext> {
  return getCurrentAppContext();
}

export const PERMISSIONS = {
  canReadEmpresa: ["ADMIN_EMPRESA", "PREVENCIONISTA", "SUPERVISOR", "AUDITOR"],
  canManageEmpresa: ["ADMIN_EMPRESA"],
  canReadTrabajadores: ["ADMIN_EMPRESA", "PREVENCIONISTA", "SUPERVISOR", "AUDITOR"],
  canCreateTrabajador: ["ADMIN_EMPRESA", "PREVENCIONISTA"],
  canUpdateTrabajador: ["ADMIN_EMPRESA", "PREVENCIONISTA", "SUPERVISOR"],
  canReadDocumentacion: ["ADMIN_EMPRESA", "PREVENCIONISTA", "SUPERVISOR", "AUDITOR"],
  canManageDocumentacion: ["ADMIN_EMPRESA", "PREVENCIONISTA", "SUPERVISOR"],
  canReadCumplimiento: ["ADMIN_EMPRESA", "PREVENCIONISTA", "SUPERVISOR", "AUDITOR"],
  canReadAlertas: ["ADMIN_EMPRESA", "PREVENCIONISTA", "SUPERVISOR", "AUDITOR"],
  canReadOrganigrama: ["ADMIN_EMPRESA", "PREVENCIONISTA", "SUPERVISOR", "AUDITOR"],
  // Extras para mantener la misma granularidad aplicada en Fase 12.
  canCreateDocumentacion: ["ADMIN_EMPRESA", "PREVENCIONISTA"],
  canDeactivateTrabajador: ["ADMIN_EMPRESA", "PREVENCIONISTA"],
} as const satisfies Record<string, readonly AppRole[]>;

export type PermissionKey = keyof typeof PERMISSIONS;

export async function requirePermission(permission: PermissionKey): Promise<AppContext> {
  const context = await requireAuth();

  if (context.rol === "SUPERADMIN") {
    return context;
  }

  const allowedRoles = PERMISSIONS[permission];
  const hasAccess = allowedRoles.some((role) => role === context.rol);
  if (!hasAccess) {
    forbidden("No autorizado para ejecutar esta accion");
  }

  return context;
}

export async function requireRole(...roles: AppRole[]): Promise<AppContext> {
  const context = await requireAuth();

  if (context.rol === "SUPERADMIN") {
    return context;
  }

  if (!roles.includes(context.rol)) {
    forbidden("No autorizado para ejecutar esta accion");
  }

  return context;
}

export async function requireEmpresaAccess(empresaId: string): Promise<AppContext> {
  const context = await requireAuth();

  if (context.rol === "SUPERADMIN") {
    return context;
  }

  if (context.empresaId !== empresaId) {
    forbidden("No autorizado para acceder a esta empresa");
  }

  return context;
}