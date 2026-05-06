import type { AppContext, AppRole } from "@/server/context";
import { getCurrentAppContext } from "@/server/context";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions-matrix";

function forbidden(message: string): never {
  throw new Error(message);
}

export async function requireAuth(): Promise<AppContext> {
  return getCurrentAppContext();
}

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