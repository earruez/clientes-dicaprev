"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Download, FileSearch, FileText, FolderKanban, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoriaDocumento, DocumentoMatrizRow, EstadoDocumento, TabDocumentacion } from "./types";
import { useDocumentos } from "./hooks/useDocumentos";
import TableView from "./components/TableView";
import Filtros from "./components/Filtros";
import { DOCUMENTO_ACCEPT, DOCUMENTO_TIPOS_LABEL, MAX_DOCUMENTO_FILE_SIZE, formatDocumentoPeso } from "@/lib/documentacion/archivo-documento";
import { exportarInformeDocumentalPdf } from "@/lib/documentacion/export-informe-documental-pdf";
import { usePermissions } from "@/lib/permissions";
import { guardarDocumentoGeneradoPDF } from "@/lib/documentacion/registro-documento-generado-client";

type ArchivoSubido = {
  archivoNombre: string;
  archivoNombreOriginal: string;
  archivoUrl: string;
  archivoTipo: string | null;
  archivoPeso: number;
};

export default function DocumentacionPage() {
  const router = useRouter();
  const isProductionBuild = process.env.NODE_ENV === "production";
  const {
    usuarioActual,
    dotacion,
    documentos,
    tabActiva,
    setTabActiva,
    filtrados,
    filtros,
    setFiltros,
    historialGlobal,
    kpis,
    alertasResumen,
    addDocumento,
    replaceDocumentoArchivo,
    updateDocumentoMetadatos,
    marcarDocumentoNoAplica,
    marcarDocumentoAplica,
    restaurarDocumentoVersion,
    validarDocumento,
    enviarDocumentoAFirma,
    firmarDocumento,
    descargarInformeDocumental,
  } = useDocumentos();
  const { hasPermission } = usePermissions();
  const canManageDocumentacion = hasPermission("canManageDocumentacion");

  const [openAdditional, setOpenAdditional] = useState(false);
  const [openReplace, setOpenReplace] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentoMatrizRow | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [infoType, setInfoType] = useState<"success" | "error">("success");
  const infoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showInfo(message: string, type: "success" | "error" = "success") {
    if (infoDismissRef.current) clearTimeout(infoDismissRef.current);
    setInfoMessage(message);
    setInfoType(type);
    infoDismissRef.current = setTimeout(() => setInfoMessage(null), 5000);
  }

  const [additionalForm, setAdditionalForm] = useState({
    nombre: "",
    categoria: "legales_empresa" as CategoriaDocumento,
    tipo: "",
    archivoNombre: "",
    fechaEmision: "",
    fechaVencimiento: "",
    tieneVencimiento: true,
    observaciones: "",
    estado: "Pendiente de carga" as EstadoDocumento,
    version: "1.0",
  });

  const [replaceForm, setReplaceForm] = useState({
    version: "",
    observaciones: "",
  });
  const [additionalFile, setAdditionalFile] = useState<File | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloadingInforme, setIsDownloadingInforme] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [replacePreviewUrl, setReplacePreviewUrl] = useState<string | null>(null);
  const [historyBusyId, setHistoryBusyId] = useState<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const tabs: Array<{ key: TabDocumentacion; label: string }> = [
    { key: "todos", label: "Todos" },
    { key: "legales_empresa", label: "Legales empresa" },
    { key: "laborales_previsionales", label: "Laborales y previsionales" },
    { key: "sst", label: "Seguridad y salud en el trabajo" },
    { key: "mutualidad_ley_16744", label: "Mutualidad / Ley 16.744" },
    { key: "protocolos", label: "Protocolos" },
    { key: "plantillas_formatos", label: "Plantillas y formatos" },
    { key: "historial", label: "Historial" },
  ];

  const selectedHistory = useMemo(() => {
    if (!selectedDoc) return [];
    return [...selectedDoc.historial].sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [selectedDoc]);

  const selectedVersiones = useMemo(() => {
    if (!selectedDoc) return [];

    const currentKey = [selectedDoc.version ?? "", selectedDoc.archivoUrl ?? "", selectedDoc.archivoNombre ?? ""].join("::");
    const historicos = new Map<string, {
      id: string;
      isCurrent: false;
      fecha: string;
      version: string | null;
      archivoUrl: string | null;
      archivoNombre: string | null;
      archivoNombreOriginal: string | null;
      archivoTipo: string | null;
      archivoPeso: number | null;
      detalle: string;
    }>();

    for (const item of selectedHistory) {
      if (!item.archivoUrl) continue;
      const key = [item.version ?? "", item.archivoUrl ?? "", item.archivoNombre ?? ""].join("::");
      if (key === currentKey || historicos.has(key)) continue;
      historicos.set(key, {
        id: item.id,
        isCurrent: false,
        fecha: item.fecha,
        version: item.version ?? null,
        archivoUrl: item.archivoUrl ?? null,
        archivoNombre: item.archivoNombre ?? null,
        archivoNombreOriginal: item.archivoNombreOriginal ?? null,
        archivoTipo: item.archivoTipo ?? null,
        archivoPeso: item.archivoPeso ?? null,
        detalle: item.detalle,
      });
    }

    return [
      {
        id: `current-${selectedDoc.id}`,
        isCurrent: true as const,
        fecha: selectedDoc.fechaActualizacion ?? selectedDoc.fechaSubida ?? new Date().toISOString(),
        version: selectedDoc.version,
        archivoUrl: selectedDoc.archivoUrl,
        archivoNombre: selectedDoc.archivoNombre,
        archivoNombreOriginal: selectedDoc.archivoNombreOriginal ?? null,
        archivoTipo: selectedDoc.archivoTipo,
        archivoPeso: selectedDoc.archivoPeso,
        detalle: "Versión vigente del documento.",
      },
      ...Array.from(historicos.values()).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    ];
  }, [selectedDoc, selectedHistory]);

  useEffect(() => {
    if (!replaceFile) {
      setReplacePreviewUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(replaceFile);
    setReplacePreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [replaceFile]);

  const hasActiveFilters =
    filtros.categoria !== "todas" ||
    filtros.estado !== "todos" ||
    filtros.vigencia !== "todas" ||
    filtros.search.trim() !== "" ||
    filtros.subidoPor.trim() !== "" ||
    filtros.fechaSubida.trim() !== "";

  function categoryLabel(value: CategoriaDocumento) {
    return {
      legales_empresa: "Legales empresa",
      laborales_previsionales: "Laborales y previsionales",
      sst: "Seguridad y salud en el trabajo",
      mutualidad_ley_16744: "Mutualidad / Ley 16.744",
      protocolos: "Protocolos",
      plantillas_formatos: "Plantillas y formatos",
    }[value];
  }

  async function handleCreateAdditional() {
    if (!canManageDocumentacion) {
      showInfo("No tienes permisos para crear documentos adicionales.", "error");
      return;
    }
    if (!additionalForm.nombre.trim()) {
      showInfo("Debes completar el nombre del documento adicional.", "error");
      return;
    }
    if (additionalForm.tieneVencimiento && !additionalForm.fechaVencimiento) {
      showInfo("Si el documento tiene vencimiento, debes ingresar la fecha de vencimiento.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const archivoSubido = additionalFile ? await subirArchivo(additionalFile) : null;

      const ok = await addDocumento({
        nombre: additionalForm.nombre,
        categoria: additionalForm.categoria,
        tipo: additionalForm.tipo,
        archivoNombre: archivoSubido?.archivoNombre,
        archivoNombreOriginal: archivoSubido?.archivoNombreOriginal,
        archivoUrl: archivoSubido?.archivoUrl,
        archivoTipo: archivoSubido?.archivoTipo,
        archivoPeso: archivoSubido?.archivoPeso ?? null,
        fechaEmision: additionalForm.fechaEmision,
        fechaVencimiento: additionalForm.tieneVencimiento ? additionalForm.fechaVencimiento : null,
        tieneVencimiento: additionalForm.tieneVencimiento,
        observaciones: additionalForm.observaciones,
        estado: additionalForm.estado,
        version: additionalForm.version,
        documentoRequeridoId: null,
      });

      if (!ok) {
        showInfo("No se pudo guardar el documento adicional.", "error");
        return;
      }

      showInfo("Documento adicional creado correctamente.", "success");
      setOpenAdditional(false);
      setAdditionalFile(null);
      setAdditionalForm({
        nombre: "",
        categoria: "legales_empresa",
        tipo: "",
        archivoNombre: "",
        fechaEmision: "",
        fechaVencimiento: "",
        tieneVencimiento: true,
        observaciones: "",
        estado: "Pendiente de carga",
        version: "1.0",
      });
    } catch (error) {
      showInfo(error instanceof Error ? error.message : "No se pudo cargar el archivo.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReplace() {
    if (!canManageDocumentacion) {
      showInfo("No tienes permisos para modificar documentos.", "error");
      return;
    }
    if (!selectedDoc) {
      showInfo("Selecciona un documento para cargar/reemplazar.", "error");
      return;
    }

    if (!replaceFile) {
      showInfo("Debes seleccionar un archivo para cargar o reemplazar.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const archivoSubido = await subirArchivo(replaceFile);

      const ok = await replaceDocumentoArchivo({
        documentoId: selectedDoc.documentoEmpresaId,
        documentoRequeridoId: selectedDoc.documentoRequeridoId,
        archivoNombre: archivoSubido.archivoNombre,
        archivoNombreOriginal: archivoSubido.archivoNombreOriginal,
        archivoUrl: archivoSubido.archivoUrl,
        archivoTipo: archivoSubido.archivoTipo,
        archivoPeso: archivoSubido.archivoPeso,
        version: replaceForm.version || selectedDoc.version || "1.0",
        observaciones: replaceForm.observaciones,
      });

      if (!ok) {
        showInfo("No se pudo registrar la carga/reemplazo.", "error");
        return;
      }

      showInfo("Archivo subido correctamente.", "success");
      setOpenReplace(false);
      setReplaceFile(null);
      setReplaceForm({ version: "", observaciones: "" });
    } catch (error) {
      showInfo(error instanceof Error ? error.message : "No se pudo cargar el archivo.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditMetadata() {
    if (!canManageDocumentacion) {
      showInfo("No tienes permisos para editar metadatos.", "error");
      return;
    }
    if (!selectedDoc) return;

    const ok = await updateDocumentoMetadatos({
      documentoId: selectedDoc.documentoEmpresaId,
      documentoRequeridoId: selectedDoc.documentoRequeridoId,
      nombre: selectedDoc.nombre,
      categoria: selectedDoc.categoria,
      tipo: selectedDoc.tipo,
      estado: selectedDoc.estado,
      fechaEmision: selectedDoc.fechaEmision,
      fechaVencimiento: selectedDoc.tieneVencimiento ? selectedDoc.fechaVencimiento : null,
      tieneVencimiento: selectedDoc.tieneVencimiento,
      observaciones: selectedDoc.observaciones,
      version: selectedDoc.version || "1.0",
      archivoNombre: selectedDoc.ultimoArchivo || undefined,
    });

    showInfo(ok ? "Metadatos actualizados correctamente." : "No se pudieron actualizar metadatos.", ok ? "success" : "error");
    setOpenEdit(false);
  }

  function handleDownload(doc: DocumentoMatrizRow) {
    if (!doc.archivoUrl) {
      showInfo("Descarga deshabilitada: aún no existe archivo real almacenado.", "error");
      return;
    }
    const link = document.createElement("a");
    link.href = doc.archivoUrl;
    link.download = doc.archivoNombreOriginal ?? doc.archivoNombre ?? "documento";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function handleDownloadHistorial(item: { archivoUrl: string | null; archivoNombreOriginal: string | null; archivoNombre: string | null }) {
    if (!item.archivoUrl) {
      showInfo("Esta versión histórica no tiene archivo disponible para descarga.", "error");
      return;
    }
    const link = document.createElement("a");
    link.href = item.archivoUrl;
    link.download = item.archivoNombreOriginal ?? item.archivoNombre ?? "documento-version";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function handleOpenDocument(doc: DocumentoMatrizRow) {
    if (!doc.archivoUrl) {
      showInfo("Aún no existe un archivo cargado para este documento.", "error");
      return;
    }
    window.open(doc.archivoUrl, "_blank", "noopener,noreferrer");
  }

  async function handleRestoreVersion(historialId: string) {
    if (!canManageDocumentacion) {
      showInfo("No tienes permisos para restaurar versiones.", "error");
      return;
    }
    if (!selectedDoc?.documentoEmpresaId) {
      showInfo("No se encontró el documento actual para restaurar la versión.", "error");
      return;
    }

    setHistoryBusyId(historialId);
    try {
      const ok = await restaurarDocumentoVersion(selectedDoc.documentoEmpresaId, historialId);
      showInfo(ok ? "Versión histórica restaurada correctamente." : "No se pudo restaurar la versión.", ok ? "success" : "error");
      setOpenHistory(false);
    } catch (error) {
      showInfo(error instanceof Error ? error.message : "No se pudo restaurar la versión.", "error");
    } finally {
      setHistoryBusyId(null);
    }
  }

  async function subirArchivo(file: File): Promise<ArchivoSubido> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/dicaprev/documentacion/upload", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as ArchivoSubido | { error?: string };
    if (!response.ok) {
      throw new Error("error" in payload && payload.error ? payload.error : "No se pudo guardar el archivo.");
    }

    return payload as ArchivoSubido;
  }

  function canPreviewInline(doc: DocumentoMatrizRow) {
    if (!doc.archivoUrl || !doc.archivoTipo) return false;
    return doc.archivoTipo === "application/pdf" || doc.archivoTipo.startsWith("image/");
  }

  function openReplaceDialog(doc: DocumentoMatrizRow) {
    if (!canManageDocumentacion) return;
    setSelectedDoc(doc);
    setReplaceForm({
      version: doc.version ?? "1.0",
      observaciones: doc.observaciones,
    });
    setReplaceFile(null);
    setIsDragOver(false);
    setOpenReplace(true);
  }

  function pickReplaceFile(file: File | null) {
    if (!file) return;
    setReplaceFile(file);
  }

  function openHistoryDialog(doc: DocumentoMatrizRow) {
    setSelectedDoc(doc);
    setOpenHistory(true);
  }

  function openEditDialog(doc: DocumentoMatrizRow) {
    if (!canManageDocumentacion) return;
    setSelectedDoc({ ...doc });
    setOpenEdit(true);
  }

  function openViewDialog(doc: DocumentoMatrizRow) {
    setSelectedDoc(doc);
    setOpenView(true);
  }

  async function handleDownloadInformeDocumental() {
    try {
      setIsDownloadingInforme(true);
      const informe = await descargarInformeDocumental();
      const content = JSON.stringify(informe, null, 2);
      const blob = new Blob([content], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const empresaSafe = (informe.empresa.nombre || "empresa").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const stamp = new Date().toISOString().slice(0, 10);
      const filename = `informe-documental-${empresaSafe || "empresa"}-${stamp}.json`;

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      showInfo("Informe documental descargado correctamente.", "success");
    } catch {
      showInfo("No se pudo generar el informe documental.", "error");
    } finally {
      setIsDownloadingInforme(false);
    }
  }

  async function handleDownloadInformeDocumentalPdf() {
    try {
      setIsDownloadingPdf(true);
      const informe = await descargarInformeDocumental();
      const pdf = await exportarInformeDocumentalPdf(informe);
      const empresaSafe = (informe.empresa.nombre || "empresa").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const stamp = new Date().toISOString().slice(0, 10);
      const filename = `informe-documental-${empresaSafe || "empresa"}-${stamp}.pdf`;
      await guardarDocumentoGeneradoPDF({
        empresaId: informe.empresa.id,
        modulo: "documentacion",
        tipoDocumento: "informe_documental_pdf",
        entidadTipo: "informe_documental_empresa",
        entidadId: informe.empresa.id,
        nombre: `Informe documental ${informe.empresa.nombre}`,
        blob: pdf,
        filename,
        version: informe.meta.version,
        estado: informe.cumplimiento.totalFaltantes > 0 ? "con_observaciones" : "completo",
        historialDetalle: "Documento generado automáticamente",
        metadata: {
          version: informe.meta.version,
          generadoEn: informe.meta.generadoEn,
          totalAplicables: informe.cumplimiento.totalAplicables,
          totalCumple: informe.cumplimiento.totalCumple,
          totalFaltantes: informe.cumplimiento.totalFaltantes,
          totalIncompletos: informe.cumplimiento.totalIncompletos,
        },
      });
      showInfo("PDF del informe documental descargado correctamente.", "success");
    } catch {
      showInfo("No se pudo generar el PDF del informe documental.", "error");
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-slate-900 p-2.5 text-white">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Módulo Empresa</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">Documentación empresa</h1>
              <p className="mt-1 text-sm text-slate-600">
                Documentos legales, certificados y requisitos corporativos propios de la empresa.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleDownloadInformeDocumentalPdf} disabled={isDownloadingPdf}>
              <Download className="mr-1 h-4 w-4" />
              {isDownloadingPdf ? "Generando PDF..." : "Descargar PDF"}
            </Button>
            <Button variant="outline" onClick={handleDownloadInformeDocumental} disabled={isDownloadingInforme}>
              <Download className="mr-1 h-4 w-4" />
              {isDownloadingInforme ? "Generando informe..." : "Descargar informe documental"}
            </Button>
            {canManageDocumentacion ? (
              <Button className="bg-slate-900 text-white hover:bg-slate-800 [&_svg]:text-white" onClick={() => setOpenAdditional(true)}>
                <Upload className="mr-1 h-4 w-4" />Agregar documento adicional
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))]">
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/80 p-4 shadow-sm xl:col-span-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Cumplimiento documental</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{kpis.cumplimientoPct}%</p>
                <p className="mt-1 text-sm text-slate-600">{kpis.vigentes} vigentes sobre {kpis.aplicables} documentos aplicables.</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white/80 p-2 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-500 to-lime-400 transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, kpis.cumplimientoPct))}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>No aplica: {kpis.noAplica}</span>
                <span>Total: {kpis.total}</span>
              </div>
            </div>
          </div>
          <KpiCard label="Documentos aplicables" value={kpis.aplicables} icon={<FileText className="h-4 w-4" />} tone="slate" />
          <KpiCard label="Vigentes" value={kpis.vigentes} icon={<ShieldCheck className="h-4 w-4" />} tone="emerald" />
          <KpiCard label="Por vencer" value={kpis.porVencer} icon={<CalendarClock className="h-4 w-4" />} tone="amber" />
          <KpiCard label="Vencidos" value={kpis.vencidos} icon={<FileSearch className="h-4 w-4" />} tone="rose" />
          <KpiCard label="Pendientes de carga" value={kpis.pendientesCarga} icon={<Upload className="h-4 w-4" />} tone="sky" />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTabActiva(item.key)}
              className={[
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                tabActiva === item.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800">Filtros</h2>
          <span className="text-xs text-slate-500">Mostrando {filtrados.length} de {documentos.length}</span>
        </div>
        <Filtros filtros={filtros} onChangeFiltros={setFiltros} dotacion={dotacion} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Resumen alertas documentales:</span>
          {isProductionBuild ? (
            <>
              <span className="rounded border border-red-200 bg-red-50 px-2 py-1 text-red-700">Críticas: {alertasResumen.critica}</span>
              <span className="rounded border border-orange-200 bg-orange-50 px-2 py-1 text-orange-700">Altas: {alertasResumen.alta}</span>
              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">Medias: {alertasResumen.media}</span>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">Bajas: {alertasResumen.baja}</span>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600">Modulo de alertas en preparacion</span>
            </>
          ) : (
            <>
              <button onClick={() => router.push("/dicaprev/alertas?severidad=critica")} className="rounded border border-red-200 bg-red-50 px-2 py-1 text-red-700 hover:bg-red-100">Críticas: {alertasResumen.critica}</button>
              <button onClick={() => router.push("/dicaprev/alertas?severidad=alta")} className="rounded border border-orange-200 bg-orange-50 px-2 py-1 text-orange-700 hover:bg-orange-100">Altas: {alertasResumen.alta}</button>
              <button onClick={() => router.push("/dicaprev/alertas?severidad=media")} className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700 hover:bg-amber-100">Medias: {alertasResumen.media}</button>
              <button onClick={() => router.push("/dicaprev/alertas?severidad=baja")} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 hover:bg-slate-100">Bajas: {alertasResumen.baja}</button>
            </>
          )}
        </div>
      </div>

      {hasActiveFilters ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
          Filtros activos aplicados sobre la matriz requerida.
        </div>
      ) : null}

      {infoMessage ? (
        <div
          className={
            infoType === "success"
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          }
        >
          {infoMessage}
        </div>
      ) : null}

      {tabActiva === "historial" ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-800">Historial global documental</h3>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {historialGlobal.map((h) => (
              <div key={h.id} className="border-b border-slate-100 px-4 py-3 text-sm">
                <p className="font-medium text-slate-800">{h.accion} · {h.documentoNombre}</p>
                <p className="text-xs text-slate-500">{new Date(h.fecha).toLocaleString("es-CL")} · {h.usuario} ({h.usuarioEmail})</p>
                <p className="mt-1 text-slate-600">{h.detalle}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <TableView
          documentos={filtrados}
          onView={openViewDialog}
          onDownload={handleDownload}
          onReplace={openReplaceDialog}
          onHistory={openHistoryDialog}
          onEdit={openEditDialog}
          onValidar={async (doc) => {
            if (!canManageDocumentacion) {
              showInfo("No tienes permisos para validar documentos.", "error");
              return;
            }
            if (!doc.documentoEmpresaId) {
              showInfo("El documento no tiene un registro activo para validar.", "error");
              return;
            }
            const resultado = await validarDocumento(doc.documentoEmpresaId, doc.observaciones);
            showInfo(resultado.ok ? "Documento validado correctamente." : (resultado.error ?? "No se pudo validar el documento."), resultado.ok ? "success" : "error");
          }}
          onEnviarAFirma={async (doc) => {
            if (!canManageDocumentacion) {
              showInfo("No tienes permisos para enviar documentos a firma.", "error");
              return;
            }
            if (!doc.documentoEmpresaId) {
              showInfo("El documento no tiene un registro activo para enviar a firma.", "error");
              return;
            }
            const resultado = await enviarDocumentoAFirma(doc.documentoEmpresaId);
            showInfo(resultado.ok ? "Documento enviado a firma correctamente." : (resultado.error ?? "No se pudo enviar el documento a firma."), resultado.ok ? "success" : "error");
          }}
          canManageDocumentacion={canManageDocumentacion}
          onNoAplica={async (doc) => {
            if (!canManageDocumentacion) {
              showInfo("No tienes permisos para modificar documentos.", "error");
              return;
            }
            await marcarDocumentoNoAplica(doc.documentoEmpresaId, doc.documentoRequeridoId, doc);
            showInfo("Documento marcado como no aplica.", "success");
          }}
          onAplica={async (doc) => {
            if (!canManageDocumentacion) {
              showInfo("No tienes permisos para modificar documentos.", "error");
              return;
            }
            await marcarDocumentoAplica(doc.documentoEmpresaId, doc.documentoRequeridoId, doc);
            showInfo("Documento reactivado correctamente.", "success");
          }}
          onFirmar={async (doc) => {
            if (!canManageDocumentacion) {
              showInfo("No tienes permisos para firmar documentos.", "error");
              return;
            }
            if (!doc.documentoEmpresaId) {
              showInfo("El documento no tiene un registro activo para firmar.", "error");
              return;
            }
            const resultado = await firmarDocumento(doc.documentoEmpresaId);
            if (resultado.ok) {
              showInfo("Documento firmado correctamente.", "success");
            } else {
              showInfo(resultado.error ?? "No se pudo firmar el documento.", "error");
            }
          }}
        />
      )}

      <Dialog open={openAdditional} onOpenChange={setOpenAdditional}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Agregar documento adicional</DialogTitle>
            <DialogDescription>Solo para documentos no contemplados en la matriz requerida.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label>Nombre del documento</Label>
              <Input value={additionalForm.nombre} onChange={(e) => setAdditionalForm((p) => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select value={additionalForm.categoria} onValueChange={(v) => setAdditionalForm((p) => ({ ...p, categoria: v as CategoriaDocumento }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="legales_empresa">Legales empresa</SelectItem>
                  <SelectItem value="laborales_previsionales">Laborales y previsionales</SelectItem>
                  <SelectItem value="sst">Seguridad y salud en el trabajo</SelectItem>
                  <SelectItem value="mutualidad_ley_16744">Mutualidad / Ley 16.744</SelectItem>
                  <SelectItem value="protocolos">Protocolos</SelectItem>
                  <SelectItem value="plantillas_formatos">Plantillas y formatos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo de documento</Label>
              <Input value={additionalForm.tipo} onChange={(e) => setAdditionalForm((p) => ({ ...p, tipo: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Archivo</Label>
              <Input type="file" accept={DOCUMENTO_ACCEPT} onChange={(e) => setAdditionalFile(e.target.files?.[0] ?? null)} />
              <p className="text-xs text-slate-500">Permitidos: {DOCUMENTO_TIPOS_LABEL}. Máximo {Math.round(MAX_DOCUMENTO_FILE_SIZE / (1024 * 1024))} MB.</p>
            </div>
            <div className="space-y-1">
              <Label>Fecha de emisión</Label>
              <Input type="date" value={additionalForm.fechaEmision} onChange={(e) => setAdditionalForm((p) => ({ ...p, fechaEmision: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Tiene vencimiento</Label>
              <Select value={additionalForm.tieneVencimiento ? "si" : "no"} onValueChange={(v) => setAdditionalForm((p) => ({ ...p, tieneVencimiento: v === "si" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fecha de vencimiento</Label>
              <Input
                type="date"
                value={additionalForm.fechaVencimiento}
                onChange={(e) => setAdditionalForm((p) => ({ ...p, fechaVencimiento: e.target.value }))}
                disabled={!additionalForm.tieneVencimiento}
              />
            </div>
            <div className="space-y-1">
              <Label>Estado inicial</Label>
              <Select value={additionalForm.estado} onValueChange={(v) => setAdditionalForm((p) => ({ ...p, estado: v as EstadoDocumento }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente de carga">Pendiente de carga</SelectItem>
                  <SelectItem value="Vigente">Vigente</SelectItem>
                  <SelectItem value="Por vencer">Por vencer</SelectItem>
                  <SelectItem value="Vencido">Vencido</SelectItem>
                  <SelectItem value="En revisión">En revisión</SelectItem>
                  <SelectItem value="No aplica">No aplica</SelectItem>
                  <SelectItem value="Reemplazado">Reemplazado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Versión</Label>
              <Input value={additionalForm.version} onChange={(e) => setAdditionalForm((p) => ({ ...p, version: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Observaciones</Label>
              <Textarea value={additionalForm.observaciones} onChange={(e) => setAdditionalForm((p) => ({ ...p, observaciones: e.target.value }))} />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 md:col-span-2">
              Subido por: {usuarioActual.nombre} ({usuarioActual.email}) · Fecha/hora de carga: automática
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdditional(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateAdditional} disabled={isSubmitting}>Guardar documento adicional</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openReplace} onOpenChange={setOpenReplace}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDoc?.archivoUrl ? "Reemplazar documento" : "Subir documento"}</DialogTitle>
            <DialogDescription>
              {selectedDoc?.nombre ? `Documento: ${selectedDoc.nombre}` : "Se registra trazabilidad automática en historial."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {selectedDoc?.archivoUrl ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Archivo actual: {selectedDoc.archivoNombreOriginal ?? selectedDoc.archivoNombre ?? "-"}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Pendiente de carga: sube el primer archivo para este documento.
              </div>
            )}
            <div className="space-y-1">
              <Label>Archivo</Label>
              <input
                ref={replaceInputRef}
                type="file"
                accept={DOCUMENTO_ACCEPT}
                className="hidden"
                onChange={(e) => pickReplaceFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => replaceInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragOver(false);
                  const file = event.dataTransfer.files?.[0] ?? null;
                  pickReplaceFile(file);
                }}
                className={[
                  "w-full rounded-xl border-2 border-dashed px-4 py-6 text-left transition",
                  isDragOver
                    ? "border-slate-700 bg-slate-100"
                    : "border-slate-300 bg-slate-50 hover:border-slate-400",
                ].join(" ")}
              >
                <p className="text-sm font-medium text-slate-800">
                  {replaceFile ? "Archivo seleccionado" : "Arrastra y suelta el archivo aquí"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {replaceFile
                    ? `${replaceFile.name} · ${formatDocumentoPeso(replaceFile.size)}`
                    : "o haz clic para seleccionar desde tu equipo"}
                </p>
              </button>
              <p className="text-xs text-slate-500">Permitidos: {DOCUMENTO_TIPOS_LABEL}. Máximo {Math.round(MAX_DOCUMENTO_FILE_SIZE / (1024 * 1024))} MB.</p>
            </div>
            {replaceFile && replacePreviewUrl ? (
              <div className="space-y-1">
                <Label>Vista previa</Label>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {replaceFile.type === "application/pdf" ? (
                    <iframe src={replacePreviewUrl} title="Vista previa PDF" className="h-56 w-full bg-white" />
                  ) : replaceFile.type.startsWith("image/") ? (
                    <div className="relative h-56 w-full bg-white">
                      <Image src={replacePreviewUrl} alt={replaceFile.name} fill className="object-contain" unoptimized />
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center text-xs text-slate-500">
                      No hay vista previa para este tipo de archivo.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            <div className="space-y-1">
              <Label>Versión</Label>
              <Input value={replaceForm.version} onChange={(e) => setReplaceForm((p) => ({ ...p, version: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Observaciones</Label>
              <Textarea value={replaceForm.observaciones} onChange={(e) => setReplaceForm((p) => ({ ...p, observaciones: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenReplace(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleReplace} disabled={isSubmitting}>
              {isSubmitting ? "Subiendo..." : selectedDoc?.archivoUrl ? "Reemplazar documento" : "Subir documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openHistory} onOpenChange={setOpenHistory}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Historial del documento</DialogTitle>
            <DialogDescription>{selectedDoc?.nombre}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-200">
            {selectedVersiones.map((item) => (
              <div key={item.id} className="border-b border-slate-100 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-800">Versión {item.version ?? "-"}</p>
                  {item.isCurrent ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Actual</span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Histórico</span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{new Date(item.fecha).toLocaleString("es-CL")}</p>
                <p className="mt-1 text-slate-600">{item.detalle}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">
                    Archivo: {item.archivoNombreOriginal ?? item.archivoNombre ?? "sin archivo"}
                  </span>
                  {item.isCurrent ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => selectedDoc && handleOpenDocument(selectedDoc)} disabled={!selectedDoc?.archivoUrl}>
                        Ver
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => item.archivoUrl && handleDownloadHistorial(item)} disabled={!item.archivoUrl}>
                        Descargar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => item.archivoUrl && handleDownloadHistorial(item)} disabled={!item.archivoUrl}>
                        Descargar versión
                      </Button>
                      {canManageDocumentacion ? (
                        <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => handleRestoreVersion(item.id)} disabled={historyBusyId === item.id}>
                          {historyBusyId === item.id ? "Restaurando..." : "Restaurar versión"}
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenHistory(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Editar metadatos</DialogTitle>
            <DialogDescription>Actualiza estado, vigencia y campos generales del documento.</DialogDescription>
          </DialogHeader>
          {selectedDoc ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <Label>Nombre</Label>
                <Input value={selectedDoc.nombre} onChange={(e) => setSelectedDoc((p) => (p ? { ...p, nombre: e.target.value } : p))} />
              </div>
              <div className="space-y-1">
                <Label>Categoría</Label>
                <Select value={selectedDoc.categoria} onValueChange={(v) => setSelectedDoc((p) => (p ? { ...p, categoria: v as CategoriaDocumento } : p))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legales_empresa">Legales empresa</SelectItem>
                    <SelectItem value="laborales_previsionales">Laborales y previsionales</SelectItem>
                    <SelectItem value="sst">Seguridad y salud en el trabajo</SelectItem>
                    <SelectItem value="mutualidad_ley_16744">Mutualidad / Ley 16.744</SelectItem>
                    <SelectItem value="protocolos">Protocolos</SelectItem>
                    <SelectItem value="plantillas_formatos">Plantillas y formatos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Input value={selectedDoc.tipo} onChange={(e) => setSelectedDoc((p) => (p ? { ...p, tipo: e.target.value } : p))} />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={selectedDoc.estado} onValueChange={(v) => setSelectedDoc((p) => (p ? { ...p, estado: v as EstadoDocumento } : p))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vigente">Vigente</SelectItem>
                    <SelectItem value="Por vencer">Por vencer</SelectItem>
                    <SelectItem value="Vencido">Vencido</SelectItem>
                    <SelectItem value="Pendiente de carga">Pendiente de carga</SelectItem>
                    <SelectItem value="En revisión">En revisión</SelectItem>
                    <SelectItem value="No aplica">No aplica</SelectItem>
                    <SelectItem value="Reemplazado">Reemplazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Versión</Label>
                <Input value={selectedDoc.version ?? ""} onChange={(e) => setSelectedDoc((p) => (p ? { ...p, version: e.target.value } : p))} />
              </div>
              <div className="space-y-1">
                <Label>Fecha emisión</Label>
                <Input type="date" value={selectedDoc.fechaEmision} onChange={(e) => setSelectedDoc((p) => (p ? { ...p, fechaEmision: e.target.value } : p))} />
              </div>
              <div className="space-y-1">
                <Label>Fecha vencimiento</Label>
                <Input
                  type="date"
                  value={selectedDoc.fechaVencimiento ?? ""}
                  onChange={(e) => setSelectedDoc((p) => (p ? { ...p, fechaVencimiento: e.target.value || null } : p))}
                  disabled={!selectedDoc.tieneVencimiento}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Observaciones</Label>
                <Textarea value={selectedDoc.observaciones} onChange={(e) => setSelectedDoc((p) => (p ? { ...p, observaciones: e.target.value } : p))} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEditMetadata}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Ver documento</DialogTitle>
            <DialogDescription>{selectedDoc?.nombre}</DialogDescription>
          </DialogHeader>
          {selectedDoc ? (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.9fr)]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {selectedDoc.archivoUrl ? (
                  canPreviewInline(selectedDoc) ? (
                    selectedDoc.archivoTipo === "application/pdf" ? (
                      <iframe src={selectedDoc.archivoUrl} title={selectedDoc.nombre} className="h-[480px] w-full bg-white" />
                    ) : (
                      <div className="relative h-[480px] w-full bg-white">
                        <Image src={selectedDoc.archivoUrl} alt={selectedDoc.nombre} fill className="object-contain" unoptimized />
                      </div>
                    )
                  ) : (
                    <div className="flex h-[480px] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-600">
                      <p>No hay previsualización embebida para este tipo de archivo.</p>
                      <p className="text-xs text-slate-500">Usa &quot;Abrir documento&quot; o &quot;Descargar&quot; para revisar el contenido.</p>
                    </div>
                  )
                ) : (
                  <div className="flex h-[480px] items-center justify-center px-6 text-center text-sm text-slate-500">
                    Este documento aún no tiene un archivo cargado.
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <p><span className="font-medium text-slate-900">Categoría:</span> {categoryLabel(selectedDoc.categoria)}</p>
                <p><span className="font-medium text-slate-900">Estado:</span> {selectedDoc.estado}</p>
                <p><span className="font-medium text-slate-900">Obligatorio:</span> {selectedDoc.obligatorio ? "Sí" : "No"}</p>
                <p><span className="font-medium text-slate-900">Archivo original:</span> {selectedDoc.archivoNombreOriginal ?? selectedDoc.archivoNombre ?? "Sin archivo"}</p>
                <p><span className="font-medium text-slate-900">Tipo MIME:</span> {selectedDoc.archivoTipo ?? "-"}</p>
                <p><span className="font-medium text-slate-900">Peso:</span> {formatDocumentoPeso(selectedDoc.archivoPeso)}</p>
                <p><span className="font-medium text-slate-900">Versión:</span> {selectedDoc.version ?? "-"}</p>
                <p><span className="font-medium text-slate-900">Subido por:</span> {selectedDoc.subidoPorEmail ?? "-"}</p>
                <p><span className="font-medium text-slate-900">Fecha subida:</span> {selectedDoc.fechaSubida ? new Date(selectedDoc.fechaSubida).toLocaleString("es-CL") : "-"}</p>
                <p><span className="font-medium text-slate-900">Última actualización:</span> {selectedDoc.fechaActualizacion ? new Date(selectedDoc.fechaActualizacion).toLocaleString("es-CL") : "-"}</p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenView(false)}>Cerrar</Button>
            <Button variant="outline" onClick={() => selectedDoc && handleOpenDocument(selectedDoc)} disabled={!selectedDoc?.archivoUrl}>Abrir documento</Button>
            <Button onClick={() => selectedDoc && handleDownload(selectedDoc)} disabled={!selectedDoc?.archivoUrl}>Descargar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "slate" | "emerald" | "amber" | "rose" | "sky";
}) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    sky: "bg-sky-50 text-sky-700 border-sky-200",
  }[tone];

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide">{label}</p>
        <span>{icon}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
