
"use client";
import React from "react";
import { Trabajador } from "../types";

export default function CardView({ data, onEdit, onDelete }:{
  data: Trabajador[];
  onEdit: (id:string)=>void;
  onDelete: (id:string)=>void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {data.map(t=>(
        <div 
          key={t.id}
          className="rounded-2xl bg-white shadow-lg border border-slate-200 p-6 flex flex-col gap-4 hover:shadow-xl transition"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              {t.nombres} {t.apellidos}
            </h2>
            <span 
              className={
                "px-3 py-1 text-xs rounded-full " + 
                (t.estado === "vigente" 
                  ? "bg-emerald-100 text-emerald-700" 
                  : t.estado === "baja"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700")
              }
            >
              {t.estado}
            </span>
          </div>

          <div className="text-sm text-slate-600 space-y-1">
            <p><strong>RUT:</strong> {t.rut}</p>
            <p><strong>Centro:</strong> {t.centroNombre}</p>
            <p><strong>Cargo:</strong> {t.cargoNombre}</p>
            <p><strong>Puesto:</strong> {t.puestoNombre}</p>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {t.riesgos.slice(0,4).map((r,i)=>(
              <span 
                key={i}
                className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs"
              >
                {r}
              </span>
            ))}
            {t.riesgos.length > 4 && (
              <span className="px-2 py-1 rounded-md bg-slate-200 text-slate-600 text-xs">
                +{t.riesgos.length - 4}
              </span>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button 
              onClick={()=>onEdit(t.id)}
              className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              Editar
            </button>

            <button 
              onClick={()=>onDelete(t.id)}
              className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
