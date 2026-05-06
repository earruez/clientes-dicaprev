"use client";

import { useCallback, useEffect, useState } from "react";
import { getTrabajadores } from "@/actions/trabajadores";
import type { Trabajador } from "./types";

function toLegacyTrabajador(worker: Awaited<ReturnType<typeof getTrabajadores>>[number]): Trabajador {
  return {
    id: worker.id,
    rut: worker.rut,
    nombres: worker.nombre,
    apellidos: worker.apellido,
    estado: worker.estado === "Activo" ? "vigente" : "baja",
    centroId: "",
    centroNombre: worker.centroTrabajo,
    areaId: "",
    areaNombre: worker.area,
    cargoId: "",
    cargoNombre: worker.cargo,
    puestoId: "",
    puestoNombre: worker.cargo,
    riesgos: [],
    eppObligatorio: [],
    capacitacionObligatoriaCumplida: worker.capacitacionesPendientes === 0,
    ds44Pendiente: worker.documentosPendientes + worker.capacitacionesPendientes > 2,
    creadoEl: new Date().toISOString(),
    actualizadoEl: new Date().toISOString(),
  };
}

export function useTrabajadores() {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);

  const recargar = useCallback(async () => {
    const data = await getTrabajadores();
    setTrabajadores(data.map(toLegacyTrabajador));
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

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
    recargar,
    agregarTrabajador,
    actualizarTrabajador,
    eliminarTrabajador,
  };
}
