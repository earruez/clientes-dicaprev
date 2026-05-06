"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getResumenEmpresa } from "@/app/dicaprev/empresa/resumen/actions";
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

  useEffect(() => {
    let mounted = true;

    getResumenEmpresa()
      .then((result) => {
        if (!mounted) return;

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
            cumplimientoDocumentalEmpresa: result.kpis.cumplimientoDocumentalEmpresa,
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