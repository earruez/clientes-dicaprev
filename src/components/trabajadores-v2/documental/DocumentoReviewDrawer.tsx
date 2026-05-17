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
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
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
  const updateRow = (index: number, patch: Partial<EppItem>) => {
    const next = rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row));
    onChange(next);
  };
  const addRow = () => onChange([...rows, { descripcion: "", marca: "", modelo: "", color_talla: "", fecha_entrega: "", si: true, no: false, observaciones: "" }]);
  const removeRow = (index: number) => onChange(rows.filter((_, rowIndex) => rowIndex !== index));

  return (
    <SectionCard title="Tabla de EPP">
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-100 text-[11px] uppercase tracking-[0.08em] text-slate-600">
              <th className="border border-slate-200 px-3 py-2">Descripción</th>
              <th className="border border-slate-200 px-3 py-2">Marca</th>
              <th className="border border-slate-200 px-3 py-2">Modelo</th>
              <th className="border border-slate-200 px-3 py-2">Color/Talla</th>
              <th className="border border-slate-200 px-3 py-2">Fecha entrega</th>
              <th className="border border-slate-200 px-3 py-2">SI</th>
              <th className="border border-slate-200 px-3 py-2">NO</th>
              <th className="border border-slate-200 px-3 py-2">Observaciones</th>
              <th className="border border-slate-200 px-3 py-2">Acción</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.descripcion}-${index}`}>
                <td className="border border-slate-200 p-2"><input className="w-full rounded-lg border border-slate-200 px-2 py-1" value={row.descripcion} onChange={(e) => updateRow(index, { descripcion: e.target.value })} disabled={disabled} /></td>
                <td className="border border-slate-200 p-2"><input className="w-full rounded-lg border border-slate-200 px-2 py-1" value={row.marca} onChange={(e) => updateRow(index, { marca: e.target.value })} disabled={disabled} /></td>
                <td className="border border-slate-200 p-2"><input className="w-full rounded-lg border border-slate-200 px-2 py-1" value={row.modelo} onChange={(e) => updateRow(index, { modelo: e.target.value })} disabled={disabled} /></td>
                <td className="border border-slate-200 p-2"><input className="w-full rounded-lg border border-slate-200 px-2 py-1" value={row.color_talla} onChange={(e) => updateRow(index, { color_talla: e.target.value })} disabled={disabled} /></td>
                <td className="border border-slate-200 p-2"><input type="date" className="w-full rounded-lg border border-slate-200 px-2 py-1" value={row.fecha_entrega} onChange={(e) => updateRow(index, { fecha_entrega: e.target.value })} disabled={disabled} /></td>
                <td className="border border-slate-200 p-2">
                  <input type="checkbox" checked={row.si} disabled={disabled} onChange={(e) => updateRow(index, { si: e.target.checked, no: !e.target.checked })} />
                </td>
                <td className="border border-slate-200 p-2"><input type="checkbox" checked={row.no} disabled={disabled} onChange={(e) => updateRow(index, { no: e.target.checked, si: !e.target.checked })} /></td>
                <td className="border border-slate-200 p-2"><input className="w-full rounded-lg border border-slate-200 px-2 py-1" value={row.observaciones} onChange={(e) => updateRow(index, { observaciones: e.target.value })} disabled={disabled} /></td>
                <td className="border border-slate-200 p-2"><button type="button" onClick={() => removeRow(index)} disabled={disabled} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50">Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addRow} disabled={disabled} className="mt-3 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50">Agregar fila</button>
    </SectionCard>
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
        <SectionCard title="Encabezado" action={renderSectionIABtn("encabezado")}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Empresa" value={c.empresa_nombre} onChange={(value) => actualizarCampoIrl("empresa_nombre", value)} disabled={isReadOnly} />
            <Field label="Código documento" value={c.codigo_documento} onChange={(value) => actualizarCampoIrl("codigo_documento", value)} disabled={isReadOnly} />
            <Field label="Versión" value={c.version} onChange={(value) => actualizarCampoIrl("version", value)} disabled={isReadOnly} />
            <Field label="Cargo" value={c.cargo} onChange={(value) => actualizarCampoIrl("cargo", value)} disabled={isReadOnly} />
            <Field label="Año" value={c.anio} onChange={(value) => actualizarCampoIrl("anio", value)} disabled={isReadOnly} />
            <Field label="Tipo inducción" value={c.tipo_induccion} onChange={(value) => actualizarCampoIrl("tipo_induccion", value)} disabled={isReadOnly} />
            <Field label="Modalidad" value={c.modalidad} onChange={(value) => actualizarCampoIrl("modalidad", value)} disabled={isReadOnly} />
            <Field label="Tipo actividad" value={c.tipo_actividad} onChange={(value) => actualizarCampoIrl("tipo_actividad", value)} disabled={isReadOnly} />
            <Field label="Trabajador" value={c.trabajador_nombre} onChange={(value) => actualizarCampoIrl("trabajador_nombre", value)} disabled={isReadOnly} />
            <Field label="RUT" value={c.trabajador_rut} onChange={(value) => actualizarCampoIrl("trabajador_rut", value)} disabled={isReadOnly} />
            <Field label="Trabajador cargo" value={c.trabajador_cargo} onChange={(value) => actualizarCampoIrl("trabajador_cargo", value)} disabled={isReadOnly} />
            <Field label="Trabajador área" value={c.trabajador_area} onChange={(value) => actualizarCampoIrl("trabajador_area", value)} disabled={isReadOnly} />
            <Field label="Fecha" type="date" value={c.fecha} onChange={(value) => actualizarCampoIrl("fecha", value)} disabled={isReadOnly} />
            <Field label="Teléfono emergencia" value={c.telefono_emergencia} onChange={(value) => actualizarCampoIrl("telefono_emergencia", value)} disabled={isReadOnly} />
          </div>
        </SectionCard>

        <SectionCard title="Lugar y condiciones" action={renderSectionIABtn("lugar_trabajo")}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Lugar de trabajo" value={c.lugar_trabajo} onChange={(value) => actualizarCampoIrl("lugar_trabajo", value)} disabled={isReadOnly} />
            <Field label="Espacio de trabajo" value={c.espacio_trabajo} rows={3} onChange={(value) => actualizarCampoIrl("espacio_trabajo", value)} disabled={isReadOnly} />
            <Field label="Condiciones ambientales" value={c.condiciones_ambientales} rows={3} onChange={(value) => actualizarCampoIrl("condiciones_ambientales", value)} disabled={isReadOnly} />
            <Field label="Orden y aseo" value={c.orden_aseo} rows={3} onChange={(value) => actualizarCampoIrl("orden_aseo", value)} disabled={isReadOnly} />
          </div>
        </SectionCard>

        <SectionCard title="Riesgos generales" action={renderSectionIABtn("riesgos_generales")}>
          <RiskTableEditor rows={c.riesgos_generales_tabla} onChange={(next) => actualizarCampoIrl("riesgos_generales_tabla", next)} disabled={isReadOnly} />
        </SectionCard>

        <SectionCard title="Riesgos específicos" action={renderSectionIABtn("riesgos_especificos")}>
          <RiskTableEditor rows={c.riesgos_especificos_tabla} onChange={(next) => actualizarCampoIrl("riesgos_especificos_tabla", next)} disabled={isReadOnly} />
        </SectionCard>

        <SectionCard title="Normativa y documentos" action={renderSectionIABtn("normativa")}>
          <div className="space-y-3">
            <Field label="Normas generales" value={c.normas_generales} rows={4} onChange={(value) => actualizarCampoIrl("normas_generales", value)} disabled={isReadOnly} />
            <Field label="Protocolos MINSAL" value={c.protocolos_minsal} rows={4} onChange={(value) => actualizarCampoIrl("protocolos_minsal", value)} disabled={isReadOnly} />
            <Field label="Documentos asociados" value={c.documentos_asociados} rows={4} onChange={(value) => actualizarCampoIrl("documentos_asociados", value)} disabled={isReadOnly} />
          </div>
        </SectionCard>

        <SectionCard title="Declaración y firmas" action={renderSectionIABtn("cierre")}>
          <div className="space-y-3">
            <Field label="Declaración" value={c.declaracion} rows={4} onChange={(value) => actualizarCampoIrl("declaracion", value)} disabled={isReadOnly} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Firma trabajador" value={c.firma_trabajador} onChange={(value) => actualizarCampoIrl("firma_trabajador", value)} disabled={isReadOnly} />
              <Field label="Firma relator" value={c.firma_relator} onChange={(value) => actualizarCampoIrl("firma_relator", value)} disabled={isReadOnly} />
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
