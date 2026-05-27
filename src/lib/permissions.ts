"use client";

import { useEffect, useMemo, useState } from "react";
import { PERMISSIONS, type PermissionKey, type UserRole } from "@/lib/permissions-matrix";
import type { CompanyModuleKey } from "@/lib/company-modules";

type MePermissionsResponse = {
  role: UserRole;
  email: string;
  modulos?: Partial<Record<CompanyModuleKey, boolean>>;
};

export function hasPermission(permission: PermissionKey, role: UserRole | null | undefined) {
  if (!role) return false;
  if (role === "SUPERADMIN") return true;
  return PERMISSIONS[permission].some((allowedRole) => allowedRole === role);
}

export function usePermissions() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [modulos, setModulos] = useState<Set<CompanyModuleKey>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetch("/api/dicaprev/me/permissions", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No se pudo obtener el rol del usuario");
        }
        return (await response.json()) as MePermissionsResponse;
      })
      .then((data) => {
        if (mounted) {
          setRole(data.role);
          const enabled = new Set<CompanyModuleKey>();
          Object.entries(data.modulos ?? {}).forEach(([key, value]) => {
            if (value) {
              enabled.add(key as CompanyModuleKey);
            }
          });
          setModulos(enabled);
        }
      })
      .catch(() => {
        if (mounted) {
          setRole(null);
          setModulos(new Set());
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const checker = useMemo(() => {
    return (permission: PermissionKey) => hasPermission(permission, role);
  }, [role]);

  const hasModule = useMemo(() => {
    return (module: CompanyModuleKey) => {
      if (role === "SUPERADMIN") return true;
      if (modulos.size === 0) return true;
      return modulos.has(module);
    };
  }, [modulos, role]);

  return {
    role,
    loading,
    hasPermission: checker,
    hasModule,
  };
}