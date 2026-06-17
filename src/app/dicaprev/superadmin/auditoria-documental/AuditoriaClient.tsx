"use client";

import { useState, useTransition } from "react";
import { ejecutarAuditoriaDocumental, type ResultadoAuditoria } from "./actions";
import { CheckCircle2, AlertCircle, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuditoriaClientProps {
  empresaId: string;
  empresaNombre: string;
  auditoriaInicial: ResultadoAuditoria;
}

export function AuditoriaClient({
  empresaId,
  empresaNombre,
  auditoriaInicial,
}: AuditoriaClientProps) {
  const [auditoria, setAuditoria] = useState(auditoriaInicial);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const handleActualizar = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        const resultado = await ejecutarAuditoriaDocumental(empresaId);
        setAuditoria(resultado);
        setMessage({ type: "success", text: "Auditoría actualizada correctamente" });
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Error al actualizar auditoría",
        });
      }
    });
  };

  const getIconoEstado = (estado: string) => {
    switch (estado) {
      case "ok":
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      case "advertencia":
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case "crítico":
        return <AlertCircle className="h-5 w-5 text-rose-600" />;
      default:
        return null;
    }
  };

  const getColorEstado = (estado: string) => {
    switch (estado) {
      case "ok":
        return "border-emerald-200 bg-emerald-50";
      case "advertencia":
        return "border-amber-200 bg-amber-50";
      case "crítico":
        return "border-rose-200 bg-rose-50";
      default:
        return "border-slate-200 bg-slate-50";
    }
  };

  const getColorBadge = (estado: string) => {
    switch (estado) {
      case "ok":
        return "bg-emerald-100 text-emerald-800";
      case "advertencia":
        return "bg-amber-100 text-amber-800";
      case "crítico":
        return "bg-rose-100 text-rose-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Auditoría Documental</h2>
          <p className="mt-1 text-sm text-slate-600">
            Empresa: <span className="font-semibold">{empresaNombre}</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Última auditoría: {new Date(auditoria.timestamp).toLocaleString("es-CL")}
          </p>
        </div>
        <Button
          onClick={handleActualizar}
          disabled={isPending}
          className="gap-2"
          variant="outline"
        >
          <RotateCcw className="h-4 w-4" />
          {isPending ? "Actualizando..." : "Actualizar auditoría"}
        </Button>
      </div>

      {/* Mensajes */}
      {message && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          )}
        >
          {message.text}
        </div>
      )}

      {/* Cards por módulo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(auditoria.modulos).map(([key, modulo]) => (
          <div
            key={key}
            className={cn(
              "rounded-lg border p-5 shadow-sm transition-colors",
              getColorEstado(modulo.estado)
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {getIconoEstado(modulo.estado)}
                  <h3 className="font-semibold text-slate-900">{modulo.nombre}</h3>
                </div>
                <p
                  className={cn(
                    "mt-1 inline-block rounded-full px-2 py-1 text-xs font-medium",
                    getColorBadge(modulo.estado)
                  )}
                >
                  {modulo.estado === "ok"
                    ? "OK"
                    : modulo.estado === "advertencia"
                      ? "Advertencia"
                      : "Crítico"}
                </p>
              </div>
            </div>

            {/* Conteos */}
            <div className="mt-4 space-y-2 border-t border-current border-opacity-10 pt-4">
              {Object.entries(modulo.conteos).map(([contador, valor]) => (
                <div key={contador} className="flex justify-between text-sm">
                  <span className="text-slate-600 capitalize">
                    {contador.replace(/([A-Z])/g, " $1").trim()}:
                  </span>
                  <span className="font-semibold text-slate-900">{valor}</span>
                </div>
              ))}
            </div>

            {/* Inconsistencias del módulo */}
            {modulo.inconsistencias.length > 0 && (
              <div className="mt-4 border-t border-current border-opacity-10 pt-4">
                <p className="text-xs font-semibold text-slate-900 mb-2">
                  Problemas detectados:
                </p>
                <ul className="space-y-1 text-xs">
                  {modulo.inconsistencias.map((incon, idx) => (
                    <li key={idx} className="text-slate-700">
                      • {incon.problema}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Acción sugerida */}
            {modulo.accionSugerida && (
              <div className="mt-3 rounded bg-white bg-opacity-50 p-2 text-xs text-slate-700">
                <strong>Sugerencia:</strong> {modulo.accionSugerida}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Inconsistencias críticas globales */}
      {auditoria.inconsistenciasGlobales.length > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-rose-600" />
            <h3 className="font-semibold text-slate-900">
              Problemas críticos detectados ({auditoria.inconsistenciasGlobales.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rose-200">
                  <th className="px-3 py-2 text-left font-semibold text-slate-900">Módulo</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-900">Problema</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-900">
                    Solución sugerida
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditoria.inconsistenciasGlobales.map((incon, idx) => (
                  <tr key={idx} className="border-b border-rose-100">
                    <td className="px-3 py-3 text-slate-600">{incon.modulo}</td>
                    <td className="px-3 py-3 text-slate-900 font-medium">{incon.problema}</td>
                    <td className="px-3 py-3 text-slate-700">{incon.solucionSugerida}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resumen sin problemas */}
      {auditoria.inconsistenciasGlobales.length === 0 &&
        Object.values(auditoria.modulos).every((m) => m.estado === "ok") && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="font-semibold text-emerald-900">
                ✓ Auditoría completada sin problemas críticos
              </p>
            </div>
          </div>
        )}
    </div>
  );
}
