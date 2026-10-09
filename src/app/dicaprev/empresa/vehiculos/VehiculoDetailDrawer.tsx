"use client";

import { useState, useEffect, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  X, Pencil, Car, Truck, Wrench,
  CheckCircle2, AlertTriangle, XCircle,
  MapPin, User, Calendar, Gauge, FileText, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type Vehiculo,
  type TipoVehiculo,
  type EstadoVehiculo,
  type TipoDocumento,
} from "./domain";
import { DOCUMENTO_ACCEPT } from "@/lib/documentacion/archivo-documento";
import { normalizarArchivoSeguroUrl } from "@/lib/documentacion/archivo-seguro";
import {
  crearMantencionVehiculo,
  cambiarEstadoDocumentoVehiculo,
  crearOActualizarDocumentoVehiculo,
  evaluarDocumentosVehiculo,
  getVehiculoDetalle,
  type EstadoDocumentoVehiculo,
  type VehiculoDocumentoDTO,
  type MantencionEstado,
  type VehiculoMantencionDTO,
  type VehiculoAcreditacionRelacionDTO,
} from "./actions";
import { formatDocumentoPeso } from "@/lib/documentacion/archivo-documento";

import { esDocumentoBaseVehiculo, ordenarDocumentosVehiculo, isDocumentoVencido, isDocumentoPendiente, estadoDocumentalFromDocumentos } from "@/lib/vehiculos/documentos-estado";

type ArchivoSubido = {
  archivoNombre: string;
  archivoNombreOriginal: string;
  archivoUrl: string;
};

type DocumentoVehiculoState = {
  id?: string;
  tipo: TipoDocumento;
  tipoNombre?: string;
  subido: boolean;
  estado?: string;
  vencimiento: string | null;
  tipoDocumentoId?: string | null;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  archivoNombre?: string | null;
  archivoNombreOriginal?: string | null;
  archivoUrl?: string | null;
  archivoTipo?: string | null;
  archivoPeso?: number | null;
  observaciones?: string | null;
};

type EstadoDocumentalVehiculo = "en_regla" | "por_vencer" | "fuera_de_regla" | "en_revision";

// ── Visual config ─────────────────────────────────────────────────────────

const TIPO_ICON: Record<TipoVehiculo, React.ReactNode> = {
  camioneta: <Car className="h-5 w-5" />,
  camion:    <Truck className="h-5 w-5" />,
  equipo:    <Wrench className="h-5 w-5" />,
};

const TIPO_LABEL: Record<TipoVehiculo, string> = {
  camioneta: "Camioneta",
  camion:    "Camión",
  equipo:    "Equipo / Maquinaria",
};

const ESTADO_OP_CFG: Record<EstadoVehiculo, { label: string; cls: string; icon: React.ReactNode }> = {
  operativo:  { label: "Operativo",     cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  mantencion: { label: "En mantención", cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",       icon: <AlertTriangle className="h-3 w-3" /> },
  baja:       { label: "Dado de baja",  cls: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",           icon: <XCircle className="h-3 w-3" /> },
};

const ESTADO_DOC_CFG: Record<EstadoDocumentalVehiculo, { label: string; cls: string; banner: string }> = {
  en_regla:       { label: "En regla",       cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", banner: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  por_vencer:     { label: "Por vencer",     cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",       banner: "bg-amber-50 border-amber-200 text-amber-800"       },
  fuera_de_regla: { label: "Fuera de regla", cls: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",           banner: "bg-rose-50 border-rose-200 text-rose-800"           },
  en_revision:    { label: "En revisión",    cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",           banner: "bg-blue-50 border-blue-200 text-blue-800"           },
};

const MANTENCIÓN_ESTADO_CLS: Record<"completada" | "pendiente" | "programada", string> = {
  completada: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  pendiente:  "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  programada: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
};

function diasParaVencerDocumento(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

// ── Sub-components ────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-slate-900">{value || "—"}</p>
      </div>
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
      {label}
    </h3>
  );
}

// ── Mock data ─────────────────────────────────────────────────────────────

type Mantencion = VehiculoMantencionDTO;

interface AsignacionHistorial {
  id: string;
  centro: string;
  responsable: string;
  desde: string;
  hasta: string | null;
  activa: boolean;
}

function mockAsignaciones(v: Vehiculo): AsignacionHistorial[] {
  return [
    {
      id: "a1",
      centro: v.centro,
      responsable: v.responsable,
      desde: v.creadoEl,
      hasta: null,
      activa: true,
    },
    {
      id: "a2",
      centro: "Casa Matriz",
      responsable: "Supervisor de Flota",
      desde: `${v.anio}-01-15`,
      hasta: v.creadoEl,
      activa: false,
    },
  ];
}

// ── Types ─────────────────────────────────────────────────────────────────

type TabId = "resumen" | "documentacion" | "mantenciones" | "asignacion" | "observaciones";

const TABS: { id: TabId; label: string }[] = [
  { id: "resumen",       label: "Resumen"       },
  { id: "documentacion", label: "Documentación" },
  { id: "mantenciones",  label: "Mantenciones"  },
  { id: "asignacion",    label: "Asignación"    },
  { id: "observaciones", label: "Observaciones" },
];

export interface VehiculoDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  vehiculo: Vehiculo | null;
  onEdit: (v: Vehiculo) => void;
  onDocumentosChange?: (id: string, documentos: VehiculoDocumentoDTO[]) => void;
}

// ── Main component ────────────────────────────────────────────────────────

export function VehiculoDetailDrawer({
  open,
  onClose,
  vehiculo: vehiculoProp,
  onEdit,
  onDocumentosChange,
}: VehiculoDetailDrawerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("resumen");
  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(vehiculoProp);
  const [documentos, setDocumentos] = useState<DocumentoVehiculoState[]>(
    (vehiculoProp?.documentos ?? []).map((d) => ({
      tipo: d.tipo,
      tipoNombre: d.tipo,
      subido: d.subido,
      estado: "pendiente",
      vencimiento: d.vencimiento,
      fechaEmision: null,
      fechaVencimiento: null,
      archivoNombre: null,
      archivoNombreOriginal: null,
      archivoUrl: null,
      archivoTipo: null,
      archivoPeso: null,
      observaciones: null,
    }))
  );
  const [mantenciones, setMantenciones] = useState<Mantencion[]>([]);
  const [acreditacionesRelacionadas, setAcreditacionesRelacionadas] = useState<VehiculoAcreditacionRelacionDTO[]>([]);
  const [mantencionModalOpen, setMantencionModalOpen] = useState(false);
  const [mantencionForm, setMantencionForm] = useState({
    tipo: "",
    fecha: "",
    estado: "programada" as MantencionEstado,
    observaciones: "",
    kilometraje: vehiculoProp?.kilometraje ?? 0,
  });
  const [isPending, startTransition] = useTransition();
  const [docError, setDocError] = useState<string | null>(null);
  const [guardandoDocumento, setGuardandoDocumento] = useState(false);
  const [guardandoEdicionDocumento, setGuardandoEdicionDocumento] = useState(false);
  const [docModalError, setDocModalError] = useState<string | null>(null);
  const [guardandoMantencion, setGuardandoMantencion] = useState(false);
  const [mantencionError, setMantencionError] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docEdit, setDocEdit] = useState<{
    id?: string;
    tipo: TipoDocumento;
    tipoNombre: string;
    subido: boolean;
    vencimiento: string;
    tipoDocumentoId?: string | null;
  } | null>(null);

  // Sync from prop (reflects store updates after edits)
  useEffect(() => {
    setVehiculo(vehiculoProp);
    setDocumentos(
      (vehiculoProp?.documentos ?? []).map((d) => ({
        tipo: d.tipo,
        tipoNombre: d.tipo,
        subido: d.subido,
        estado: "pendiente",
        vencimiento: d.vencimiento,
        fechaEmision: null,
        fechaVencimiento: null,
        archivoNombre: null,
        archivoNombreOriginal: null,
        archivoUrl: null,
        archivoTipo: null,
        archivoPeso: null,
        observaciones: null,
      }))
    );
    setMantencionForm((prev) => ({
      ...prev,
      kilometraje: vehiculoProp?.kilometraje ?? 0,
    }));
    setAcreditacionesRelacionadas([]);
  }, [vehiculoProp]);

  useEffect(() => {
    if (!open || !vehiculoProp?.id) return;

    let cancelled = false;
    startTransition(async () => {
      try {
        const detalle = await getVehiculoDetalle(vehiculoProp.id);
        if (cancelled) return;
        setDocumentos(
          detalle.documentos.map((d) => ({
            id: d.id,
            tipo: d.tipo,
            tipoNombre: d.tipoNombre,
            subido: d.subido,
            estado: d.estado,
            vencimiento: d.vencimiento,
            fechaEmision: d.fechaEmision,
            fechaVencimiento: d.fechaVencimiento,
            archivoNombre: d.archivoNombre,
            archivoNombreOriginal: d.archivoNombreOriginal,
            archivoUrl: d.archivoUrl,
            archivoTipo: d.archivoTipo,
            archivoPeso: d.archivoPeso,
            observaciones: d.observaciones,
            tipoDocumentoId: d.tipoDocumentoId,
          }))
        );
        setMantenciones(detalle.mantenciones);
        setAcreditacionesRelacionadas(detalle.acreditaciones);
      } catch {
        if (cancelled) return;
        setMantenciones([]);
        setAcreditacionesRelacionadas([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, vehiculoProp?.id, startTransition]);

  // Reset tab when opening a different vehicle
  useEffect(() => {
    if (open) setActiveTab("resumen");
  }, [open, vehiculoProp?.id]);

  // Escape cierra primero el modal interno, sin descartar operaciones en curso.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (docEdit) {
        if (!guardandoEdicionDocumento) {
          setDocFile(null);
          setDocEdit(null);
        }
      } else if (mantencionModalOpen) {
        if (!guardandoMantencion) setMantencionModalOpen(false);
      } else {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, docEdit, mantencionModalOpen, guardandoEdicionDocumento, guardandoMantencion]);

  async function subirArchivo(file: File): Promise<ArchivoSubido> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/dicaprev/documentacion/upload", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as ArchivoSubido | { error?: string };
    if (!response.ok) {
      throw new Error("error" in payload && payload.error ? payload.error : "No se pudo guardar el archivo.");
    }

    return payload as ArchivoSubido;
  }

  async function cambiarEstadoDocumento(doc: DocumentoVehiculoState, estado: EstadoDocumentoVehiculo) {
    if (!doc.id || !vehiculo || guardandoDocumento) return;
    setGuardandoDocumento(true);
    setDocError(null);
    try {
      const updated = await cambiarEstadoDocumentoVehiculo(doc.id, estado);
      setDocumentos((prev) => prev.map((item) => item.id === updated.id ? updated : item));
      const detalle = await getVehiculoDetalle(vehiculo.id);
      setDocumentos(detalle.documentos);
      onDocumentosChange?.(vehiculo.id, detalle.documentos);
    } catch (error) {
      setDocError(error instanceof Error ? error.message : "No se pudo actualizar el documento.");
    } finally {
      setGuardandoDocumento(false);
    }
  }

  async function handleDocSave(e: FormEvent) {
    e.preventDefault();
    if (!vehiculo || !docEdit || guardandoEdicionDocumento) return;
    setGuardandoEdicionDocumento(true);
    setDocModalError(null);

    try {
      const archivoSubido = docFile ? await subirArchivo(docFile) : null;
      await crearOActualizarDocumentoVehiculo({
        vehiculoId: vehiculo.id,
        documentoId: docEdit.id,
        tipo: docEdit.tipo,
        tipoDocumentoId: docEdit.tipoDocumentoId ?? undefined,
        subido: docEdit.subido,
        fechaVencimiento: docEdit.vencimiento,
        vencimiento: docEdit.vencimiento,
        archivoNombre: archivoSubido?.archivoNombre,
        archivoNombreOriginal: archivoSubido?.archivoNombreOriginal,
        archivoUrl: archivoSubido?.archivoUrl,
      });

      // El documento ya quedó guardado: no mantener el formulario disponible
      // para un segundo envío si falla el refresco del detalle.
      setDocFile(null);
      setDocEdit(null);
      try {
        const evaluated = await evaluarDocumentosVehiculo(vehiculo.id);
        onDocumentosChange?.(vehiculo.id, evaluated);
        setDocumentos(
          evaluated.map((d) => ({
            id: d.id,
            tipo: d.tipo,
            tipoNombre: d.tipoNombre,
            subido: d.subido,
            estado: d.estado,
            vencimiento: d.vencimiento,
            fechaEmision: d.fechaEmision,
            fechaVencimiento: d.fechaVencimiento,
            archivoNombre: d.archivoNombre,
            archivoNombreOriginal: d.archivoNombreOriginal,
            archivoUrl: d.archivoUrl,
            archivoTipo: d.archivoTipo,
            archivoPeso: d.archivoPeso,
            observaciones: d.observaciones,
            tipoDocumentoId: d.tipoDocumentoId,
          }))
        );
      } catch {
        setDocError("El documento se guardó, pero no se pudo actualizar su estado. Cierra y vuelve a abrir el vehículo para ver el dato actualizado.");
      }
    } catch (error) {
      setDocModalError(error instanceof Error ? error.message : "No se pudo guardar el documento. Intenta nuevamente.");
    } finally {
      setGuardandoEdicionDocumento(false);
    }
  }

  async function submitMantencion(e: FormEvent) {
    e.preventDefault();
    if (!vehiculo || !mantencionForm.tipo || !mantencionForm.fecha || guardandoMantencion) return;
    setGuardandoMantencion(true);
    setMantencionError(null);
    try {
      const created = await crearMantencionVehiculo(vehiculo.id, {
        tipo: mantencionForm.tipo,
        fecha: mantencionForm.fecha,
        estado: mantencionForm.estado,
        observaciones: mantencionForm.observaciones,
        kilometraje: mantencionForm.kilometraje,
      });

      setMantenciones((prev) => [created, ...prev]);
      setVehiculo((prev) =>
        prev
          ? {
              ...prev,
              kilometraje:
                mantencionForm.kilometraje > 0 ? mantencionForm.kilometraje : prev.kilometraje,
            }
          : prev
      );
      setMantencionModalOpen(false);
      setMantencionForm((prev) => ({
        ...prev,
        tipo: "",
        fecha: "",
        estado: "programada",
        observaciones: "",
      }));
    } catch (error) {
      setMantencionError(error instanceof Error ? error.message : "No fue posible guardar la mantención.");
    } finally {
      setGuardandoMantencion(false);
    }
  }

  if (!open || !vehiculo) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300",
          open && vehiculo ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Document edit mini-modal — z-[60] sits above the drawer */}
      {docEdit && vehiculo && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-4 py-[max(1rem,env(safe-area-inset-top))] sm:items-center">
          <div
            aria-hidden
            className="absolute inset-0 bg-slate-900/30"
          />
          <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl [-webkit-overflow-scrolling:touch]">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Actualizar — {docEdit.tipoNombre}
            </h3>
            {docModalError ? <p role="alert" className="mb-3 text-sm text-rose-700">{docModalError}</p> : null}
            <form onSubmit={handleDocSave} className="space-y-4">
              <div className="flex min-w-0 items-center gap-3">
                <input
                  id="doc-subido"
                  type="checkbox"
                  checked={docEdit.subido}
                  onChange={(e) =>
                    setDocEdit((prev) => prev && { ...prev, subido: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                />
                <Label htmlFor="doc-subido">Documento subido / disponible</Label>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de vencimiento</Label>
                <Input
                  type="date"
                  className="rounded-xl"
                  value={docEdit.vencimiento}
                  onChange={(e) =>
                    setDocEdit((prev) => prev && { ...prev, vencimiento: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Archivo (opcional)</Label>
                <Input
                  type="file"
                  className="rounded-xl"
                  accept={DOCUMENTO_ACCEPT}
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                />
                {docFile && (
                  <p className="text-xs text-slate-500">Archivo seleccionado: {docFile.name}</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={guardandoEdicionDocumento}
                  onClick={() => {
                    setDocFile(null);
                    setDocEdit(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={guardandoEdicionDocumento}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {guardandoEdicionDocumento ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mantencionModalOpen && vehiculo && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-4 py-[max(1rem,env(safe-area-inset-top))] sm:items-center">
          <div
            aria-hidden
            className="absolute inset-0 bg-slate-900/30"
          />
          <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl [-webkit-overflow-scrolling:touch]">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Nueva mantención</h3>
            {mantencionError ? <p role="alert" className="mb-3 text-sm text-rose-700">{mantencionError}</p> : null}
            <form onSubmit={submitMantencion} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tipo de mantención</Label>
                <Input
                  className="rounded-xl"
                  value={mantencionForm.tipo}
                  onChange={(e) =>
                    setMantencionForm((prev) => ({ ...prev, tipo: e.target.value }))
                  }
                  placeholder="Ej: Cambio de aceite y filtros"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    className="rounded-xl"
                    value={mantencionForm.fecha}
                    onChange={(e) =>
                      setMantencionForm((prev) => ({ ...prev, fecha: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    value={mantencionForm.estado}
                    onChange={(e) =>
                      setMantencionForm((prev) => ({
                        ...prev,
                        estado: e.target.value as MantencionEstado,
                      }))
                    }
                  >
                    <option value="programada">Programada</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="completada">Completada</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Kilometraje actual</Label>
                <Input
                  type="number"
                  min={0}
                  className="rounded-xl"
                  value={mantencionForm.kilometraje}
                  onChange={(e) =>
                    setMantencionForm((prev) => ({
                      ...prev,
                      kilometraje: Number.parseInt(e.target.value, 10) || 0,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Observaciones</Label>
                <Textarea
                  className="rounded-xl"
                  rows={3}
                  value={mantencionForm.observaciones}
                  onChange={(e) =>
                    setMantencionForm((prev) => ({ ...prev, observaciones: e.target.value }))
                  }
                  placeholder="Detalle de trabajos realizados"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setMantencionModalOpen(false)}
                  disabled={guardandoMantencion}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white"
                  disabled={guardandoMantencion}
                >
                  {guardandoMantencion ? "Guardando..." : "Guardar mantención"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-label="Detalle del vehículo"
        aria-modal
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex h-[100dvh] max-h-[100dvh] min-h-0 w-full max-w-[480px] flex-col overflow-hidden bg-white shadow-2xl transition-transform duration-300 ease-out",
          open && vehiculo ? "translate-x-0" : "translate-x-full",
        )}
      >
        {vehiculo &&
          (() => {
            const estadoOp  = ESTADO_OP_CFG[vehiculo.estado];
            const estDocStr = estadoDocumentalFromDocumentos(documentos);
            const estadoDoc = ESTADO_DOC_CFG[estDocStr];
            const requeridos = ordenarDocumentosVehiculo(documentos);
            const aniosUso = new Date().getFullYear() - vehiculo.anio;
            const docsPendientes = documentos.filter((doc) => isDocumentoPendiente(doc) || isDocumentoVencido(doc)).length;
            const asignaciones = mockAsignaciones(vehiculo);
            const estadoAcreditacionLabel = (estado: string) => {
              if (estado === "en_preparacion") return "En preparación";
              if (estado === "listo_para_enviar") return "Lista para enviar";
              if (estado === "enviado") return "Enviada";
              if (estado === "observada") return "Observada";
              if (estado === "aprobado") return "Aprobada";
              if (estado === "rechazado") return "Rechazada";
              if (estado === "cerrada") return "Cerrada";
              if (estado === "vencido") return "Vencida";
              return estado;
            };

            return (
              <>
                {/* ── Header ── */}
                <div className="shrink-0 border-b border-slate-200 px-5 pt-5 pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                        {TIPO_ICON[vehiculo.tipo]}
                      </div>
                      <div>
                        <h2 className="break-words text-base font-bold leading-tight text-slate-900">
                          {vehiculo.marca} {vehiculo.modelo}
                        </h2>
                        <p className="mt-0.5 font-mono text-xs text-slate-400">
                          {vehiculo.patente}
                          {vehiculo.codigoInterno && (
                            <>
                              <span className="mx-1 text-slate-300">·</span>
                              {vehiculo.codigoInterno}
                            </>
                          )}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              estadoOp.cls,
                            )}
                          >
                            {estadoOp.icon} {estadoOp.label}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              estadoDoc.cls,
                            )}
                          >
                            {estadoDoc.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => onEdit(vehiculo)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </button>
                      <button
                        onClick={onClose}
                        aria-label="Cerrar detalle del vehículo"
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick stats bar */}
                  <div className="grid grid-cols-2 border-t border-slate-100 -mx-5 sm:grid-cols-4">
                    {[
                      {
                        val: `${aniosUso} año${aniosUso !== 1 ? "s" : ""}`,
                        label: "Antigüedad",
                        accent: false,
                      },
                      {
                        val: String(docsPendientes),
                        label: "Docs en riesgo",
                        accent: docsPendientes > 0,
                      },
                      {
                        val: vehiculo.proximaRevision
                          ? new Date(vehiculo.proximaRevision + "T00:00:00").toLocaleDateString(
                              "es-CL",
                              { day: "2-digit", month: "short" },
                            )
                          : "—",
                        label: "Próx. revisión",
                        accent: false,
                      },
                      { val: vehiculo.centro || "—", label: "Centro", small: true, accent: false },
                    ].map((s, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex flex-col items-center justify-center px-2 py-3 text-center",
                          i > 0 && "border-l border-slate-100",
                        )}
                      >
                        <p
                          className={cn(
                            "font-bold leading-tight text-slate-900",
                            s.accent ? "text-sm text-rose-600" : "text-sm",
                            s.small && "max-w-[72px] truncate text-xs",
                          )}
                        >
                          {s.val}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Tab bar */}
                  <div className="-mx-5 overflow-x-auto overscroll-x-contain border-t border-slate-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex min-w-max">
                      {TABS.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setActiveTab(t.id)}
                          className={cn(
                            "relative whitespace-nowrap px-4 py-2.5 text-xs font-semibold transition-colors",
                            activeTab === t.id
                              ? "text-slate-900"
                              : "text-slate-400 hover:text-slate-700",
                          )}
                        >
                          {t.label}
                          {activeTab === t.id && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-slate-900" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Body (scrollable) ── */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-[calc(env(safe-area-inset-bottom)+24px)] [-webkit-overflow-scrolling:touch]">

                  {/* Resumen */}
                  {activeTab === "resumen" && (
                    <div className="p-5 space-y-4">
                      <SectionTitle label="Información del vehículo" />
                      <div className="grid grid-cols-1 gap-4">
                        <InfoRow
                          icon={<Wrench className="h-4 w-4" />}
                          label="Tipo"
                          value={TIPO_LABEL[vehiculo.tipo]}
                        />
                        <InfoRow
                          icon={<FileText className="h-4 w-4" />}
                          label="Patente"
                          value={vehiculo.patente}
                        />
                        <InfoRow
                          icon={<Car className="h-4 w-4" />}
                          label="Marca"
                          value={vehiculo.marca}
                        />
                        <InfoRow
                          icon={<Car className="h-4 w-4" />}
                          label="Modelo"
                          value={vehiculo.modelo}
                        />
                        <InfoRow
                          icon={<Calendar className="h-4 w-4" />}
                          label="Año"
                          value={String(vehiculo.anio)}
                        />
                        <InfoRow
                          icon={<MapPin className="h-4 w-4" />}
                          label="Centro de trabajo"
                          value={vehiculo.centro}
                        />
                        <InfoRow
                          icon={<User className="h-4 w-4" />}
                          label="Responsable"
                          value={
                            vehiculo.responsableEmail
                              ? `${vehiculo.responsable} · ${vehiculo.responsableEmail}`
                              : vehiculo.responsable
                          }
                        />
                        <InfoRow
                          icon={<FileText className="h-4 w-4" />}
                          label="N.º de chasis"
                          value={vehiculo.numeroChasis || "No informado"}
                        />
                        <InfoRow
                          icon={<CheckCircle2 className="h-4 w-4" />}
                          label="GPS"
                          value={vehiculo.gps ? "Sí" : "No"}
                        />
                        <InfoRow
                          icon={<CheckCircle2 className="h-4 w-4" />}
                          label="Estado operativo"
                          value={estadoOp.label}
                        />
                        <InfoRow
                          icon={<Calendar className="h-4 w-4" />}
                          label="Próxima revisión"
                          value={vehiculo.proximaRevision || "No definida"}
                        />
                        {vehiculo.tipo !== "equipo" && (
                          <InfoRow
                            icon={<Gauge className="h-4 w-4" />}
                            label="Kilometraje"
                            value={
                              vehiculo.kilometraje > 0
                                ? `${vehiculo.kilometraje.toLocaleString("es-CL")} km`
                                : "No aplica"
                            }
                          />
                        )}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                              Acreditaciones relacionadas
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {acreditacionesRelacionadas.length} expediente{acreditacionesRelacionadas.length !== 1 ? "s" : ""}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Acceso directo a las acreditaciones donde este vehículo participa.
                            </p>
                          </div>
                          <div className="rounded-xl bg-white px-3 py-2 text-right shadow-sm ring-1 ring-slate-200">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">Última actividad</p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-700">
                              {acreditacionesRelacionadas[0]?.updatedAt
                                ? new Date(acreditacionesRelacionadas[0].updatedAt).toLocaleDateString("es-CL")
                                : "Sin actividad"}
                            </p>
                          </div>
                        </div>

                        {acreditacionesRelacionadas.length > 0 ? (
                          <div className="mt-4 space-y-2.5">
                            {acreditacionesRelacionadas.map((acreditacion) => (
                              <button
                                key={acreditacion.id}
                                type="button"
                                onClick={() => {
                                  onClose();
                                  router.push(`/dicaprev/acreditaciones/${acreditacion.id}`);
                                }}
                                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-800">{acreditacion.mandante}</p>
                                  <p className="truncate text-xs text-slate-500">{acreditacion.proyecto}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                    {estadoAcreditacionLabel(acreditacion.estado)}
                                  </span>
                                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5">
                            <p className="text-sm text-slate-500">Este vehículo aún no participa en acreditaciones activas.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Documentación */}
                  {activeTab === "documentacion" && (
                    <div className="p-5 space-y-4">
                      {/* Estado banner */}
                      <div
                        className={cn(
                          "rounded-xl border px-4 py-3 text-sm font-medium",
                          estadoDoc.banner,
                        )}
                      >
                        {estDocStr === "en_regla" &&
                          "Toda la documentación está vigente y al día."}
                        {estDocStr === "por_vencer" &&
                          "Hay documentos próximos a vencer. Gestionar renovación."}
                        {estDocStr === "en_revision" &&
                          "Hay documentos en revisión. Esperando validación administrativa."}
                        {estDocStr === "fuera_de_regla" &&
                          "Hay documentos vencidos o sin cargar. Acción requerida."}
                      </div>

                      <SectionTitle label="Documentación del vehículo" />
                      <p className="text-xs text-slate-500">
                        Padrón, SOAP, permiso de circulación, revisión técnica y gases son los documentos base.
                        Revisión técnica y gases se obtienen en conjunto; registra ambos certificados.
                        En los adicionales puedes elegir «No aplica» para excluirlos de pendientes y alertas.
                      </p>
                      {docError && <p role="alert" className="text-sm text-rose-700">{docError}</p>}

                      <div className="space-y-3">
                        {requeridos.map((doc) => {
                          const dias = doc.fechaVencimiento
                            ? diasParaVencerDocumento(doc.fechaVencimiento)
                            : null;

                          let badgeLabel = "Sin cargar";
                          let badgeCls = "bg-slate-100 text-slate-500";

                          if (doc.estado === "no_aplica") {
                            badgeLabel = "No aplica";
                          } else if (doc.estado === "en_revision") {
                            badgeLabel = "En revisión";
                            badgeCls = "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
                          } else if (doc.estado === "rechazado") {
                            badgeLabel = "Rechazado";
                            badgeCls = "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
                          } else if (doc.subido) {
                            if (dias === null && doc.estado !== "vencido") {
                              badgeLabel = "Vigente";
                              badgeCls = "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
                            } else if (dias !== null && dias < 0) {
                              badgeLabel = "Vencido";
                              badgeCls = "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
                            } else if (dias !== null && dias <= 30) {
                              badgeLabel = "Por vencer";
                              badgeCls = "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
                            } else {
                              badgeLabel = "Vigente";
                              badgeCls = "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
                            }
                          }

                          return (
                            <div
                              key={doc.id ?? doc.tipo}
                              className="flex flex-wrap items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 gap-3"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800">
                                  {doc.tipoNombre ?? doc.tipo}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {esDocumentoBaseVehiculo(doc.tipo) ? "Documento base" : "Documento adicional"}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {doc.estado === "no_aplica"
                                    ? "Excluido de pendientes y alertas"
                                    : doc.fechaVencimiento
                                    ? `Vence: ${new Date(
                                        `${doc.fechaVencimiento}T00:00:00`,
                                      ).toLocaleDateString("es-CL")}${
                                        dias !== null
                                          ? ` (${dias >= 0 ? `${dias} días` : "vencido"})`
                                          : ""
                                      }`
                                    : doc.subido
                                    ? "Sin fecha de vencimiento"
                                    : "No cargado"}
                                </p>
                                {normalizarArchivoSeguroUrl(doc.archivoUrl) && (
                                  <a
                                    href={normalizarArchivoSeguroUrl(doc.archivoUrl) ?? undefined}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-block text-xs font-medium text-slate-600 underline"
                                  >
                                    Ver archivo
                                  </a>
                                )}
                                {(doc.archivoNombreOriginal || doc.archivoTipo || typeof doc.archivoPeso === "number") && (
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    {[doc.archivoNombreOriginal, doc.archivoTipo, typeof doc.archivoPeso === "number" ? formatDocumentoPeso(doc.archivoPeso) : null]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {!esDocumentoBaseVehiculo(doc.tipo) && doc.id && (
                                  <select
                                    aria-label={`Aplicabilidad de ${doc.tipoNombre ?? doc.tipo}`}
                                    value={doc.estado === "no_aplica" ? "no_aplica" : "aplica"}
                                    disabled={guardandoDocumento || isPending}
                                    onChange={(event) => void cambiarEstadoDocumento(doc, event.target.value === "no_aplica" ? "no_aplica" : "pendiente")}
                                    className="min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 disabled:opacity-50"
                                  >
                                    <option value="aplica">Aplica</option>
                                    <option value="no_aplica">No aplica</option>
                                  </select>
                                )}
                                <span
                                  className={cn(
                                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                    badgeCls,
                                  )}
                                >
                                  {badgeLabel}
                                </span>
                                <button
                                  type="button"
                                  disabled={doc.estado === "no_aplica" || guardandoDocumento || isPending}
                                  aria-label={`Editar ${doc.tipoNombre ?? doc.tipo}`}
                                  onClick={() => {
                                    setDocFile(null);
                                    setDocModalError(null);
                                    setDocEdit({
                                      id: doc.id,
                                      tipo: doc.tipo,
                                      tipoNombre: doc.tipoNombre ?? doc.tipo,
                                      subido: doc.subido,
                                      vencimiento: doc.fechaVencimiento ?? doc.vencimiento ?? "",
                                      tipoDocumentoId: doc.tipoDocumentoId,
                                    });
                                  }}
                                  className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-colors hover:border-slate-400 hover:text-slate-700"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                {doc.id && doc.subido && doc.estado !== "no_aplica" && (
                                  <button
                                    type="button"
                                    disabled={guardandoDocumento || isPending}
                                    onClick={() => void cambiarEstadoDocumento(doc, "en_revision")}
                                    className="rounded-lg border border-blue-200 px-2 py-1 text-[11px] font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50"
                                  >
                                    En revisión
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {requeridos.length === 0 && (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6">
                            <p className="text-sm text-slate-500">No hay tipos documentales vehiculares activos para la empresa.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mantenciones */}
                  {activeTab === "mantenciones" && (
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <SectionTitle label="Historial de mantenciones" />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 rounded-lg text-xs"
                          onClick={() => { setMantencionError(null); setMantencionModalOpen(true); }}
                        >
                          Agregar mantención
                        </Button>
                      </div>

                      {isPending && mantenciones.length === 0 && (
                        <p className="text-xs text-slate-400">Cargando mantenciones...</p>
                      )}

                      {!isPending && mantenciones.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6">
                          <p className="text-sm text-slate-500">No hay mantenciones registradas.</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        {mantenciones.map((m) => (
                          <div
                            key={m.id}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-800">{m.tipo}</p>
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                  MANTENCIÓN_ESTADO_CLS[m.estado],
                                )}
                              >
                                {m.estado.charAt(0).toUpperCase() + m.estado.slice(1)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {new Date(m.fecha + "T00:00:00").toLocaleDateString("es-CL", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })}
                              {typeof m.kilometraje === "number" && m.kilometraje > 0
                                ? ` · ${m.kilometraje.toLocaleString("es-CL")} km`
                                : ""}
                            </p>
                            {m.observaciones && (
                              <p className="mt-1.5 text-xs text-slate-500">{m.observaciones}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Asignación */}
                  {activeTab === "asignacion" && (
                    <div className="p-5 space-y-4">
                      <SectionTitle label="Asignación actual" />
                      <div className="grid gap-4">
                        <InfoRow
                          icon={<MapPin className="h-4 w-4" />}
                          label="Centro asignado"
                          value={vehiculo.centro}
                        />
                        <InfoRow
                          icon={<User className="h-4 w-4" />}
                          label="Responsable"
                          value={vehiculo.responsable}
                        />
                      </div>

                      <div className="pt-2">
                        <SectionTitle label="Historial de asignaciones" />
                        <div className="space-y-3">
                          {asignaciones.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800">{a.centro}</p>
                                <p className="mt-0.5 text-xs text-slate-400">{a.responsable}</p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  Desde{" "}
                                  {new Date(a.desde + "T00:00:00").toLocaleDateString("es-CL")}
                                  {a.hasta
                                    ? ` → ${new Date(a.hasta + "T00:00:00").toLocaleDateString("es-CL")}`
                                    : " · Activa"}
                                </p>
                              </div>
                              {a.activa && (
                                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                  Activa
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Observaciones */}
                  {activeTab === "observaciones" && (
                    <div className="p-5 space-y-4">
                      <SectionTitle label="Observaciones" />
                      {vehiculo.observaciones ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                            {vehiculo.observaciones}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">Sin observaciones registradas.</p>
                      )}
                    </div>
                  )}

                </div>
              </>
            );
          })()}
      </div>
    </>
  );
}
