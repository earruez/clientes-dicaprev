export type UserRole =
  | "SUPERADMIN"
  | "ADMIN_EMPRESA"
  | "PREVENCIONISTA"
  | "SUPERVISOR"
  | "TRABAJADOR"
  | "AUDITOR";

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
  canCreateDocumentacion: ["ADMIN_EMPRESA", "PREVENCIONISTA"],
  canDeactivateTrabajador: ["ADMIN_EMPRESA", "PREVENCIONISTA"],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;