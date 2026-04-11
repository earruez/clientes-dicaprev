"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  X, Pencil, Car, Truck, Wrench,
  CheckCircle2, AlertTriangle, XCircle,
  MapPin, User, Calendar, Gauge, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type Vehiculo,
  type TipoVehiculo,
  type EstadoVehiculo,
  type EstadoDocumental,
  type TipoDocumento,
  evaluarEstadoDocumental,
  diasParaVencer,
  DOC_NOMBRE,
  DOCS_REQUERIDOS,
  updateDocumento,
  getVehiculoById,
} from "@/lib/vehiculos/vehiculos-store";

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

const ESTADO_DOC_CFG: Record<EstadoDocumental, { label: string; cls: string; banner: string }> = {
  en_regla:       { label: "En regla",       cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", banner: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  por_vencer:     { label: "Por vencer",     cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",       banner: "bg-amber-50 border-amber-200 text-amber-800"       },
  fuera_de_regla: { label: "Fuera de regla", cls: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",           banner: "bg-rose-50 border-rose-200 text-rose-800"           },
};

const MANTENCIÓN_ESTADO_CLS: Record<"completada" | "pendiente" | "programada", string> = {
  completada: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  pendiente:  "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  programada: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
};

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

interface Mantencion {
  id: string;
  tipo: string;
  fecha: string;
  estado: "completada" | "pendiente" | "programada";
  observaciones: string;
}

function mockMantenciones(v: Vehiculo): Mantencion[] {
  return [
    {
      id: "m1",
      tipo: "Mantención preventiva mayor",
      fecha: `${v.anio + 2}-11-10`,
      estado: "completada",
      observaciones: "Sin novedades. Filtros y aceite reemplazados.",
    },
    {
      id: "m2",
      tipo: "Cambio de aceite y filtros",
      fecha: `${v.anio + 3}-06-22`,
      estado: "completada",
      observaciones: "Aceite 15W-40 sintético.",
    },
    {
      id: "m3",
      tipo: "Revisión sistema de frenos",
      fecha: v.proximaRevision || "2026-07-01",
      estado: "programada",
      observaciones: "Programar con taller autorizado según kilometraje.",
    },
  ];
}

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
}

// ── Main component ────────────────────────────────────────────────────────

export function VehiculoDetailDrawer({
  open,
  onClose,
  vehiculo: vehiculoProp,
  onEdit,
}: VehiculoDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("resumen");
  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(vehiculoProp);
  const [docEdit, setDocEdit] = useState<{
    tipo: TipoDocumento;
    subido: boolean;
    vencimiento: string;
  } | null>(null);

  // Sync from prop (reflects store updates after edits)
  useEffect(() => {
    setVehiculo(vehiculoProp);
  }, [vehiculoProp]);

  // Reset tab when opening a different vehicle
  useEffect(() => {
    if (open) setActiveTab("resumen");
  }, [open, vehiculoProp?.id]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleDocSave(e: FormEvent) {
    e.preventDefault();
    if (!vehiculo || !docEdit) return;
    updateDocumento(vehiculo.id, docEdit.tipo, {
      subido: docEdit.subido,
      vencimiento: docEdit.vencimiento || null,
    });
    const updated = getVehiculoById(vehiculo.id);
    if (updated) setVehiculo(updated);
    setDocEdit(null);
  }

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            aria-hidden
            onClick={() => setDocEdit(null)}
            className="absolute inset-0 bg-slate-900/30"
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Actualizar — {DOC_NOMBRE[docEdit.tipo]}
            </h3>
            <form onSubmit={handleDocSave} className="space-y-4">
              <div className="flex items-center gap-3">
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
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setDocEdit(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white"
                >
                  Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
          open && vehiculo ? "translate-x-0" : "translate-x-full",
        )}
      >
        {vehiculo &&
          (() => {
            const estadoOp  = ESTADO_OP_CFG[vehiculo.estado];
            const estDocStr = evaluarEstadoDocumental(vehiculo);
            const estadoDoc = ESTADO_DOC_CFG[estDocStr];
            const requeridos    = DOCS_REQUERIDOS[vehiculo.tipo];
            const aniosUso      = new Date().getFullYear() - vehiculo.anio;
            const hoy           = new Date();
            const docsPendientes = requeridos.filter((req) => {
              const doc = vehiculo.documentos.find((d) => d.tipo === req);
              if (!doc || !doc.subido) return true;
              if (doc.vencimiento && new Date(doc.vencimiento) < hoy) return true;
              return false;
            }).length;
            const mantenciones = mockMantenciones(vehiculo);
            const asignaciones = mockAsignaciones(vehiculo);

            return (
              <>
                {/* ── Header ── */}
                <div className="shrink-0 border-b border-slate-200 px-5 pt-5 pb-0">
                  <div className="flex items-start justify-between gap-3 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                        {TIPO_ICON[vehiculo.tipo]}
                      </div>
                      <div>
                        <h2 className="text-base font-bold leading-tight text-slate-900">
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
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick stats bar */}
                  <div className="grid grid-cols-4 border-t border-slate-100 -mx-5">
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
                  <div className="-mx-5 overflow-x-auto border-t border-slate-100">
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
                <div className="flex-1 overflow-y-auto">

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
                          value={vehiculo.responsable}
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
                        {estDocStr === "fuera_de_regla" &&
                          "Hay documentos vencidos o sin cargar. Acción requerida."}
                      </div>

                      <SectionTitle label="Documentos requeridos" />

                      <div className="space-y-3">
                        {requeridos.map((req) => {
                          const doc = vehiculo.documentos.find((d) => d.tipo === req);
                          const dias = doc?.vencimiento
                            ? diasParaVencer(doc.vencimiento)
                            : null;

                          let badgeLabel = "Sin cargar";
                          let badgeCls = "bg-slate-100 text-slate-500";

                          if (doc?.subido) {
                            if (dias === null) {
                              badgeLabel = "Vigente";
                              badgeCls = "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
                            } else if (dias < 0) {
                              badgeLabel = "Vencido";
                              badgeCls = "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
                            } else if (dias <= 30) {
                              badgeLabel = "Por vencer";
                              badgeCls = "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
                            } else {
                              badgeLabel = "Vigente";
                              badgeCls = "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
                            }
                          }

                          return (
                            <div
                              key={req}
                              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 gap-3"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800">
                                  {DOC_NOMBRE[req]}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {doc?.vencimiento
                                    ? `Vence: ${new Date(
                                        doc.vencimiento + "T00:00:00",
                                      ).toLocaleDateString("es-CL")}${
                                        dias !== null
                                          ? ` (${dias >= 0 ? `${dias} días` : "vencido"})`
                                          : ""
                                      }`
                                    : doc?.subido
                                    ? "Sin fecha de vencimiento"
                                    : "No cargado"}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
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
                                  onClick={() =>
                                    setDocEdit({
                                      tipo: req,
                                      subido: doc?.subido ?? false,
                                      vencimiento: doc?.vencimiento ?? "",
                                    })
                                  }
                                  className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-colors hover:border-slate-400 hover:text-slate-700"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Mantenciones */}
                  {activeTab === "mantenciones" && (
                    <div className="p-5 space-y-4">
                      <SectionTitle label="Historial de mantenciones" />
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
