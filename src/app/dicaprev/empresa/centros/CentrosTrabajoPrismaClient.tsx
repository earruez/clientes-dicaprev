"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Building2,
  Users,
  Briefcase,
  UserMinus,
  ShieldCheck,
  GraduationCap,
  CalendarClock,
  TriangleAlert,
  ChevronRight,
  MapPin,
  X,
  Plus,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { cn } from "@/lib/utils";
import {
  crearCentroTrabajo,
  actualizarCentroTrabajo,
  desactivarCentroTrabajo,
  type CentroTrabajoInput,
} from "./actions";

export type CentroTrabajoDTO = {
  id: string;
  nombre: string;
  direccion: string;
  comuna: string;
  region: string;
  tipo: string;
  estado: string;
  cantidadTrabajadores: number;
  createdAt: string;
  updatedAt: string;
};

type CentroEstado = "activo" | "inactivo" | "en-riesgo" | "detenido";

type CentroUI = {
  id: string;
  nombre: string;
  codigo: string;
  tipo: string;
  direccion: string;
  comuna: string;
  region: string;
  estado: CentroEstado;
  trabajadoresTotal: number;
  dotacionTotal: number;
  cumplimientoDocPct: number;
  capacitacionesPendientes: number;
  vencimientos: number;
  alertasDs44: number;
  creadoEl: string;
};

type CentroForm = {
  nombre: string;
  tipo: string;
  direccion: string;
  comuna: string;
  region: string;
  estado: CentroEstado;
};

type FormErrors = Partial<Record<keyof CentroForm, string>>;

const TIPO_OPTIONS = ["Casa Matriz", "Sucursal", "Obra", "Planta", "Bodega", "Faena", "Otro"];

const ESTADO_OPTIONS: { value: CentroEstado; label: string }[] = [
  { value: "activo", label: "Activo" },
  { value: "en-riesgo", label: "En riesgo" },
  { value: "detenido", label: "Detenido" },
  { value: "inactivo", label: "Inactivo" },
];

function emptyForm(): CentroForm {
  return {
    nombre: "",
    tipo: "Obra",
    direccion: "",
    comuna: "",
    region: "",
    estado: "activo",
  };
}

function statusBadge(estado: CentroEstado) {
  if (estado === "activo") {
    return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Operando</Badge>;
  }
  if (estado === "en-riesgo") {
    return <Badge className="border-amber-200 bg-amber-50 text-amber-700">En riesgo</Badge>;
  }
  if (estado === "inactivo") {
    return <Badge className="border-slate-200 bg-slate-50 text-slate-500">Inactivo</Badge>;
  }
  return <Badge className="border-rose-200 bg-rose-50 text-rose-700">Detenido</Badge>;
}

function docColor(pct: number) {
  if (pct >= 85) return "text-emerald-600";
  if (pct >= 70) return "text-amber-600";
  return "text-rose-600";
}

function validate(form: CentroForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.nombre.trim()) errors.nombre = "Requerido";
  if (!form.comuna.trim()) errors.comuna = "Requerido";
  if (!form.region.trim()) errors.region = "Requerido";
  return errors;
}

function codeFromId(id: string) {
  return `CTR-${id.slice(0, 4).toUpperCase()}`;
}

function toInput(form: CentroForm): CentroTrabajoInput {
  return {
    nombre: form.nombre.trim(),
    direccion: form.direccion.trim(),
    comuna: form.comuna.trim(),
    region: form.region.trim(),
    tipo: form.tipo,
    estado: form.estado,
  };
}

function mapCentro(row: CentroTrabajoDTO): CentroUI {
  return {
    id: row.id,
    nombre: row.nombre,
    codigo: codeFromId(row.id),
    tipo: row.tipo,
    direccion: row.direccion,
    comuna: row.comuna,
    region: row.region,
    estado: (row.estado as CentroEstado) || "activo",
    trabajadoresTotal: row.cantidadTrabajadores,
    dotacionTotal: row.cantidadTrabajadores,
    cumplimientoDocPct: 0,
    capacitacionesPendientes: 0,
    vencimientos: 0,
    alertasDs44: 0,
    creadoEl: row.createdAt.slice(0, 10),
  };
}

export default function CentrosTrabajoPrismaClient({ initialCentros }: { initialCentros: CentroTrabajoDTO[] }) {
  const [centros, setCentros] = useState<CentroUI[]>(initialCentros.map(mapCentro));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CentroForm>(emptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCentro = useMemo(() => centros.find((c) => c.id === selectedId) ?? null, [centros, selectedId]);

  const kpis = useMemo(() => {
    const active = centros.filter((c) => c.estado !== "inactivo");
    const totalCentros = active.length;
    const trabajadores = active.reduce((acc, c) => acc + c.trabajadoresTotal, 0);
    const dotacion = active.reduce((acc, c) => acc + c.dotacionTotal, 0);
    const vacantes = Math.max(dotacion - trabajadores, 0);
    const cumplimiento = totalCentros > 0 ? Math.round(active.reduce((acc, c) => acc + c.cumplimientoDocPct, 0) / totalCentros) : 0;
    const capsPend = active.reduce((acc, c) => acc + c.capacitacionesPendientes, 0);
    const vencimientos = active.reduce((acc, c) => acc + c.vencimientos, 0);
    const ds44 = active.reduce((acc, c) => acc + c.alertasDs44, 0);
    return { totalCentros, trabajadores, dotacion, vacantes, cumplimiento, capsPend, vencimientos, ds44 };
  }, [centros]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(centro: CentroUI) {
    setEditingId(centro.id);
    setForm({
      nombre: centro.nombre,
      tipo: centro.tipo,
      direccion: centro.direccion,
      comuna: centro.comuna,
      region: centro.region,
      estado: centro.estado,
    });
    setFormErrors({});
    setModalOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const updated = await actualizarCentroTrabajo(editingId, toInput(form));
        setCentros((prev) => prev.map((item) => (item.id === updated.id ? mapCentro({
          ...updated,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        }) : item)));
      } else {
        const created = await crearCentroTrabajo(toInput(form));
        setCentros((prev) => [mapCentro({
          ...created,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        }), ...prev]);
      }
      setModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDesactivar(id: string) {
    const updated = await desactivarCentroTrabajo(id);
    setCentros((prev) => prev.map((item) => (item.id === updated.id ? mapCentro({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }) : item)));
  }

  function setField<K extends keyof CentroForm>(key: K, value: CentroForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) {
      setFormErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,#ecfeff_0%,#f8fafc_45%,#eef2ff_100%)] py-8">
      <div className="space-y-8">
        <header>
          <StandardPageHeader
            moduleLabel="Módulo Empresa"
            title="Centros de trabajo"
            description="Vista ejecutiva por centro: cobertura de dotación, cumplimiento documental, alertas DS44 y focos críticos."
            icon={<Building2 className="h-6 w-6" />}
            iconWrapClassName="bg-cyan-700"
            actions={
              <div className="flex items-end gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Estado global</p>
                  <p className={cn("text-3xl font-bold", docColor(kpis.cumplimiento))}>{kpis.cumplimiento}%</p>
                  <p className="text-xs text-slate-500">Cumplimiento promedio</p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
                  <Plus className="h-4 w-4" />
                  Nuevo centro
                </Button>
              </div>
            }
          />
        </header>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
          {[
            { label: "Centros", value: kpis.totalCentros, icon: Building2, tone: "bg-cyan-50 text-cyan-700" },
            { label: "Trabajadores", value: kpis.trabajadores, icon: Users, tone: "bg-emerald-50 text-emerald-700" },
            { label: "Dotación", value: kpis.dotacion, icon: Briefcase, tone: "bg-sky-50 text-sky-700" },
            { label: "Vacantes", value: kpis.vacantes, icon: UserMinus, tone: "bg-amber-50 text-amber-700" },
            { label: "% documental", value: `${kpis.cumplimiento}%`, icon: ShieldCheck, tone: "bg-violet-50 text-violet-700" },
            { label: "Cap. pendientes", value: kpis.capsPend, icon: GraduationCap, tone: "bg-indigo-50 text-indigo-700" },
            { label: "Vencimientos", value: kpis.vencimientos, icon: CalendarClock, tone: "bg-orange-50 text-orange-700" },
            { label: "Alertas DS44", value: kpis.ds44, icon: TriangleAlert, tone: "bg-rose-50 text-rose-700" },
          ].map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} className="rounded-2xl border border-white/60 bg-white/90 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tone)}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-0">
            <div className="grid grid-cols-12 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span className="col-span-3">Centro</span>
              <span className="col-span-1 text-center">Trab.</span>
              <span className="col-span-1 text-center">Dotación</span>
              <span className="col-span-1 text-center">Vacantes</span>
              <span className="col-span-2 text-center">Cumplimiento</span>
              <span className="col-span-1 text-center">Cap.</span>
              <span className="col-span-1 text-center">Venc.</span>
              <span className="col-span-1 text-center">DS44</span>
              <span className="col-span-2 text-right">Acciones</span>
            </div>

            {centros.length === 0 && (
              <p className="px-6 py-12 text-center text-sm text-slate-400">No hay centros registrados. Crea el primero con &quot;+ Nuevo centro&quot;.</p>
            )}

            <div className="divide-y divide-slate-100">
              {centros.map((centro) => {
                const vacantes = Math.max(centro.dotacionTotal - centro.trabajadoresTotal, 0);
                return (
                  <div key={centro.id} className={cn("grid grid-cols-12 items-center px-4 py-4 text-sm", centro.estado === "inactivo" && "opacity-55")}>
                    <div className="col-span-3 min-w-0">
                      <p className="truncate font-semibold text-slate-900">{centro.nombre}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span>{centro.codigo}</span>
                        <span>·</span>
                        <span>{centro.comuna}</span>
                        <span>·</span>
                        <span>{centro.tipo}</span>
                      </div>
                      <div className="mt-2">{statusBadge(centro.estado)}</div>
                    </div>

                    <p className="col-span-1 text-center font-semibold text-slate-700">{centro.trabajadoresTotal}</p>
                    <p className="col-span-1 text-center font-semibold text-slate-700">{centro.dotacionTotal}</p>
                    <p className="col-span-1 text-center font-semibold text-slate-700">{vacantes}</p>

                    <div className="col-span-2 px-3">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={cn("h-full rounded-full", "bg-rose-500")} style={{ width: `${centro.cumplimientoDocPct}%` }} />
                      </div>
                      <p className={cn("mt-1 text-center text-xs font-semibold", docColor(centro.cumplimientoDocPct))}>{centro.cumplimientoDocPct}%</p>
                    </div>

                    <p className="col-span-1 text-center font-semibold text-slate-700">{centro.capacitacionesPendientes}</p>
                    <p className="col-span-1 text-center font-semibold text-slate-700">{centro.vencimientos}</p>
                    <p className="col-span-1 text-center font-semibold text-slate-700">{centro.alertasDs44}</p>

                    <div className="col-span-2 flex flex-col items-end gap-1.5">
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => openEdit(centro)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                          <Pencil className="h-3 w-3" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDesactivar(centro.id)}
                          disabled={centro.estado === "inactivo"}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                            centro.estado === "inactivo"
                              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                              : "border-amber-200 text-amber-700 hover:bg-amber-50"
                          )}
                        >
                          Desactivar
                        </button>
                        <Button variant="outline" className="rounded-xl border-slate-200 px-2.5 py-1.5 text-xs" onClick={() => setSelectedId(centro.id)}>
                          Ver detalle
                        </Button>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">Ver cumplimiento <ChevronRight className="h-3 w-3" /></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedCentro && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/45 backdrop-blur-[1px]" onClick={() => setSelectedId(null)}>
          <aside className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-slate-200 bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Detalle centro</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">{selectedCentro.nombre}</h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{selectedCentro.direccion || "Sin dirección registrada"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">{statusBadge(selectedCentro.estado)}</div>
                </div>
                <button type="button" onClick={() => setSelectedId(null)} className="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <Card className="rounded-2xl border border-slate-200">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Información general</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <InfoItem label="Código" value={selectedCentro.codigo} />
                    <InfoItem label="Tipo" value={selectedCentro.tipo} />
                    <InfoItem label="Comuna" value={selectedCentro.comuna || "-"} />
                    <InfoItem label="Región" value={selectedCentro.region || "-"} />
                    <InfoItem label="Trabajadores" value={String(selectedCentro.trabajadoresTotal)} />
                    <InfoItem label="Registrado" value={selectedCentro.creadoEl} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <Button variant="outline" className="rounded-xl" onClick={() => { openEdit(selectedCentro); setSelectedId(null); }}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Editar datos
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    "rounded-xl",
                    selectedCentro.estado === "inactivo"
                      ? "border-slate-200 text-slate-400"
                      : "border-amber-200 text-amber-700 hover:bg-amber-50"
                  )}
                  onClick={() => handleDesactivar(selectedCentro.id)}
                  disabled={selectedCentro.estado === "inactivo"}
                >
                  Desactivar
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(open) => !open && setModalOpen(false)}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar centro" : "Nuevo centro de trabajo"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Actualiza los datos administrativos del centro." : "Completa los datos para registrar un nuevo centro."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ct-nombre">Nombre <span className="text-rose-500">*</span></Label>
              <Input id="ct-nombre" value={form.nombre} onChange={(e: ChangeEvent<HTMLInputElement>) => setField("nombre", e.target.value)} placeholder="ej. Obra Norte" />
              {formErrors.nombre && <p className="text-xs text-rose-600">{formErrors.nombre}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ct-tipo">Tipo <span className="text-rose-500">*</span></Label>
                <select id="ct-tipo" value={form.tipo} onChange={(e: ChangeEvent<HTMLSelectElement>) => setField("tipo", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20">
                  {TIPO_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-estado">Estado</Label>
                <select id="ct-estado" value={form.estado} onChange={(e: ChangeEvent<HTMLSelectElement>) => setField("estado", e.target.value as CentroEstado)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20">
                  {ESTADO_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ct-direccion">Dirección</Label>
              <Input id="ct-direccion" value={form.direccion} onChange={(e: ChangeEvent<HTMLInputElement>) => setField("direccion", e.target.value)} placeholder="ej. Av. Las Industrias 1500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ct-comuna">Comuna <span className="text-rose-500">*</span></Label>
                <Input id="ct-comuna" value={form.comuna} onChange={(e: ChangeEvent<HTMLInputElement>) => setField("comuna", e.target.value)} placeholder="ej. Santiago" />
                {formErrors.comuna && <p className="text-xs text-rose-600">{formErrors.comuna}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-region">Región <span className="text-rose-500">*</span></Label>
                <Input id="ct-region" value={form.region} onChange={(e: ChangeEvent<HTMLInputElement>) => setField("region", e.target.value)} placeholder="ej. Metropolitana" />
                {formErrors.region && <p className="text-xs text-rose-600">{formErrors.region}</p>}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-slate-900 text-white hover:bg-slate-700" disabled={isSubmitting}>
                {editingId ? "Guardar cambios" : "Crear centro"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}
