"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createTrabajador,
  deleteTrabajador,
  generarInduccionTrabajador,
  getTrabajadores,
  updateTrabajador,
} from "@/actions/trabajadores";
import type { Worker } from "@/components/trabajadores-v2/types";

export type UseTrabajadoresResult = {
  trabajadores: Worker[];
  loading: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  guardarTrabajador: (worker: Worker) => Promise<void>;
  eliminarTrabajador: (id: string) => Promise<void>;
  generarInduccion: (id: string) => Promise<boolean>;
};

export function useTrabajadores(): UseTrabajadoresResult {
  const [trabajadores, setTrabajadores] = useState<Worker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTrabajadores();
      setTrabajadores(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar trabajadores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const guardarTrabajador = useCallback(async (worker: Worker) => {
    setError(null);
    const saved = worker.id.startsWith("w-")
      ? await createTrabajador(worker)
      : await updateTrabajador(worker);

    setTrabajadores((prev) => {
      const exists = prev.some((item) => item.id === saved.id);
      return exists
        ? prev.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...prev];
    });
  }, []);

  const eliminarTrabajadorHandler = useCallback(async (id: string) => {
    setError(null);
    await deleteTrabajador(id);
    setTrabajadores((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const generarInduccionHandler = useCallback(async (id: string) => {
    setError(null);
    const result = await generarInduccionTrabajador(id);
    return result.creada;
  }, []);

  return {
    trabajadores,
    loading,
    error,
    recargar,
    guardarTrabajador,
    eliminarTrabajador: eliminarTrabajadorHandler,
    generarInduccion: generarInduccionHandler,
  };
}

export default useTrabajadores;
