"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Building2,
  Users,
  ShieldCheck,
  Car,
  Paperclip,
  Download,
  FileText,
  Mail,
  Send,
  Sparkles,
  Loader2,
  Info,
  Layers,
  Calendar,
  Link2,
} from "lucide-react";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { cn } from "@/lib/utils";
import {
  ACREDITACIONES_MOCK,
  HISTORIAL_MOCK,
  generarDocumentosInstancia,
  agruparExpediente,
  calcularCompletitud,
  evaluarEstadoExpediente,
} from "../mock-data";
import type {
  DocumentoInstancia,
  EstadoDocumento,
  CategoriaRequisito,
  HistorialExpediente,
  BloqueTrabajador,
  EstadoAcreditacion,
  HistorialEstadoAcreditacion,
} from "../types";
import {
  CambiarEstadoModal,
  TRANSICIONES,
  ESTADO_CFG as ESTADO_AC_BADGE,
} from "../components/CambiarEstadoModal";

// ── Helpers ────────────────────────────────────────────────────────────

function fmt(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-CL");
}
function fmtDatetime(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

const ESTADO_DOC: Record<EstadoDocumento, { label: string; cls: string; icon: React.ReactNode }> = {
  completo: {
    label: "Completo",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  vencido: {
    label: "Vencido",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  faltante: {
    label: "Faltante",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

const CATEGORIA_CFG: Record<CategoriaRequisito, { label: string; icon: React.ReactNode; cls: string }> = {
  empresa: { label: "Empresa", icon: <Building2 className="h-4 w-4" />, cls: "text-blue-600 bg-blue-50" },
  trabajador: { label: "Trabajadores", icon: <Users className="h-4 w-4" />, cls: "text-violet-600 bg-violet-50" },
  sst: { label: "SST", icon: <ShieldCheck className="h-4 w-4" />, cls: "text-emerald-600 bg-emerald-50" },
  vehiculo: { label: "Vehículos", icon: <Car className="h-4 w-4" />, cls: "text-orange-600 bg-orange-50" },
  anexo: { label: "Anexos", icon: <Paperclip className="h-4 w-4" />, cls: "text-slate-600 bg-slate-100" },
};

const ESTADO_AC_CFG: Record<string, { label: string; cls: string }> = {
  en_preparacion: { label: "En preparación", cls: "bg-slate-100 text-slate-600 border-slate-300" },
  listo_para_enviar: { label: "Lista para enviar", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  enviado: { label: "Enviada", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  observada: { label: "Observada", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  aprobado: { label: "Aprobada", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rechazado: { label: "Rechazada", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  cerrada: { label: "Cerrada", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  vencido: { label: "Vencida", cls: "bg-orange-50 text-orange-700 border-orange-200" },
};

// ── Toast ──────────────────────────────────────────────────────────────

type ToastT = { id: number; tipo: "success" | "error" | "info"; msg: string };

function useToast() {
  const [toasts, setToasts] = useState<ToastT[]>([]);
  const push = useCallback((tipo: ToastT["tipo"], msg: string) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, tipo, msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  return { toasts, push };
}

function Toasts({ toasts }: { toasts: ToastT[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg",
            t.tipo === "success" && "bg-emerald-50 border-emerald-200 text-emerald-800",
            t.tipo === "error" && "bg-rose-50 border-rose-200 text-rose-800",
            t.tipo === "info" && "bg-blue-50 border-blue-200 text-blue-800"
          )}
        >
          {t.tipo === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
          {t.tipo === "error" && <XCircle className="h-4 w-4 text-rose-600 shrink-0" />}
          {t.tipo === "info" && <Info className="h-4 w-4 text-blue-600 shrink-0" />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Generación ZIP ────────────────────────────────────────────────────

async function generarZip(docs: DocumentoInstancia[], empresaNombre: string): Promise<void> {
  const zip = new JSZip();
  const fecha = new Date().toISOString().slice(0, 10);
  const base = `Expediente_${empresaNombre.replace(/\s/g, "_")}_${fecha}`;
  const root = zip.folder(base)!;

  const carpetas: Partial<Record<CategoriaRequisito, JSZip>> = {
    empresa: root.folder("01_Empresa")!,
    sst: root.folder("03_SST")!,
    anexo: root.folder("05_Anexos")!,
  };
  const tCarpetas: Record<string, JSZip> = {};
  const vCarpetas: Record<string, JSZip> = {};
  const tRoot = root.folder("02_Trabajadores")!;
  const vRoot = root.folder("04_Vehiculos")!;

  for (const doc of docs.filter((d) => d.estado !== "faltante")) {
    const nombre = doc.nombreArchivo ?? `${doc.nombreDocumento.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    const contenido = `[Simulado] ${doc.nombreDocumento}\nTitular: ${doc.titularNombre}\nEmisión: ${doc.fechaEmision ?? "—"}\nVencimiento: ${doc.fechaVencimiento ?? "—"}`;
    const blob = new Blob([contenido], { type: "application/pdf" });

    if (doc.categoria === "empresa" || doc.categoria === "sst" || doc.categoria === "anexo") {
      carpetas[doc.categoria]?.file(nombre, blob);
    } else if (doc.categoria === "trabajador") {
      const key = doc.titularId;
      if (!tCarpetas[key]) tCarpetas[key] = tRoot.folder(doc.titularNombre.replace(/\s/g, "_"))!;
      tCarpetas[key].file(nombre, blob);
    } else if (doc.categoria === "vehiculo") {
      const key = doc.titularId;
      if (!vCarpetas[key]) vCarpetas[key] = vRoot.folder(doc.titularNombre.replace(/[^a-zA-Z0-9]/g, "_"))!;
      vCarpetas[key].file(nombre, blob);
    }
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${base}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

function generarPDF(docs: DocumentoInstancia[], ac: { empresaNombre: string; mandante: string; plantillaNombre: string }) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const fecha = new Date().toLocaleDateString("es-CL");

  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, W, 36, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text("EXPEDIENTE DE ACREDITACIÓN", 14, 15);
  pdf.setFontSize(9.5);
  pdf.setFont("helvetica", "normal");
  pdf.text(`${ac.empresaNombre}  ·  ${ac.mandante}`, 14, 24);
  pdf.text(`Plantilla: ${ac.plantillaNombre}  ·  ${fecha}`, 14, 31);

  let y = 50;
  pdf.setTextColor(30, 41, 59);

  const categorias: CategoriaRequisito[] = ["empresa", "trabajador", "sst", "vehiculo", "anexo"];

  for (const cat of categorias) {
    const grupo = docs.filter((d) => d.categoria === cat);
    if (grupo.length === 0) continue;

    if (y > 260) { pdf.addPage(); y = 20; }

    pdf.setFillColor(241, 245, 249);
    pdf.rect(14, y - 4, W - 28, 8, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    pdf.text(CATEGORIA_CFG[cat].label.toUpperCase(), 16, y + 1);
    y += 10;

    for (const doc of grupo) {
      if (y > 270) { pdf.addPage(); y = 20; }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(30, 41, 59);
      pdf.text(doc.nombreDocumento.length > 55 ? doc.nombreDocumento.slice(0, 55) + "…" : doc.nombreDocumento, 16, y);
      pdf.setTextColor(100, 116, 139);
      pdf.text(doc.titularNombre.length > 30 ? doc.titularNombre.slice(0, 30) + "…" : doc.titularNombre, 120, y);

      const estado = { completo: "✓", vencido: "⚠", faltante: "✗" }[doc.estado];
      if (doc.estado === "completo") pdf.setTextColor(6, 95, 70);
      else if (doc.estado === "vencido") pdf.setTextColor(180, 83, 9);
      else pdf.setTextColor(190, 18, 60);
      pdf.text(estado, 175, y);
      y += 6;
    }
    y += 4;
  }

  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`PREVANTIA · Generado: ${fecha} · Página ${i}/${pages}`, 14, 290);
  }

  pdf.save(`Indice_${ac.empresaNombre.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function generarEmail(ac: { empresaNombre: string; mandante: string }, docs: DocumentoInstancia[]) {
  const incl = docs.filter((d) => d.estado !== "faltante").length;
  return `Estimado equipo ${ac.mandante},\n\nAdjunto el expediente de acreditación de ${ac.empresaNombre} (${new Date().toLocaleDateString("es-CL")}), con ${incl} documentos organizados según requisitos.\n\nQuedo atento ante cualquier consulta.\n\nSaludos,\nEquipo DICAPREV`;
}

// ── Componente BloqueDocumentos ───────────────────────────────────────

function DocRow({ doc }: { doc: DocumentoInstancia }) {
  const cfg = ESTADO_DOC[doc.estado];
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0", cfg.cls)}>
        {cfg.icon}
        {cfg.label}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={cn("text-sm font-medium leading-snug", doc.estado === "faltante" ? "text-slate-400" : "text-slate-800")}>
            {doc.nombreDocumento}
          </p>
          {!doc.obligatorio && <span className="text-[10px] font-normal text-slate-400">opcional</span>}
          {doc.fuenteBiblioteca && (
            <span
              title="Vinculado desde la Biblioteca Documental"
              className="inline-flex items-center gap-0.5 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 shrink-0"
            >
              <Link2 className="h-2.5 w-2.5" />
              Biblioteca
            </span>
          )}
        </div>
        {doc.observaciones && (
          <p className="text-[11px] text-amber-600 mt-0.5">{doc.observaciones}</p>
        )}
      </div>
      {doc.fechaVencimiento && (
        <span className={cn("text-xs shrink-0", doc.estado === "vencido" ? "text-amber-600 font-semibold" : "text-slate-400")}>
          Vence {fmt(doc.fechaVencimiento)}
        </span>
      )}
      {doc.archivoUrl && (
        <a href={doc.archivoUrl} className="shrink-0 text-blue-500 hover:text-blue-700" title="Ver documento">
          <Paperclip className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function BloqueSeccion({
  titulo,
  icon,
  iconCls,
  docs,
  defaultOpen = true,
}: {
  titulo: string;
  icon: React.ReactNode;
  iconCls: string;
  docs: DocumentoInstancia[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const completos = docs.filter((d) => d.estado === "completo").length;
  const pct = docs.length ? Math.round((completos / docs.length) * 100) : 100;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", iconCls)}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-900 text-sm">{titulo}</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">{completos}/{docs.length} completos</span>
              <span className={cn("text-xs font-bold", pct === 100 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-rose-600")}>
                {pct}%
              </span>
            </div>
          </div>
          <Progress value={pct} className="h-1 mt-1.5" />
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-4">
          {docs.map((doc) => <DocRow key={doc.id} doc={doc} />)}
          {docs.length === 0 && <p className="text-xs text-slate-400 py-2">Sin documentos en esta categoría.</p>}
        </div>
      )}
    </div>
  );
}

function BloqueTrabajadorSec({ bloque }: { bloque: BloqueTrabajador }) {
  const [open, setOpen] = useState(true);
  const completos = bloque.documentos.filter((d) => d.estado === "completo").length;
  const total = bloque.documentos.length;
  const pct = total ? Math.round((completos / total) * 100) : 100;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white transition-colors text-left"
      >
        <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm shrink-0">
          {bloque.trabajador.nombre.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900 text-sm">{bloque.trabajador.nombre}</p>
              <p className="text-[11px] text-slate-500">{bloque.trabajador.rut} · {bloque.trabajador.cargo}</p>
            </div>
            <span className={cn("text-xs font-bold", pct === 100 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-rose-600")}>
              {pct}%
            </span>
          </div>
          <Progress value={pct} className="h-1 mt-1.5" />
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-3">
          {bloque.documentos.map((doc) => <DocRow key={doc.id} doc={doc} />)}
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────

export default function ExpedientePage() {
  const params = useParams();
  const router = useRouter();
  const acId = params.id as string;

  const acreditacion = useMemo(
    () => ACREDITACIONES_MOCK.find((a) => a.id === acId),
    [acId]
  );

  const [docs] = useState(() =>
    acreditacion ? generarDocumentosInstancia(acreditacion) : []
  );

  const agrupado = useMemo(() =>
    acreditacion ? agruparExpediente(acreditacion, docs) : null,
  [acreditacion, docs]);

  const validacion = useMemo(() => evaluarEstadoExpediente(docs), [docs]);
  const pctGlobal = useMemo(() => calcularCompletitud(docs), [docs]);

  const [historial, setHistorial] = useState<HistorialExpediente[]>(
    HISTORIAL_MOCK[acId] ?? []
  );
  const [generando, setGenerando] = useState(false);
  const [estadoActual, setEstadoActual] = useState<EstadoAcreditacion>(
    (acreditacion?.estado as EstadoAcreditacion) ?? "en_preparacion"
  );
  const [historialEstados, setHistorialEstados] = useState<HistorialEstadoAcreditacion[]>(
    acreditacion?.historialEstados ?? []
  );
  const [modalCambioEstado, setModalCambioEstado] = useState<EstadoAcreditacion | null>(null);
  const { toasts, push } = useToast();

  if (!acreditacion || !agrupado) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400 text-sm">
        Acreditación no encontrada.
      </div>
    );
  }

  const addHistorial = (estado: "generado" | "enviado") => {
    setHistorial((prev) => [
      {
        id: `h-${Date.now()}`,
        acreditacionId: acId,
        fecha: new Date().toISOString(),
        generadoPor: "Prevencionista PREVANTIA",
        documentosIncluidos: docs.filter((d) => d.estado !== "faltante").length,
        estado,
      },
      ...prev,
    ]);
  };

  async function handleZip() {
    if (validacion.bloqueado) { push("error", `${validacion.faltantesOblig.length} documentos obligatorios faltantes.`); return; }
    setGenerando(true);
    try {
      await generarZip(docs, acreditacion!.empresaNombre);
      addHistorial("generado");
      push("success", "ZIP descargado correctamente.");
    } catch { push("error", "Error al generar el ZIP."); }
    finally { setGenerando(false); }
  }

  function handlePDF() {
    generarPDF(docs, { empresaNombre: acreditacion!.empresaNombre, mandante: acreditacion!.mandante, plantillaNombre: acreditacion!.plantillaNombre });
    push("success", "PDF índice generado.");
  }

  function handleEmail() {
    navigator.clipboard.writeText(generarEmail(acreditacion!, docs)).then(() => push("success", "Texto copiado al portapapeles."));
  }

  function confirmarCambioEstado(comentario: string) {
    if (!modalCambioEstado) return;
    const entrada: HistorialEstadoAcreditacion = {
      estado: modalCambioEstado,
      fecha: new Date().toISOString(),
      usuario: "Prevencionista PREVANTIA",
      ...(comentario ? { comentario } : {}),
    };
    setEstadoActual(modalCambioEstado);
    setHistorialEstados((prev) => [...prev, entrada]);
    push("success", `Estado actualizado a \u201c${ESTADO_AC_CFG[modalCambioEstado]?.label}\u201d.`);
    setModalCambioEstado(null);
  }

  const estadoVal = validacion.bloqueado
    ? { label: "Incompleto", cls: "text-rose-700 bg-rose-50 border-rose-200", icon: <XCircle className="h-4 w-4" /> }
    : validacion.advertencias > 0
    ? { label: "Con observaciones", cls: "text-amber-700 bg-amber-50 border-amber-200", icon: <AlertTriangle className="h-4 w-4" /> }
    : { label: "Listo para enviar", cls: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: <CheckCircle2 className="h-4 w-4" /> };

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Topbar */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm px-6 py-3.5">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => router.push("/dicaprev/acreditaciones")}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Acreditaciones
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-semibold text-slate-800 truncate max-w-[260px]">
              {acreditacion.empresaNombre} — {acreditacion.mandante}
            </span>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", ESTADO_AC_CFG[estadoActual]?.cls ?? "")}>
            {ESTADO_AC_CFG[estadoActual]?.label}
          </span>
        </div>
      </div>

      {/* Layout 3 columnas */}
      <div className="max-w-screen-xl mx-auto px-4 lg:px-6 py-6 grid gap-5 lg:grid-cols-[260px_1fr_270px]">

        {/* ── Columna izquierda ── */}
        <aside className="flex flex-col gap-4">
          {/* Resumen empresa */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-3.5">
            <Field label="Empresa" value={acreditacion.empresaNombre} />
            <Field label="Mandante" value={acreditacion.mandante} />
            <Field label="Tipo" value={acreditacion.tipo.replace(/_/g, " ")} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Estado</p>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", ESTADO_AC_CFG[estadoActual]?.cls ?? "")}>
                {ESTADO_AC_CFG[estadoActual]?.label}
              </span>
              {TRANSICIONES[estadoActual]?.length > 0 && (
                <SidebarEstadoSelector
                  estadoActual={estadoActual}
                  onSelect={setModalCambioEstado}
                />
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Plantilla aplicada</p>
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <p className="text-xs font-medium text-slate-700 leading-snug">{acreditacion.plantillaNombre}</p>
              </div>
            </div>
          </div>

          {/* Completitud */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Completitud global</p>
            <div className="flex items-center gap-3">
              <div className={cn("h-14 w-14 shrink-0 rounded-full flex items-center justify-center text-lg font-bold",
                pctGlobal >= 80 ? "bg-emerald-100 text-emerald-700" : pctGlobal >= 50 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700")}>
                {pctGlobal}%
              </div>
              <div className="flex-1 space-y-1">
                <Progress value={pctGlobal} className="h-2" />
                <p className="text-[11px] text-slate-500">Documentos obligatorios</p>
              </div>
            </div>
            <div className="divide-y divide-slate-100 text-sm">
              {[
                { label: "Completos", val: docs.filter((d) => d.estado === "completo").length, cls: "text-emerald-600" },
                { label: "Vencidos", val: docs.filter((d) => d.estado === "vencido").length, cls: "text-amber-600" },
                { label: "Faltantes", val: docs.filter((d) => d.estado === "faltante").length, cls: "text-rose-600" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between py-2">
                  <span className={row.cls}>{row.label}</span>
                  <span className="font-semibold text-slate-800">{row.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trabajadores */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Trabajadores ({acreditacion.trabajadores.length})
            </p>
            <ul className="space-y-2.5">
              {acreditacion.trabajadores.map((t) => (
                <li key={t.id} className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {t.nombre.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 leading-tight">{t.nombre}</p>
                    <p className="text-[11px] text-slate-500">{t.cargo}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Vehículos */}
          {acreditacion.vehiculos.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Vehículos ({acreditacion.vehiculos.length})
              </p>
              <ul className="space-y-2.5">
                {acreditacion.vehiculos.map((v) => (
                  <li key={v.id} className="flex items-center gap-2.5">
                    <Car className="h-4 w-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{v.modelo}</p>
                      <p className="text-[11px] text-slate-500">{v.patente}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Historial */}
          {historial.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Historial</p>
              <ul className="space-y-3">
                {historial.map((h) => (
                  <li key={h.id} className="text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-700">{fmtDatetime(h.fecha)}</span>
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium border", h.estado === "enviado" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200")}>
                        {h.estado === "enviado" ? "Enviado" : "Generado"}
                      </span>
                    </div>
                    <p className="text-slate-400">{h.documentosIncluidos} docs · {h.generadoPor}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* ── Columna central — documentos agrupados ── */}
        <main className="flex flex-col gap-4 min-w-0">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest px-1">
            Documentos por categoría · {docs.length} totales
          </p>

          {/* Empresa */}
          {agrupado.empresa.length > 0 && (
            <BloqueSeccion
              titulo="Documentos empresa"
              icon={<Building2 className="h-4 w-4" />}
              iconCls="bg-blue-50 text-blue-600"
              docs={agrupado.empresa}
            />
          )}

          {/* Trabajadores — agrupado por persona */}
          {agrupado.trabajadores.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-violet-50 text-violet-600 shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">Trabajadores</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {agrupado.trabajadores.length} persona{agrupado.trabajadores.length !== 1 ? "s" : ""} · {agrupado.trabajadores.reduce((a, b) => a + b.documentos.length, 0)} documentos
                  </p>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {agrupado.trabajadores.map((bloque) => (
                  <BloqueTrabajadorSec key={bloque.trabajador.id} bloque={bloque} />
                ))}
              </div>
            </div>
          )}

          {/* SST */}
          {agrupado.sst.length > 0 && (
            <BloqueSeccion
              titulo="Seguridad y Salud en el Trabajo (SST)"
              icon={<ShieldCheck className="h-4 w-4" />}
              iconCls="bg-emerald-50 text-emerald-600"
              docs={agrupado.sst}
            />
          )}

          {/* Vehículos */}
          {agrupado.vehiculos.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-orange-50 text-orange-600 shrink-0">
                  <Car className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">Vehículos / Equipos</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {agrupado.vehiculos.length} vehículo{agrupado.vehiculos.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {agrupado.vehiculos.map((bloque) => (
                  <BloqueTrabajadorSec key={bloque.trabajador.id} bloque={bloque} />
                ))}
              </div>
            </div>
          )}

          {/* Anexos */}
          {agrupado.anexos.length > 0 && (
            <BloqueSeccion
              titulo="Anexos adicionales"
              icon={<Paperclip className="h-4 w-4" />}
              iconCls="bg-slate-100 text-slate-600"
              docs={agrupado.anexos}
              defaultOpen={false}
            />
          )}
        </main>

        {/* ── Columna derecha — validaciones + acciones ── */}
        <aside className="flex flex-col gap-4">
          {/* Estado expediente */}
          <div className={cn("rounded-2xl border p-5 space-y-2", estadoVal.cls)}>
            <div className="flex items-center gap-2 font-semibold text-sm">
              {estadoVal.icon}
              {estadoVal.label}
            </div>
            <p className="text-[12px] opacity-80">
              {validacion.bloqueado
                ? `${validacion.faltantesOblig.length} documento(s) obligatorio(s) sin cargar.`
                : validacion.advertencias > 0
                ? `${validacion.advertencias} documento(s) vencido(s).`
                : "Todos los documentos obligatorios están completos y vigentes."}
            </p>
          </div>

          {/* Validaciones detalle */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Validaciones</p>

            {validacion.faltantesOblig.length === 0 ? (
              <Row icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />} text="Sin faltantes obligatorios" cls="text-emerald-700" />
            ) : (
              validacion.faltantesOblig.slice(0, 5).map((d) => (
                <Row key={d.id} icon={<XCircle className="h-3.5 w-3.5 text-rose-500" />} text={`${d.nombreDocumento} — ${d.titularNombre}`} cls="text-rose-700" />
              ))
            )}

            {validacion.vencidosOblig.length > 0 && (
              <>
                <div className="pt-1" />
                {validacion.vencidosOblig.slice(0, 4).map((d) => (
                  <Row key={d.id} icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />} text={`Vencido: ${d.nombreDocumento}`} cls="text-amber-700" />
                ))}
              </>
            )}

            {validacion.listoParaEnviar && (
              <Row icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />} text="Todos los documentos OK" cls="text-emerald-700" />
            )}
          </div>

          {/* Acciones */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Acciones</p>

            <Button
              onClick={async () => { await handleZip(); if (!validacion.bloqueado) handlePDF(); }}
              disabled={generando || validacion.bloqueado}
              className="w-full rounded-xl h-10 bg-slate-900 hover:bg-slate-800 text-white text-sm"
            >
              {generando
                ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Generando…</span>
                : <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Generar expediente</span>}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleZip} disabled={generando || validacion.bloqueado} className="rounded-xl text-sm h-9">
                <Download className="h-4 w-4 mr-1.5" />ZIP
              </Button>
              <Button variant="outline" onClick={handlePDF} className="rounded-xl text-sm h-9">
                <FileText className="h-4 w-4 mr-1.5" />PDF
              </Button>
            </div>

            <Button variant="outline" onClick={handleEmail} className="w-full rounded-xl text-sm h-9 justify-start">
              <Mail className="h-4 w-4 mr-1.5 text-slate-500" />Copiar texto correo
            </Button>

            <Button
              variant="outline"
              onClick={() => setModalCambioEstado(TRANSICIONES[estadoActual]?.[0] ?? null)}
              disabled={TRANSICIONES[estadoActual]?.length === 0}
              className="w-full rounded-xl text-sm h-9 justify-start"
            >
              <Send className="h-4 w-4 mr-1.5 text-slate-500" />
              Cambiar estado…
            </Button>
            {TRANSICIONES[estadoActual]?.length > 1 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estados disponibles</p>
                {TRANSICIONES[estadoActual].map((e) => {
                  const cfg = ESTADO_AC_BADGE[e];
                  return (
                    <button
                      key={e}
                      onClick={() => setModalCambioEstado(e)}
                      className={cn(
                        "w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors hover:opacity-80",
                        cfg?.badgeCls ?? "bg-slate-50 border-slate-200 text-slate-700"
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full shrink-0", cfg?.dotCls ?? "bg-slate-400")} />
                      {cfg?.label ?? e}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info rápida */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Resumen</p>
            <div className="space-y-2 text-sm">
              <MiniRow label="Total docs" val={String(docs.length)} />
              <MiniRow label="Requisitos plantilla" val={String(ACREDITACIONES_MOCK.find((a) => a.id === acId) ? docs.length : "—")} />
              <MiniRow label="Trabajadores" val={String(acreditacion.trabajadores.length)} />
              {acreditacion.vehiculos.length > 0 && <MiniRow label="Vehículos" val={String(acreditacion.vehiculos.length)} />}
              <MiniRow label="Actualizado" val={fmt(acreditacion.actualizadoEl)} />
            </div>
          </div>
        </aside>
      </div>

      <Toasts toasts={toasts} />

      {/* Modal de cambio de estado */}
      {modalCambioEstado && (
        <CambiarEstadoModal
          open
          estadoActual={estadoActual}
          estadoNuevo={modalCambioEstado}
          empresaNombre={acreditacion.empresaNombre}
          mandante={acreditacion.mandante}
          onConfirmar={confirmarCambioEstado}
          onCerrar={() => setModalCambioEstado(null)}
        />
      )}
    </div>
  );
}

// ── Auxiliares pequeños ───────────────────────────────────────────────

function SidebarEstadoSelector({
  estadoActual,
  onSelect,
}: {
  estadoActual: EstadoAcreditacion;
  onSelect: (e: EstadoAcreditacion) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const transiciones = TRANSICIONES[estadoActual] ?? [];

  return (
    <div className="relative mt-2">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-full text-[11px] text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-2 py-1.5 transition-colors text-left flex items-center gap-1.5"
      >
        <ChevronDown className="h-3 w-3 shrink-0" />
        Cambiar estado…
      </button>
      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-44 bg-white rounded-xl border border-slate-200 shadow-lg py-1 overflow-hidden">
            <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Cambiar a
            </p>
            {transiciones.map((e) => {
              const c = ESTADO_AC_BADGE[e];
              return (
                <button
                  key={e}
                  onClick={() => {
                    setAbierto(false);
                    onSelect(e);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span className={cn("h-2 w-2 rounded-full shrink-0", c?.dotCls ?? "bg-slate-400")} />
                  {c?.label ?? e}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Row({ icon, text, cls }: { icon: React.ReactNode; text: string; cls: string }) {
  return (
    <div className={cn("flex items-start gap-2 text-[12px]", cls)}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="leading-snug">{text}</span>
    </div>
  );
}

function MiniRow({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{val}</span>
    </div>
  );
}
