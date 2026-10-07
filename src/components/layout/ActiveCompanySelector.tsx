"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

type EmpresaOption = {
  id: string;
  nombre: string;
};

type PermissionsPayload = {
  role: string;
  email: string;
  empresaId?: string;
  empresas?: EmpresaOption[];
};

const PERMISSIONS_RETRY_DELAYS_MS = [300, 900, 1800] as const;

async function fetchPermissions(): Promise<PermissionsPayload> {
  const response = await fetch("/api/dicaprev/me/permissions", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("No se pudo obtener el contexto de empresa");
  }
  return (await response.json()) as PermissionsPayload;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchPermissionsWithRetry(): Promise<PermissionsPayload> {
  let lastError: unknown = null;

  for (const delayMs of PERMISSIONS_RETRY_DELAYS_MS) {
    try {
      return await fetchPermissions();
    } catch (error) {
      lastError = error;
      await wait(delayMs);
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("No se pudo obtener el contexto de empresa");
}

type ActiveCompanySelectorProps = {
  variant?: "desktop" | "mobile" | "menu";
};

export default function ActiveCompanySelector({ variant = "desktop" }: ActiveCompanySelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string>("");
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);

  useEffect(() => {
    const handleCompanyChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ empresaId?: string }>).detail;
      if (detail?.empresaId) {
        setEmpresaId(detail.empresaId);
      }
    };

    window.addEventListener("nextprev:empresa-activa", handleCompanyChanged);

    let mounted = true;

    fetchPermissionsWithRetry()
      .then((data) => {
        if (!mounted) {
          return;
        }
        setEmpresaId(data.empresaId ?? "");
        setEmpresas(Array.isArray(data.empresas) ? data.empresas : []);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) {
          return;
        }
        setEmpresaId("");
        setEmpresas([]);
        setError(err instanceof Error ? err.message : "No se pudo cargar la empresa activa");
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      window.removeEventListener("nextprev:empresa-activa", handleCompanyChanged);
    };
  }, []);

  const empresaActiva = useMemo(() => {
    return empresas.find((empresa) => empresa.id === empresaId) ?? null;
  }, [empresaId, empresas]);

  const canSelect = empresas.length > 1;

  const onChangeEmpresa = (nextEmpresaId: string) => {
    setError(null);

    startTransition(() => {
      fetch("/api/dicaprev/me/empresa-activa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ empresaId: nextEmpresaId }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const data = (await response.json().catch(() => ({}))) as { error?: string };
            throw new Error(data.error ?? "No se pudo cambiar la empresa activa");
          }
          setEmpresaId(nextEmpresaId);
          window.dispatchEvent(
            new CustomEvent("nextprev:empresa-activa", { detail: { empresaId: nextEmpresaId } }),
          );
          router.push("/dicaprev/dashboard");
          router.refresh();
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "No se pudo cambiar la empresa activa");
        });
    });
  };

  const isMobile = variant === "mobile";
  const isMenu = variant === "menu";

  const shellClass = isMobile
    ? "flex min-w-0 max-w-[142px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5"
    : isMenu
      ? "flex w-full min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
      : "flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5";

  const selectClass = isMobile
    ? "min-w-0 max-w-[112px] flex-1 border-0 bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-none"
    : isMenu
      ? "min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
      : "min-w-[180px] border-0 bg-transparent text-xs font-medium text-slate-700 focus:outline-none";

  const labelClass = isMobile
    ? "min-w-0 truncate text-[11px] font-semibold text-slate-700"
    : isMenu
      ? "min-w-0 truncate text-sm font-semibold text-slate-700"
      : "text-xs font-medium text-slate-700";

  if (loading) {
    return (
      <div className={shellClass}>
        <Building2 className="h-4 w-4 shrink-0 text-slate-500" />
        <span className={isMobile ? "truncate text-[11px] text-slate-500" : "text-xs text-slate-500"}>
          {isMobile ? "Empresa..." : "Cargando empresa..."}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={shellClass}>
        <Building2 className="h-4 w-4 shrink-0 text-amber-700" />
        <span className={isMobile ? "truncate text-[11px] text-amber-700" : "text-xs text-amber-700"}>
          Sin empresa activa
        </span>
      </div>
    );
  }

  if (!empresaId || !empresaActiva) {
    return (
      <div className={shellClass}>
        <Building2 className="h-4 w-4 shrink-0 text-slate-500" />
        <span className={isMobile ? "truncate text-[11px] text-slate-600" : "text-xs text-slate-600"}>
          Sin empresa activa
        </span>
      </div>
    );
  }

  const content = !canSelect ? (
    <span className={labelClass} title={empresaActiva.nombre}>
      {empresaActiva.nombre}
    </span>
  ) : (
    <select
      className={selectClass}
      value={empresaId}
      onChange={(event) => onChangeEmpresa(event.target.value)}
      disabled={isPending}
      aria-label="Empresa activa"
      title={empresaActiva.nombre}
    >
      {empresas.map((empresa) => (
        <option key={empresa.id} value={empresa.id}>
          {empresa.nombre}
        </option>
      ))}
    </select>
  );

  if (isMenu) {
    return (
      <div className="space-y-1.5">
        <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Empresa activa
        </p>
        <div className={shellClass}>
          <Building2 className="h-4 w-4 shrink-0 text-emerald-600" />
          {content}
        </div>
        {canSelect ? (
          <p className="px-0.5 text-[11px] leading-4 text-slate-500">
            Cambiar de empresa te llevará al dashboard de la empresa seleccionada.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <Building2 className="h-4 w-4 shrink-0 text-emerald-600" />
      {content}
    </div>
  );
}
