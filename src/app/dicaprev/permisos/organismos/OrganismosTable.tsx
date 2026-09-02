"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { PermisoOrganismo } from "@prisma/client";
import { desactivarOrganismo } from "../actions/permisos";
import { PERMISO_MODALIDADES, PermisoModalidad } from "../types";
import { ConfirmarEliminacionDialog } from "../ConfirmarEliminacionDialog";

interface OrganismosTableProps {
  organismos: PermisoOrganismo[];
}

export function OrganismosTable({ organismos }: OrganismosTableProps) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [region, setRegion] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [organismoAEliminar, setOrganismoAEliminar] = useState<PermisoOrganismo | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const handleDelete = async () => {
    if (!organismoAEliminar) return;

    setEliminando(true);
    try {
      await desactivarOrganismo(organismoAEliminar.id);
      setOrganismoAEliminar(null);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No fue posible eliminar la municipalidad");
    } finally {
      setEliminando(false);
    }
  };

  const regiones = useMemo(
    () => Array.from(new Set(organismos.map((o) => o.region).filter(Boolean))).sort() as string[],
    [organismos],
  );

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return organismos.filter((o) => {
      const coincideTexto =
        !texto ||
        o.nombre.toLowerCase().includes(texto) ||
        (o.comuna || "").toLowerCase().includes(texto) ||
        (o.region || "").toLowerCase().includes(texto) ||
        (o.nombreOficial || "").toLowerCase().includes(texto);

      const coincideRegion = !region || o.region === region;
      const coincideModalidad = !modalidad || o.modalidad === modalidad;

      return coincideTexto && coincideRegion && coincideModalidad;
    });
  }, [organismos, busqueda, region, modalidad]);

  return (
    <div className="space-y-4">
      {/* Buscador y filtros */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, comuna o región..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las regiones</option>
          {regiones.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={modalidad}
          onChange={(e) => setModalidad(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las modalidades</option>
          {Object.entries(PERMISO_MODALIDADES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-slate-500">
        Mostrando {filtrados.length} de {organismos.length} municipalidades
      </p>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Municipalidad</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Región</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Comuna</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Modalidad</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Plazo</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Última verificación</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    {organismos.length === 0
                      ? "No hay municipalidades registradas. Importa la matriz municipal o crea una manualmente."
                      : "Ninguna municipalidad coincide con la búsqueda/filtros."}
                  </td>
                </tr>
              ) : (
                filtrados.map((o) => (
                  <tr key={o.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{o.nombre}</td>
                    <td className="px-6 py-3 text-slate-600">{o.region || "—"}</td>
                    <td className="px-6 py-3 text-slate-600">{o.comuna || "—"}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {PERMISO_MODALIDADES[o.modalidad as PermisoModalidad] || o.modalidad || "—"}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {o.plazoDias ? `${o.plazoDias} ${o.tipoPlazo === "HABILES" ? "hábiles" : "corridos"}` : "No informado"}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {o.fechaVerificacion ? new Date(o.fechaVerificacion).toLocaleDateString("es-CL") : "—"}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/dicaprev/permisos/organismos/${o.id}`}>
                          <Button variant="outline" size="sm">Editar</Button>
                        </Link>
                        <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setOrganismoAEliminar(o)}>
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmarEliminacionDialog
        open={Boolean(organismoAEliminar)}
        entidad="Municipalidad"
        nombre={organismoAEliminar?.nombre || ""}
        loading={eliminando}
        onOpenChange={(open) => !open && setOrganismoAEliminar(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
