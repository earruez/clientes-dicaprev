"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { generarDocumentosFaltantes, getResumenEmpresa } from "@/app/dicaprev/empresa/resumen/actions";
import { getAlertasEmpresa } from "@/app/dicaprev/alertas/actions";
import HeaderResumenEmpresa from "@/app/dicaprev/empresa/resumen/components/HeaderResumenEmpresa";
import TabsResumenEmpresa from "@/app/dicaprev/empresa/resumen/components/TabsResumenEmpresa";
import GeneralTab from "@/app/dicaprev/empresa/resumen/components/general/GeneralTab";
import GobiernoSSTTab from "@/app/dicaprev/empresa/resumen/components/gobierno/GobiernoSSTTab";
import EstructuraTab from "@/app/dicaprev/empresa/resumen/components/estructura/EstructuraTab";
import DS44Tab from "@/app/dicaprev/empresa/resumen/components/ds44/DS44Tab";
import type { ResumenData } from "@/app/dicaprev/empresa/resumen/types";
import type { AlertaCumplimiento } from "@/lib/alertas/cumplimiento-alertas";

const EMPTY_RESUMEN: ResumenData = {
  general: {
    razonSocial: "",
    rutEmpresa: "",
    representanteLegal: "",
    rutRepresentante: "",
    direccion: "",
    comuna: "",
    region: "",
    giro: "",
    cantidadTrabajadores: 0,
    cantidadCentrosTrabajo: 0,
  },
  gobierno: {
    comiteParitario: "-",
    delegadoSST: "-",
    tasaDS67: "-",
    accidentabilidad: "-",
    reglamentoInterno: "-",
    comiteEstado: "-",
    cumplimientoDocumentalEmpresa: 0,
    documentosVigentes: 0,
    documentosPendientes: 0,
    documentosVencidos: 0,
    documentosPorVencer: 0,
    keyDates: {
      ultimaEleccion: "-",
      vigenciaHasta: "-",
    },
  },
  estructura: {
    areas: 0,
    cargos: 0,
    puestos: 0,
    trabajadores: 0,
    posicionesCubiertas: 0,
    vacantes: 0,
    organigrama: "Estructura jerárquica de la empresa",
  },
};

function ResumenPageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "general";
  const [resumenData, setResumenData] = useState<ResumenData>(EMPTY_RESUMEN);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [alertas, setAlertas] = useState<AlertaCumplimiento[]>([]);
  const [empresaId, setEmpresaId] = useState<string>("");
  const [cumplimiento, setCumplimiento] = useState<{
    porcentaje: number;
    totalAplicables: number;
    totalCumple: number;
    totalFaltantes: number;
    totalIncompletos: number;
  } | null>(null);
  const [cumplimientoLoading, setCumplimientoLoading] = useState(true);
  const [generacionLoading, setGeneracionLoading] = useState(false);
  const [generacionMensaje, setGeneracionMensaje] = useState<string>("");

  const cumplimientoColorClasses = (() => {
    const porcentaje = cumplimiento?.porcentaje ?? 0;
    if (porcentaje < 50) {
      return {
        card: "border-red-200 bg-red-50",
        value: "text-red-700",
        label: "text-red-600",
        chip: "bg-red-100 text-red-700",
      };
    }
    if (porcentaje < 80) {
      return {
        card: "border-amber-200 bg-amber-50",
        value: "text-amber-700",
        label: "text-amber-600",
        chip: "bg-amber-100 text-amber-700",
      };
    }
    return {
      card: "border-emerald-200 bg-emerald-50",
      value: "text-emerald-700",
      label: "text-emerald-600",
      chip: "bg-emerald-100 text-emerald-700",
    };
  })();

  useEffect(() => {
    let mounted = true;

    setCumplimientoLoading(true);

    getResumenEmpresa()
      .then((result) => {
        if (!mounted) return;

        setEmpresaId(result.empresa.id);
        setCumplimiento(result.cumplimiento);
        setCumplimientoLoading(false);

        setResumenData({
          general: {
            razonSocial: result.empresa.razonSocial,
            rutEmpresa: result.empresa.rut,
            representanteLegal: "",
            rutRepresentante: "",
            direccion: result.empresa.direccion,
            comuna: result.empresa.comuna,
            region: result.empresa.region,
            giro: result.empresa.giro,
            cantidadTrabajadores: result.kpis.totalTrabajadoresActivos,
            cantidadCentrosTrabajo: result.kpis.totalCentros,
          },
          gobierno: {
            comiteParitario: "-",
            delegadoSST: "-",
            tasaDS67: "-",
            accidentabilidad: "-",
            reglamentoInterno: "-",
            comiteEstado: "-",
            cumplimientoDocumentalEmpresa: result.cumplimiento.porcentaje,
            documentosVigentes: result.kpis.documentosVigentes,
            documentosPendientes: result.kpis.documentosPendientes,
            documentosVencidos: result.kpis.documentosVencidos,
            documentosPorVencer: result.kpis.documentosPorVencer,
            keyDates: {
              ultimaEleccion: "-",
              vigenciaHasta: "-",
            },
          },
          estructura: {
            areas: result.kpis.totalAreas,
            cargos: result.kpis.totalCargos,
            puestos: result.kpis.totalPosicionesDotacion,
            trabajadores: result.kpis.totalTrabajadoresActivos,
            posicionesCubiertas: result.kpis.totalPosicionesCubiertas,
            vacantes: result.kpis.totalVacantes,
            organigrama: "Estructura jerárquica de la empresa",
          },
        });
      })
      .catch(() => {
        if (!mounted) return;
        setCumplimientoLoading(false);
        setResumenData(EMPTY_RESUMEN);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    getAlertasEmpresa()
      .then((result) => {
        if (!mounted) return;
        setAlertas(result.alertas.slice(0, 6));
      })
      .catch(() => {
        if (!mounted) return;
        setAlertas([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const updateResumenData = (updatedData: Partial<ResumenData>) => {
    setResumenData((prev) => ({ ...prev, ...updatedData }));
  };

  const recargarResumen = async () => {
    const result = await getResumenEmpresa();

    setEmpresaId(result.empresa.id);
    setCumplimiento(result.cumplimiento);

    setResumenData({
      general: {
        razonSocial: result.empresa.razonSocial,
        rutEmpresa: result.empresa.rut,
        representanteLegal: "",
        rutRepresentante: "",
        direccion: result.empresa.direccion,
        comuna: result.empresa.comuna,
        region: result.empresa.region,
        giro: result.empresa.giro,
        cantidadTrabajadores: result.kpis.totalTrabajadoresActivos,
        cantidadCentrosTrabajo: result.kpis.totalCentros,
      },
      gobierno: {
        comiteParitario: "-",
        delegadoSST: "-",
        tasaDS67: "-",
        accidentabilidad: "-",
        reglamentoInterno: "-",
        comiteEstado: "-",
        cumplimientoDocumentalEmpresa: result.cumplimiento.porcentaje,
        documentosVigentes: result.kpis.documentosVigentes,
        documentosPendientes: result.kpis.documentosPendientes,
        documentosVencidos: result.kpis.documentosVencidos,
        documentosPorVencer: result.kpis.documentosPorVencer,
        keyDates: {
          ultimaEleccion: "-",
          vigenciaHasta: "-",
        },
      },
      estructura: {
        areas: result.kpis.totalAreas,
        cargos: result.kpis.totalCargos,
        puestos: result.kpis.totalPosicionesDotacion,
        trabajadores: result.kpis.totalTrabajadoresActivos,
        posicionesCubiertas: result.kpis.totalPosicionesCubiertas,
        vacantes: result.kpis.totalVacantes,
        organigrama: "Estructura jerárquica de la empresa",
      },
    });
  };

  const onGenerarDocumentos = async () => {
    if (!empresaId || generacionLoading) return;
    setGeneracionLoading(true);
    setGeneracionMensaje("");

    try {
      const resultado = await generarDocumentosFaltantes({ empresaId });
      setGeneracionMensaje(
        `Generados ${resultado.generados}, actualizados ${resultado.actualizados}, omitidos ${resultado.omitidos}`,
      );
      await recargarResumen();
    } catch {
      setGeneracionMensaje("No fue posible generar documentos en este momento.");
    } finally {
      setGeneracionLoading(false);
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "general":
        return (
          <GeneralTab
            data={resumenData.general}
            onSave={(updatedData) =>
              updateResumenData({
                general: {
                  ...resumenData.general,
                  ...updatedData,
                },
              })
            }
          />
        );
      case "gobierno":
        return <GobiernoSSTTab data={resumenData.gobierno} />;
      case "estructura":
        return <EstructuraTab data={resumenData.estructura} />;
      case "ds44":
        return <DS44Tab />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <HeaderResumenEmpresa />
      <div className={`mt-4 rounded-xl border p-4 shadow-sm ${cumplimientoColorClasses.card}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${cumplimientoColorClasses.label}`}>
              Cumplimiento SST
            </p>
            {cumplimientoLoading ? (
              <p className="mt-1 text-sm text-slate-600">Calculando...</p>
            ) : (
              <p className={`mt-1 text-4xl font-bold ${cumplimientoColorClasses.value}`}>
                {Math.round(cumplimiento?.porcentaje ?? 0)}%
              </p>
            )}
          </div>

          {!cumplimientoLoading && (
            <div className="flex flex-col items-end gap-2 text-sm font-medium">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 ${cumplimientoColorClasses.chip}`}>
                  Cumple {cumplimiento?.totalCumple ?? 0}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  Incompletos {cumplimiento?.totalIncompletos ?? 0}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  Faltantes {cumplimiento?.totalFaltantes ?? 0}
                </span>
              </div>

              <button
                type="button"
                onClick={onGenerarDocumentos}
                disabled={generacionLoading || !empresaId}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generacionLoading ? "Generando..." : "Generar documentos faltantes"}
              </button>
            </div>
          )}
        </div>
        {generacionMensaje ? (
          <p className="mt-2 text-xs text-slate-600">{generacionMensaje}</p>
        ) : null}
      </div>
      <TabsResumenEmpresa activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Alertas de cumplimiento</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {alertas.length}
          </span>
        </div>

        {alertas.length === 0 ? (
          <p className="text-sm text-slate-500">Sin alertas activas.</p>
        ) : (
          <ul className="space-y-2">
            {alertas.map((alerta) => (
              <li key={alerta.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-sm font-medium text-slate-800">{alerta.documento}</p>
                <p className="text-xs text-slate-600">{alerta.mensaje}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-6">{renderActiveTab()}</div>
    </div>
  );
}

export default function ResumenPage() {
  return (
    <Suspense>
      <ResumenPageContent />
    </Suspense>
  );
}