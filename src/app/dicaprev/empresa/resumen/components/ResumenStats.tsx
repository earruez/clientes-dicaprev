import React from "react";

interface ResumenStatsProps {
  totalTrabajadores: number;
  totalCentros: number;
  cumplimientoGlobal: string;
}

const ResumenStats: React.FC<ResumenStatsProps> = ({ totalTrabajadores, totalCentros, cumplimientoGlobal }) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold text-gray-700">Trabajadores Totales</h3>
        <p className="text-2xl font-bold text-gray-900">{totalTrabajadores}</p>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold text-gray-700">Centros de Trabajo</h3>
        <p className="text-2xl font-bold text-gray-900">{totalCentros}</p>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold text-gray-700">Cumplimiento Global</h3>
        <p className="text-2xl font-bold text-green-500">{cumplimientoGlobal}</p>
      </div>
    </div>
  );
};

export default ResumenStats;