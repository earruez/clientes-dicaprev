"use client";

import { useMemo, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PermisoCliente, PermisoInstalacion, PermisoOrganismo, PermisoResponsable } from "@prisma/client";
import {
  PERMISO_ESTADOS,
  ESTADO_COLORS,
  ESTADOS_REQUIEREN_COMENTARIO,
  PermisoEstado,
} from "./types";
import { actualizarFechaPresentacion, cambiarEstadoPermiso } from "./actions/permisos";

type PermisoConRelaciones = PermisoInstalacion & {
  organismo: PermisoOrganismo | null;
  responsable: PermisoResponsable | null;
  cliente: PermisoCliente | null;
};

interface PermisosTableProps {
  permisos: PermisoConRelaciones[];
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function CambiarEstadoInline({ permiso }: { permiso: PermisoConRelaciones }) {
  const router = useRouter();
  const estadoActual = permiso.estado as PermisoEstado;
  const opciones = (Object.keys(PERMISO_ESTADOS) as PermisoEstado[]).filter((estado) => estado !== estadoActual);
  const [nuevoEstado, setNuevoEstado] = useState(opciones[0] || "");
  const [fecha, setFecha] = useState(
    permiso.fechaPresentacion ? new Date(permiso.fechaPresentacion).toISOString().slice(0, 10) : hoyISO(),
  );
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiereComentario = ESTADOS_REQUIEREN_COMENTARIO.includes(nuevoEstado as (typeof ESTADOS_REQUIEREN_COMENTARIO)[number]);

  const handleGuardar = async () => {
    setError(null);

    if (requiereComentario && !comentario.trim()) {
      setError("Indica una observación/motivo para este estado.");
      return;
    }

    setLoading(true);
    try {
      if (fecha && (!permiso.fechaPresentacion || new Date(permiso.fechaPresentacion).toISOString().slice(0, 10) !== fecha)) {
        await actualizarFechaPresentacion(permiso.id, fecha);
      }
      await cambiarEstadoPermiso(permiso.id, nuevoEstado, comentario.trim() || undefined);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el permiso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Nuevo estado</label>
        <select
          value={nuevoEstado}
          onChange={(e) => setNuevoEstado(e.target.value as PermisoEstado)}
          className="px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {opciones.map((estado) => (
            <option key={estado} value={estado}>
              {PERMISO_ESTADOS[estado]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de presentación</label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {requiereComentario && (
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            {nuevoEstado === "OBSERVADO" ? "Observación del organismo *" : "Motivo *"}
          </label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={1}
            className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
      <Button type="button" size="sm" onClick={handleGuardar} disabled={loading}>
        {loading ? "Guardando..." : "Guardar"}
      </Button>
      {error && <p className="text-xs text-red-600 w-full">{error}</p>}
    </div>
  );
}

export function PermisosTable({ permisos }: PermisosTableProps) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return permisos.filter((p) => {
      const coincideTexto =
        !texto ||
        p.direccion.toLowerCase().includes(texto) ||
        (p.cliente?.nombre || "").toLowerCase().includes(texto) ||
        (p.organismo?.nombre || "").toLowerCase().includes(texto) ||
        (p.responsable?.nombre || "").toLowerCase().includes(texto);

      const coincideEstado = !filtroEstado || p.estado === filtroEstado;

      return coincideTexto && coincideEstado;
    });
  }, [permisos, busqueda, filtroEstado]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por dirección, cliente, organismo o responsable..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:col-span-2"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {Object.entries(PERMISO_ESTADOS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-slate-500">
        Mostrando {filtrados.length} de {permisos.length} permisos
      </p>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Estado</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Riesgo</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Cliente</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Dirección</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Fecha instalación</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Organismo</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Responsable</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Último movimiento</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                    {permisos.length === 0
                      ? "No hay permisos registrados. Crea tu primer permiso para comenzar."
                      : "Ningún permiso coincide con la búsqueda/filtros."}
                  </td>
                </tr>
              ) : (
                filtrados.map((permiso) => (
                  <Fragment key={permiso.id}>
                    <tr className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium border leading-snug whitespace-normal max-w-[160px] ${ESTADO_COLORS[permiso.estado as PermisoEstado]}`}
                        >
                          {PERMISO_ESTADOS[permiso.estado as PermisoEstado] || permiso.estado}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {permiso.nivelRiesgo === "EN_RIESGO" && "🔴"}
                        {permiso.nivelRiesgo === "ATENCION" && "🟡"}
                        {permiso.nivelRiesgo === "EN_PLAZO" && "🟢"}
                        {permiso.nivelRiesgo === "SIN_DATOS" && "⚪"}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-900">{permiso.cliente?.nombre || "—"}</td>
                      <td className="px-6 py-3 text-sm max-w-xs truncate">
                        <Link href={`/dicaprev/permisos/${permiso.id}`} className="text-blue-600 hover:underline">
                          {permiso.direccion}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-900">
                        {permiso.fechaInstalacion.toLocaleDateString("es-CL")}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">{permiso.organismo?.nombre || "—"}</td>
                      <td className="px-6 py-3 text-sm text-slate-600">{permiso.responsable?.nombre || "—"}</td>
                      <td className="px-6 py-3 text-sm text-slate-500">
                        {new Date().getTime() - new Date(permiso.updatedAt).getTime() < 86400000 ? "Hoy" : "Hace días"}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {permiso.estado === "APROBADO" ? (
                          <span className="text-xs text-slate-400">Estado final</span>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandido(expandido === permiso.id ? null : permiso.id)}
                          >
                            Cambiar estado
                          </Button>
                        )}
                      </td>
                    </tr>
                    {expandido === permiso.id && permiso.estado !== "APROBADO" && (
                      <tr className="border-b border-slate-200 bg-slate-50/50">
                        <td colSpan={9} className="px-6 py-3">
                          <CambiarEstadoInline permiso={permiso} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
