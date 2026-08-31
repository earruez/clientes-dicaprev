"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { crearPermiso } from "../actions/permisos";

export default function NuevoPermisoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      
      const permisoData = {
        clienteId: formData.get("clienteId") as string | undefined,
        sucursalId: formData.get("sucursalId") as string | undefined,
        direccion: formData.get("direccion") as string,
        fechaInstalacion: formData.get("fechaInstalacion") as string,
        fechaRecepcionSolicitud: formData.get("fechaRecepcionSolicitud") as string,
        organismoId: formData.get("organismoId") as string,
        responsableId: formData.get("responsableId") as string,
        modalidad: formData.get("modalidad") as string | undefined,
        estado: "SOLICITUD_RECIBIDA" as const,
        observaciones: formData.get("observaciones") as string | undefined,
        fechaPresentacion: formData.get("fechaPresentacion") as string | undefined,
      };

      await crearPermiso(permisoData);
      router.push("/dicaprev/permisos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear permiso");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dicaprev/permisos">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nuevo Permiso</h1>
          <p className="text-slate-600 text-sm mt-0.5">Registra una nueva solicitud de permiso</p>
        </div>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Sección: Instalación */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Instalación</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cliente
                </label>
                <input
                  type="text"
                  name="clienteId"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del cliente (opcional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sucursal
                </label>
                <input
                  type="text"
                  name="sucursalId"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sucursal (opcional)"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Dirección *
                </label>
                <input
                  type="text"
                  name="direccion"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Dirección de la instalación"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha de Instalación *
                </label>
                <input
                  type="date"
                  name="fechaInstalacion"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Sección: Solicitud */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Solicitud</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha de Recepción *
                </label>
                <input
                  type="date"
                  name="fechaRecepcionSolicitud"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha de Presentación
                </label>
                <input
                  type="date"
                  name="fechaPresentacion"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Organismo *
                </label>
                <select
                  name="organismoId"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona organismo...</option>
                  <option value="test">Municipalidad de Prueba</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Responsable *
                </label>
                <select
                  name="responsableId"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona responsable...</option>
                  <option value="test">Usuario de Prueba</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  name="observaciones"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notas adicionales (opcional)"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4 justify-end pt-4 border-t border-slate-200">
            <Link href="/dicaprev/permisos">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear Permiso"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
