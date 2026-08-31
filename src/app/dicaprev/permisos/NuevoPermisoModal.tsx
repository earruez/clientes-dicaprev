"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { PermisoCliente, PermisoOrganismo, PermisoResponsable } from "@prisma/client";
import { crearPermiso, obtenerOrganismoSugerido } from "./actions/permisos";

interface NuevoPermisoModalProps {
  clientes: PermisoCliente[];
  organismos: PermisoOrganismo[];
  responsables: PermisoResponsable[];
  comunas: { comuna: string; region: string }[];
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const initialForm = {
  clienteId: "",
  sucursalId: "",
  direccion: "",
  comuna: "",
  region: "",
  fechaInstalacion: "",
  fechaRecepcionSolicitud: hoyISO(),
  organismoId: "",
  responsableId: "",
  responsableIdsAdicionales: [] as string[],
  observaciones: "",
};

export function NuevoPermisoModal({ clientes, organismos, responsables, comunas }: NuevoPermisoModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sugerencia, setSugerencia] = useState<string | null>(null);

  const puedeAvanzar = Boolean(form.direccion.trim() && form.fechaInstalacion);

  const resetAndClose = () => {
    setOpen(false);
    setStep(1);
    setForm(initialForm);
    setError(null);
    setSugerencia(null);
  };

  const handleSiguiente = async () => {
    if (!puedeAvanzar) {
      setError("Completa la dirección y la fecha de instalación para continuar.");
      return;
    }
    setError(null);
    setSugerencia(null);

    if (!form.organismoId && (form.comuna.trim() || form.region.trim())) {
      const sugerido = await obtenerOrganismoSugerido(form.comuna.trim() || undefined, form.region.trim() || undefined);
      if (sugerido) {
        setForm((f) => ({ ...f, organismoId: sugerido.id }));
        setSugerencia(`Organismo sugerido según la comuna/región: ${sugerido.nombre}. Puedes cambiarlo.`);
      }
    }

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!form.organismoId || !form.responsableId || !form.fechaRecepcionSolicitud) {
      setError("Completa organismo, responsable y fecha de recepción de la solicitud.");
      return;
    }

    setLoading(true);
    try {
      await crearPermiso({
        clienteId: form.clienteId || undefined,
        sucursalId: form.sucursalId || undefined,
        direccion: form.direccion,
        comuna: form.comuna || undefined,
        region: form.region || undefined,
        fechaInstalacion: form.fechaInstalacion,
        fechaRecepcionSolicitud: form.fechaRecepcionSolicitud,
        organismoId: form.organismoId,
        responsableId: form.responsableId,
        responsableIds: form.responsableIdsAdicionales,
        estado: "PERMISO_CREADO",
        observaciones: form.observaciones || undefined,
      });
      resetAndClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el permiso");
      setLoading(false);
    }
  };

  const sinCatalogos = organismos.length === 0 || responsables.length === 0;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        Nuevo permiso
      </Button>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Nuevo permiso</DialogTitle>
          <DialogDescription>
            Paso {step} de 2 · {step === 1 ? "Datos de instalación" : "Datos de solicitud"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
        )}

        {sinCatalogos && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            {organismos.length === 0 && (
              <p>
                No hay organismos registrados. Crea uno en{" "}
                <Link href="/dicaprev/permisos/organismos" className="underline font-medium">
                  Organismos
                </Link>
                .
              </p>
            )}
            {responsables.length === 0 && (
              <p>
                No hay responsables registrados. Crea uno en{" "}
                <Link href="/dicaprev/permisos/responsables" className="underline font-medium">
                  Responsables
                </Link>
                .
              </p>
            )}
          </div>
        )}

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
              <select
                value={form.clienteId}
                onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin cliente / otro</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
              {clientes.length === 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  ¿Cliente recurrente? Crea uno en{" "}
                  <Link href="/dicaprev/permisos/clientes" className="underline font-medium">
                    Clientes
                  </Link>
                  .
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sucursal</label>
              <input
                type="text"
                value={form.sucursalId}
                onChange={(e) => setForm((f) => ({ ...f, sucursalId: e.target.value }))}
                placeholder="Ej: Sucursal Ñuble (opcional)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dirección *</label>
              <input
                type="text"
                required
                value={form.direccion}
                onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                placeholder="Dirección de la instalación"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Comuna</label>
                <select
                  value={form.comuna}
                  onChange={(e) => {
                    const comunaSeleccionada = e.target.value;
                    const match = comunas.find((c) => c.comuna === comunaSeleccionada);
                    setForm((f) => ({
                      ...f,
                      comuna: comunaSeleccionada,
                      region: match ? match.region : f.region,
                    }));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona comuna...</option>
                  {comunas.map((c) => (
                    <option key={c.comuna} value={c.comuna}>
                      {c.comuna}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Región</label>
                <select
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona región...</option>
                  {Array.from(new Set(comunas.map((c) => c.region)))
                    .sort((a, b) => a.localeCompare(b, "es"))
                    .map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Al elegir la comuna completamos automáticamente la región, y con ambas intentamos sugerir el organismo a
              solicitar (puedes cambiarlo en el siguiente paso).
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de instalación *</label>
              <input
                type="date"
                required
                value={form.fechaInstalacion}
                onChange={(e) => setForm((f) => ({ ...f, fechaInstalacion: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetAndClose}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSiguiente}>
                Siguiente
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {sugerencia && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs">{sugerencia}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha de recepción de la solicitud *
              </label>
              <input
                type="date"
                required
                value={form.fechaRecepcionSolicitud}
                onChange={(e) => setForm((f) => ({ ...f, fechaRecepcionSolicitud: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Organismo *</label>
              <select
                required
                value={form.organismoId}
                onChange={(e) => setForm((f) => ({ ...f, organismoId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>
                  Selecciona organismo...
                </option>
                {organismos.map((organismo) => (
                  <option key={organismo.id} value={organismo.id}>
                    {organismo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Responsable *</label>
              <select
                required
                value={form.responsableId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    responsableId: e.target.value,
                    responsableIdsAdicionales: f.responsableIdsAdicionales.filter((id) => id !== e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>
                  Selecciona responsable...
                </option>
                {responsables.map((responsable) => (
                  <option key={responsable.id} value={responsable.id}>
                    {responsable.nombre}
                  </option>
                ))}
              </select>
            </div>
            {responsables.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Responsables adicionales (opcional)
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  También recibirán los correos de actualización de estado (sugerido: 1 a 2 adicionales).
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {responsables
                    .filter((responsable) => responsable.id !== form.responsableId)
                    .map((responsable) => (
                      <label key={responsable.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.responsableIdsAdicionales.includes(responsable.id)}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              responsableIdsAdicionales: e.target.checked
                                ? [...f.responsableIdsAdicionales, responsable.id]
                                : f.responsableIdsAdicionales.filter((id) => id !== responsable.id),
                            }))
                          }
                        />
                        {responsable.nombre}
                      </label>
                    ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                rows={3}
                placeholder="Notas adicionales (opcional)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear permiso"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
