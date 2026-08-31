"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { PermisoCliente } from "@prisma/client";
import { guardarCliente } from "../actions/permisos";

interface ClienteFormProps {
  cliente?: PermisoCliente;
}

export function ClienteForm({ cliente }: ClienteFormProps) {
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
        contactoEmail: (formData.get("contactoEmail") as string) || undefined,
        contactoTelefono: (formData.get("contactoTelefono") as string) || undefined,
      };

      await guardarCliente(data, cliente?.id);
      router.push("/dicaprev/permisos/clientes");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el cliente");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dicaprev/permisos/clientes">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {cliente ? "Editar cliente" : "Nuevo cliente"}
          </h1>
          <p className="text-slate-600 text-sm mt-0.5">
            Clientes que solicitan permisos con frecuencia (ej: Salcobrand)
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
              defaultValue={cliente?.nombre}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Salcobrand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email de contacto</label>
            <input
              type="email"
              name="contactoEmail"
              defaultValue={cliente?.contactoEmail || ""}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email de contacto (opcional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono de contacto</label>
            <input
              type="text"
              name="contactoTelefono"
              defaultValue={cliente?.contactoTelefono || ""}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Teléfono de contacto (opcional)"
            />
          </div>

          <div className="flex gap-4 justify-end pt-4 border-t border-slate-200">
            <Link href="/dicaprev/permisos/clientes">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : cliente ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
