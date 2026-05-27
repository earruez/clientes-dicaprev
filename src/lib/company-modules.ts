export const COMPANY_MODULES = [
  "dashboard",
  "empresa",
  "trabajadores",
  "cumplimiento",
  "documentacion",
  "plan_trabajo",
  "acreditaciones",
  "biblioteca_capacitaciones",
  "notificaciones",
] as const;

export type CompanyModuleKey = (typeof COMPANY_MODULES)[number];

export const COMPANY_MODULE_LABELS: Record<CompanyModuleKey, string> = {
  dashboard: "Dashboard",
  empresa: "Empresa",
  trabajadores: "Trabajadores",
  cumplimiento: "Cumplimiento",
  documentacion: "Documentación",
  plan_trabajo: "Plan de trabajo",
  acreditaciones: "Acreditaciones",
  biblioteca_capacitaciones: "Biblioteca / Capacitaciones",
  notificaciones: "Notificaciones",
};
