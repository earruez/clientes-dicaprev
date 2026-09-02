"use client";

import { useMemo, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PermisoCliente, PermisoInstalacion, PermisoOrganismo, PermisoResponsable } from "@prisma/client";
import {
  PERMISO_ESTADOS,
  ESTADO_COLORS,
  ESTADOS_REQUIEREN_COMENTARIO,
  PermisoEstado,
} from "./types";
import { actualizarFechaPresentacion, cambiarEstadoPermiso, eliminarPermiso } from "./actions/permisos";
import { ConfirmarEliminacionDialog } from "./ConfirmarEliminacionDialog";

type PermisoConRelaciones = PermisoInstalacion & {
  organismo: PermisoOrganismo | null;
  responsable: PermisoResponsable | null;
  cliente: PermisoCliente | null;
};

interface PermisosTableProps {
  permisos: PermisoConRelaciones[];
}

type OrdenClave = "estado" | "riesgo" | "cliente" | "direccion" | "instalacion" | "municipalidad" | "responsable" | "actualizacion";
type OrdenDireccion = "asc" | "desc";

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
            {nuevoEstado === "OBSERVADO" ? "Observación de la municipalidad *" : "Motivo *"}
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
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [ordenClave, setOrdenClave] = useState<OrdenClave>("actualizacion");
  const [ordenDireccion, setOrdenDireccion] = useState<OrdenDireccion>("desc");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [permisoSeleccionado, setPermisoSeleccionado] = useState<PermisoConRelaciones | null>(null);
  const [permisoAEliminar, setPermisoAEliminar] = useState<PermisoConRelaciones | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    const permisosFiltrados = permisos.filter((p) => {
      const coincideTexto =
        !texto ||
        p.direccion.toLowerCase().includes(texto) ||
        (p.cliente?.nombre || "").toLowerCase().includes(texto) ||
        (p.organismo?.nombre || "").toLowerCase().includes(texto) ||
        (p.responsable?.nombre || "").toLowerCase().includes(texto);

      const coincideEstado = !filtroEstado || p.estado === filtroEstado;

      return coincideTexto && coincideEstado;
    });

    return permisosFiltrados.sort((a, b) => {
      const texto = (valor: string, otroValor: string) => valor.localeCompare(otroValor, "es");
      const riesgoOrden = { EN_RIESGO: 0, ATENCION: 1, SIN_DATOS: 2, EN_PLAZO: 3 } as const;
      let resultado: number;

      switch (ordenClave) {
        case "estado":
          resultado = texto(PERMISO_ESTADOS[a.estado as PermisoEstado] || a.estado, PERMISO_ESTADOS[b.estado as PermisoEstado] || b.estado);
          break;
        case "riesgo":
          resultado = (riesgoOrden[a.nivelRiesgo as keyof typeof riesgoOrden] ?? 99) - (riesgoOrden[b.nivelRiesgo as keyof typeof riesgoOrden] ?? 99);
          break;
        case "cliente":
          resultado = texto(a.cliente?.nombre || "", b.cliente?.nombre || "");
          break;
        case "direccion":
          resultado = texto(a.direccion, b.direccion);
          break;
        case "instalacion":
          resultado = a.fechaInstalacion.getTime() - b.fechaInstalacion.getTime();
          break;
        case "municipalidad":
          resultado = texto(a.organismo?.nombre || "", b.organismo?.nombre || "");
          break;
        case "responsable":
          resultado = texto(a.responsable?.nombre || "", b.responsable?.nombre || "");
          break;
        default:
          resultado = a.updatedAt.getTime() - b.updatedAt.getTime();
      }

      return ordenDireccion === "asc" ? resultado : -resultado;
    });
  }, [permisos, busqueda, filtroEstado, ordenClave, ordenDireccion]);

  const cambiarOrden = (clave: OrdenClave) => {
    if (ordenClave === clave) {
      setOrdenDireccion((direccion) => (direccion === "asc" ? "desc" : "asc"));
      return;
    }

    setOrdenClave(clave);
    setOrdenDireccion(clave === "actualizacion" ? "desc" : "asc");
  };

  const encabezadoOrdenable = (etiqueta: string, clave: OrdenClave) => (
    <button
      type="button"
      onClick={() => cambiarOrden(clave)}
      className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-blue-700"
      aria-label={`Ordenar por ${etiqueta}`}
    >
      {etiqueta}
      {ordenClave !== clave && <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />}
      {ordenClave === clave && ordenDireccion === "asc" && <ArrowUp className="h-3.5 w-3.5 text-blue-700" />}
      {ordenClave === clave && ordenDireccion === "desc" && <ArrowDown className="h-3.5 w-3.5 text-blue-700" />}
    </button>
  );

  const handleEliminar = async () => {
    if (!permisoAEliminar) return;

    setEliminandoId(permisoAEliminar.id);
    try {
      await eliminarPermiso(permisoAEliminar.id);
      setPermisoSeleccionado(null);
      setPermisoAEliminar(null);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No fue posible eliminar el permiso");
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por dirección, cliente, municipalidad o coordinador..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:col-span-2 xl:col-span-3"
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
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Estado", "estado")}</th>
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Riesgo", "riesgo")}</th>
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Cliente", "cliente")}</th>
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Dirección", "direccion")}</th>
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Fecha instalación", "instalacion")}</th>
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Municipalidad", "municipalidad")}</th>
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Coordinador", "responsable")}</th>
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Último movimiento", "actualizacion")}</th>
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
                    <tr
                      className="cursor-pointer border-b border-slate-200 hover:bg-slate-50"
                      onClick={() => setPermisoSeleccionado(permiso)}
                    >
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium border leading-snug whitespace-normal max-w-[160px] ${ESTADO_COLORS[permiso.estado as PermisoEstado]}`}
                        >
                          {PERMISO_ESTADOS[permiso.estado as PermisoEstado] || permiso.estado}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {!["APROBADO", "CANCELADO"].includes(permiso.estado) && (
                          <>
                            {permiso.nivelRiesgo === "EN_RIESGO" && "🔴"}
                            {permiso.nivelRiesgo === "ATENCION" && "🟡"}
                            {permiso.nivelRiesgo === "EN_PLAZO" && "🟢"}
                            {permiso.nivelRiesgo === "SIN_DATOS" && "⚪"}
                          </>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-900">{permiso.cliente?.nombre || "—"}</td>
                      <td className="px-6 py-3 text-sm max-w-[220px]">
                        <button type="button" className="block max-w-full truncate text-left text-blue-600 hover:underline" onClick={() => setPermisoSeleccionado(permiso)}>
                          {permiso.direccion}
                        </button>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-900">
                        {permiso.fechaInstalacion.toLocaleDateString("es-CL")}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">{permiso.organismo?.nombre || "—"}</td>
                      <td className="px-6 py-3 text-sm text-slate-600">{permiso.responsable?.nombre || "—"}</td>
                      <td className="px-6 py-3 text-sm text-slate-500">
                        {new Date().getTime() - new Date(permiso.updatedAt).getTime() < 86400000 ? "Hoy" : "Hace días"}
                      </td>
                      <td className="px-6 py-3 text-sm" onClick={(event) => event.stopPropagation()}>
                        <div className="flex flex-wrap items-center gap-2">
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                            onClick={() => setPermisoAEliminar(permiso)}
                            disabled={eliminandoId === permiso.id}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar permiso</span>
                          </Button>
                        </div>
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

      <ConfirmarEliminacionDialog
        open={Boolean(permisoAEliminar)}
        entidad="Permiso"
        nombre={permisoAEliminar?.direccion || ""}
        detalle="Este permiso y su historial se eliminarán definitivamente. Esta acción no se puede deshacer."
        accion="Eliminar definitivamente"
        loading={Boolean(eliminandoId)}
        onOpenChange={(open) => !open && setPermisoAEliminar(null)}
        onConfirm={handleEliminar}
      />

      <Dialog open={Boolean(permisoSeleccionado)} onOpenChange={(open) => !open && setPermisoSeleccionado(null)}>
        <DialogContent size="sm">
          {permisoSeleccionado && (
            <>
              <DialogHeader>
                <DialogTitle>Ficha del permiso</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className={`rounded-lg border p-3 ${ESTADO_COLORS[permisoSeleccionado.estado as PermisoEstado]}`}>
                  <p className="text-xs font-semibold uppercase">Estado actual</p>
                  <p className="mt-1 text-base font-bold">{PERMISO_ESTADOS[permisoSeleccionado.estado as PermisoEstado] || permisoSeleccionado.estado}</p>
                </div>
                <dl className="divide-y divide-slate-200 rounded-lg border border-slate-200 px-4">
                  <div className="grid grid-cols-2 gap-3 py-3"><dt className="text-slate-500">Cliente</dt><dd className="text-right font-medium text-slate-900">{permisoSeleccionado.cliente?.nombre || "Sin cliente"}</dd></div>
                  <div className="grid grid-cols-2 gap-3 py-3"><dt className="text-slate-500">Dirección</dt><dd className="text-right font-medium text-slate-900">{permisoSeleccionado.direccion}</dd></div>
                  <div className="grid grid-cols-2 gap-3 py-3"><dt className="text-slate-500">Municipalidad</dt><dd className="text-right font-medium text-slate-900">{permisoSeleccionado.organismo?.nombre || "-"}</dd></div>
                  <div className="grid grid-cols-2 gap-3 py-3"><dt className="text-slate-500">Coordinador</dt><dd className="text-right font-medium text-slate-900">{permisoSeleccionado.responsable?.nombre || "-"}</dd></div>
                  <div className="grid grid-cols-2 gap-3 py-3"><dt className="text-slate-500">Fecha de instalación</dt><dd className="text-right font-medium text-slate-900">{permisoSeleccionado.fechaInstalacion.toLocaleDateString("es-CL")}</dd></div>
                  <div className="grid grid-cols-2 gap-3 py-3"><dt className="text-slate-500">Fecha de solicitud</dt><dd className="text-right font-medium text-slate-900">{permisoSeleccionado.fechaRecepcionSolicitud.toLocaleDateString("es-CL")}</dd></div>
                </dl>
                {permisoSeleccionado.observaciones && <p className="rounded-lg bg-slate-50 p-3 text-slate-700">{permisoSeleccionado.observaciones}</p>}
                <div className="flex justify-end">
                  <Link href={`/dicaprev/permisos/${permisoSeleccionado.id}`} className="text-sm font-semibold text-blue-700 hover:underline">Ver detalle completo</Link>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
