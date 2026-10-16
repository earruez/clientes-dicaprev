"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, Upload } from "lucide-react";
import type { PermisoInstalacion, PermisoOrganismo, PermisoResponsable, PermisoCliente, PermisoHistorial } from "@prisma/client";
import { actualizarFechaPresentacion, cambiarEstadoPermiso, guardarPermisoAprobado } from "../actions/permisos";
import { ESTADO_COLORS, PERMISO_ESTADOS, ESTADOS_REQUIEREN_COMENTARIO, PermisoEstado } from "../types";
import { DOCUMENTO_ACCEPT, DOCUMENTO_TIPOS_LABEL, MAX_DOCUMENTO_FILE_SIZE } from "@/lib/documentacion/archivo-documento";

type ArchivoSubido = {
  archivoNombre: string;
  archivoNombreOriginal: string;
  archivoUrl: string;
  archivoTipo: string | null;
  archivoPeso: number;
};

interface PermisoDetailProps {
  permiso: PermisoInstalacion & {
    organismo: PermisoOrganismo;
    responsable: PermisoResponsable;
    cliente: PermisoCliente | null;
  };
  historial: PermisoHistorial[];
}

function toDateInputValue(value: Date | string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return date.toISOString().slice(0, 10);
}

function formatearFechaHora(value: Date | string): string {
  const date = new Date(value);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${date.getFullYear()} ${hh}:${min}`;
}

function formatearPesoArchivo(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PermisoDetailClient({ permiso, historial }: PermisoDetailProps) {
  const router = useRouter();

  const [fechaPresentacion, setFechaPresentacion] = useState(toDateInputValue(permiso.fechaPresentacion));
  const [savingFecha, setSavingFecha] = useState(false);
  const [fechaError, setFechaError] = useState<string | null>(null);

  const estadoActual = permiso.estado as PermisoEstado;
  const opcionesEstado = (Object.keys(PERMISO_ESTADOS) as PermisoEstado[]).filter((estado) => estado !== estadoActual);
  const [nuevoEstado, setNuevoEstado] = useState<string>(opcionesEstado[0] || "");
  const [comentario, setComentario] = useState("");
  const [savingEstado, setSavingEstado] = useState(false);
  const [estadoError, setEstadoError] = useState<string | null>(null);

  const [archivoAprobado, setArchivoAprobado] = useState<File | null>(null);
  const [savingArchivo, setSavingArchivo] = useState(false);
  const [archivoError, setArchivoError] = useState<string | null>(null);
  const [archivoMensaje, setArchivoMensaje] = useState<string | null>(null);

  const requiereComentario = ESTADOS_REQUIEREN_COMENTARIO.includes(nuevoEstado as (typeof ESTADOS_REQUIEREN_COMENTARIO)[number]);

  const handleGuardarFecha = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingFecha(true);
    setFechaError(null);
    try {
      await actualizarFechaPresentacion(permiso.id, fechaPresentacion);
      router.refresh();
    } catch (err) {
      setFechaError(err instanceof Error ? err.message : "Error al actualizar la fecha de presentación");
    } finally {
      setSavingFecha(false);
    }
  };

  const handleCambiarEstado = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEstadoError(null);

    if (requiereComentario && !comentario.trim()) {
      setEstadoError("Pega el texto de la observación de la municipalidad antes de continuar.");
      return;
    }

    setSavingEstado(true);
    try {
      await cambiarEstadoPermiso(permiso.id, nuevoEstado, comentario.trim() || undefined);
      setComentario("");
      router.refresh();
    } catch (err) {
      setEstadoError(err instanceof Error ? err.message : "Error al cambiar el estado del permiso");
    } finally {
      setSavingEstado(false);
    }
  };

  const handleAdjuntarPermisoAprobado = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setArchivoError(null);
    setArchivoMensaje(null);

    if (!archivoAprobado) {
      setArchivoError("Selecciona el permiso aprobado que deseas adjuntar.");
      return;
    }
    if (archivoAprobado.size > MAX_DOCUMENTO_FILE_SIZE) {
      setArchivoError("El archivo supera el máximo permitido de 10 MB.");
      return;
    }

    setSavingArchivo(true);
    try {
      const formData = new FormData();
      formData.append("file", archivoAprobado);
      const response = await fetch("/api/dicaprev/documentacion/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as ArchivoSubido | { error?: string };
      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "No se pudo guardar el archivo.");
      }

      const subido = payload as ArchivoSubido;
      await guardarPermisoAprobado(permiso.id, {
        archivoNombre: subido.archivoNombre,
        archivoNombreOriginal: subido.archivoNombreOriginal,
        archivoTipo: subido.archivoTipo,
        archivoPeso: subido.archivoPeso,
      });

      setArchivoAprobado(null);
      setArchivoMensaje(permiso.permisoAprobadoArchivoNombre ? "Permiso aprobado reemplazado correctamente." : "Permiso aprobado adjuntado correctamente.");
      router.refresh();
    } catch (err) {
      setArchivoError(err instanceof Error ? err.message : "No se pudo adjuntar el permiso aprobado.");
    } finally {
      setSavingArchivo(false);
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
          <h1 className="text-2xl font-bold text-slate-900">{permiso.direccion}</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            {permiso.cliente?.nombre || "Sin cliente"} · {permiso.organismo.nombre}
          </p>
        </div>
        <span
          className={`ml-auto inline-block px-2.5 py-1 rounded-md text-xs font-medium border leading-snug ${ESTADO_COLORS[estadoActual]}`}
        >
          {PERMISO_ESTADOS[estadoActual] || permiso.estado}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Datos generales */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Datos del permiso</h2>
          <div className="text-sm text-slate-600 grid grid-cols-2 gap-y-2">
            <span className="text-slate-500">Coordinador</span>
            <span className="text-slate-900">{permiso.responsable.nombre}</span>
            <span className="text-slate-500">Fecha de instalación</span>
            <span className="text-slate-900">{new Date(permiso.fechaInstalacion).toLocaleDateString("es-CL")}</span>
            <span className="text-slate-500">Fecha de solicitud</span>
            <span className="text-slate-900">
              {new Date(permiso.fechaRecepcionSolicitud).toLocaleDateString("es-CL")}
            </span>
            <span className="text-slate-500">Fecha de presentación</span>
            <span className="text-slate-900">
              {permiso.fechaPresentacion
                ? new Date(permiso.fechaPresentacion).toLocaleDateString("es-CL")
                : "Pendiente de presentar"}
            </span>
            <span className="text-slate-500">Fecha estimada resolución</span>
            <span className="text-slate-900">
              {permiso.fechaEstimadaResolucion
                ? new Date(permiso.fechaEstimadaResolucion).toLocaleDateString("es-CL")
                : "—"}
            </span>
          </div>
          {permiso.observaciones && (
            <div className="pt-2 border-t border-slate-200 text-sm">
              <p className="text-slate-500 mb-1">Observaciones</p>
              <p className="text-slate-800 whitespace-pre-line">{permiso.observaciones}</p>
            </div>
          )}
        </div>

        {/* Actualizar fecha de presentación */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Fecha de presentación</h2>
          <p className="text-sm text-slate-500 mb-4">
            Registra la fecha en que el permiso fue efectivamente presentado ante la municipalidad.
          </p>
          <form onSubmit={handleGuardarFecha} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de presentación</label>
              <input
                type="date"
                value={fechaPresentacion}
                onChange={(e) => setFechaPresentacion(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button type="submit" disabled={savingFecha}>
              {savingFecha ? "Guardando..." : "Actualizar"}
            </Button>
          </form>
          {fechaError && <p className="text-red-600 text-sm mt-2">{fechaError}</p>}
        </div>
      </div>

      {/* Cambiar estado */}
      {estadoActual === "APROBADO" ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Cambiar estado</h2>
          <p className="text-sm text-slate-500">Este permiso ya fue aprobado y no admite más cambios de estado.</p>
        </div>
      ) : opcionesEstado.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Cambiar estado</h2>
          <form onSubmit={handleCambiarEstado} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nuevo estado</label>
              <select
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {opcionesEstado.map((estado) => (
                  <option key={estado} value={estado}>
                    {PERMISO_ESTADOS[estado]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {nuevoEstado === "OBSERVADO"
                  ? "Pega aquí el texto de la observación de la municipalidad *"
                  : requiereComentario
                    ? "Motivo *"
                    : "Comentario (opcional)"}
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={4}
                required={requiereComentario}
                placeholder={
                  nuevoEstado === "OBSERVADO"
                    ? "Copia y pega el texto de la observación / solicitud de información de la municipalidad"
                    : requiereComentario
                      ? "Indica el motivo de este cambio de estado"
                      : "Notas adicionales (opcional)"
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {["SOLICITADO", "APROBADO", "CANCELADO"].includes(nuevoEstado) && (
                <p className="text-xs text-slate-500 mt-1">
                  Se enviará un correo automático a los coordinadores asignados informando este cambio.
                </p>
              )}
            </div>
            {estadoError && <p className="text-red-600 text-sm">{estadoError}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={savingEstado}>
                {savingEstado ? "Actualizando..." : "Actualizar estado"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {estadoActual === "APROBADO" && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Permiso aprobado</h2>
              <p className="mt-1 text-sm text-slate-500">
                Adjunta el documento final emitido por la municipalidad. Quedará asociado a este permiso y protegido por empresa.
              </p>
            </div>
            {permiso.permisoAprobadoArchivoNombre && (
              <span className="inline-flex self-start rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                Documento adjunto
              </span>
            )}
          </div>

          {permiso.permisoAprobadoArchivoNombre && permiso.permisoAprobadoArchivoUrl && (
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {permiso.permisoAprobadoArchivoNombreOriginal || "Permiso aprobado"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatearPesoArchivo(permiso.permisoAprobadoArchivoPeso)}
                    {permiso.permisoAprobadoAdjuntadoAt
                      ? ` · Adjuntado ${formatearFechaHora(permiso.permisoAprobadoAdjuntadoAt)}`
                      : ""}
                  </p>
                </div>
              </div>
              <a
                href={permiso.permisoAprobadoArchivoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Ver archivo
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          <form onSubmit={handleAdjuntarPermisoAprobado} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                {permiso.permisoAprobadoArchivoNombre ? "Reemplazar permiso aprobado" : "Adjuntar permiso aprobado"}
              </label>
              <input
                type="file"
                accept={DOCUMENTO_ACCEPT}
                onChange={(e) => {
                  setArchivoAprobado(e.target.files?.[0] || null);
                  setArchivoError(null);
                  setArchivoMensaje(null);
                }}
                className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              />
              <p className="mt-1 text-xs text-slate-500">
                {DOCUMENTO_TIPOS_LABEL}. Máximo 10 MB.
              </p>
            </div>
            {archivoError && <p className="text-sm text-red-600">{archivoError}</p>}
            {archivoMensaje && <p className="text-sm text-emerald-700">{archivoMensaje}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={savingArchivo || !archivoAprobado} className="gap-2">
                <Upload className="h-4 w-4" />
                {savingArchivo
                  ? "Guardando..."
                  : permiso.permisoAprobadoArchivoNombre
                    ? "Reemplazar archivo"
                    : "Adjuntar permiso aprobado"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Historial */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Historial</h2>
        <p className="text-xs text-slate-500 mb-4">
          Trazabilidad de cada cambio de estado, con el tiempo transcurrido desde el movimiento anterior.
        </p>
        {historial.length === 0 ? (
          <p className="text-sm text-slate-500">Sin movimientos registrados.</p>
        ) : (
          <ul className="space-y-3">
            {[...historial]
              .map((item, index) => ({
                item,
                diasDesdeAnterior:
                  index === 0
                    ? null
                    : Math.round(
                        (new Date(item.createdAt).getTime() - new Date(historial[index - 1].createdAt).getTime()) /
                          (1000 * 60 * 60 * 24),
                      ),
              }))
              .reverse()
              .map(({ item, diasDesdeAnterior }) => (
                <li key={item.id} className="text-sm border-l-2 border-slate-200 pl-3">
                  <p className="text-slate-900 font-medium">
                    {item.estadoAnterior ? `${PERMISO_ESTADOS[item.estadoAnterior as PermisoEstado] || item.estadoAnterior} → ` : ""}
                    {PERMISO_ESTADOS[item.estadoNuevo as PermisoEstado] || item.estadoNuevo}
                  </p>
                  {item.comentario && <p className="text-slate-600 whitespace-pre-line">{item.comentario}</p>}
                  <p className="text-slate-400 text-xs mt-0.5">
                    {formatearFechaHora(item.createdAt)}
                    {diasDesdeAnterior !== null && (
                      <span className="ml-2 text-slate-500">
                        · {diasDesdeAnterior === 0 ? "mismo día" : `+${diasDesdeAnterior} día${diasDesdeAnterior === 1 ? "" : "s"}`}
                      </span>
                    )}
                  </p>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
