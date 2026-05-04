"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  UploadCloud,
  FileText,
  ChevronRight,
  CheckCircle2,
  Users,
  Building2,
  Briefcase,
  Trash2,
  Package,
} from "lucide-react";
import { MOCK_WORKERS, CENTROS, CARGOS } from "../types";
import { TIPOS_DOCUMENTO, CATEGORIA_CONFIG } from "./types";

// ── Public types ───────────────────────────────────────────────────────────────

export interface BulkUploadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Internal types ─────────────────────────────────────────────────────────────

interface MockFile {
  id: string;
  name: string;
  size: string;
}

type AssignMode = "manual" | "centro" | "cargo";
type Step       = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS = ["Archivos", "Tipo doc.", "Asignación", "Confirmación", "Resultado"];

// ── Shared micro-helpers (same style as DocumentUploadDrawer) ──────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
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

export function BulkUploadDrawer({ isOpen, onClose }: BulkUploadDrawerProps) {
  const [step,             setStep]             = useState<Step>(1);
  const [files,            setFiles]            = useState<MockFile[]>([]);
  const [isDragging,       setIsDragging]       = useState(false);
  const [tipoDocumentoId,  setTipoDocumentoId]  = useState("");
  const [estadoInicial,    setEstadoInicial]    = useState<"en_revision" | "completo">("en_revision");
  const [cargadoPor,       setCargadoPor]       = useState("");
  const [assignMode,       setAssignMode]       = useState<AssignMode>("manual");
  const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set());
  const [filterCentro,     setFilterCentro]     = useState("");
  const [filterCargo,      setFilterCargo]      = useState("");
  const [isSubmitting,     setIsSubmitting]     = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset whenever drawer opens
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setFiles([]);
    setIsDragging(false);
    setTipoDocumentoId("");
    setEstadoInicial("en_revision");
    setCargadoPor("");
    setAssignMode("manual");
    setSelectedIds(new Set());
    setFilterCentro("");
    setFilterCargo("");
    setIsSubmitting(false);
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // ── File helpers ────────────────────────────────────────────────────────────

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: MockFile[] = Array.from(list).map((f) => ({
      id:   `${Date.now()}-${Math.random()}`,
      name:  f.name,
      size:  f.size < 1_048_576
        ? `${(f.size / 1024).toFixed(0)} KB`
        : `${(f.size / 1_048_576).toFixed(1)} MB`,
    }));
    setFiles((prev) => [...prev, ...next]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  // ── Worker selection helpers ───────────────────────────────────────────────

  function toggleWorker(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  }

  function selectByCentro(centro: string) {
    setFilterCentro(centro);
    setSelectedIds(
      new Set(centro ? MOCK_WORKERS.filter((w) => w.centroTrabajo === centro).map((w) => w.id) : [])
    );
  }

  function selectByCargo(cargo: string) {
    setFilterCargo(cargo);
    setSelectedIds(
      new Set(cargo ? MOCK_WORKERS.filter((w) => w.cargo === cargo).map((w) => w.id) : [])
    );
  }

  // ── Step navigation ────────────────────────────────────────────────────────

  const canProceed: boolean =
    step === 1 ? files.length > 0 :
    step === 2 ? tipoDocumentoId !== "" && cargadoPor.trim() !== "" :
    step === 3 ? selectedIds.size > 0 :
    step === 4 ? true :
    false;

  function handleNext() {
    if (step === 4) {
      setIsSubmitting(true);
      setTimeout(() => { setIsSubmitting(false); setStep(5); }, 850);
      return;
    }
    if (step < 5) setStep((s) => (s + 1) as Step);
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const selectedTipo    = TIPOS_DOCUMENTO.find((t) => t.id === tipoDocumentoId);
  const selectedWorkers = MOCK_WORKERS.filter((w) => selectedIds.has(w.id));
  const totalRecords    = files.length * selectedIds.size;

  const workerListForMode =
    assignMode === "centro" && filterCentro
      ? MOCK_WORKERS.filter((w) => w.centroTrabajo === filterCentro)
      : assignMode === "cargo" && filterCargo
        ? MOCK_WORKERS.filter((w) => w.cargo === filterCargo)
        : MOCK_WORKERS;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-[75] bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal
        aria-label="Carga masiva de documentos"
        className={`fixed right-0 top-0 z-[80] flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >

        {/* ── Header ── */}
        <div className="shrink-0 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                <Package className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Carga masiva de documentos</p>
                <p className="text-[11px] text-slate-500">Subir en lote y asignar a múltiples trabajadores</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stepper (steps 1-4) */}
          {step < 5 && (
            <div className="mt-4 flex items-center">
              {STEP_LABELS.slice(0, 4).map((label, i) => {
                const s      = (i + 1) as Step;
                const isDone = step > s;
                const isAct  = step === s;
                return (
                  <div key={label} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition ${
                        isDone ? "bg-emerald-500 text-white" : isAct ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"
                      }`}>
                        {isDone ? "✓" : s}
                      </div>
                      <span className={`text-[9px] font-semibold uppercase tracking-wide ${
                        isAct ? "text-slate-900" : isDone ? "text-emerald-600" : "text-slate-400"
                      }`}>
                        {label}
                      </span>
                    </div>
                    {i < 3 && (
                      <div className={`mb-4 mx-1 h-px flex-1 ${step > s ? "bg-emerald-400" : "bg-slate-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">

          {/* ────────── STEP 1: Files ────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <FieldLabel required>Archivos a cargar</FieldLabel>

                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragEnter={() => setIsDragging(true)}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed py-10 transition ${
                    isDragging
                      ? "border-blue-400 bg-blue-50"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <UploadCloud className={`h-8 w-8 ${isDragging ? "text-blue-500" : "text-slate-300"}`} />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-600">Arrastra archivos aquí</p>
                    <p className="mt-0.5 text-xs text-slate-400">o haz clic para seleccionar</p>
                  </div>
                  <span className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white">
                    Seleccionar archivos
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
                    {files.length} archivo{files.length !== 1 ? "s" : ""} seleccionado{files.length !== 1 ? "s" : ""}
                  </p>
                  <div className="space-y-1.5">
                    {files.map((f) => (
                      <div key={f.id} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-800">{f.name}</p>
                          <p className="text-[10px] text-slate-400">{f.size}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFiles((prev) => prev.filter((x) => x.id !== f.id)); }}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-center text-xs text-slate-400">
                Formatos aceptados: PDF, DOCX, JPG, PNG. Máx. 10 MB por archivo.
              </p>
            </div>
          )}

          {/* ────────── STEP 2: Document type ────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <FieldLabel required>Tipo de documento</FieldLabel>
                <FieldSelect value={tipoDocumentoId} onChange={(e) => setTipoDocumentoId(e.target.value)}>
                  <option value="">Seleccionar tipo...</option>
                  {TIPOS_DOCUMENTO.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre} ({t.categoria})</option>
                  ))}
                </FieldSelect>
                {selectedTipo && (
                  <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${CATEGORIA_CONFIG[selectedTipo.categoria].bg}`}>
                      <FileText className={`h-3 w-3 ${CATEGORIA_CONFIG[selectedTipo.categoria].text}`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{selectedTipo.nombre}</p>
                      <p className="text-[11px] text-slate-500">
                        {selectedTipo.categoria}
                        {selectedTipo.esCritico && " · Crítico DS44"}
                        {selectedTipo.requiereVencimiento && ` · Vence cada ${selectedTipo.vencimientoMeses} meses`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Estado inicial</FieldLabel>
                  <FieldSelect
                    value={estadoInicial}
                    onChange={(e) => setEstadoInicial(e.target.value as "en_revision" | "completo")}
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
                    value={cargadoPor}
                    onChange={(e) => setCargadoPor(e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3">
                <p className="text-xs font-semibold text-violet-800">
                  {files.length} archivo{files.length !== 1 ? "s" : ""} se asociará{files.length !== 1 ? "n" : ""} al tipo seleccionado.
                </p>
                <p className="mt-0.5 text-[11px] text-violet-600">
                  El mismo tipo documental se asignará a todos los archivos del lote.
                </p>
              </div>
            </div>
          )}

          {/* ────────── STEP 3: Assignment ────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <FieldLabel>Modo de asignación</FieldLabel>
                <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {(
                    [
                      { id: "manual" as AssignMode, label: "Manual",      Icon: Users },
                      { id: "centro" as AssignMode, label: "Por centro",  Icon: Building2 },
                      { id: "cargo"  as AssignMode, label: "Por cargo",   Icon: Briefcase },
                    ]
                  ).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setAssignMode(id);
                        setSelectedIds(new Set());
                        setFilterCentro("");
                        setFilterCargo("");
                      }}
                      className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold transition ${
                        assignMode === id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Centro filter */}
              {assignMode === "centro" && (
                <div>
                  <FieldLabel>Centro de trabajo</FieldLabel>
                  <FieldSelect value={filterCentro} onChange={(e) => selectByCentro(e.target.value)}>
                    <option value="">Seleccionar centro…</option>
                    {CENTROS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </FieldSelect>
                  {filterCentro && (
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      {MOCK_WORKERS.filter((w) => w.centroTrabajo === filterCentro).length} trabajadores seleccionados automáticamente.
                      Puedes ajustar la selección abajo.
                    </p>
                  )}
                </div>
              )}

              {/* Cargo filter */}
              {assignMode === "cargo" && (
                <div>
                  <FieldLabel>Cargo</FieldLabel>
                  <FieldSelect value={filterCargo} onChange={(e) => selectByCargo(e.target.value)}>
                    <option value="">Seleccionar cargo…</option>
                    {CARGOS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </FieldSelect>
                  {filterCargo && (
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      {MOCK_WORKERS.filter((w) => w.cargo === filterCargo).length} trabajadores seleccionados automáticamente.
                      Puedes ajustar la selección abajo.
                    </p>
                  )}
                </div>
              )}

              {/* Worker list */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <FieldLabel>
                    Trabajadores
                    {selectedIds.size > 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-blue-700">
                        {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}
                      </span>
                    )}
                  </FieldLabel>
                  {selectedIds.size > 0 && (
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="text-[11px] font-semibold text-slate-400 transition hover:text-red-500"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
                  {workerListForMode.map((w) => {
                    const checked  = selectedIds.has(w.id);
                    const initials = `${w.nombre[0]}${w.apellido[0]}`;
                    return (
                      <label
                        key={w.id}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 transition ${
                          checked ? "bg-blue-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleWorker(w.id)}
                          className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                        />
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white ${checked ? "bg-blue-600" : "bg-slate-800"}`}>
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900">{w.apellido}, {w.nombre}</p>
                          <p className="truncate text-[11px] text-slate-400">{w.cargo} · {w.centroTrabajo}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ────────── STEP 4: Confirmation ────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-slate-900">Confirmar carga masiva</p>

              {/* Summary card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Tipo de documento</span>
                    <span className="text-right text-xs font-semibold text-slate-900">{selectedTipo?.nombre ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Estado inicial</span>
                    <span className={`text-xs font-semibold ${estadoInicial === "completo" ? "text-emerald-700" : "text-blue-700"}`}>
                      {estadoInicial === "completo" ? "Completo" : "En revisión"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Cargado por</span>
                    <span className="text-xs font-semibold text-slate-900">{cargadoPor}</span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Archivos</span>
                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">{files.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Trabajadores</span>
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">{selectedIds.size}</span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">Total de registros</span>
                    <span className="rounded-full bg-slate-900 px-3 py-0.5 text-xs font-bold text-white">{totalRecords}</span>
                  </div>
                </div>
              </div>

              {/* Worker mini-list */}
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Trabajadores seleccionados
                </p>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
                  {selectedWorkers.map((w) => {
                    const initials = `${w.nombre[0]}${w.apellido[0]}`;
                    return (
                      <div key={w.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[11px] font-bold text-white">
                          {initials}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{w.apellido}, {w.nombre}</p>
                          <p className="text-[11px] text-slate-400">{w.cargo} · {w.centroTrabajo}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ────────── STEP 5: Success ────────── */}
          {step === 5 && (
            <div className="flex flex-col items-center justify-center gap-5 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">Carga completada</p>
                <p className="mt-1 text-sm text-slate-500">
                  {totalRecords} registro{totalRecords !== 1 ? "s" : ""} procesado{totalRecords !== 1 ? "s" : ""} correctamente.
                </p>
              </div>
              <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="space-y-2.5">
                  {[
                    { label: "Archivos procesados",   value: `${files.length}` },
                    { label: "Trabajadores asignados", value: `${selectedIds.size}` },
                    { label: "Tipo de documento",      value: selectedTipo?.nombre ?? "—" },
                    { label: "Estado asignado",        value: estadoInicial === "completo" ? "Completo" : "En revisión" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-emerald-700">{label}</span>
                      <span className="text-right text-xs font-bold text-emerald-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-slate-200 px-5 py-4">
          {step < 5 ? (
            <div className="flex items-center gap-3">
              <button
                onClick={step === 1 ? onClose : () => setStep((s) => (s - 1) as Step)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {step === 1 ? "Cancelar" : "Atrás"}
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceed || isSubmitting}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                  !canProceed || isSubmitting
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-violet-600 hover:bg-violet-700"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Procesando…
                  </>
                ) : step === 4 ? (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Cargar documentos
                  </>
                ) : (
                  <>
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </>
  );
}
