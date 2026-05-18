"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Sparkles,
  CheckCircle2,
  Send,
  PenLine,
  Shield,
  Clock,
  User,
  Briefcase,
  FileText,
  AlertTriangle,
  History,
  Download,
} from "lucide-react";
import { type Worker } from "../types";
import { type DocTrabajadorView } from "./types";
import { puedeGenerarseConIA } from "@/lib/documentacion/ia-generacion-helper";
import { exportTrabajadorDocumentoPdf } from "./export-trabajador-documento-pdf";
import {
  cambiarEstadoTrabajadorDocumento,
  generarContenidoIATrabajadorDocumento,
  generarCampoIATrabajadorDocumento,
  guardarContenidoIADocumento,
  validarTrabajadorDocumento,
  enviarTrabajadorDocumentoAFirma,
  firmarTrabajadorDocumento,
  regenerarSeccionIATrabajadorDocumento,
  getHistorialDocumentoTrabajador,
  registrarHistorialDocumentoTrabajador,
  createTrabajadorDocumento,
  getEmpresaDocumentoMeta,
  type HistorialEntryView,
  type EmpresaDocumentoMeta,
} from "@/actions/trabajadores/documentos";
import {
  construirContenidoBasePlantilla,
  getPlantilla,
  normalizarNombreDocumentoDisplay,
} from "@/lib/documentacion/plantillas-documento";
import { generarPlantillaContenidoIA } from "@/lib/documentacion/ia-generacion-helper";
import {
  crearDocumentoEppEstructurado,
  crearDocumentoIrlEstructurado,
  parseDocumentoEstructurado,
  serializarDocumentoEstructurado,
  type DocumentoEppEstructurado,
  type DocumentoEppCampos,
  type DocumentoEstructurado,
  type DocumentoIrlEstructurado,
  type DocumentoIrlCampos,
  type EppItem,
  type IrlEppItem,
  type IrlRiesgoFila,
} from "@/lib/documentacion/documento-estructurado";

// ── Public types ──────────────────────────────────────────────────────────────

export interface DocumentoReviewContext {
  /** Null = modo "generar" (todavía no existe el documento en DB) */
  doc: DocTrabajadorView | null;
  worker: Worker;
  /** Pre-fill inicial del contenido en modo "generar" */
  contenidoGenerado?: string;
}

export interface DocumentoReviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context?: DocumentoReviewContext | null;
  onUpdated?: () => void | Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type Phase = "idle" | "saving" | "validating" | "enviando" | "firmando" | "done" | "error";

function estadoBadge(estado: string) {
  const cfg: Record<string, { label: string; color: string }> = {
    pendiente:     { label: "Pendiente",      color: "bg-amber-100 text-amber-800 border-amber-200" },
    vencido:       { label: "Vencido",        color: "bg-red-100 text-red-800 border-red-200" },
    rechazado:     { label: "Rechazado",      color: "bg-rose-100 text-rose-800 border-rose-200" },
    en_revision:   { label: "En revisión",    color: "bg-blue-100 text-blue-800 border-blue-200" },
    validado:      { label: "Validado",       color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
    enviado_firma: { label: "Enviado a firma", color: "bg-teal-100 text-teal-800 border-teal-200" },
    firmado:       { label: "Firmado",        color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    completo:      { label: "Completo",       color: "bg-green-100 text-green-800 border-green-200" },
    no_aplica:     { label: "No aplica",      color: "bg-slate-100 text-slate-600 border-slate-200" },
  };
  const e = cfg[estado] ?? { label: estado, color: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${e.color}`}>
      {e.label}
    </span>
  );
}

function accionLabel(accion: string): string {
  const map: Record<string, string> = {
    ESTADO_ACTUALIZADO:      "Estado actualizado",
    CONTENIDO_EDITADO:       "Documento editado",
    DOCUMENTO_VALIDADO:      "Documento validado",
    DOCUMENTO_ENVIADO_FIRMA: "Enviado a firma",
    DOCUMENTO_FIRMADO:       "Firmado",
    DOCUMENTO_CREADO:        "Documento creado",
    ARCHIVO_CARGADO:         "Archivo cargado",
  };
  return map[accion] ?? accion;
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows = 1,
  disabled = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  type?: "text" | "date";
}) {
  const shared = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50";
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {rows > 1 ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={shared}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={shared}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2 bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-2.5">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-white">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function RiskTableEditor({
  rows,
  onChange,
  disabled,
}: {
  rows: IrlRiesgoFila[];
  onChange: (next: IrlRiesgoFila[]) => void;
  disabled?: boolean;
}) {
  const updateRow = (index: number, patch: Partial<IrlRiesgoFila>) => {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };
  const addRow = () => onChange([...rows, { peligro: "", consecuencia: "", medida: "" }]);
  const removeRow = (index: number) => onChange(rows.filter((_, rowIndex) => rowIndex !== index));

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="min-w-[920px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-100 text-[11px] uppercase tracking-[0.08em] text-slate-600">
              <th className="border border-slate-200 px-3 py-2">Peligro</th>
              <th className="border border-slate-200 px-3 py-2">Consecuencia</th>
              <th className="border border-slate-200 px-3 py-2">Medida preventiva</th>
              <th className="border border-slate-200 px-3 py-2">Acción</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`risk-${index}`}>
                <td className="border border-slate-200 p-2"><input className="w-full rounded-lg border border-slate-200 px-2 py-1" value={row.peligro} onChange={(e) => updateRow(index, { peligro: e.target.value })} disabled={disabled} /></td>
                <td className="border border-slate-200 p-2"><input className="w-full rounded-lg border border-slate-200 px-2 py-1" value={row.consecuencia} onChange={(e) => updateRow(index, { consecuencia: e.target.value })} disabled={disabled} /></td>
                <td className="border border-slate-200 p-2"><input className="w-full rounded-lg border border-slate-200 px-2 py-1" value={row.medida} onChange={(e) => updateRow(index, { medida: e.target.value })} disabled={disabled} /></td>
                <td className="border border-slate-200 p-2"><button type="button" onClick={() => removeRow(index)} disabled={disabled} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50">Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addRow} disabled={disabled} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50">Agregar fila</button>
    </div>
  );
}

function EppTableEditor({
  rows,
  onChange,
  disabled,
}: {
  rows: EppItem[];
  onChange: (next: EppItem[]) => void;
  disabled?: boolean;
}) {
  const newRow = (): EppItem => ({
    descripcion: "", marca: "", modelo: "", color: "", talla: "", cantidad: 1,
    norma_tecnica: "", fecha_entrega: "", fecha_vencimiento_epp: "",
    si: true, no: false, firma_recepcion: "", observaciones: "",
  });
  const updateRow = (index: number, patch: Partial<EppItem>) => {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };
  const addRow = () => onChange([...rows, newRow()]);
  const removeRow = (index: number) => onChange(rows.filter((_, rowIndex) => rowIndex !== index));

  const th = "border border-slate-200 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 whitespace-nowrap";
  const inp = "w-full rounded border border-slate-200 px-1.5 py-1 text-xs text-slate-800 focus:border-violet-400 focus:outline-none";

  return (
    <SectionCard title="Tabla de EPP — Registro de entrega">
      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full border-collapse text-left text-xs">
          <thead>
            <tr>
              <th className={`${th} w-[18%]`}>Descripción artículo</th>
              <th className={`${th} w-[9%]`}>Marca</th>
              <th className={`${th} w-[9%]`}>Modelo</th>
              <th className={`${th} w-[6%]`}>Color</th>
              <th className={`${th} w-[6%]`}>Talla</th>
              <th className={`${th} w-[5%] text-center`}>Cant.</th>
              <th className={`${th} w-[11%]`}>Norma técnica</th>
              <th className={`${th} w-[8%]`}>F. entrega</th>
              <th className={`${th} w-[8%]`}>F. venc. EPP</th>
              <th className={`${th} w-[4%] text-center`}>SI</th>
              <th className={`${th} w-[4%] text-center`}>NO</th>
              <th className={`${th} w-[8%]`}>Firma recepción</th>
              <th className={`${th} w-[8%]`}>Observaciones</th>
              <th className={`${th} w-[6%] text-center`}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`epp-${index}`} className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-200 p-1.5"><input className={inp} value={row.descripcion} onChange={(e) => updateRow(index, { descripcion: e.target.value })} disabled={disabled} placeholder="Ej: Casco de seguridad" /></td>
                <td className="border border-slate-200 p-1.5"><input className={inp} value={row.marca} onChange={(e) => updateRow(index, { marca: e.target.value })} disabled={disabled} placeholder="3M" /></td>
                <td className="border border-slate-200 p-1.5"><input className={inp} value={row.modelo} onChange={(e) => updateRow(index, { modelo: e.target.value })} disabled={disabled} placeholder="H-700" /></td>
                <td className="border border-slate-200 p-1.5"><input className={inp} value={row.color} onChange={(e) => updateRow(index, { color: e.target.value })} disabled={disabled} placeholder="Blanco" /></td>
                <td className="border border-slate-200 p-1.5"><input className={inp} value={row.talla} onChange={(e) => updateRow(index, { talla: e.target.value })} disabled={disabled} placeholder="M / 42" /></td>
                <td className="border border-slate-200 p-1.5 text-center"><input type="number" min={1} className={`${inp} text-center w-14`} value={row.cantidad} onChange={(e) => updateRow(index, { cantidad: Math.max(1, Number(e.target.value)) })} disabled={disabled} /></td>
                <td className="border border-slate-200 p-1.5"><input className={inp} value={row.norma_tecnica} onChange={(e) => updateRow(index, { norma_tecnica: e.target.value })} disabled={disabled} placeholder="NCh 1234" /></td>
                <td className="border border-slate-200 p-1.5"><input type="date" className={inp} value={row.fecha_entrega} onChange={(e) => updateRow(index, { fecha_entrega: e.target.value })} disabled={disabled} /></td>
                <td className="border border-slate-200 p-1.5"><input type="date" className={inp} value={row.fecha_vencimiento_epp} onChange={(e) => updateRow(index, { fecha_vencimiento_epp: e.target.value })} disabled={disabled} /></td>
                <td className="border border-slate-200 p-1.5 text-center"><input type="checkbox" checked={row.si} disabled={disabled} className="accent-violet-600" onChange={(e) => updateRow(index, { si: e.target.checked, no: !e.target.checked })} /></td>
                <td className="border border-slate-200 p-1.5 text-center"><input type="checkbox" checked={row.no} disabled={disabled} className="accent-red-500" onChange={(e) => updateRow(index, { no: e.target.checked, si: !e.target.checked })} /></td>
                <td className="border border-slate-200 p-1.5"><input className={inp} value={row.firma_recepcion} onChange={(e) => updateRow(index, { firma_recepcion: e.target.value })} disabled={disabled} placeholder="RUT / nombre" /></td>
                <td className="border border-slate-200 p-1.5"><input className={inp} value={row.observaciones} onChange={(e) => updateRow(index, { observaciones: e.target.value })} disabled={disabled} /></td>
                <td className="border border-slate-200 p-1.5 text-center"><button type="button" onClick={() => removeRow(index)} disabled={disabled} className="rounded border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500 hover:border-red-300 hover:text-red-600 disabled:opacity-40">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addRow} disabled={disabled} className="mt-3 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50">+ Agregar EPP</button>
    </SectionCard>
  );
}

function IrlEppTableEditor({
  rows,
  onChange,
  disabled,
}: {
  rows: IrlEppItem[];
  onChange: (next: IrlEppItem[]) => void;
  disabled?: boolean;
}) {
  const updateRow = (index: number, patch: Partial<IrlEppItem>) => {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };
  const addRow = () => onChange([...rows, { descripcion: "", cantidad: 1, entregado: true, observaciones: "" }]);
  const removeRow = (index: number) => onChange(rows.filter((_, rowIndex) => rowIndex !== index));

  const th = "border border-slate-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100";
  const inp = "w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-violet-400 focus:outline-none";

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="min-w-[600px] w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className={`${th} w-[45%]`}>Descripción EPP</th>
              <th className={`${th} w-[12%] text-center`}>Cantidad</th>
              <th className={`${th} w-[12%] text-center`}>Entregado</th>
              <th className={`${th} w-[25%]`}>Observaciones</th>
              <th className={`${th} w-[6%] text-center`}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`irl-epp-${index}`} className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-200 p-1.5"><input className={inp} value={row.descripcion} onChange={(e) => updateRow(index, { descripcion: e.target.value })} disabled={disabled} placeholder="Ej: Casco blanco" /></td>
                <td className="border border-slate-200 p-1.5 text-center"><input type="number" min={1} className={`${inp} text-center w-16`} value={row.cantidad} onChange={(e) => updateRow(index, { cantidad: Math.max(1, Number(e.target.value)) })} disabled={disabled} /></td>
                <td className="border border-slate-200 p-1.5 text-center"><input type="checkbox" checked={row.entregado} disabled={disabled} className="accent-violet-600" onChange={(e) => updateRow(index, { entregado: e.target.checked })} /></td>
                <td className="border border-slate-200 p-1.5"><input className={inp} value={row.observaciones} onChange={(e) => updateRow(index, { observaciones: e.target.value })} disabled={disabled} /></td>
                <td className="border border-slate-200 p-1.5 text-center"><button type="button" onClick={() => removeRow(index)} disabled={disabled} className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-red-600 disabled:opacity-40">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addRow} disabled={disabled} className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">+ Agregar EPP</button>
    </div>
  );
}

function CompromisosEditor({
  items,
  onChange,
  disabled,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const updateItem = (index: number, value: string) => {
    onChange(items.map((item, i) => (i === index ? value : item)));
  };
  const addItem = () => onChange([...items, ""]);
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`comp-${index}`} className="flex items-start gap-2">
          <span className="mt-2.5 text-slate-400 text-xs font-semibold w-5 shrink-0">{index + 1}.</span>
          <input
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:outline-none disabled:bg-slate-50"
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            disabled={disabled}
            placeholder="Compromiso del trabajador..."
          />
          <button type="button" onClick={() => removeItem(index)} disabled={disabled} className="mt-2 rounded-lg border border-slate-200 px-2 py-1 text-[10px] text-slate-400 hover:text-red-500 disabled:opacity-40">✕</button>
        </div>
      ))}
      <button type="button" onClick={addItem} disabled={disabled} className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">+ Agregar compromiso</button>
    </div>
  );
}

function CapacitacionesPreviasEditor({
  items,
  onChange,
  disabled,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const updateItem = (index: number, value: string) => {
    onChange(items.map((item, i) => (i === index ? value : item)));
  };
  const addItem = () => onChange([...items, ""]);
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`cap-${index}`} className="flex items-center gap-2">
          <span className="text-violet-400 text-xs">✓</span>
          <input
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:outline-none disabled:bg-slate-50"
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            disabled={disabled}
            placeholder="Ej: Inducción de empresa"
          />
          <button type="button" onClick={() => removeItem(index)} disabled={disabled} className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] text-slate-400 hover:text-red-500 disabled:opacity-40">✕</button>
        </div>
      ))}
      <button type="button" onClick={addItem} disabled={disabled} className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">+ Agregar capacitación previa</button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DocumentoReviewDrawer({
  isOpen,
  onClose,
  context,
  onUpdated,
}: DocumentoReviewDrawerProps) {
  const router = useRouter();
  const [contenido, setContenido]   = useState("");
  const [historial, setHistorial]   = useState<HistorialEntryView[]>([]);
  const [phase, setPhase]           = useState<Phase>("idle");
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [localDoc, setLocalDoc]     = useState<DocTrabajadorView | null>(null);
  const [estructura, setEstructura] = useState<DocumentoEstructurado | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [empresaMeta, setEmpresaMeta] = useState<EmpresaDocumentoMeta | null>(null);
  const [generatingFieldId, setGeneratingFieldId] = useState<string | null>(null);
  const [regeneratingSectionId, setRegeneratingSectionId] = useState<string | null>(null);

  // ── Init when drawer opens ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !context) return;

    setPhase("idle");
    setErrorMsg(null);
    setShowHistorial(false);
    setExportingPdf(false);
    setEmpresaMeta(null);

    const d = context.doc;
    setLocalDoc(d);
    const contenidoInicial = d?.observacion ?? context.contenidoGenerado ?? "";

    // Pre-fill content
    setContenido(contenidoInicial);
    setEstructura(parseDocumentoEstructurado(contenidoInicial));

    // Load historial from DB if we have a real documentoId
    if (d?.documentoId) {
      getHistorialDocumentoTrabajador(d.documentoId)
        .then(setHistorial)
        .catch(() => setHistorial([]));
    } else {
      setHistorial([]);
    }

    getEmpresaDocumentoMeta()
      .then(setEmpresaMeta)
      .catch(() => setEmpresaMeta(null));
  }, [isOpen, context]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen || !context) return null;

  const { worker, doc: originalDoc } = context;
  const doc = localDoc;
  const tipoNombre = doc?.tipo.nombre ?? originalDoc?.tipo.nombre ?? "";
  const nombreDisplay = normalizarNombreDocumentoDisplay(tipoNombre);
  const origen = puedeGenerarseConIA(doc?.tipo ?? originalDoc?.tipo ?? {}) ? "IA" : "Manual";
  const isReadOnly = doc?.estado === "firmado";
  const efectoEstado = doc?.estado ?? "pendiente";
  const plantillaActual = getPlantilla(doc?.tipo.id ?? originalDoc?.tipo.id ?? "", tipoNombre);
  const plantillaCodigo = (plantillaActual?.codigo ?? "").toLowerCase();
  const plantillaNombre = (plantillaActual?.nombre ?? "").toLowerCase();
  const esPlantillaEstructurable =
    plantillaCodigo.includes("irl") ||
    plantillaCodigo.includes("epp") ||
    plantillaNombre.includes("irl") ||
    plantillaNombre.includes("epp");
  const pdfEstadosPermitidos = new Set(["en_revision", "validado", "enviado_firma", "firmado"]);
  const puedeDescargarPdf = Boolean(contenido.trim()) && pdfEstadosPermitidos.has(efectoEstado);
  const puedeMostrarSinContenido = pdfEstadosPermitidos.has(efectoEstado) && !contenido.trim();

  function actualizarEstructura(next: DocumentoEstructurado) {
    setEstructura(next);
    setContenido(serializarDocumentoEstructurado(next));
  }

  function actualizarCampoIrl<K extends keyof DocumentoIrlCampos>(campo: K, valor: DocumentoIrlCampos[K]) {
    if (!estructura || estructura.plantillaCodigo !== "IRL") return;
    actualizarEstructura({
      ...estructura,
      campos: {
        ...estructura.campos,
        [campo]: valor,
      },
    });
  }

  function actualizarCampoEpp<K extends keyof DocumentoEppCampos>(campo: K, valor: DocumentoEppCampos[K]) {
    if (!estructura || estructura.plantillaCodigo !== "EPP") return;
    actualizarEstructura({
      ...estructura,
      campos: {
        ...estructura.campos,
        [campo]: valor,
      },
    });
  }

  async function handleGenerarCampoIA(campoId: string) {
    if (!doc?.documentoId || phase !== "idle") return;
    setGeneratingFieldId(campoId);
    setErrorMsg(null);
    try {
      const result = await generarCampoIATrabajadorDocumento(doc.documentoId, campoId);
      setContenido(result.contenido);
      setEstructura(parseDocumentoEstructurado(result.contenido));
      await onUpdated?.();
      router.refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al generar campo con IA");
      setPhase("error");
    } finally {
      setGeneratingFieldId(null);
    }
  }

  async function handleRegenerarSeccionIA(seccionId: string) {
    if (!doc?.documentoId || phase !== "idle") return;
    setRegeneratingSectionId(seccionId);
    setErrorMsg(null);
    try {
      const result = await regenerarSeccionIATrabajadorDocumento(doc.documentoId, seccionId);
      setContenido(result.contenido);
      setEstructura(parseDocumentoEstructurado(result.contenido));
      await onUpdated?.();
      router.refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al regenerar sección con IA");
      setPhase("error");
    } finally {
      setRegeneratingSectionId(null);
    }
  }

  function renderFieldIABtn(campoId: string) {
    const disabled = isReadOnly || isLoading || !doc?.documentoId;
    return (
      <button
        type="button"
        onClick={() => handleGenerarCampoIA(campoId)}
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {generatingFieldId === campoId ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        ) : (
          <Sparkles className="h-3 w-3" />
        )}
        IA campo
      </button>
    );
  }

  function renderSectionIABtn(seccionId: string) {
    const disabled = isReadOnly || isLoading || !doc?.documentoId;
    return (
      <button
        type="button"
        onClick={() => handleRegenerarSeccionIA(seccionId)}
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {regeneratingSectionId === seccionId ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        ) : (
          <Sparkles className="h-3 w-3" />
        )}
        Regenerar sección IA
      </button>
    );
  }

  function convertirLegacyAEstructura() {
    const plantilla = getPlantilla(doc?.tipo.id ?? originalDoc?.tipo.id ?? "", tipoNombre);
    if (!plantilla) return;
    const nuevo = plantilla && (plantilla.codigo.toLowerCase().includes("epp") || plantilla.nombre.toLowerCase().includes("epp"))
      ? crearDocumentoEppEstructurado({
          tipoNombre,
          trabajadorNombre: `${worker.nombre} ${worker.apellido}`,
          trabajadorRut: worker.rut,
          cargo: worker.cargo,
          area: worker.area,
        })
      : crearDocumentoIrlEstructurado({
          tipoNombre,
          trabajadorNombre: `${worker.nombre} ${worker.apellido}`,
          trabajadorRut: worker.rut,
          cargo: worker.cargo,
          area: worker.area,
        });
    actualizarEstructura(nuevo);
  }

  function renderIrlEditor(data: DocumentoIrlEstructurado) {
    const c = data.campos;
    return (
      <div className="space-y-4">
        {/* ── 1-3: Tipo inducción, modalidad, actividad ───────────────────────── */}
        <SectionCard title="1–3. Tipo inducción, modalidad y actividad" action={renderSectionIABtn("encabezado")}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Código documento" value={c.codigo_documento} onChange={(v) => actualizarCampoIrl("codigo_documento", v)} disabled={isReadOnly} />
            <Field label="Versión" value={c.version} onChange={(v) => actualizarCampoIrl("version", v)} disabled={isReadOnly} />
            <Field label="Año" value={c.anio} onChange={(v) => actualizarCampoIrl("anio", v)} disabled={isReadOnly} />
            <Field label="Tipo inducción" value={c.tipo_induccion} onChange={(v) => actualizarCampoIrl("tipo_induccion", v)} disabled={isReadOnly} placeholder="Persona trabajadora nueva" />
            <Field label="Modalidad" value={c.modalidad} onChange={(v) => actualizarCampoIrl("modalidad", v)} disabled={isReadOnly} placeholder="Presencial / On Line" />
            <Field label="Tipo actividad" value={c.tipo_actividad} onChange={(v) => actualizarCampoIrl("tipo_actividad", v)} disabled={isReadOnly} placeholder="Interna / Externa" />
          </div>
        </SectionCard>

        {/* ── 4: Identificación del trabajador ────────────────────────────────── */}
        <SectionCard title="4. Identificación de la persona trabajadora" action={renderSectionIABtn("encabezado")}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Nombre trabajador" value={c.trabajador_nombre} onChange={(v) => actualizarCampoIrl("trabajador_nombre", v)} disabled={isReadOnly} />
            <Field label="RUT" value={c.trabajador_rut} onChange={(v) => actualizarCampoIrl("trabajador_rut", v)} disabled={isReadOnly} />
            <Field label="Cargo" value={c.trabajador_cargo} onChange={(v) => actualizarCampoIrl("trabajador_cargo", v)} disabled={isReadOnly} />
            <Field label="Área" value={c.trabajador_area} onChange={(v) => actualizarCampoIrl("trabajador_area", v)} disabled={isReadOnly} />
            <Field label="Fecha" type="date" value={c.fecha} onChange={(v) => actualizarCampoIrl("fecha", v)} disabled={isReadOnly} />
            <Field label="Duración capacitación" value={c.duracion_capacitacion} onChange={(v) => actualizarCampoIrl("duracion_capacitacion", v)} disabled={isReadOnly} placeholder="Ej: 2 horas" />
            <Field label="Teléfono emergencia (contacto)" value={c.telefono_emergencia} onChange={(v) => actualizarCampoIrl("telefono_emergencia", v)} disabled={isReadOnly} placeholder="132 / Nombre contacto" />
            <Field label="Empresa contratista" value={c.empresa_contratista} onChange={(v) => actualizarCampoIrl("empresa_contratista", v)} disabled={isReadOnly} placeholder="Si aplica" />
            <Field label="Empresa mandante" value={c.empresa_mandante} onChange={(v) => actualizarCampoIrl("empresa_mandante", v)} disabled={isReadOnly} />
          </div>
        </SectionCard>

        {/* ── 5: Características del lugar de trabajo ──────────────────────────── */}
        <SectionCard title="5. Características del lugar de trabajo" action={renderSectionIABtn("lugar_trabajo")}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Lugar de trabajo específico" value={c.lugar_trabajo} onChange={(v) => actualizarCampoIrl("lugar_trabajo", v)} disabled={isReadOnly} />
            <Field label="Dirección / centro de trabajo" value={c.direccion_lugar_trabajo} onChange={(v) => actualizarCampoIrl("direccion_lugar_trabajo", v)} disabled={isReadOnly} />
            <Field label="Espacio de trabajo" value={c.espacio_trabajo} rows={3} onChange={(v) => actualizarCampoIrl("espacio_trabajo", v)} disabled={isReadOnly} />
            <Field label="Condiciones ambientales del puesto" value={c.condiciones_ambientales} rows={3} onChange={(v) => actualizarCampoIrl("condiciones_ambientales", v)} disabled={isReadOnly} />
            <Field label="Condiciones de orden y aseo" value={c.orden_aseo} rows={3} onChange={(v) => actualizarCampoIrl("orden_aseo", v)} disabled={isReadOnly} />
          </div>
        </SectionCard>

        {/* ── 6: Riesgos generales ────────────────────────────────────────────── */}
        <SectionCard title="6. Riesgos generales" action={renderSectionIABtn("riesgos_generales")}>
          <RiskTableEditor rows={c.riesgos_generales_tabla} onChange={(next) => actualizarCampoIrl("riesgos_generales_tabla", next)} disabled={isReadOnly} />
        </SectionCard>

        {/* ── 6.1: Riesgos por máquinas y equipos ─────────────────────────────── */}
        <SectionCard title="6.1 Riesgos por máquinas y/o equipos" action={renderSectionIABtn("riesgos_maquinas")}>
          <RiskTableEditor rows={c.riesgos_maquinas_tabla ?? []} onChange={(next) => actualizarCampoIrl("riesgos_maquinas_tabla", next)} disabled={isReadOnly} />
        </SectionCard>

        {/* ── 6.2: Riesgos por agentes químicos ────────────────────────────────── */}
        <SectionCard title="6.2 Riesgos por agentes químicos" action={renderSectionIABtn("riesgos_quimicos")}>
          <RiskTableEditor rows={c.riesgos_quimicos_tabla ?? []} onChange={(next) => actualizarCampoIrl("riesgos_quimicos_tabla", next)} disabled={isReadOnly} />
        </SectionCard>

        {/* ── 6.3: Riesgos psicosociales ───────────────────────────────────────── */}
        <SectionCard title="6.3 Riesgos psicosociales" action={renderSectionIABtn("riesgos_psicosociales")}>
          <RiskTableEditor rows={c.riesgos_psicosociales_tabla ?? []} onChange={(next) => actualizarCampoIrl("riesgos_psicosociales_tabla", next)} disabled={isReadOnly} />
        </SectionCard>

        {/* ── 7.1: Riesgos específicos del cargo ──────────────────────────────── */}
        <SectionCard title="7.1 Riesgos inherentes a la actividad realizada" action={renderSectionIABtn("riesgos_especificos")}>
          <div className="space-y-3">
            <Field label="Descripción de la actividad" value={c.descripcion_actividad} rows={3} onChange={(v) => actualizarCampoIrl("descripcion_actividad", v)} disabled={isReadOnly} />
            <Field label="Tareas que realiza" value={c.tareas_realiza} rows={4} onChange={(v) => actualizarCampoIrl("tareas_realiza", v)} disabled={isReadOnly} placeholder="Una tarea por línea" />
            <Field label="Lugares de trabajo del cargo" value={c.lugares_trabajo_cargo} rows={3} onChange={(v) => actualizarCampoIrl("lugares_trabajo_cargo", v)} disabled={isReadOnly} />
            <Field label="Herramientas y equipos" value={c.herramientas_equipos} rows={3} onChange={(v) => actualizarCampoIrl("herramientas_equipos", v)} disabled={isReadOnly} />
            <Field label="EPP requerido/informado" value={c.epp_requerido_info} rows={3} onChange={(v) => actualizarCampoIrl("epp_requerido_info", v)} disabled={isReadOnly} placeholder="Descripción de EPP necesarios (no entrega, solo información)" />
            <div>
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Riesgos presentes en las tareas</span>
              <RiskTableEditor rows={c.riesgos_tareas_tabla ?? []} onChange={(next) => actualizarCampoIrl("riesgos_tareas_tabla", next)} disabled={isReadOnly} />
            </div>
            <div>
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Riesgos presentes en el lugar de trabajo</span>
              <RiskTableEditor rows={c.riesgos_lugar_tabla ?? []} onChange={(next) => actualizarCampoIrl("riesgos_lugar_tabla", next)} disabled={isReadOnly} />
            </div>
          </div>
        </SectionCard>

        {/* ── 8: Normas generales de seguridad ─────────────────────────────────── */}
        <SectionCard title="8. Normas generales de seguridad" action={renderSectionIABtn("normativa")}>
          <div className="space-y-3">
            <Field label="a) Ley 16.744 y contenido" value={c.normas_ley16744 || c.normas_generales} rows={3} onChange={(v) => actualizarCampoIrl("normas_ley16744", v)} disabled={isReadOnly} />
            <Field label="b) Manejo manual de materiales (Ley 20.001 / D.S. 63)" value={c.normas_mmc} rows={3} onChange={(v) => actualizarCampoIrl("normas_mmc", v)} disabled={isReadOnly} />
            <Field label="c) Control de emergencias, incendios, extintores, primeros auxilios" value={c.normas_emergencias_control} rows={3} onChange={(v) => actualizarCampoIrl("normas_emergencias_control", v)} disabled={isReadOnly} />
            <Field label="d) Actuación en caso de emergencias" value={c.normas_emergencias_actuacion} rows={3} onChange={(v) => actualizarCampoIrl("normas_emergencias_actuacion", v)} disabled={isReadOnly} />
            <Field label="e) Res. 156 SUSESO — Accidentes graves y fatales" value={c.normas_accidentes_graves} rows={3} onChange={(v) => actualizarCampoIrl("normas_accidentes_graves", v)} disabled={isReadOnly} />
            <Field label="f) EPP: tipos, manejo correcto, obligatoriedad" value={c.normas_epp_info} rows={3} onChange={(v) => actualizarCampoIrl("normas_epp_info", v)} disabled={isReadOnly} />
            <Field label="g) Ergonomía y posición en puesto de trabajo" value={c.normas_ergonomia} rows={3} onChange={(v) => actualizarCampoIrl("normas_ergonomia", v)} disabled={isReadOnly} />
            <Field label="h) Uso y manejo de extintores" value={c.normas_extintores} rows={3} onChange={(v) => actualizarCampoIrl("normas_extintores", v)} disabled={isReadOnly} />
            <Field label="i) Señalizaciones de seguridad" value={c.normas_senalizacion} rows={3} onChange={(v) => actualizarCampoIrl("normas_senalizacion", v)} disabled={isReadOnly} />
            <Field label="j) Procedimientos de trabajo seguro (PTS)" value={c.normas_pts_texto || c.pts} rows={3} onChange={(v) => actualizarCampoIrl("normas_pts_texto", v)} disabled={isReadOnly} />
            <Field label="l) Sustancias químicas peligrosas" value={c.normas_quimicos} rows={3} onChange={(v) => actualizarCampoIrl("normas_quimicos", v)} disabled={isReadOnly} />
            {/* Legacy fields */}
            <Field label="Plan de emergencias y evacuación" value={c.emergencias_evacuacion} rows={3} onChange={(v) => actualizarCampoIrl("emergencias_evacuacion", v)} disabled={isReadOnly} />
            <Field label="Protocolos MINSAL (texto libre)" value={c.protocolos_minsal} rows={2} onChange={(v) => actualizarCampoIrl("protocolos_minsal", v)} disabled={isReadOnly} />
          </div>
        </SectionCard>

        {/* ── 9: Documentos ───────────────────────────────────────────────────── */}
        <SectionCard title="9. Documentos asociados" action={renderSectionIABtn("documentos_section")}>
          <div className="space-y-3">
            <div>
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Procedimientos de Trabajo Seguro (PTS)</span>
              <CompromisosEditor items={c.documentos_pts_lista ?? []} onChange={(v) => actualizarCampoIrl("documentos_pts_lista", v)} disabled={isReadOnly} />
            </div>
            <div>
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Hojas de Datos de Seguridad (HDS)</span>
              <CompromisosEditor items={c.documentos_hds_lista ?? []} onChange={(v) => actualizarCampoIrl("documentos_hds_lista", v)} disabled={isReadOnly} />
            </div>
            <div>
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Otros documentos</span>
              <CompromisosEditor items={c.documentos_otros_lista ?? []} onChange={(v) => actualizarCampoIrl("documentos_otros_lista", v)} disabled={isReadOnly} />
            </div>
            <Field label="Documentos asociados (texto libre)" value={c.documentos_asociados} rows={2} onChange={(v) => actualizarCampoIrl("documentos_asociados", v)} disabled={isReadOnly} />
          </div>
        </SectionCard>

        {/* ── Antecedentes del trabajador ────────────────────────────────────── */}
        <SectionCard title="Antecedentes del trabajador" action={renderSectionIABtn("encabezado")}>
          <div className="space-y-3">
            <Field label="Accidentes anteriores" value={c.accidentes_anteriores} rows={2} onChange={(v) => actualizarCampoIrl("accidentes_anteriores", v)} disabled={isReadOnly} />
            <div>
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Capacitaciones previas recibidas</span>
              <CapacitacionesPreviasEditor items={c.capacitaciones_previas ?? []} onChange={(v) => actualizarCampoIrl("capacitaciones_previas", v)} disabled={isReadOnly} />
            </div>
          </div>
        </SectionCard>

        {/* ── EPP requeridos (solo informativo, no entrega) ────────────────────── */}
        <SectionCard title="EPP requeridos/informados en la inducción (solo referencia)" action={renderSectionIABtn("epp_resumen")}>
          <p className="mb-2 text-[11px] text-slate-500">Esta sección es informativa. La entrega de EPP se registra en el documento &quot;Registro de Entrega de EPP&quot; (documento separado).</p>
          <IrlEppTableEditor rows={c.epp_induccion_tabla ?? []} onChange={(next) => actualizarCampoIrl("epp_induccion_tabla", next)} disabled={isReadOnly} />
        </SectionCard>

        {/* ── Compromisos ─────────────────────────────────────────────────────── */}
        <SectionCard title="10. Compromisos del trabajador" action={renderSectionIABtn("compromisos")}>
          <CompromisosEditor items={c.compromisos_trabajador ?? []} onChange={(v) => actualizarCampoIrl("compromisos_trabajador", v)} disabled={isReadOnly} />
        </SectionCard>

        {/* ── Prevencionista ───────────────────────────────────────────────────── */}
        <SectionCard title="Prevencionista responsable" action={renderSectionIABtn("lugar_trabajo")}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nombre prevencionista" value={c.prevencionista_nombre} onChange={(v) => actualizarCampoIrl("prevencionista_nombre", v)} disabled={isReadOnly} />
            <Field label="Cargo prevencionista" value={c.prevencionista_cargo} onChange={(v) => actualizarCampoIrl("prevencionista_cargo", v)} disabled={isReadOnly} />
          </div>
        </SectionCard>

        {/* ── Cierre ──────────────────────────────────────────────────────────── */}
        <SectionCard title="10. Declaración y firmas" action={renderSectionIABtn("cierre")}>
          <div className="space-y-3">
            <Field label="Declaración" value={c.declaracion} rows={4} onChange={(v) => actualizarCampoIrl("declaracion", v)} disabled={isReadOnly} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Firma trabajador" value={c.firma_trabajador} onChange={(v) => actualizarCampoIrl("firma_trabajador", v)} disabled={isReadOnly} />
              <Field label="Nombre relator / firma" value={c.firma_relator} onChange={(v) => actualizarCampoIrl("firma_relator", v)} disabled={isReadOnly} />
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  function renderEppEditor(data: DocumentoEppEstructurado) {
    const c = data.campos;
    return (
      <div className="space-y-4">
        <SectionCard title="Encabezado" action={renderSectionIABtn("encabezado")}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Trabajador</span>{renderFieldIABtn("trabajador_nombre")}</div>
              <Field label="" value={c.trabajador_nombre} onChange={(value) => actualizarCampoEpp("trabajador_nombre", value)} disabled={isReadOnly} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">RUT</span>{renderFieldIABtn("trabajador_rut")}</div>
              <Field label="" value={c.trabajador_rut} onChange={(value) => actualizarCampoEpp("trabajador_rut", value)} disabled={isReadOnly} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Área</span>{renderFieldIABtn("area")}</div>
              <Field label="" value={c.area} onChange={(value) => actualizarCampoEpp("area", value)} disabled={isReadOnly} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Fecha</span>{renderFieldIABtn("fecha")}</div>
              <Field label="" type="date" value={c.fecha} onChange={(value) => actualizarCampoEpp("fecha", value)} disabled={isReadOnly} />
            </div>
          </div>
        </SectionCard>

        <EppTableEditor
          rows={c.epp_tabla}
          onChange={(next) => actualizarCampoEpp("epp_tabla", next)}
          disabled={isReadOnly}
        />

        <SectionCard title="Observaciones y firma" action={renderSectionIABtn("cierre")}>
          <div className="space-y-3">
            <Field label="Observaciones generales" value={c.observaciones_generales} rows={4} onChange={(value) => actualizarCampoEpp("observaciones_generales", value)} disabled={isReadOnly} />
            <Field label="Declaración" value={c.declaracion} rows={4} onChange={(value) => actualizarCampoEpp("declaracion", value)} disabled={isReadOnly} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Firma trabajador" value={c.firma_trabajador} onChange={(value) => actualizarCampoEpp("firma_trabajador", value)} disabled={isReadOnly} />
              <Field label="Entregado por" value={c.entregado_por} onChange={(value) => actualizarCampoEpp("entregado_por", value)} disabled={isReadOnly} />
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  async function handleDescargarPdf() {
    if (!puedeDescargarPdf || isLoading) return;

    const documentoParaPdf = doc ?? originalDoc;
    if (!documentoParaPdf) return;

    setExportingPdf(true);
    setErrorMsg(null);

    try {
      await exportTrabajadorDocumentoPdf({
        documento: documentoParaPdf,
        trabajador: worker,
        contenido,
        estado: efectoEstado,
        firmadoPor: doc?.firmadoPor ?? originalDoc?.firmadoPor ?? null,
        firmadoEn: doc?.firmadoEn ?? originalDoc?.firmadoEn ?? null,
        empresa: empresaMeta,
      });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "No fue posible exportar el PDF");
      setPhase("error");
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleGuardar() {
    if (phase !== "idle") return;
    setPhase("saving");
    setErrorMsg(null);
    try {
      const tipo = doc?.tipo ?? originalDoc?.tipo;
      if (doc?.documentoId) {
        // Update existing document content
        await guardarContenidoIADocumento(doc.documentoId, contenido);
      } else if (tipo) {
        // Create new documento with en_revision state
        const created = await createTrabajadorDocumento({
          trabajadorId: worker.id,
          tipoDocumentoId: tipo.id,
          estado: "en_revision",
          observaciones: contenido,
          cargadoPor: worker.email,
        });
        // Update local state so buttons reflect new estado
        setLocalDoc({
          documentoId: created.id,
          tipo: tipo,
          estado: "en_revision",
          observacion: contenido,
        });
        // Refresh historial
        const h = await getHistorialDocumentoTrabajador(created.id);
        setHistorial(h);
      }
      await onUpdated?.();
      router.refresh();
      setPhase("done");
      setTimeout(() => setPhase("idle"), 1500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al guardar");
      setPhase("error");
    }
  }

  async function handleGuardarCorreccion() {
    if (phase !== "idle" || !doc?.documentoId) return;
    setPhase("saving");
    setErrorMsg(null);
    try {
      await guardarContenidoIADocumento(doc.documentoId, contenido);
      await cambiarEstadoTrabajadorDocumento(
        doc.documentoId,
        "en_revision",
        "Documento corregido tras rechazo",
      );
      await registrarHistorialDocumentoTrabajador(doc.documentoId, {
        accion: "CONTENIDO_EDITADO",
        detalle: "Documento corregido tras rechazo",
      });

      const updated = { ...doc, estado: "en_revision" as const, observacion: contenido };
      setLocalDoc(updated);
      const h = await getHistorialDocumentoTrabajador(doc.documentoId);
      setHistorial(h);
      await onUpdated?.();
      router.refresh();
      setPhase("done");
      setTimeout(() => setPhase("idle"), 1500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al guardar correccion");
      setPhase("error");
    }
  }

  async function handleRegenerarIA() {
    if (phase !== "idle" || !doc?.documentoId) return;
    setPhase("saving");
    setErrorMsg(null);
    try {
      const plantilla = getPlantilla(doc.tipo.id, doc.tipo.nombre);
      const contenidoGenerado = plantilla
        ? construirContenidoBasePlantilla(plantilla)
        : generarPlantillaContenidoIA({
            tipoNombre: doc.tipo.nombre,
            trabajadorNombre: `${worker.nombre} ${worker.apellido}`,
            trabajadorRut: worker.rut,
            cargo: worker.cargo,
          });

      await generarContenidoIATrabajadorDocumento(doc.documentoId, contenidoGenerado);
      await registrarHistorialDocumentoTrabajador(doc.documentoId, {
        accion: "CONTENIDO_EDITADO",
        detalle: "Documento regenerado con IA tras rechazo",
      });

      setContenido(contenidoGenerado);
      setEstructura(parseDocumentoEstructurado(contenidoGenerado));
      const updated = {
        ...doc,
        estado: "en_revision" as const,
        observacion: contenidoGenerado,
      };
      setLocalDoc(updated);
      const h = await getHistorialDocumentoTrabajador(doc.documentoId);
      setHistorial(h);
      await onUpdated?.();
      router.refresh();
      setPhase("done");
      setTimeout(() => setPhase("idle"), 1500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al regenerar contenido IA");
      setPhase("error");
    }
  }

  async function handleValidar() {
    if (phase !== "idle" || !doc?.documentoId) return;
    setPhase("validating");
    setErrorMsg(null);
    try {
      await validarTrabajadorDocumento(doc.documentoId, "Documento validado técnicamente");
      const updated = { ...doc, estado: "validado" as const };
      setLocalDoc(updated);
      const h = await getHistorialDocumentoTrabajador(doc.documentoId);
      setHistorial(h);
      await onUpdated?.();
      router.refresh();
      setPhase("done");
      setTimeout(() => setPhase("idle"), 1500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al validar");
      setPhase("error");
    }
  }

  async function handleEnviarFirma() {
    if (phase !== "idle" || !doc?.documentoId) return;
    setPhase("enviando");
    setErrorMsg(null);
    try {
      await enviarTrabajadorDocumentoAFirma(doc.documentoId, "Documento enviado a firma");
      const updated = { ...doc, estado: "enviado_firma" as const };
      setLocalDoc(updated);
      const h = await getHistorialDocumentoTrabajador(doc.documentoId);
      setHistorial(h);
      await onUpdated?.();
      router.refresh();
      setPhase("done");
      setTimeout(() => setPhase("idle"), 1500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al enviar a firma");
      setPhase("error");
    }
  }

  async function handleFirmar() {
    if (phase !== "idle" || !doc?.documentoId) return;
    setPhase("firmando");
    setErrorMsg(null);
    try {
      const result = await firmarTrabajadorDocumento(doc.documentoId);
      const updated = { ...doc, estado: "firmado" as const, firmadoPor: result.firmadoPor, firmadoEn: result.firmadoEn.toISOString() };
      setLocalDoc(updated);
      const h = await getHistorialDocumentoTrabajador(doc.documentoId);
      setHistorial(h);
      await onUpdated?.();
      router.refresh();
      setPhase("done");
      setTimeout(() => setPhase("idle"), 1500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al firmar");
      setPhase("error");
    }
  }

  const isLoading = phase === "saving" || phase === "validating" || phase === "enviando" || phase === "firmando";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Revisar documento: ${nombreDisplay}`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl"
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100">
              <Sparkles className="h-4 w-4 text-violet-600" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{nombreDisplay}</h2>
              <p className="text-[11px] text-slate-500">Revisión y firma de documento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <MetaRow
              icon={<User className="h-3.5 w-3.5" />}
              label="Trabajador"
              value={`${worker.nombre} ${worker.apellido}`}
            />
            <MetaRow
              icon={<Briefcase className="h-3.5 w-3.5" />}
              label="Cargo"
              value={worker.cargo}
            />
            <MetaRow
              icon={<Briefcase className="h-3.5 w-3.5" />}
              label="Área"
              value={worker.area}
            />
            <MetaRow
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Documento"
              value={nombreDisplay}
            />
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-slate-400"><Clock className="h-3.5 w-3.5" /></span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Estado</p>
                <div className="mt-0.5">{estadoBadge(efectoEstado)}</div>
              </div>
            </div>
            {/* Origen */}
            <div className="col-span-2 flex items-center gap-2 border-t border-slate-100 pt-3">
              {origen === "IA" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                  <Sparkles className="h-2.5 w-2.5" />
                  Origen: IA
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                  <FileText className="h-2.5 w-2.5" />
                  Origen: Manual
                </span>
              )}
              {doc?.fechaCarga && (
                <span className="text-[11px] text-slate-400">
                  Creado: {doc.fechaCarga}
                </span>
              )}
            </div>
          </div>

          {/* Firmado — read-only banner */}
          {efectoEstado === "firmado" && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">
                Documento firmado — solo lectura
              </span>
            </div>
          )}

          {/* Error banner */}
          {phase === "error" && errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-800">{errorMsg}</p>
            </div>
          )}

          {/* Success banner */}
          {phase === "done" && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-emerald-800">Acción completada correctamente.</span>
            </div>
          )}

          {/* Content editor */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Contenido del documento
              </label>
              {!estructura && !isReadOnly && esPlantillaEstructurable && (
                <button
                  type="button"
                  onClick={convertirLegacyAEstructura}
                  className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100"
                >
                  Convertir a formato estructurado
                </button>
              )}
            </div>

            {estructura ? (
              <div className={isLoading ? "pointer-events-none opacity-60" : ""}>
                {estructura.plantillaCodigo === "IRL"
                  ? renderIrlEditor(estructura)
                  : renderEppEditor(estructura)}
                <p className="mt-2 text-[11px] text-slate-400">
                  La edición se guarda como JSON estructurado y se usa para PDF, historial y workflow.
                </p>
              </div>
            ) : (
              <>
                <textarea
                  value={contenido}
                  onChange={(e) => !isReadOnly && setContenido(e.target.value)}
                  readOnly={isReadOnly || isLoading}
                  rows={18}
                  className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-[12px] leading-relaxed text-slate-800 transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 ${
                    isReadOnly
                      ? "cursor-not-allowed bg-slate-50 text-slate-500"
                      : "resize-y"
                  } ${isLoading ? "opacity-60" : ""}`}
                  placeholder="El contenido del documento aparecerá aquí. Puede editarlo antes de guardar o validar."
                />
                {!isReadOnly && (
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Puede editar el contenido generado antes de guardarlo o validarlo.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Historial */}
          {doc?.documentoId && (
            <div>
              <button
                onClick={() => setShowHistorial((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 transition hover:text-slate-800"
              >
                <History className="h-3.5 w-3.5" />
                {showHistorial ? "Ocultar historial" : `Ver historial (${historial.length})`}
              </button>
              {showHistorial && historial.length > 0 && (
                <ol className="mt-3 space-y-2">
                  {historial.map((h) => (
                    <li key={h.id} className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
                        <History className="h-2.5 w-2.5 text-slate-500" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-slate-700">{accionLabel(h.accion)}</p>
                        {h.detalle && <p className="text-[11px] text-slate-500">{h.detalle}</p>}
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {h.usuarioNombre ?? h.usuarioEmail ?? "Sistema"} ·{" "}
                          {new Date(h.createdAt).toLocaleString("es-CL")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {showHistorial && historial.length === 0 && (
                <p className="mt-2 text-[11px] text-slate-400">Sin historial registrado.</p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer: action buttons ─────────────────────────────────────────── */}
        <div className="border-t border-slate-100 px-6 py-4">
          {/* State-based buttons */}
          {(puedeDescargarPdf || puedeMostrarSinContenido || !isReadOnly) && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">

                {puedeDescargarPdf && (
                  <button
                    onClick={handleDescargarPdf}
                    disabled={exportingPdf || isLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {exportingPdf ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Descargar PDF
                  </button>
                )}

                {/* en_revision or initial create -> Guardar + Validar */}
                {(efectoEstado === "en_revision" || !doc?.documentoId) && (
                  <>
                    <button
                      onClick={handleGuardar}
                      disabled={isLoading || !contenido.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {phase === "saving"
                        ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        : <PenLine className="h-3.5 w-3.5" />
                      }
                      Guardar cambios
                    </button>
                    {doc?.documentoId && (
                      <button
                        onClick={handleValidar}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {phase === "validating"
                          ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          : <Shield className="h-3.5 w-3.5" />
                        }
                        Validar documento
                      </button>
                    )}
                  </>
                )}

                {/* validado → Enviar a firma */}
                {efectoEstado === "validado" && doc?.documentoId && (
                  <button
                    onClick={handleEnviarFirma}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {phase === "enviando"
                      ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      : <Send className="h-3.5 w-3.5" />
                    }
                    Enviar a firma
                  </button>
                )}

                {/* enviado_firma → Firmar */}
                {efectoEstado === "enviado_firma" && doc?.documentoId && (
                  <button
                    onClick={handleFirmar}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {phase === "firmando"
                      ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      : <CheckCircle2 className="h-3.5 w-3.5" />
                    }
                    Firmar documento
                  </button>
                )}

                {/* rechazado → corregir y volver a en_revision */}
                {efectoEstado === "rechazado" && doc?.documentoId && (
                  <>
                    <button
                      onClick={handleGuardarCorreccion}
                      disabled={isLoading || !contenido.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {phase === "saving"
                        ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        : <PenLine className="h-3.5 w-3.5" />
                      }
                      Guardar corrección
                    </button>

                    {origen === "IA" && (
                      <button
                        onClick={handleRegenerarIA}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {phase === "saving"
                          ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          : <Sparkles className="h-3.5 w-3.5" />
                        }
                        Regenerar con IA
                      </button>
                    )}
                  </>
                )}
              </div>

              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" />
                Cerrar
              </button>
            </div>
          )}

          {puedeMostrarSinContenido && (
            <p className="mt-3 text-xs text-slate-500">No hay contenido para descargar</p>
          )}

          {/* Firmado — only close */}
          {isReadOnly && !puedeDescargarPdf && (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" />
                Cerrar
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
