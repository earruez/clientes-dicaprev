import React, { useState } from "react";
import { GeneralData } from "@/app/dicaprev/empresa/resumen/types";

interface GeneralTabProps {
  data: GeneralData;
  onSave: (updatedData: Partial<GeneralData>) => void;
}

const GeneralTab: React.FC<GeneralTabProps> = ({ data, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(data);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = () => {
    onSave(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(data);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Razón Social</label>
            <input
              type="text"
              name="razonSocial"
              value={formData.razonSocial}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">RUT Empresa</label>
            <input
              type="text"
              name="rutEmpresa"
              value={formData.rutEmpresa}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {/* Add other fields similarly */}
          <div className="flex space-x-4">
            <button
              onClick={handleSave}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Guardar
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-700">Razón Social</h3>
            <p className="text-gray-900">{data.razonSocial}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-700">RUT Empresa</h3>
            <p className="text-gray-900">{data.rutEmpresa}</p>
          </div>
          {/* Add other fields similarly */}
          <button
            onClick={() => setIsEditing(true)}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Editar
          </button>
        </div>
      )}
    </div>
  );
};

export default GeneralTab;