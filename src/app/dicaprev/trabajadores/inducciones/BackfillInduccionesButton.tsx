"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { sincronizarInduccionesExistentesConCarpetaTrabajador } from "@/actions/inducciones";
import type { SincronizacionBackfillResumen } from "@/actions/inducciones/types";

type EstadoResultado = {
  tipo: "success" | "error";
  mensaje: string;
};

export default function BackfillInduccionesButton() {
  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<EstadoResultado | null>(null);

  const ejecutarBackfill = () => {
    if (isPending) return;

    const confirmacion = window.confirm(
      "¿Deseas sincronizar las inducciones históricas con la carpeta documental del trabajador?",
    );

    if (!confirmacion) return;

    setResultado(null);

    startTransition(async () => {
      try {
        const resumen: SincronizacionBackfillResumen =
          await sincronizarInduccionesExistentesConCarpetaTrabajador();

        const base = `Sincronización completada: ${resumen.revisados} revisados, ${resumen.creados} creados, ${resumen.actualizados} actualizados, ${resumen.omitidos} omitidos.`;
        const conErrores =
          resumen.errores.length > 0
            ? `${base} ${resumen.errores.length} con error.`
            : base;

        setResultado({
          tipo: resumen.errores.length > 0 ? "error" : "success",
          mensaje: conErrores,
        });
      } catch {
        setResultado({
          tipo: "error",
          mensaje: "No se pudo sincronizar la carpeta documental de inducciones.",
        });
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={ejecutarBackfill}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {isPending ? "Sincronizando..." : "Sincronizar carpeta documental"}
      </button>

      {resultado ? (
        <p
          className={`max-w-md text-right text-xs ${
            resultado.tipo === "success" ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {resultado.mensaje}
        </p>
      ) : null}
    </div>
  );
}
