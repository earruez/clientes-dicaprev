"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { X, User, Briefcase, AlertCircle } from "lucide-react";
import { type Worker, AREAS, CARGOS, CENTROS, CONTRATOS, ESTADOS } from "./types";
import { CARGO_TO_AREA } from "@/lib/empresa/domain";
import { getCentroNombres } from "@/lib/centros/centros-store";

interface WorkerFormProps {
  worker: Worker | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (w: Worker) => void;
}

type FormData = Omit<Worker, "id">;
type FormErrors = Record<string, string>;

const EMPTY: FormData = {
  nombre: "",
  apellido: "",
  rut: "",
  cargo: CARGOS[0],
  area: CARGO_TO_AREA[CARGOS[0]] ?? AREAS[0],
  centroTrabajo: CENTROS[0],
  email: "",
  telefono: "",
  estado: "Activo",
  fechaIngreso: new Date().toISOString().slice(0, 10),
  fechaNacimiento: "",
  tipoContrato: "Indefinido",
  documentosPendientes: 0,
  capacitacionesPendientes: 0,
};

const centroOptions = () => {
  const centros = getCentroNombres();
  return centros.length > 0 ? centros : CENTROS;
};

function formatRut(v: string): string {
  const clean = v.replace(/[^0-9kK]/g, "").toUpperCase();
  if (!clean) return "";
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!body) return clean;
  const reversed = body.split("").reverse().join("");
  const grouped = reversed.match(/.{1,3}/g)?.join(".") ?? "";
  const formattedBody = grouped.split("").reverse().join("");
  return `${formattedBody}-${dv}`;
}

// ── Sub-components defined outside to avoid remount ──

function SectionTitle({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-emerald-600">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-slate-900">{label}</h3>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  error,
  half,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  half?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={half ? "" : "sm:col-span-2"}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = (err?: string) =>
  `w-full rounded-xl border ${
    err ? "border-red-400 bg-red-50" : "border-slate-200 bg-white"
  } px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20`;

const selectCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

// ─────────────────────────────────────────────────────────

export function WorkerForm({ worker, isOpen, onClose, onSave }: WorkerFormProps) {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!isOpen) return;
    if (worker) {
      const { id, ...rest } = worker;
      setForm(rest);
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [isOpen, worker]);

  const set = (key: keyof FormData, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.nombre.trim()) e.nombre = "Requerido";
    if (!form.apellido.trim()) e.apellido = "Requerido";
    if (!form.rut.trim()) e.rut = "Requerido";
    if (!form.email.trim()) e.email = "Requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email inválido";
    if (!form.fechaNacimiento) e.fechaNacimiento = "Requerido";
    if (!form.fechaIngreso) e.fechaIngreso = "Requerido";
    if (!form.cargo) e.cargo = "Requerido";
    if (!form.centroTrabajo) e.centroTrabajo = "Requerido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ id: worker?.id ?? `w-${Date.now()}`, ...form });
    onClose();
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <>
      {/* Overlay */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal
        className={`fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-300 ${
          isOpen
            ? "-translate-y-1/2 scale-100 opacity-100"
            : "-translate-y-[48%] scale-95 opacity-0 pointer-events-none"
        }`}
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900">
              <User className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {worker ? `Editar: ${worker.nombre} ${worker.apellido}` : "Nuevo Trabajador"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 140px)" }}>
          <form id="worker-form" onSubmit={handleSubmit} noValidate>
            <div className="space-y-8 px-6 py-6">
              {/* ── Datos personales ── */}
              <section>
                <SectionTitle icon={<User className="h-4 w-4" />} label="Datos Personales" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field id="nombre" label="Nombre" required error={errors.nombre} half>
                    <input
                      id="nombre"
                      value={form.nombre}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => set("nombre", e.target.value)}
                      placeholder="Carlos"
                      className={inputCls(errors.nombre)}
                    />
                  </Field>

                  <Field id="apellido" label="Apellido" required error={errors.apellido} half>
                    <input
                      id="apellido"
                      value={form.apellido}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        set("apellido", e.target.value)
                      }
                      placeholder="González Pérez"
                      className={inputCls(errors.apellido)}
                    />
                  </Field>

                  <Field id="rut" label="RUT" required error={errors.rut} half>
                    <input
                      id="rut"
                      value={form.rut}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        set("rut", formatRut(e.target.value))
                      }
                      placeholder="12.345.678-9"
                      className={inputCls(errors.rut)}
                    />
                  </Field>

                  <Field
                    id="fechaNacimiento"
                    label="Fecha de Nacimiento"
                    required
                    error={errors.fechaNacimiento}
                    half
                  >
                    <input
                      id="fechaNacimiento"
                      type="date"
                      value={form.fechaNacimiento}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        set("fechaNacimiento", e.target.value)
                      }
                      className={inputCls(errors.fechaNacimiento)}
                    />
                  </Field>

                  <Field id="email" label="Correo Electrónico" required error={errors.email}>
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => set("email", e.target.value)}
                      placeholder="nombre@empresa.cl"
                      className={inputCls(errors.email)}
                    />
                  </Field>

                  <Field id="telefono" label="Teléfono" half>
                    <input
                      id="telefono"
                      value={form.telefono}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        set("telefono", e.target.value)
                      }
                      placeholder="+56 9 1234 5678"
                      className={inputCls()}
                    />
                  </Field>
                </div>
              </section>

              {/* ── Datos laborales ── */}
              <section>
                <SectionTitle
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Datos Laborales"
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field id="cargo" label="Cargo" required error={errors.cargo} half>
                    <select
                      id="cargo"
                      value={form.cargo}
                      onChange={(e) => {
                        const cargo = e.target.value;
                        set("cargo", cargo);
                        set("area", CARGO_TO_AREA[cargo] ?? form.area);
                      }}
                      className={selectCls}
                    >
                      {CARGOS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field id="area" label="Área (desde cargo)" half>
                    <div className="mt-1 flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
                      {form.area || "—"}
                    </div>
                  </Field>

                  <Field id="centroTrabajo" label="Centro de Trabajo" required error={errors.centroTrabajo} half>
                    <select
                      id="centroTrabajo"
                      value={form.centroTrabajo}
                      onChange={(e) => set("centroTrabajo", e.target.value)}
                      className={selectCls}
                    >
                      {centroOptions().map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field id="tipoContrato" label="Tipo de Contrato" half>
                    <select
                      id="tipoContrato"
                      value={form.tipoContrato}
                      onChange={(e) => set("tipoContrato", e.target.value as Worker["tipoContrato"])}
                      className={selectCls}
                    >
                      {CONTRATOS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field id="estado" label="Estado" half>
                    <select
                      id="estado"
                      value={form.estado}
                      onChange={(e) => set("estado", e.target.value as Worker["estado"])}
                      className={selectCls}
                    >
                      {ESTADOS.map((e) => (
                        <option key={e} value={e}>
                          {e}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    id="fechaIngreso"
                    label="Fecha de Ingreso"
                    required
                    error={errors.fechaIngreso}
                    half
                  >
                    <input
                      id="fechaIngreso"
                      type="date"
                      value={form.fechaIngreso}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        set("fechaIngreso", e.target.value)
                      }
                      className={inputCls(errors.fechaIngreso)}
                    />
                  </Field>

                  <Field id="documentosPendientes" label="Documentos pendientes" half>
                    <input
                      id="documentosPendientes"
                      type="number"
                      min={0}
                      value={form.documentosPendientes}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        set("documentosPendientes", parseInt(e.target.value) || 0)
                      }
                      className={inputCls()}
                    />
                  </Field>

                  <Field id="capacitacionesPendientes" label="Capacitaciones pendientes" half>
                    <input
                      id="capacitacionesPendientes"
                      type="number"
                      min={0}
                      value={form.capacitacionesPendientes}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        set("capacitacionesPendientes", parseInt(e.target.value) || 0)
                      }
                      className={inputCls()}
                    />
                  </Field>
                </div>
              </section>

              {/* Error summary */}
              {hasErrors && (
                <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                  <p className="text-sm text-red-700">
                    Corrige los campos marcados antes de guardar.
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="worker-form"
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            {worker ? "Guardar cambios" : "Crear trabajador"}
          </button>
        </div>
      </div>
    </>
  );
}
