"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { PermisoResponsable } from "@prisma/client";
import { guardarResponsable } from "../actions/permisos";

interface ResponsableFormProps {
  responsable?: PermisoResponsable;
}

export function ResponsableForm({ responsable }: ResponsableFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const data = {
        nombre: formData.get("nombre") as string,
        cargo: formData.get("cargo") as string,
        email: formData.get("email") as string,
        telefono: (formData.get("telefono") as string) || undefined,
      };

      await guardarResponsable(data, responsable?.id);
      router.push("/dicaprev/permisos/responsables");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el coordinador");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dicaprev/permisos/responsables">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {responsable ? "Editar coordinador" : "Nuevo coordinador"}
          </h1>
          <p className="text-slate-600 text-sm mt-0.5">
            Persona que recibe las notificaciones de seguimiento de un permiso
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input
              type="text"
              name="nombre"
              required
              defaultValue={responsable?.nombre}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cargo *</label>
            <input
              type="text"
              name="cargo"
              required
              defaultValue={responsable?.cargo}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input
              type="email"
              name="email"
              required
              defaultValue={responsable?.email}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
            <input
              type="text"
              name="telefono"
              defaultValue={responsable?.telefono || ""}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-4 justify-end pt-4 border-t border-slate-200">
            <Link href="/dicaprev/permisos/responsables">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : responsable ? "Guardar cambios" : "Crear coordinador"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
