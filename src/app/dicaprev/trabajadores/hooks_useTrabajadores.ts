"use client";

import { useState } from "react";
import type { Trabajador } from "./types"; // 👈 Ojo: ./types (mismo folder)

const MOCK_TRABAJADORES: Trabajador[] = [
  {
    id: "t-1",
    rut: "12.345.678-9",
    nombres: "Juan",
    apellidos: "Pérez",
    estado: "vigente",
    centroId: "c-1",
    centroNombre: "Planta Santiago",
    areaId: "a-1",
    areaNombre: "Operaciones",
    cargoId: "cg-1",
    cargoNombre: "Supervisor",
    puestoId: "p-1",
    puestoNombre: "Supervisor de Turno",
    riesgos: ["Ruido", "Caídas", "Corte"],
    eppObligatorio: ["Casco", "Zapatos de seguridad"],
    capacitacionObligatoriaCumplida: false,
    ds44Pendiente: true,
    creadoEl: new Date().toISOString(),
    actualizadoEl: new Date().toISOString(),
  },
];

export function useTrabajadores() {
  const [trabajadores, setTrabajadores] =
    useState<Trabajador[]>(MOCK_TRABAJADORES);

  const agregarTrabajador = (t: Trabajador) => {
    setTrabajadores((prev) => [...prev, t]);
  };

  const actualizarTrabajador = (
    id: string,
    data: Partial<Trabajador>
  ) => {
    setTrabajadores((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data } : t))
    );
  };

  const eliminarTrabajador = (id: string) => {
    setTrabajadores((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    trabajadores,
    agregarTrabajador,
    actualizarTrabajador,
    eliminarTrabajador,
  };
}
