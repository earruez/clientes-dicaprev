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

async function fetchPermissions(): Promise<PermissionsPayload> {
  const response = await fetch("/api/dicaprev/me/permissions", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("No se pudo obtener el contexto de empresa");
  }
  return (await response.json()) as PermissionsPayload;
}

export default function ActiveCompanySelector() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string>("");
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);

  useEffect(() => {
    let mounted = true;

    fetchPermissions()
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
          router.push("/dicaprev/dashboard");
          router.refresh();
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "No se pudo cambiar la empresa activa");
        });
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
        <Building2 className="h-4 w-4 text-slate-500" />
        <span className="text-xs text-slate-500">Cargando empresa...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5">
        <Building2 className="h-4 w-4 text-amber-700" />
        <span className="text-xs text-amber-700">Sin empresa activa</span>
      </div>
    );
  }

  if (!empresaId || !empresaActiva) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
        <Building2 className="h-4 w-4 text-slate-500" />
        <span className="text-xs text-slate-600">Sin empresa activa</span>
      </div>
    );
  }

  if (!canSelect) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
        <Building2 className="h-4 w-4 text-slate-500" />
        <span className="text-xs font-medium text-slate-700">{empresaActiva.nombre}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5">
      <Building2 className="h-4 w-4 text-slate-500" />
      <select
        className="min-w-[180px] border-0 bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
        value={empresaId}
        onChange={(event) => onChangeEmpresa(event.target.value)}
        disabled={isPending}
        aria-label="Empresa activa"
      >
        {empresas.map((empresa) => (
          <option key={empresa.id} value={empresa.id}>
            {empresa.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
