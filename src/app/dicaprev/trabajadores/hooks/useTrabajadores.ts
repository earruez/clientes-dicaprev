"use client";

import { useMemo, useState } from "react";
import {
  Trabajador,
  TrabajadorFiltros,
  TrabajadoresVista,
  TrabajadorOrden,
} from "../types";

export type UseTrabajadoresResult = {
  // Datos en memoria
  trabajadores: Trabajador[];
  setTrabajadores: (data: Trabajador[]) => void;

  // Vista (tabla / cards)
  vista: TrabajadoresVista;
  setVista: (v: TrabajadoresVista) => void;

  // Filtros
  filtros: TrabajadorFiltros;
  setFiltros: (f: TrabajadorFiltros) => void;

  // Orden
  orden: TrabajadorOrden;
  setOrden: (o: TrabajadorOrden) => void;

  // Selección múltiple (tabla)
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;

  // Datos ya filtrados + ordenados (lo que usan tabla / cards)
  filtrados: Trabajador[];

  // CRUD en memoria (por ahora sin Firebase)
  crearTrabajador: (t: Trabajador) => void;
  actualizarTrabajador: (id: string, partial: Partial<Trabajador>) => void;
  eliminarTrabajador: (id: string) => void;
};

const ORDEN_POR_DEFECTO: TrabajadorOrden = {
  campo: "creadoEl",
  direccion: "desc",
};

export function useTrabajadores(
  inicial: Trabajador[] = []
): UseTrabajadoresResult {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>(inicial);
  const [vista, setVista] = useState<TrabajadoresVista>("tabla");
  const [filtros, setFiltros] = useState<TrabajadorFiltros>({});
  const [orden, setOrden] = useState<TrabajadorOrden>(ORDEN_POR_DEFECTO);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Helpers internos
  const filtrar = (t: Trabajador): boolean => {
    if (filtros.texto) {
      const q = filtros.texto.toLowerCase().trim();
      const hayTexto =
        t.rut.toLowerCase().includes(q) ||
        `${t.nombres} ${t.apellidos}`.toLowerCase().includes(q) ||
        t.centroNombre.toLowerCase().includes(q) ||
        t.areaNombre.toLowerCase().includes(q) ||
        t.cargoNombre.toLowerCase().includes(q);
      if (!hayTexto) return false;
    }

    if (filtros.estado && filtros.estado !== "todos") {
      if (t.estado !== filtros.estado) return false;
    }

    if (filtros.centroId && t.centroId !== filtros.centroId) return false;
    if (filtros.areaId && t.areaId !== filtros.areaId) return false;
    if (filtros.cargoId && t.cargoId !== filtros.cargoId) return false;

    if (
      typeof filtros.ds44Pendiente === "boolean" &&
      t.ds44Pendiente !== filtros.ds44Pendiente
    ) {
      return false;
    }

    if (
      typeof filtros.capacitacionObligatoriaCumplida === "boolean" &&
      t.capacitacionObligatoriaCumplida !==
        filtros.capacitacionObligatoriaCumplida
    ) {
      return false;
    }

    return true;
  };

  const ordenar = (lista: Trabajador[]): Trabajador[] => {
    const { campo, direccion } = orden;
    const factor = direccion === "asc" ? 1 : -1;

    return [...lista].sort((a, b) => {
      const va = a[campo];
      const vb = b[campo];

      if (va < vb) return -1 * factor;
      if (va > vb) return 1 * factor;
      return 0;
    });
  };

  const filtrados = useMemo(() => {
    const base = trabajadores.filter(filtrar);
    return ordenar(base);
  }, [trabajadores, filtrar, ordenar]);

  // CRUD en memoria (luego se conectan a Firestore)
  const crearTrabajador = (t: Trabajador) => {
    setTrabajadores((prev) => [...prev, t]);
  };

  const actualizarTrabajador = (id: string, partial: Partial<Trabajador>) => {
    setTrabajadores((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...partial } : t))
    );
  };

  const eliminarTrabajador = (id: string) => {
    setTrabajadores((prev) => prev.filter((t) => t.id !== id));
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  return {
    trabajadores,
    setTrabajadores,
    vista,
    setVista,
    filtros,
    setFiltros,
    orden,
    setOrden,
    selectedIds,
    setSelectedIds,
    filtrados,
    crearTrabajador,
    actualizarTrabajador,
    eliminarTrabajador,
  };
}

export default useTrabajadores;
