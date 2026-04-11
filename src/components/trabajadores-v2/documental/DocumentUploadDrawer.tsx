"use client";

import { useState, useEffect } from "react";
import {
  X,
  UploadCloud,
  RefreshCcw,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { MOCK_WORKERS } from "../types";
import { TIPOS_DOCUMENTO, CATEGORIA_CONFIG } from "./types";

// ── Public types ──────────────────────────────────────────────────────────────

export interface DocumentUploadContext {
  workerId?: string;
  tipoDocumentoId?: string;
  mode: "subir" | "reenviar";
  rejectionObservation?: string;
}

export interface DocumentUploadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context?: DocumentUploadContext;
}

// ── Internal types ────────────────────────────────────────────────────────────

interface FormState {
  trabajadorId: string;
  tipoDocumentoId: string;
  nombreArchivo: string;
  fechaCarga: string;
  fechaEmision: string;
  fechaVencimiento: string;
  estadoInicial: "completo" | "en_revision";
  cargadoPor: string;
  observaciones: string;
}

type Phase = "form" | "submitting" | "success";

const TODAY = "2026-04-08";

const EMPTY_FORM: FormState = {
  trabajadorId:    "",
  tipoDocumentoId: "",
  nombreArchivo:   "",
  fechaCarga:      TODAY,
  fechaEmision:    "",
  fechaVencimiento:"",
  estadoInicial:   "en_revision",
  cargadoPor:      "",
  observaciones:   "",
};

// ── Micro-helpers ─────────────────────────────────────────────────────────────

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
    />
  );
}

function FieldSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return (
    <select
      {...rest}
      className={`h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DocumentUploadDrawer({
  isOpen,
  onClose,
  context,
}: DocumentUploadDrawerProps) {
  const [form, setForm] = useState<FormState>({
    ...EMPTY_FORM,
    trabajadorId:    context?.workerId       ?? "",
    tipoDocumentoId: context?.tipoDocumentoId ?? "",
  });
  const [phase, setPhase] = useState<Phase>("form");

  // Re-initialise whenever the drawer opens with new context
  useEffect(() => {
    if (isOpen) {
      setForm({
        ...EMPTY_FORM,
        trabajadorId:    context?.workerId       ?? "",
        tipoDocumentoId: context?.tipoDocumentoId ?? "",
      });
      setPhase("form");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, context?.workerId, context?.tipoDocumentoId]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  function patch(partial: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  const selectedWorker = MOCK_WORKERS.find((w) => w.id === form.trabajadorId);
  const selectedTipo   = TIPOS_DOCUMENTO.find((t) => t.id === form.tipoDocumentoId);
  const isPrefilledWorker = !!context?.workerId;
  const isPrefilledTipo   = !!context?.tipoDocumentoId;
  const isReenviar = context?.mode === "reenviar";

  const isValid =
    form.trabajadorId.trim()    !== "" &&
    form.tipoDocumentoId.trim() !== "" &&
    form.nombreArchivo.trim()   !== "" &&
    form.fechaCarga             !== "" &&
    form.cargadoPor.trim()      !== "";

  function handleSubmit() {
    if (!isValid || phase !== "form") return;
    setPhase("submitting");
    setTimeout(() => {
      setPhase("success");
      setTimeout(onClose, 1800);
    }, 750);
  }

  const Icon = isReenviar ? RefreshCcw : UploadCloud;
  const accentCls = isReenviar
    ? { bg: "bg-rose-100", text: "text-rose-600", btn: "bg-rose-600 hover:bg-rose-700" }
    : { bg: "bg-blue-100",  text: "text-blue-600",  btn: "bg-blue-600 hover:bg-blue-700" };

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* ── Drawer panel ── */}
      <div
        role="dialog"
        aria-modal
        aria-label={isReenviar ? "Reenviar documento" : "Subir documento"}
        className={`fixed right-0 top-0 z-[70] flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Success overlay ── */}
        {phase === "success" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">
                {isReenviar ? "Documento reenviado" : "Documento cargado"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                El documento ha sido registrado correctamente.
              </p>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="shrink-0 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentCls.bg}`}>
                <Icon className={`h-4 w-4 ${accentCls.text}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {isReenviar ? "Reenviar documento" : "Subir documento"}
                </p>
                <p className="text-[11px] text-slate-500">Control de trazabilidad documental</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable form body ── */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">

          {/* Rejection alert */}
          {isReenviar && context?.rejectionObservation && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-rose-700">
                    Motivo del rechazo anterior
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-rose-800">
                    "{context.rejectionObservation}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Trabajador ── */}
          <div>
            <FieldLabel required>Trabajador</FieldLabel>
            {isPrefilledWorker && selectedWorker ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[11px] font-bold text-white">
                  {selectedWorker.nombre[0]}{selectedWorker.apellido[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedWorker.nombre} {selectedWorker.apellido}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {selectedWorker.cargo} · {selectedWorker.rut}
                  </p>
                </div>
              </div>
            ) : (
              <FieldSelect
                value={form.trabajadorId}
                onChange={(e) => patch({ trabajadorId: e.target.value })}
              >
                <option value="">Seleccionar trabajador...</option>
                {MOCK_WORKERS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.apellido}, {w.nombre} — {w.cargo}
                  </option>
                ))}
              </FieldSelect>
            )}
          </div>

          {/* ── Tipo de documento ── */}
          <div>
            <FieldLabel required>Tipo de documento</FieldLabel>
            {isPrefilledTipo && selectedTipo ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${CATEGORIA_CONFIG[selectedTipo.categoria].bg}`}
                >
                  <FileText
                    className={`h-3.5 w-3.5 ${CATEGORIA_CONFIG[selectedTipo.categoria].text}`}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{selectedTipo.nombre}</p>
                  <p className="text-[11px] text-slate-500">
                    {selectedTipo.categoria}
                    {selectedTipo.esCritico && " · Crítico ●"}
                    {selectedTipo.requiereVencimiento &&
                      ` · Vence en ${selectedTipo.vencimientoMeses} meses`}
                  </p>
                </div>
              </div>
            ) : (
              <FieldSelect
                value={form.tipoDocumentoId}
                onChange={(e) => patch({ tipoDocumentoId: e.target.value })}
              >
                <option value="">Seleccionar tipo de documento...</option>
                {TIPOS_DOCUMENTO.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} ({t.categoria})
                  </option>
                ))}
              </FieldSelect>
            )}
          </div>

          {/* ── Nombre del archivo ── */}
          <div>
            <FieldLabel required>Nombre del archivo</FieldLabel>
            <FieldInput
              type="text"
              placeholder="ej. contrato_firmado_pedro_soto.pdf"
              value={form.nombreArchivo}
              onChange={(e) => patch({ nombreArchivo: e.target.value })}
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Referencia del archivo. En producción se adjuntará el documento real.
            </p>
          </div>

          {/* ── Fecha de carga + Fecha de emisión ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>Fecha de carga</FieldLabel>
              <FieldInput
                type="date"
                value={form.fechaCarga}
                onChange={(e) => patch({ fechaCarga: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Fecha de emisión</FieldLabel>
              <FieldInput
                type="date"
                value={form.fechaEmision}
                onChange={(e) => patch({ fechaEmision: e.target.value })}
              />
            </div>
          </div>

          {/* ── Fecha de vencimiento (solo si el tipo lo requiere) ── */}
          {selectedTipo?.requiereVencimiento && (
            <div>
              <FieldLabel>Fecha de vencimiento</FieldLabel>
              <FieldInput
                type="date"
                value={form.fechaVencimiento}
                onChange={(e) => patch({ fechaVencimiento: e.target.value })}
              />
              <p className="mt-1.5 text-[11px] text-amber-600">
                Este tipo de documento vence cada {selectedTipo.vencimientoMeses} meses.
              </p>
            </div>
          )}

          {/* ── Estado inicial + Cargado por ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Estado inicial</FieldLabel>
              <FieldSelect
                value={form.estadoInicial}
                onChange={(e) =>
                  patch({ estadoInicial: e.target.value as "completo" | "en_revision" })
                }
              >
                <option value="en_revision">En revisión</option>
                <option value="completo">Completo</option>
              </FieldSelect>
            </div>
            <div>
              <FieldLabel required>Cargado por</FieldLabel>
              <FieldInput
                type="text"
                placeholder="ej. RRHH, Área SST…"
                value={form.cargadoPor}
                onChange={(e) => patch({ cargadoPor: e.target.value })}
              />
            </div>
          </div>

          {/* ── Observaciones ── */}
          <div>
            <FieldLabel>Observaciones</FieldLabel>
            <textarea
              rows={3}
              placeholder="Notas adicionales sobre este documento..."
              value={form.observaciones}
              onChange={(e) => patch({ observaciones: e.target.value })}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid || phase !== "form"}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                !isValid || phase !== "form"
                  ? "cursor-not-allowed bg-slate-300"
                  : accentCls.btn
              }`}
            >
              {phase === "submitting" ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Guardando…
                </>
              ) : (
                <>
                  <Icon className="h-3.5 w-3.5" />
                  {isReenviar ? "Reenviar documento" : "Cargar documento"}
                </>
              )}
            </button>
          </div>
          {!isValid && phase === "form" && (
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Completa los campos obligatorios para continuar
            </p>
          )}
        </div>
      </div>
    </>
  );
}
