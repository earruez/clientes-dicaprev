"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import { Building2, MapPin, Users, FileText, Pencil, Info, ImageUp } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  actualizarEmpresaActual,
  subirLogoEmpresa,
  type EmpresaGeneralData,
} from "./actions";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-3 border-b border-slate-100 last:border-0">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400 sm:w-56 shrink-0 pt-0.5">
        {label}
      </span>
      {value ? (
        <span className="text-sm text-slate-800">{value}</span>
      ) : (
        <span className="text-sm text-slate-400 italic">Sin configurar</span>
      )}
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
        <span className="text-slate-500">{icon}</span>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">{title}</h2>
      </div>
      <div className="px-6 divide-y divide-slate-100">{children}</div>
    </div>
  );
}

type Props = {
  initialEmpresa: EmpresaGeneralData;
  canManageEmpresa: boolean;
};

type ValidatedField =
  | "rut"
  | "rutRepresentanteLegal"
  | "correo"
  | "web"
  | "telefono"
  | "cotizacionAdicional";

type FieldErrors = Partial<Record<ValidatedField, string>>;

function isValidRut(value: string, range?: { min: number; max: number }): boolean {
  const normalized = value.trim().toUpperCase().replace(/\./g, "");
  const match = normalized.match(/^(\d+)-([\dK])$/);
  if (!match) return false;

  const body = match[1];
  const verifier = match[2];
  const bodyNumber = Number.parseInt(body, 10);

  if (!Number.isFinite(bodyNumber)) {
    return false;
  }

  if (range && (bodyNumber < range.min || bodyNumber > range.max)) {
    return false;
  }

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number.parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  const expectedVerifier = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);

  return verifier === expectedVerifier;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidWeb(value: string): boolean {
  const raw = value.trim();
  if (!raw) return true;

  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(withProtocol);
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

function isValidPhone(value: string): boolean {
  const raw = value.trim();
  if (!raw) return true;
  if (!/^[\d+\s()\-]+$/.test(raw)) return false;

  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

function isValidCotizacion(value: string): boolean {
  const raw = value.trim();
  if (!raw) return true;

  if (!/^(100([.,]0{1,2})?|\d{1,2}([.,]\d{1,2})?)%?$/.test(raw)) {
    return false;
  }

  const numeric = Number.parseFloat(raw.replace("%", "").replace(",", "."));
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 100;
}

function formatRut(value: string): string {
  const cleaned = value.trim().replace(/[^\dkK]/g, "").toUpperCase();
  if (!cleaned) return "";

  const formatBody = (digits: string) => {
    let formatted = "";
    for (let i = digits.length - 1, pos = 0; i >= 0; i--, pos++) {
      if (pos > 0 && pos % 3 === 0) formatted = "." + formatted;
      formatted = digits[i] + formatted;
    }
    return formatted;
  };

  // While typing less than 7 body digits, keep partial body format without DV.
  if (cleaned.length <= 7) {
    return formatBody(cleaned.replace(/\D/g, ""));
  }

  const verifier = cleaned.slice(-1);
  const body = cleaned.slice(0, -1).replace(/\D/g, "");
  if (!body) return verifier;

  return `${formatBody(body)}-${verifier}`;
}

const TAMANO_OPTIONS = [
  { value: "Micro", label: "Microempresa" },
  { value: "Pequeña", label: "Pequeña empresa" },
  { value: "Mediana", label: "Mediana empresa" },
  { value: "Grande", label: "Gran empresa" },
];

const TIPO_EMPRESA_OPTIONS = [
  { value: "SpA", label: "SpA (Sociedad por Acciones)" },
  { value: "Eirl", label: "Eirl (Empresa Individual)" },
  { value: "LTDA", label: "LTDA (Responsabilidad Limitada)" },
  { value: "SA", label: "SA (Sociedad Anónima)" },
  { value: "Otro", label: "Otro" },
];

const MUTUALIDAD_OPTIONS = [
  { value: "Mutual de Seguridad", label: "Mutual de Seguridad" },
  { value: "ACHS", label: "ACHS" },
  { value: "IST", label: "IST" },
  { value: "SUPRATEC", label: "SUPRATEC (Corporación de Seguridad)" },
  { value: "Otro", label: "Otro" },
];

export default function InformacionGeneralClient({
  initialEmpresa,
  canManageEmpresa,
}: Props) {
  const [empresa, setEmpresa] = useState<EmpresaGeneralData>(initialEmpresa);
  const [form, setForm] = useState<EmpresaGeneralData>(initialEmpresa);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  function updateField<K extends keyof EmpresaGeneralData>(field: K, value: EmpresaGeneralData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openEditor() {
    setForm(empresa);
    setFeedback(null);
    setErrors({});
    setOpen(true);
  }

  function validateForm(): FieldErrors {
    const nextErrors: FieldErrors = {};

    if (form.rut?.trim() && !isValidRut(form.rut)) {
      nextErrors.rut = "Formato inválido. Usa por ejemplo 76.653.076-1.";
    }

    if (
      form.rutRepresentanteLegal?.trim() &&
      !isValidRut(form.rutRepresentanteLegal, { min: 1_000_000, max: 30_000_000 })
    ) {
      nextErrors.rutRepresentanteLegal =
        "Formato inválido. Usa por ejemplo 11.234.567-8 (rango 1.000.000 a 30.000.000).";
    }

    if (form.correo?.trim() && !isValidEmail(form.correo)) {
      nextErrors.correo = "Correo inválido. Usa por ejemplo contacto@empresa.cl.";
    }

    if (form.web?.trim() && !isValidWeb(form.web)) {
      nextErrors.web = "Sitio web inválido. Usa por ejemplo https://empresa.cl.";
    }

    if (form.telefono?.trim() && !isValidPhone(form.telefono)) {
      nextErrors.telefono = "Teléfono inválido. Debe tener entre 8 y 15 dígitos.";
    }

    if (form.cotizacionAdicional?.trim() && !isValidCotizacion(form.cotizacionAdicional)) {
      nextErrors.cotizacionAdicional = "Cotización inválida. Usa un valor entre 0 y 100 (ej: 1.25%).";
    }

    return nextErrors;
  }

  function saveChanges() {
    setFeedback(null);
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setFeedback({
        type: "error",
        message: "Revisa los campos con errores antes de guardar.",
      });
      return;
    }

    startTransition(async () => {
      try {
        await actualizarEmpresaActual(form);
        setEmpresa(form);
        setFeedback({ type: "success", message: "Información actualizada correctamente." });
        setOpen(false);
      } catch {
        setFeedback({ type: "error", message: "No se pudo guardar la información de la empresa." });
      }
    });
  }

  async function handleLogoUpload(file?: File | null) {
    if (!file || !canManageEmpresa) return;

    setIsUploadingLogo(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("logo", file);
      const logoUrl = await subirLogoEmpresa(formData);

      setEmpresa((prev) => ({ ...prev, logoUrl }));
      setForm((prev) => ({ ...prev, logoUrl }));
      setFeedback({ type: "success", message: "Logo corporativo actualizado correctamente." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo subir el logo corporativo.";
      setFeedback({ type: "error", message });
    } finally {
      setIsUploadingLogo(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <StandardPageHeader
        moduleLabel="Módulo Empresa"
        title="Información general"
        description="Datos legales, tributarios y de contacto de la empresa."
        icon={<Building2 className="h-6 w-6" />}
        actions={
          canManageEmpresa ? (
            <Button
              onClick={openEditor}
              className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium shrink-0"
            >
              <Pencil className="h-4 w-4 mr-1.5" />
              Editar información
            </Button>
          ) : null
        }
      />

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="space-y-4">
        <SectionCard
          title="Identificación tributaria"
          icon={<FileText className="h-5 w-5" />}
        >
          <Field label="Razón social" value={empresa.razonSocial ?? ""} />
          <Field label="RUT" value={empresa.rut ?? ""} />
          <Field label="Giro comercial" value={empresa.giro ?? ""} />
          <Field label="Nombre empresa" value={empresa.nombre} />
          <Field label="Tipo de empresa" value={empresa.tipoEmpresa ?? ""} />
          <Field label="N° trabajadores" value={String(empresa.cantidadTrabajadores ?? 0)} />
          <Field label="Tamaño" value={empresa.tamanoEmpresa ?? ""} />
          <Field label="Código CIIU" value={empresa.codigoCiiu ?? ""} />
          <Field label="Inicio de actividades" value={empresa.inicioActividades ?? ""} />
        </SectionCard>

        <SectionCard
          title="Ubicación y contacto"
          icon={<MapPin className="h-5 w-5" />}
        >
          <Field label="Dirección" value={empresa.direccion ?? ""} />
          <Field label="Ciudad" value={empresa.ciudad ?? ""} />
          <Field label="Región" value={empresa.region ?? ""} />
          <Field label="Teléfono" value={empresa.telefono ?? ""} />
          <Field label="Correo" value={empresa.correo ?? ""} />
          <Field label="Sitio web" value={empresa.web ?? ""} />
        </SectionCard>

        <SectionCard
          title="Datos operacionales"
          icon={<Users className="h-5 w-5" />}
        >
          <Field label="Representante legal" value={empresa.representanteLegal ?? ""} />
          <Field label="RUT representante" value={empresa.rutRepresentanteLegal ?? ""} />
          <Field label="Mutualidad" value={empresa.mutualidad ?? ""} />
          <Field label="Cotización adicional" value={empresa.cotizacionAdicional ?? ""} />
        </SectionCard>

        <SectionCard
          title="Identidad visual"
          icon={<ImageUp className="h-5 w-5" />}
        >
          <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {empresa.logoUrl ? (
                <Image
                  src={empresa.logoUrl}
                  alt="Logo corporativo"
                  width={128}
                  height={64}
                  className="h-16 w-32 rounded-lg border border-slate-200 bg-white object-contain p-2"
                />
              ) : (
                <div className="flex h-16 w-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-medium text-slate-400">
                  Sin logo
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-slate-700">Logo corporativo para documentos PDF</p>
                <p className="text-xs text-slate-500">PNG, JPG o WEBP. Máximo 4MB.</p>
              </div>
            </div>

            {canManageEmpresa && (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                <ImageUp className="h-3.5 w-3.5" />
                {isUploadingLogo ? "Subiendo..." : "Subir logo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={isUploadingLogo}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    void handleLogoUpload(file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </SectionCard>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar información de empresa</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nombre empresa</Label>
              <Input value={form.nombre} onChange={(e) => updateField("nombre", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Razón social</Label>
              <Input value={form.razonSocial ?? ""} onChange={(e) => updateField("razonSocial", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>RUT</Label>
              <Input
                value={form.rut ?? ""}
                onChange={(e) => {
                  const formatted = formatRut(e.target.value);
                  updateField("rut", formatted);
                  setErrors((prev) => ({ ...prev, rut: undefined }));
                }}
                placeholder="XX.XXX.XXX-X"
                className={errors.rut ? "border-rose-300 focus-visible:ring-rose-300" : ""}
              />
              {errors.rut && <p className="text-xs text-rose-600">{errors.rut}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Giro comercial</Label>
              <Input value={form.giro ?? ""} onChange={(e) => updateField("giro", e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Dirección</Label>
              <Input value={form.direccion ?? ""} onChange={(e) => updateField("direccion", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de empresa</Label>
              <Select value={form.tipoEmpresa ?? ""} onValueChange={(value) => updateField("tipoEmpresa", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_EMPRESA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tamaño empresa</Label>
              <Select value={form.tamanoEmpresa ?? ""} onValueChange={(value) => updateField("tamanoEmpresa", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tamaño..." />
                </SelectTrigger>
                <SelectContent>
                  {TAMANO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>N° trabajadores activos</Label>
              <Input type="number" value={String(form.cantidadTrabajadores ?? 0)} disabled />
              <p className="text-xs text-slate-500">
                Este valor se calcula automáticamente desde trabajadores activos.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label>Código CIIU</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-xs">
                      Clasificación Internacional Uniforme de Actividades Económicas. Identifica el sector principal de actividad de la empresa (4 dígitos). Ej: 6201 para servicios informáticos.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input value={form.codigoCiiu ?? ""} onChange={(e) => updateField("codigoCiiu", e.target.value)} placeholder="Ej: 6201" />
            </div>
            <div className="space-y-1.5">
              <Label>Inicio actividades</Label>
              <Input value={form.inicioActividades ?? ""} onChange={(e) => updateField("inicioActividades", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Ciudad</Label>
              <Input value={form.ciudad ?? ""} onChange={(e) => updateField("ciudad", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Región</Label>
              <Input value={form.region ?? ""} onChange={(e) => updateField("region", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                value={form.telefono ?? ""}
                onChange={(e) => {
                  updateField("telefono", e.target.value);
                  setErrors((prev) => ({ ...prev, telefono: undefined }));
                }}
                className={errors.telefono ? "border-rose-300 focus-visible:ring-rose-300" : ""}
              />
              {errors.telefono && <p className="text-xs text-rose-600">{errors.telefono}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Correo</Label>
              <Input
                value={form.correo ?? ""}
                onChange={(e) => {
                  updateField("correo", e.target.value);
                  setErrors((prev) => ({ ...prev, correo: undefined }));
                }}
                className={errors.correo ? "border-rose-300 focus-visible:ring-rose-300" : ""}
              />
              {errors.correo && <p className="text-xs text-rose-600">{errors.correo}</p>}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Sitio web</Label>
              <Input
                value={form.web ?? ""}
                onChange={(e) => {
                  updateField("web", e.target.value);
                  setErrors((prev) => ({ ...prev, web: undefined }));
                }}
                className={errors.web ? "border-rose-300 focus-visible:ring-rose-300" : ""}
              />
              {errors.web && <p className="text-xs text-rose-600">{errors.web}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Representante legal</Label>
              <Input value={form.representanteLegal ?? ""} onChange={(e) => updateField("representanteLegal", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>RUT representante legal</Label>
              <Input
                value={form.rutRepresentanteLegal ?? ""}
                onChange={(e) => {
                  const formatted = formatRut(e.target.value);
                  updateField("rutRepresentanteLegal", formatted);
                  setErrors((prev) => ({ ...prev, rutRepresentanteLegal: undefined }));
                }}
                placeholder="XX.XXX.XXX-X"
                className={errors.rutRepresentanteLegal ? "border-rose-300 focus-visible:ring-rose-300" : ""}
              />
              {errors.rutRepresentanteLegal && <p className="text-xs text-rose-600">{errors.rutRepresentanteLegal}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mutualidad</Label>
              <Select value={form.mutualidad ?? ""} onValueChange={(value) => updateField("mutualidad", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar mutualidad..." />
                </SelectTrigger>
                <SelectContent>
                  {MUTUALIDAD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cotización adicional</Label>
              <Input
                value={form.cotizacionAdicional ?? ""}
                onChange={(e) => {
                  updateField("cotizacionAdicional", e.target.value);
                  setErrors((prev) => ({ ...prev, cotizacionAdicional: undefined }));
                }}
                className={errors.cotizacionAdicional ? "border-rose-300 focus-visible:ring-rose-300" : ""}
              />
              {errors.cotizacionAdicional && <p className="text-xs text-rose-600">{errors.cotizacionAdicional}</p>}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={saveChanges}
              disabled={isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              {isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
