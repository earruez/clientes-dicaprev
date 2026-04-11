"use client";

import { Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface SSTConfigCardProps {
  comiteParitario: boolean;
  expertoPrevencion: boolean;
  departamentoPrevencion: boolean;
  organismoAdministrador: string;
  clasificacionRiesgo: string;
  cantidadTrabajadores: number;
  onEdit?: () => void;
  className?: string;
}

export function SSTConfigCard({
  comiteParitario,
  expertoPrevencion,
  departamentoPrevencion,
  organismoAdministrador,
  clasificacionRiesgo,
  cantidadTrabajadores,
  onEdit,
  className
}: SSTConfigCardProps) {
  const getStatusBadge = (active: boolean, recommended: boolean = false) => {
    if (active) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <CheckCircle className="h-3 w-3" />
          Activo
        </span>
      );
    } else if (recommended) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
          <AlertTriangle className="h-3 w-3" />
          Recomendado
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          <XCircle className="h-3 w-3" />
          No aplica
        </span>
      );
    }
  };

  const getSSTRecommendations = () => {
    const recommendations = [];
    if (cantidadTrabajadores >= 25 && !comiteParitario) {
      recommendations.push("Comité paritario obligatorio (≥25 trabajadores)");
    }
    if (cantidadTrabajadores >= 100 && !departamentoPrevencion) {
      recommendations.push("Departamento de prevención obligatorio (≥100 trabajadores)");
    }
    return recommendations;
  };

  const recommendations = getSSTRecommendations();

  return (
    <article className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${className || ""}`}>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Shield className="h-5 w-5 text-emerald-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Configuración SST</h3>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Shield className="h-4 w-4" />
            Editar
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Elementos SST */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Comité paritario</p>
            {getStatusBadge(comiteParitario, cantidadTrabajadores >= 25)}
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Experto en prevención</p>
            {getStatusBadge(expertoPrevencion)}
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Departamento prevención</p>
            {getStatusBadge(departamentoPrevencion, cantidadTrabajadores >= 100)}
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Clasificación de riesgo</p>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
              {clasificacionRiesgo || "No definida"}
            </span>
          </div>
        </div>

        {/* Organismo Administrador */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Organismo administrador</p>
          <p className="text-lg font-semibold text-slate-900">{organismoAdministrador || "No definido"}</p>
        </div>

        {/* Recomendaciones */}
        {recommendations.length > 0 && (
          <div className="rounded-lg bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-semibold text-amber-900">Recomendaciones SST</h4>
                <ul className="space-y-1 text-sm text-amber-800">
                  {recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Estado General */}
        <div className="rounded-lg bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">Configuración SST</p>
              <p className="text-sm text-emerald-700">
                {comiteParitario && expertoPrevencion && departamentoPrevencion
                  ? "Completamente configurada"
                  : "Configuración parcial - revisar recomendaciones"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
