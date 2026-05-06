"use client";

import { useEffect, useMemo, useState } from "react";
import { PERMISSIONS, type PermissionKey, type UserRole } from "@/lib/permissions-matrix";

type MePermissionsResponse = {
  role: UserRole;
  email: string;
};

export function hasPermission(permission: PermissionKey, role: UserRole | null | undefined) {
  if (!role) return false;
  if (role === "SUPERADMIN") return true;
  return PERMISSIONS[permission].some((allowedRole) => allowedRole === role);
}

export function usePermissions() {
  const [role, setRole] = useState<UserRole | null>(null);
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
        }
      })
      .catch(() => {
        if (mounted) {
          setRole(null);
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

  return {
    role,
    loading,
    hasPermission: checker,
  };
}