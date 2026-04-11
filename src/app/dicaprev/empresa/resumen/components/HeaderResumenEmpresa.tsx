import React from "react";

const HeaderResumenEmpresa = () => {
  return (
    <div className="flex justify-between items-center border-b pb-4 mb-6">
      <h1 className="text-2xl font-bold text-gray-800">Información de la Empresa</h1>
      <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
        Editar empresa
      </button>
    </div>
  );
};

export default HeaderResumenEmpresa;