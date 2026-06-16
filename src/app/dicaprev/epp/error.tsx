"use client";

import { useEffect } from "react";
import { AlertTriangle, Home } from "lucide-react";
import Link from "next/link";

export default function EppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[epp error]", error);
  }, [error]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-slate-50 p-6">
      <div className="text-center max-w-md space-y-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Error al cargar EPP</h1>
        <p className="text-sm text-slate-600">
          {error.message || "Se produjo un error inesperado. Por favor intenta más tarde."}
        </p>
        {error.digest && <p className="text-xs text-slate-500">ID del error: {error.digest}</p>}
        <div className="flex gap-2 justify-center pt-4">
          <button
            onClick={() => reset()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            Reintentar
          </button>
          <Link
            href="/dicaprev"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Home className="h-4 w-4" />
            Volver
          </Link>
        </div>
      </div>
    </div>
  );
}
