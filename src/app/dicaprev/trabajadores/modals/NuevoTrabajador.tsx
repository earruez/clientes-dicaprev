// src/app/dicaprev/trabajadores/modals/NuevoTrabajador.tsx
"use client";

import React, { useMemo, useState } from "react";
import type { Trabajador, EstadoTrabajador } from "../types";
import { cn } from "@/lib/utils";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "src/components/ui/dialog";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select";
import { Checkbox } from "src/components/ui/checkbox";
import { Badge } from "src/components/ui/badge";
import { Progress } from "src/components/ui/progress";

// -----------------------------------------------------------------------------
// Catálogos base (mock por ahora, luego se pueden alimentar desde Firestore)
// -----------------------------------------------------------------------------

const ESTADOS_TRABAJADOR: { value: EstadoTrabajador; label: string }[] = [
  { value: "vigente", label: "Vigente" },
  { value: "suspendido", label: "Suspendido" },
  { value: "baja", label: "Baja" },
];

const CENTROS = [
  { id: "c-1", nombre: "Planta Santiago" },
  { id: "c-2", nombre: "Planta Quilicura" },
  { id: "c-3", nombre: "Obra Condominio Los Álamos" },
];

const AREAS = [
  { id: "a-1", nombre: "Operaciones" },
  { id: "a-2", nombre: "Prevención de Riesgos" },
  { id: "a-3", nombre: "Administración" },
];

const CARGOS = [
  { id: "cg-1", nombre: "Supervisor" },
  { id: "cg-2", nombre: "Maestro primera" },
  { id: "cg-3", nombre: "Prevencionista" },
];

const PUESTOS = [
  { id: "p-1", nombre: "Supervisor de Turno" },
  { id: "p-2", nombre: "Operador de máquina" },
  { id: "p-3", nombre: "Trabajador en altura" },
];

const RIESGOS_BASE = [
  "Trabajos en altura",
  "Espacios confinados",
  "Riesgo eléctrico",
  "Riesgo de caídas de distinto nivel",
  "Riesgo de atrapamiento",
  "Riesgo de proyección de partículas",
];

const EPP_BASE = [
  "Casco",
  "Zapato de seguridad",
  "Lentes de seguridad claros",
  "Lentes de seguridad oscuros",
  "Guantes de seguridad",
  "Arnés de cuerpo completo",
];

// -----------------------------------------------------------------------------
// Tipos internos del wizard
// -----------------------------------------------------------------------------

type WizardStep = 1 | 2 | 3;

type FormState = {
  // Step 1
  rut: string;
  nombres: string;
  apellidos: string;
  estado: EstadoTrabajador;
  centroId: string;
  centroNombre: string;
  areaId: string;
  areaNombre: string;
  cargoId: string;
  cargoNombre: string;
  puestoId: string;
  puestoNombre: string;

  // Step 2
  riesgosSeleccionados: string[];
  capacitacionObligatoriaCumplida: boolean;
  ds44Pendiente: boolean;

  // Step 3
  eppSeleccionados: string[];
};

type NuevoTrabajadorProps = {
  open: boolean;
  onClose: () => void;
  onSave: (t: Trabajador) => void;
};

const emptyForm: FormState = {
  rut: "",
  nombres: "",
  apellidos: "",
  estado: "vigente",
  centroId: "",
  centroNombre: "",
  areaId: "",
  areaNombre: "",
  cargoId: "",
  cargoNombre: "",
  puestoId: "",
  puestoNombre: "",
  riesgosSeleccionados: [],
  capacitacionObligatoriaCumplida: false,
  ds44Pendiente: true,
  eppSeleccionados: [],
};

export default function NuevoTrabajadorWizard({
  open,
  onClose,
  onSave,
}: NuevoTrabajadorProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalSteps: WizardStep = 3;

  const progress = useMemo(
    () => (step / totalSteps) * 100,
    [step, totalSteps]
  );

  // ---------------------------------------------------------------------------
  // Validaciones por paso
  // ---------------------------------------------------------------------------

  const errorsStep1 = useMemo(() => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.nombres.trim()) errs.nombres = "Requerido";
    if (!form.apellidos.trim()) errs.apellidos = "Requerido";
    if (!form.rut.trim()) errs.rut = "Requerido";
    if (!form.centroId) errs.centroId = "Selecciona un centro";
    if (!form.cargoId) errs.cargoId = "Selecciona un cargo";
    return errs;
  }, [form]);

  const canGoNextFromStep1 = Object.keys(errorsStep1).length === 0;

  const handleChange = (field: keyof FormState, value: string | boolean | string[]) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setTouched(true);
  };

  const toggleFromList = (field: "riesgosSeleccionados" | "eppSeleccionados", value: string) => {
    setForm((prev) => {
      const current = prev[field];
      const exists = current.includes(value);
      return {
        ...prev,
        [field]: exists ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  };

  const resetState = () => {
    setForm(emptyForm);
    setStep(1);
    setTouched(false);
    setSaving(false);
  };

  const handleClose = () => {
    if (saving) return;
    resetState();
    onClose();
  };

  const goNext = () => {
    if (step === 1) {
      setTouched(true);
      if (!canGoNextFromStep1) return;
    }
    setStep((prev) => (prev < totalSteps ? ((prev + 1) as WizardStep) : prev));
  };

  const goPrev = () => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : prev));
  };

  const handleSave = async () => {
    setTouched(true);
    if (!canGoNextFromStep1) {
      setStep(1);
      return;
    }

    const now = new Date().toISOString();

    const nuevo: Trabajador = {
      id: `t-${Date.now()}`,
      rut: form.rut.trim(),
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      estado: form.estado,
      centroId: form.centroId,
      centroNombre: form.centroNombre,
      areaId: form.areaId,
      areaNombre: form.areaNombre,
      cargoId: form.cargoId,
      cargoNombre: form.cargoNombre,
      puestoId: form.puestoId,
      puestoNombre: form.puestoNombre,
      riesgos: form.riesgosSeleccionados,
      eppObligatorio: form.eppSeleccionados,
      capacitacionObligatoriaCumplida: form.capacitacionObligatoriaCumplida,
      ds44Pendiente: form.ds44Pendiente,
      creadoEl: now,
      actualizadoEl: now,
    };

    try {
      setSaving(true);
      await Promise.resolve(onSave(nuevo));
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className={cn(
          "max-w-4xl border border-slate-200/80 bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100",
          "shadow-2xl shadow-slate-900/10 rounded-2xl"
        )}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">
            Nuevo trabajador
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Crea la ficha del trabajador y define riesgos, condiciones y EPP
            desde una sola vista guiada.
          </DialogDescription>
        </DialogHeader>

        {/* STEP INDICATOR */}
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
              <StepPill label="Datos generales" number={1} current={step} />
              <StepPill label="Condiciones & riesgos" number={2} current={step} />
              <StepPill label="Vestimenta & EPP" number={3} current={step} />
            </div>
            <span className="text-[11px] text-slate-400">
              Paso {step} de {totalSteps}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* CONTENT */}
        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1 space-y-4">
          {step === 1 && (
            <StepDatosGenerales
              form={form}
              errors={touched ? errorsStep1 : {}}
              onChange={handleChange}
            />
          )}

          {step === 2 && (
            <StepCondicionesRiesgos
              form={form}
              onToggle={(field, value) => toggleFromList(field, value)}
              onChange={handleChange}
            />
          )}

          {step === 3 && (
            <StepEpp
              form={form}
              onToggle={(field, value) => toggleFromList(field, value)}
            />
          )}
        </div>

        {/* FOOTER */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            {step === 1 && touched && !canGoNextFromStep1 && (
              <p className="text-xs text-red-500">
                Completa los campos obligatorios para continuar.
              </p>
            )}
            <p className="text-[10px] text-slate-400">
              La ficha se usará en matrices DS44, vencimientos y módulos de documentación.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goPrev}
              disabled={step === 1 || saving}
            >
              Anterior
            </Button>
            {step < totalSteps && (
              <Button
                type="button"
                size="sm"
                onClick={goNext}
                disabled={saving}
              >
                Siguiente
              </Button>
            )}
            {step === totalSteps && (
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Creando trabajador..." : "Crear trabajador"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes de pasos
// ---------------------------------------------------------------------------

function StepPill({
  label,
  number,
  current,
}: {
  label: string;
  number: WizardStep;
  current: WizardStep;
}) {
  const isActive = current === number;
  const isDone = current > number;
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
          isActive && "bg-emerald-600 text-white shadow-sm",
          !isActive && !isDone && "bg-slate-200 text-slate-700",
          isDone && "bg-emerald-100 text-emerald-700 border border-emerald-300"
        )}
      >
        {isDone ? "✓" : number}
      </div>
      <span
        className={cn(
          "hidden sm:inline text-[11px]",
          isActive ? "text-slate-900" : "text-slate-500"
        )}
      >
        {label}
      </span>
    </div>
  );
}

type StepDatosGeneralesProps = {
  form: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  onChange: (field: keyof FormState, value: string | boolean | string[]) => void;
};

function StepDatosGenerales({ form, errors, onChange }: StepDatosGeneralesProps) {
  return (
    <section className="space-y-4">
      {/* Identificación */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Identificación
            </p>
            <p className="text-sm text-slate-500">
              Datos mínimos para identificar al trabajador en el sistema.
            </p>
          </div>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700">
            Obligatorio
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">RUT *</Label>
            <Input
              value={form.rut}
              placeholder="11.111.111-1"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange("rut", e.target.value)
              }
              className={cn(
                "h-9 font-mono text-sm",
                errors.rut && "border-red-400 bg-red-50/40"
              )}
            />
            {errors.rut && (
              <p className="text-[11px] text-red-500">{errors.rut}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Nombres *</Label>
            <Input
              value={form.nombres}
              placeholder="Sebastián Andrés"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange("nombres", e.target.value)
              }
              className={cn(
                "h-9",
                errors.nombres && "border-red-400 bg-red-50/40"
              )}
            />
            {errors.nombres && (
              <p className="text-[11px] text-red-500">{errors.nombres}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Apellidos *</Label>
            <Input
  value={form.apellidos}
  placeholder="Fernández Lobos"
  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
    onChange("apellidos", e.target.value)
  }
  className={cn(
    "h-9",
    errors.apellidos && "border-red-400 bg-red-50/40"
  )}
/>
            {errors.apellidos && (
              <p className="text-[11px] text-red-500">{errors.apellidos}</p>
            )}
          </div>
        </div>
      </div>

      {/* Ubicación en la estructura */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Estructura organizacional
            </p>
            <p className="text-sm text-slate-500">
              Centro, área, cargo y puesto donde participa.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Centro */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Centro de trabajo *</Label>
            <Select
              value={form.centroId}
              onValueChange={(id) => {
                const centro = CENTROS.find((c) => c.id === id);
                onChange("centroId", id);
                onChange("centroNombre", centro?.nombre ?? "");
              }}
            >
              <SelectTrigger
                className={cn(
                  "h-9",
                  errors.centroId && "border-red-400 bg-red-50/40"
                )}
              >
                <SelectValue placeholder="Selecciona un centro" />
              </SelectTrigger>
              <SelectContent>
                {CENTROS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.centroId && (
              <p className="text-[11px] text-red-500">{errors.centroId}</p>
            )}
          </div>

          {/* Área */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Área</Label>
            <Select
              value={form.areaId}
              onValueChange={(id) => {
                const area = AREAS.find((a) => a.id === id);
                onChange("areaId", id);
                onChange("areaNombre", area?.nombre ?? "");
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="(Opcional)" />
              </SelectTrigger>
              <SelectContent>
                {AREAS.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cargo */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Cargo *</Label>
            <Select
              value={form.cargoId}
              onValueChange={(id) => {
                const cargo = CARGOS.find((c) => c.id === id);
                onChange("cargoId", id);
                onChange("cargoNombre", cargo?.nombre ?? "");
              }}
            >
              <SelectTrigger
                className={cn(
                  "h-9",
                  errors.cargoId && "border-red-400 bg-red-50/40"
                )}
              >
                <SelectValue placeholder="Selecciona un cargo" />
              </SelectTrigger>
              <SelectContent>
                {CARGOS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cargoId && (
              <p className="text-[11px] text-red-500">{errors.cargoId}</p>
            )}
          </div>

          {/* Puesto */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Puesto / función</Label>
            <Select
              value={form.puestoId}
              onValueChange={(id) => {
                const puesto = PUESTOS.find((p) => p.id === id);
                onChange("puestoId", id);
                onChange("puestoNombre", puesto?.nombre ?? "");
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="(Opcional)" />
              </SelectTrigger>
              <SelectContent>
                {PUESTOS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* Estado */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Estado en prevención</Label>
            <Select
              value={form.estado}
              onValueChange={(v: EstadoTrabajador) => onChange("estado", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_TRABAJADOR.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-400">
              No reemplaza el estado de RRHH, solo afecta matrices y dashboards de prevención.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

type StepCondicionesProps = {
  form: FormState;
  onToggle: (field: "riesgosSeleccionados" | "eppSeleccionados", value: string) => void;
  onChange: (field: keyof FormState, value: string | boolean | string[]) => void;
};

function StepCondicionesRiesgos({ form, onToggle, onChange }: StepCondicionesProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Condiciones especiales
            </p>
            <p className="text-sm text-slate-500">
              Marca las condiciones que impactan la documentación y exámenes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Badge
            variant={form.capacitacionObligatoriaCumplida ? "default" : "outline"}
            className={cn(
              "cursor-pointer text-[11px]",
              form.capacitacionObligatoriaCumplida
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "border-slate-200"
            )}
            onClick={() =>
              onChange(
                "capacitacionObligatoriaCumplida",
                !form.capacitacionObligatoriaCumplida
              )
            }
          >
            Capacitación obligatoria completada
          </Badge>

          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer text-[11px]",
              form.ds44Pendiente
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-emerald-300 bg-emerald-50 text-emerald-800"
            )}
            onClick={() => onChange("ds44Pendiente", !form.ds44Pendiente)}
          >
            {form.ds44Pendiente ? "DS44 pendiente" : "DS44 cumplido"}
          </Badge>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Riesgos principales
            </p>
            <p className="text-sm text-slate-500">
              Selecciona los riesgos críticos asociados al cargo / puesto.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {RIESGOS_BASE.map((r) => {
            const checked = form.riesgosSeleccionados.includes(r);
            return (
              <label
                key={r}
                className={cn(
                  "flex items-start gap-2 rounded-xl border p-2.5 text-xs",
                  checked
                    ? "border-emerald-300 bg-emerald-50/70"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle("riesgosSeleccionados", r)}
                  className="mt-[2px] h-3.5 w-3.5"
                />
                <span className="text-slate-700">{r}</span>
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type StepEppProps = {
  form: FormState;
  onToggle: (field: "riesgosSeleccionados" | "eppSeleccionados", value: string) => void;
};

function StepEpp({ form, onToggle }: StepEppProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              EPP obligatorio
            </p>
            <p className="text-sm text-slate-500">
              Define el set mínimo de EPP para el trabajador según su exposición.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {EPP_BASE.map((epp) => {
            const checked = form.eppSeleccionados.includes(epp);
            return (
              <label
                key={epp}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
                  checked
                    ? "border-emerald-300 bg-emerald-50/80"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle("eppSeleccionados", epp)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-slate-700">{epp}</span>
              </label>
            );
          })}
        </div>

        <p className="mt-3 text-[10px] text-slate-400">
          Este listado se reflejará en matrices, entregas de EPP y controles de stock.
        </p>
      </div>
    </section>
  );
}
