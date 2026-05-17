import { useState } from "react";
import { ResumenData } from "@/app/dicaprev/empresa/resumen/types";

const mockData: ResumenData = {
  general: {
    razonSocial: "MVP CHILE SPA",
    rutEmpresa: "76.653.076-1",
    representanteLegal: "Jorge Mena Contreras",
    rutRepresentante: "11.234.567-8",
    direccion: "Avenida Irarrázabal 5185, oficina 503",
    comuna: "Ñuñoa",
    region: "Metropolitana de Santiago",
    giro: "Fabricación e instalación de ventanas de PVC y aluminio",
    cantidadTrabajadores: 5,
    cantidadCentrosTrabajo: 1,
  },
  gobierno: {
    comiteParitario: "Vigente",
    delegadoSST: "No Aplica",
    tasaDS67: "1.70%",
    accidentabilidad: "1.2%",
    reglamentoInterno: "Vigente",
    comiteEstado: "Constituido",
    cumplimientoDocumentalEmpresa: 85,
    documentosVigentes: 17,
    documentosPendientes: 2,
    documentosVencidos: 1,
    documentosPorVencer: 3,
    keyDates: {
      ultimaEleccion: "12-11-2024",
      vigenciaHasta: "12-11-2026",
    },
  },
  estructura: {
    areas: 2,
    cargos: 4,
    puestos: 4,
    trabajadores: 5,
    posicionesCubiertas: 3,
    vacantes: 1,
    organigrama: "Estructura jerárquica de la empresa",
  },
};

const useResumenEmpresa = () => {
  const [resumenData, setResumenData] = useState<ResumenData>(mockData);

  const updateResumenData = (updatedData: Partial<ResumenData>) => {
    setResumenData((prev) => ({ ...prev, ...updatedData }));
  };

  return { resumenData, updateResumenData };
};

export default useResumenEmpresa;