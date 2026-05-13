"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Bell } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import {
  getAlertasDocumentalesEmpresa,
  getContextoFijoDocumentacion,
  type AlertasDocumentalesEmpresaResultado,
} from "@/app/dicaprev/documentacion/actions";

type FiltroSeveridad = "todas" | "critica" | "alta" | "media" | "baja";

const SEVERIDAD_ORDEN: Record<Exclude<FiltroSeveridad, "todas">, number> = {
  critica: 1,
  alta: 2,
  media: 3,
  baja: 4,
};

function tipoLabel(tipo: AlertasDocumentalesEmpresaResultado["alertas"][number]["tipo"]) {
  const map = {
    faltante: "Faltante",
    incompleto: "Incompleto",
    pendiente_firma: "Pendiente firma",
    vencido: "Vencido",
    por_vencer: "Por vencer",
  } as const;
  return map[tipo] ?? tipo;
}

function severidadStyles(severidad: Exclude<FiltroSeveridad, "todas">) {
  if (severidad === "critica") return "border-red-200 bg-red-50 text-red-700";
  if (severidad === "alta") return "border-orange-200 bg-orange-50 text-orange-700";
  if (severidad === "media") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function resolverLinkAlerta(entidad: "empresa" | "trabajador") {
  return entidad === "trabajador"
    ? "/dicaprev/trabajadores/control-documental"
    : "/dicaprev/documentacion";
}

function AlertasDocumentalesPageContent() {
  const searchParams = useSearchParams();
  const initialFiltro = (searchParams.get("severidad") ?? "todas") as FiltroSeveridad;
  const [filtro, setFiltro] = useState<FiltroSeveridad>(
    ["todas", "critica", "alta", "media", "baja"].includes(initialFiltro) ? initialFiltro : "todas",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<AlertasDocumentalesEmpresaResultado | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const contexto = await getContextoFijoDocumentacion();
        const data = await getAlertasDocumentalesEmpresa({ empresaId: contexto.empresaId });
        setResultado(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudieron cargar alertas documentales.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const alertasFiltradas = useMemo(() => {
    const alertas = resultado?.alertas ?? [];
    const filtradas = filtro === "todas" ? alertas : alertas.filter((a) => a.severidad === filtro);

    return [...filtradas].sort((a, b) => {
      const byLevel = SEVERIDAD_ORDEN[a.severidad] - SEVERIDAD_ORDEN[b.severidad];
      if (byLevel !== 0) return byLevel;
      const dateA = a.fechaReferencia ? new Date(a.fechaReferencia).getTime() : 0;
      const dateB = b.fechaReferencia ? new Date(b.fechaReferencia).getTime() : 0;
      return dateB - dateA;
    });
  }, [resultado, filtro]);

  const counters = {
    todas: resultado?.resumen.total ?? 0,
    critica: resultado?.resumen.critica ?? 0,
    alta: resultado?.resumen.alta ?? 0,
    media: resultado?.resumen.media ?? 0,
    baja: resultado?.resumen.baja ?? 0,
  };

  return (
    <div className="space-y-5">
      <StandardPageHeader
        moduleLabel="Sistema"
        title="Alertas documentales"
        description="Alertas de faltantes, incompletos, pendientes de firma y vencimientos."
        icon={Bell}
      />

      <div className="flex flex-wrap gap-2">
        {([
          ["todas", "Todas"],
          ["critica", "Críticas"],
          ["alta", "Altas"],
          ["media", "Medias"],
          ["baja", "Bajas"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={
              filtro === key
                ? "rounded-full border border-slate-900 bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white"
                : "rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            }
          >
            {label} <span className="ml-1">({counters[key]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          Cargando alertas...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : alertasFiltradas.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          No hay alertas para el filtro seleccionado.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-12 gap-2 border-b border-slate-200 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <div className="col-span-2">Severidad</div>
            <div className="col-span-2">Tipo</div>
            <div className="col-span-5">Documento / Regla</div>
            <div className="col-span-1">Estado</div>
            <div className="col-span-2 text-right">Acción</div>
          </div>

          <div className="divide-y divide-slate-100">
            {alertasFiltradas.map((alerta) => (
              <div key={alerta.key} className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm">
                <div className="col-span-2">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${severidadStyles(alerta.severidad)}`}>
                    {alerta.severidad}
                  </span>
                </div>
                <div className="col-span-2 text-slate-700">{tipoLabel(alerta.tipo)}</div>
                <div className="col-span-5 text-slate-700">
                  <p className="font-medium text-slate-800">{alerta.documentoNombre ?? alerta.titulo}</p>
                  <p className="text-xs text-slate-500">{alerta.descripcion}</p>
                </div>
                <div className="col-span-1">
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs text-sky-700">
                    <AlertTriangle className="h-3 w-3" />{alerta.estado}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <Link
                    href={resolverLinkAlerta(alerta.entidad)}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Ver documento <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AlertasDocumentalesPage() {
  return (
    <Suspense fallback={<div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">Cargando alertas...</div>}>
      <AlertasDocumentalesPageContent />
    </Suspense>
  );
}
