"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Car,
  Truck,
  Wrench,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  User,
  MapPin,
  Calendar,
  Gauge,
  FileText,
  Clock,
  Pencil,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  actualizarVehiculo,
  getCentrosList,
  getVehiculoById,
  getVehiculoDocumentos,
  getVehiculoMantenciones,
  upsertVehiculoDocumento,
  type CentroItem,
  type VehiculoDTO,
  type VehiculoDocumentoDTO,
  type VehiculoInput,
  type VehiculoMantencionDTO,
} from "@/actions/vehiculos";

type EstadoDocumental = "en_regla" | "por_vencer" | "fuera_de_regla";

type TipoDocumento =
  | "permiso_circulacion"
  | "soap"
  | "revision_tecnica"
  | "padron"
  | "mantencion"
  | "certificacion"
  | "revision_vigente";

const NO_CENTRO_VALUE = "__sin_centro__";

const DOC_NOMBRE: Record<TipoDocumento, string> = {
  permiso_circulacion: "Permiso de circulación",
  soap: "SOAP",
  revision_tecnica: "Revisión técnica",
  padron: "Padrón",
  mantencion: "Mantención preventiva",
  certificacion: "Certificación de operación",
  revision_vigente: "Revisión vigente",
};

const DOC_ORDER: TipoDocumento[] = [
  "permiso_circulacion",
  "soap",
  "revision_tecnica",
  "padron",
  "mantencion",
  "certificacion",
  "revision_vigente",
];

const TIPO_ICON: Record<string, React.ReactNode> = {
  camioneta: <Car className="h-5 w-5" />,
  camion: <Truck className="h-5 w-5" />,
  equipo: <Wrench className="h-5 w-5" />,
};

const TIPO_LABEL: Record<string, string> = {
  camioneta: "Camioneta",
  camion: "Camión",
  equipo: "Equipo / Maquinaria",
};

const ESTADO_OP_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  operativo: {
    label: "Operativo",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  mantencion: {
    label: "En mantención",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  baja: {
    label: "Dado de baja",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

const ESTADO_DOC_CFG: Record<EstadoDocumental, { label: string; cls: string; dot: string; desc: string }> = {
  en_regla: {
    label: "En regla",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    desc: "Toda la documentación está vigente.",
  },
  por_vencer: {
    label: "Por vencer",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    desc: "Uno o más documentos vencen en los próximos 30 días.",
  },
  fuera_de_regla: {
    label: "Fuera de regla",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    desc: "Documentos faltantes o vencidos.",
  },
};

function fmt(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL");
}

function diasParaVencer(iso?: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  const now = Date.now();
  return Math.ceil((target - now) / 86400000);
}

function evaluarEstadoDocumental(documentos: VehiculoDocumentoDTO[]): EstadoDocumental {
  if (!documentos.length) return "fuera_de_regla";

  const now = Date.now();
  for (const doc of documentos) {
    if (!doc.subido) return "fuera_de_regla";
    if (doc.vencimiento) {
      const ts = new Date(doc.vencimiento).getTime();
      if (!Number.isNaN(ts) && ts < now) return "fuera_de_regla";
    }
  }

  const porVencer = documentos.some((doc) => {
    if (!doc.vencimiento) return false;
    const ts = new Date(doc.vencimiento).getTime();
    if (Number.isNaN(ts)) return false;
    const diff = ts - now;
    return diff >= 0 && diff <= 30 * 86400000;
  });

  return porVencer ? "por_vencer" : "en_regla";
}

export default function VehiculoDetailPage() {
  const params = useParams<{ id: string }>();
  const vehiculoId = params.id;

  const [vehiculo, setVehiculo] = useState<VehiculoDTO | null>(null);
  const [centros, setCentros] = useState<CentroItem[]>([]);
  const [mantenciones, setMantenciones] = useState<VehiculoMantencionDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState<VehiculoInput | null>(null);
  const [docModal, setDocModal] = useState<{ open: boolean; tipo?: TipoDocumento }>({ open: false });
  const [docForm, setDocForm] = useState<{ vencimiento: string; subido: boolean }>({
    vencimiento: "",
    subido: true,
  });

  const loadDetalle = useCallback(async () => {
    if (!vehiculoId) return;

    setLoading(true);
    try {
      const base = await getVehiculoById(vehiculoId);
      if (!base) {
        setVehiculo(null);
        setMantenciones([]);
        setCentros([]);
        return;
      }

      const [documentos, mants, centrosList] = await Promise.all([
        getVehiculoDocumentos(vehiculoId),
        getVehiculoMantenciones(vehiculoId),
        getCentrosList(),
      ]);

      setVehiculo({ ...base, documentos });
      setMantenciones(mants);
      setCentros(centrosList);
    } finally {
      setLoading(false);
    }
  }, [vehiculoId]);

  useEffect(() => {
    void loadDetalle();
  }, [loadDetalle]);

  function handleChange(field: keyof VehiculoInput, value: string | number) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function abrirEditar() {
    if (!vehiculo) return;

    setForm({
      patente: vehiculo.patente,
      codigoInterno: vehiculo.codigoInterno ?? "",
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio ?? new Date().getFullYear(),
      tipo: vehiculo.tipo,
      centroTrabajoId: vehiculo.centroTrabajoId ?? NO_CENTRO_VALUE,
      responsable: vehiculo.responsable ?? "",
      estado: vehiculo.estado,
      proximaRevision: vehiculo.proximaRevision ?? "",
      kilometraje: vehiculo.kilometraje ?? 0,
      observaciones: vehiculo.observaciones ?? "",
    });

    setEditModal(true);
  }

  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!vehiculo || !form) return;

    const payload: VehiculoInput = {
      ...form,
      centroTrabajoId: form.centroTrabajoId === NO_CENTRO_VALUE ? "" : form.centroTrabajoId,
    };

    const updated = await actualizarVehiculo(vehiculo.id, payload);
    setVehiculo(updated);
    setEditModal(false);
  }

  function abrirDoc(tipo: TipoDocumento) {
    if (!vehiculo) return;

    const existing = vehiculo.documentos.find((d) => d.tipo === tipo);
    setDocForm({
      vencimiento: existing?.vencimiento ?? "",
      subido: existing?.subido ?? false,
    });
    setDocModal({ open: true, tipo });
  }

  async function guardarDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!vehiculo || !docModal.tipo) return;

    await upsertVehiculoDocumento(vehiculo.id, {
      tipo: docModal.tipo,
      subido: docForm.subido,
      vencimiento: docForm.vencimiento,
    });

    setDocModal({ open: false });
    await loadDetalle();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/60 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
          Cargando detalle del vehículo...
        </div>
      </div>
    );
  }

  if (!vehiculo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-slate-400">
        <Car className="h-12 w-12 opacity-30" />
        <p className="text-sm">Vehículo no encontrado.</p>
        <Link href="/dicaprev/empresa/vehiculos" className="text-sm underline text-slate-600">
          ← Volver al listado
        </Link>
      </div>
    );
  }

  const estadoDoc = evaluarEstadoDocumental(vehiculo.documentos);
  const estadoOpCfg = ESTADO_OP_CFG[vehiculo.estado] ?? ESTADO_OP_CFG.operativo;
  const estadoDocCfg = ESTADO_DOC_CFG[estadoDoc];

  const docTypesRaw = vehiculo.documentos.map((d) => d.tipo as TipoDocumento);
  const docReqs = [
    ...DOC_ORDER.filter((t) => docTypesRaw.includes(t)),
    ...docTypesRaw.filter((t) => !DOC_ORDER.includes(t)),
  ];

  const centroNombre = vehiculo.centroNombre ?? "Sin centro asignado";

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-screen-lg mx-auto">
          <Link
            href="/dicaprev/empresa/vehiculos"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 mb-4 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a Vehículos y Equipos
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shrink-0">
                {TIPO_ICON[vehiculo.tipo] ?? <Car className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {vehiculo.marca} {vehiculo.modelo}
                  </h1>
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 rounded-lg px-2 py-0.5">
                    {vehiculo.patente}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-0.5">
                  {TIPO_LABEL[vehiculo.tipo] ?? vehiculo.tipo} · {vehiculo.anio ?? "—"} · {vehiculo.codigoInterno ?? "—"}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", estadoOpCfg.cls)}>
                    {estadoOpCfg.icon}
                    {estadoOpCfg.label}
                  </span>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", estadoDocCfg.cls)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", estadoDocCfg.dot)} />
                    {estadoDocCfg.label}
                  </span>
                </div>
              </div>
            </div>
            <Button
              onClick={abrirEditar}
              variant="outline"
              className="h-9 px-4 rounded-xl border-slate-200 text-sm shrink-0"
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-lg mx-auto px-6 py-6 space-y-4">
        <div className={cn("rounded-2xl border p-4 flex items-start gap-3", estadoDocCfg.cls)}>
          {estadoDoc === "en_regla" && <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />}
          {estadoDoc === "por_vencer" && <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />}
          {estadoDoc === "fuera_de_regla" && <XCircle className="h-5 w-5 shrink-0 mt-0.5" />}
          <div className="text-sm">
            <p className="font-semibold">{estadoDocCfg.label}</p>
            <p className="mt-0.5 opacity-80">{estadoDocCfg.desc}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Datos generales</h2>
              </div>
              <div className="px-5 divide-y divide-slate-100">
                {[
                  { label: "Tipo", val: TIPO_LABEL[vehiculo.tipo] ?? vehiculo.tipo, icon: <Wrench className="h-3.5 w-3.5" /> },
                  {
                    label: "Marca / Modelo",
                    val: `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.anio ?? "—"})`,
                    icon: <Car className="h-3.5 w-3.5" />,
                  },
                  { label: "Patente", val: vehiculo.patente, icon: <FileText className="h-3.5 w-3.5" /> },
                  { label: "Código interno", val: vehiculo.codigoInterno || "—", icon: <FileText className="h-3.5 w-3.5" /> },
                  { label: "Centro de trabajo", val: centroNombre, icon: <MapPin className="h-3.5 w-3.5" /> },
                  { label: "Responsable", val: vehiculo.responsable || "—", icon: <User className="h-3.5 w-3.5" /> },
                  { label: "Próxima revisión", val: fmt(vehiculo.proximaRevision), icon: <Calendar className="h-3.5 w-3.5" /> },
                  {
                    label: "Kilometraje",
                    val: (vehiculo.kilometraje ?? 0) > 0 ? `${(vehiculo.kilometraje ?? 0).toLocaleString("es-CL")} km` : "—",
                    icon: <Gauge className="h-3.5 w-3.5" />,
                  },
                  { label: "Registrado", val: fmt(vehiculo.createdAt), icon: <Clock className="h-3.5 w-3.5" /> },
                ].map(({ label, val, icon }) => (
                  <div key={label} className="flex items-start gap-3 py-3">
                    <span className="text-slate-300 mt-0.5 shrink-0">{icon}</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400 w-36 shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm text-slate-800">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {vehiculo.observaciones && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Observaciones</h2>
                <p className="text-sm text-slate-700 leading-relaxed">{vehiculo.observaciones}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-slate-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Documentación</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {docReqs.length === 0 && (
                  <div className="px-5 py-5 text-sm text-slate-500">
                    Sin documentos configurados para este tipo de vehículo.
                  </div>
                )}
                {docReqs.map((tipo) => {
                  const doc = vehiculo.documentos.find((d) => d.tipo === tipo);
                  const dias = diasParaVencer(doc?.vencimiento ?? null);
                  const expired = typeof dias === "number" && dias < 0;

                  let badgeCls = "bg-slate-100 text-slate-500 border-slate-200";
                  let badgeLabel = "Sin cargar";
                  let badgeIcon = <XCircle className="h-3 w-3" />;

                  if (doc?.subido) {
                    if (expired) {
                      badgeCls = "bg-rose-50 text-rose-700 border-rose-200";
                      badgeLabel = "Vencido";
                      badgeIcon = <XCircle className="h-3 w-3" />;
                    } else if (typeof dias === "number" && dias <= 30) {
                      badgeCls = "bg-amber-50 text-amber-700 border-amber-200";
                      badgeLabel = `Vence en ${dias}d`;
                      badgeIcon = <AlertTriangle className="h-3 w-3" />;
                    } else {
                      badgeCls = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      badgeLabel = "Vigente";
                      badgeIcon = <CheckCircle2 className="h-3 w-3" />;
                    }
                  }

                  return (
                    <div key={tipo} className="px-5 py-3.5 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{DOC_NOMBRE[tipo] ?? tipo}</p>
                        {doc?.vencimiento && (
                          <p className="text-[11px] text-slate-400 mt-0.5">Vence: {fmt(doc.vencimiento)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap", badgeCls)}>
                          {badgeIcon}
                          {badgeLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => abrirDoc(tipo)}
                          className="text-slate-400 hover:text-slate-700 transition-colors"
                          title="Actualizar documento"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Mantenciones</h2>
              {mantenciones.length === 0 ? (
                <p className="text-sm text-slate-500">Sin mantenciones registradas aún.</p>
              ) : (
                <div className="space-y-2">
                  {mantenciones.slice(0, 6).map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 truncate pr-3">{m.tipo}</span>
                      <span className="text-slate-700 font-medium">{fmt(m.fecha)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {form && (
        <Dialog open={editModal} onOpenChange={(o) => !o && setEditModal(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar vehículo</DialogTitle>
            </DialogHeader>
            <form onSubmit={guardarEdicion} className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => handleChange("tipo", v)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="camioneta">Camioneta</SelectItem>
                      <SelectItem value="camion">Camión</SelectItem>
                      <SelectItem value="equipo">Equipo / Maquinaria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Estado operativo</Label>
                  <Select value={form.estado} onValueChange={(v) => handleChange("estado", v)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operativo">Operativo</SelectItem>
                      <SelectItem value="mantencion">En mantención</SelectItem>
                      <SelectItem value="baja">Dado de baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Patente</Label>
                  <Input className="rounded-xl" value={form.patente} onChange={(e) => handleChange("patente", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Código interno</Label>
                  <Input className="rounded-xl" value={form.codigoInterno} onChange={(e) => handleChange("codigoInterno", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Marca</Label>
                  <Input className="rounded-xl" value={form.marca} onChange={(e) => handleChange("marca", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Modelo</Label>
                  <Input className="rounded-xl" value={form.modelo} onChange={(e) => handleChange("modelo", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Año</Label>
                  <Input className="rounded-xl" type="number" min={1990} max={2030} value={form.anio} onChange={(e) => handleChange("anio", Number(e.target.value) || new Date().getFullYear())} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Centro de trabajo</Label>
                  <Select value={form.centroTrabajoId || NO_CENTRO_VALUE} onValueChange={(v) => handleChange("centroTrabajoId", v)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seleccionar centro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CENTRO_VALUE}>Sin centro asignado</SelectItem>
                      {centros.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Responsable</Label>
                  <Input className="rounded-xl" value={form.responsable} onChange={(e) => handleChange("responsable", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Próxima revisión</Label>
                  <Input className="rounded-xl" type="date" value={form.proximaRevision} onChange={(e) => handleChange("proximaRevision", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Kilometraje</Label>
                  <Input className="rounded-xl" type="number" min={0} value={form.kilometraje} onChange={(e) => handleChange("kilometraje", Number(e.target.value) || 0)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Observaciones</Label>
                <Textarea className="rounded-xl resize-none" rows={2} value={form.observaciones} onChange={(e) => handleChange("observaciones", e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white">
                  Guardar cambios
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={docModal.open} onOpenChange={(o) => !o && setDocModal({ open: false })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{docModal.tipo ? DOC_NOMBRE[docModal.tipo] : "Documento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={guardarDoc} className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="subido"
                checked={docForm.subido}
                onChange={(e) => setDocForm((p) => ({ ...p, subido: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="subido" className="cursor-pointer">Documento cargado</Label>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de vencimiento</Label>
              <Input
                type="date"
                className="rounded-xl"
                value={docForm.vencimiento}
                onChange={(e) => setDocForm((p) => ({ ...p, vencimiento: e.target.value }))}
              />
              <p className="text-[11px] text-slate-400">Dejar vacío si el documento no vence (ej: padrón).</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDocModal({ open: false })}>
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white">
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
