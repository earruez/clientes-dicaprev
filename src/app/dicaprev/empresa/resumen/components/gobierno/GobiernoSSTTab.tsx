import React from "react";
import { GobiernoSSTData } from "@/app/dicaprev/empresa/resumen/types";

interface GobiernoSSTTabProps {
  data: GobiernoSSTData;
}

const GobiernoSSTTab: React.FC<GobiernoSSTTabProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold text-gray-700">Comité Paritario</h3>
          <p className="text-gray-900">{data.comiteParitario}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold text-gray-700">Delegado SST</h3>
          <p className="text-gray-900">{data.delegadoSST}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold text-gray-700">Tasa DS67</h3>
          <p className="text-gray-900">{data.tasaDS67}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold text-gray-700">Accidentabilidad</h3>
          <p className="text-gray-900">{data.accidentabilidad}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold text-gray-700">Reglamento Interno</h3>
          <p className="text-gray-900">{data.reglamentoInterno}</p>
        </div>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold text-gray-700">Fechas Clave</h3>
        <p className="text-gray-900">Última Elección: {data.keyDates.ultimaEleccion}</p>
        <p className="text-gray-900">Vigencia Hasta: {data.keyDates.vigenciaHasta}</p>
      </div>
    </div>
  );
};

export default GobiernoSSTTab;