import React from "react";
import { EstructuraData } from "@/app/dicaprev/empresa/resumen/types";

interface EstructuraTabProps {
  data: EstructuraData;
}

const EstructuraTab: React.FC<EstructuraTabProps> = ({ data }) => {
  const cards = [
    { title: "Áreas", description: "Gestiona áreas internas de la empresa.", count: data.areas },
    { title: "Cargos", description: "Define cargos y perfiles SST.", count: data.cargos },
    { title: "Puestos", description: "Define posiciones por centro.", count: data.puestos },
    { title: "Trabajadores", description: "Listado maestro de trabajadores.", count: data.trabajadores },
    { title: "Organigrama", description: "Estructura jerárquica.", count: null },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <div key={index} className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold text-gray-700">{card.title}</h3>
          <p className="text-gray-500">{card.description}</p>
          {card.count !== null && (
            <p className="text-2xl font-bold text-gray-900">{card.count}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default EstructuraTab;