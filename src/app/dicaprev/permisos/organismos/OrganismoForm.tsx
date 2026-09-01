"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { PermisoOrganismo } from "@prisma/client";
import { guardarOrganismo } from "../actions/permisos";
import { PERMISO_MODALIDADES, PERMISO_TIPOS_PLAZO } from "../types";

interface OrganismoFormProps {
  organismo?: PermisoOrganismo;
}

export function OrganismoForm({ organismo }: OrganismoFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const plazoDiasRaw = formData.get("plazoDias") as string;

      const data = {
        nombre: formData.get("nombre") as string,
        tipo: "MUNICIPAL",
        region: (formData.get("region") as string) || undefined,
        provincia: (formData.get("provincia") as string) || undefined,
        comuna: (formData.get("comuna") as string) || undefined,
        nombreOficial: (formData.get("nombreOficial") as string) || undefined,
        unidad: (formData.get("unidad") as string) || undefined,
        modalidad: formData.get("modalidad") as string,
        plazoDias: plazoDiasRaw ? Number(plazoDiasRaw) : undefined,
        tipoPlazo: formData.get("tipoPlazo") as string,
        direccion: (formData.get("direccion") as string) || undefined,
        horario: (formData.get("horario") as string) || undefined,
        urlTramite: (formData.get("urlTramite") as string) || undefined,
        urlInstitucional: (formData.get("urlInstitucional") as string) || undefined,
        documentosRequeridos: (formData.get("documentosRequeridos") as string) || undefined,
        costo: (formData.get("costo") as string) || undefined,
        observaciones: (formData.get("observaciones") as string) || undefined,
      };

      await guardarOrganismo(data, organismo?.id);
      router.push("/dicaprev/permisos/organismos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la municipalidad");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dicaprev/permisos/organismos">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {organismo ? "Editar municipalidad" : "Nueva municipalidad"}
          </h1>
          <p className="text-slate-600 text-sm mt-0.5">
            Municipalidades que emiten permisos de instalación.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Identificación</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  name="nombre"
                  required
                  defaultValue={organismo?.nombre}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Municipalidad de Providencia"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Región</label>
                <input
                  type="text"
                  name="region"
                  defaultValue={organismo?.region || ""}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Provincia</label>
                <input
                  type="text"
                  name="provincia"
                  defaultValue={organismo?.provincia || ""}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Comuna</label>
                <input
                  type="text"
                  name="comuna"
                  defaultValue={organismo?.comuna || ""}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre oficial</label>
                <input
                  type="text"
                  name="nombreOficial"
                  defaultValue={organismo?.nombreOficial || ""}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unidad / departamento</label>
                <input
                  type="text"
                  name="unidad"
                  defaultValue={organismo?.unidad || ""}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Modalidad y plazo</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Modalidad de presentación *</label>
                <select
                  name="modalidad"
                  required
                  defaultValue={organismo?.modalidad || "NO_INFORMADO"}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(PERMISO_MODALIDADES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Plazo (días)</label>
                  <input
                    type="number"
                    min={0}
                    name="plazoDias"
                    defaultValue={organismo?.plazoDias ?? ""}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de plazo</label>
                  <select
                    name="tipoPlazo"
                    defaultValue={organismo?.tipoPlazo || "NO_INFORMADO"}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(PERMISO_TIPOS_PLAZO).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Contacto y trámite</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                <input
                  type="text"
                  name="direccion"
                  defaultValue={organismo?.direccion || ""}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Horario</label>
                <input
                  type="text"
                  name="horario"
                  defaultValue={organismo?.horario || ""}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Costo</label>
                <input
                  type="text"
                  name="costo"
                  defaultValue={organismo?.costo || ""}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL del trámite</label>
                <input
                  type="text"
                  name="urlTramite"
                  defaultValue={organismo?.urlTramite || ""}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL institucional</label>
                <input
                  type="text"
                  name="urlInstitucional"
                  defaultValue={organismo?.urlInstitucional || ""}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Documentos requeridos</label>
                <textarea
                  name="documentosRequeridos"
                  defaultValue={organismo?.documentosRequeridos || ""}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
                <textarea
                  name="observaciones"
                  defaultValue={organismo?.observaciones || ""}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-end pt-4 border-t border-slate-200">
            <Link href="/dicaprev/permisos/organismos">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : organismo ? "Guardar cambios" : "Crear municipalidad"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
