"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  File,
  Plus,
  Search,
  Sparkles,
  User,
  FileText,
} from "lucide-react";
import { jsPDF } from "jspdf";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { cn } from "@/lib/utils";
import type {
  EstadoHallazgo,
  Hallazgo,
  PrioridadHallazgo,
} from "../types";
import {
  agregarEvidenciaCierreHallazgo,
  actualizarHallazgo,
  actualizarEstadoMedidaCorrectiva,
  cerrarHallazgo,
  eliminarHallazgo,
  eliminarHallazgos,
  crearHallazgo,
  getHallazgoDetalle,
  getHallazgos,
  registrarMedidaCorrectivaHallazgo,
  type HallazgoDetalle,
  type OpcionesHallazgo,
  type PlantillaHallazgo,
} from "./actions";
import HallazgoFotoIA from "./HallazgoFotoIA";

const TIPO_CFG: Record<string, { label: string; cls: string }> = {
  documental: { label: "Documental", cls: "bg-sky-50 text-sky-700 border border-sky-200" },
  condicion_insegura: { label: "Condición insegura", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  acto_inseguro: { label: "Acto inseguro", cls: "bg-rose-50 text-rose-700 border border-rose-200" },
  estructural: { label: "Estructural", cls: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  capacitacion: { label: "Capacitación", cls: "bg-violet-50 text-violet-700 border border-violet-200" },
  evidencia: { label: "Evidencia", cls: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
  procedimiento: { label: "Procedimiento", cls: "bg-rose-50 text-rose-700 border border-rose-200" },
  comite_paritario: { label: "Comité Paritario", cls: "bg-orange-50 text-orange-700 border border-orange-200" },
  plan_trabajo: { label: "Plan de trabajo", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  accidente_incidente: { label: "Accidente/incidente", cls: "bg-red-50 text-red-700 border border-red-200" },
  emergencia: { label: "Emergencia", cls: "bg-red-50 text-red-700 border border-red-200" },
  otro: { label: "Otro", cls: "bg-slate-100 text-slate-700 border border-slate-200" },
  // legacy
  seguridad: { label: "Seguridad", cls: "bg-rose-50 text-rose-700 border border-rose-200" },
  conducta: { label: "Conducta", cls: "bg-orange-50 text-orange-700 border border-orange-200" },
  equipos: { label: "Equipos", cls: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  emergencias: { label: "Emergencias", cls: "bg-red-50 text-red-700 border border-red-200" },
};

const ESTADO_CFG: Record<EstadoHallazgo, { label: string; cls: string; icon: React.ReactNode }> = {
  abierto: {
    label: "Abierto",
    cls: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  en_seguimiento: {
    label: "En seguimiento",
    cls: "bg-sky-50 text-sky-700 border border-sky-200",
    icon: <Eye className="h-3.5 w-3.5" />,
  },
  en_proceso: {
    label: "En proceso",
    cls: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  resuelto: {
    label: "Resuelto",
    cls: "bg-teal-50 text-teal-700 border border-teal-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  cerrado: {
    label: "Cerrado",
    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
};

const PRIORIDAD_CFG: Record<PrioridadHallazgo, { label: string; cls: string }> = {
  critica: { label: "Crítica", cls: "bg-red-100 text-red-700 border border-red-300" },
  alta: { label: "Alta", cls: "bg-rose-100 text-rose-700 border border-rose-200" },
  media: { label: "Media", cls: "bg-amber-100 text-amber-700 border border-amber-200" },
  baja: { label: "Baja", cls: "bg-sky-100 text-sky-700 border border-sky-200" },
};

type HallazgoFormData = {
  plantillaClave: string;
  tipo: string;
  descripcion: string;
  centroTrabajoId: string;
  trabajadorId: string;
  responsableId: string;
  obligacionClave: string;
  prioridad: PrioridadHallazgo;
  fechaCompromiso: string;
  medidaCorrectivaSugerida: string;
};

function fechaCompromisoDesdePlantilla(dias: number): string {
  const dt = new Date(Date.now() + dias * 86_400_000);
  return dt.toISOString().slice(0, 10);
}

function fmtFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL");
}

function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return `${window.location.origin}${normalized}`;
}

async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(toAbsoluteUrl(url));
    if (!response.ok) return null;
    const blob = await response.blob();
    const rawDataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });

    if (!rawDataUrl) return null;

    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        const maxHeight = 1280;
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        const width = Math.max(1, Math.round(img.width * ratio));
        const height = Math.max(1, Math.round(img.height * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(rawDataUrl);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    });
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function renderStyledPdfFromHtml(html: string, filename: string) {
  const htmlWidth = 720;
  const pdfContentWidth = 559;
  const mount = document.createElement("div");
  mount.style.position = "fixed";
  mount.style.left = "0";
  mount.style.top = "0";
  mount.style.width = `${htmlWidth}px`;
  mount.style.maxWidth = `${htmlWidth}px`;
  mount.style.pointerEvents = "none";
  mount.style.zIndex = "-1";
  mount.style.background = "#ffffff";
  mount.innerHTML = html;
  document.body.appendChild(mount);

  try {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const images = Array.from(mount.querySelectorAll("img"));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
      ),
    );

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
    await doc.html(mount, {
      margin: [18, 18, 18, 18],
      autoPaging: "text",
      width: pdfContentWidth,
      windowWidth: htmlWidth,
      html2canvas: {
        scale: 0.72,
        useCORS: true,
        backgroundColor: "#ffffff",
      },
    });
    doc.save(filename);
  } finally {
    document.body.removeChild(mount);
  }
}

function esJefatura(cargoNombre: string | null | undefined): boolean {
  const token = (cargoNombre ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return ["jefe", "supervisor", "encargado", "coordinador", "lider", "gerente"].some((item) => token.includes(item));
}

function FORM_EMPTY(): HallazgoFormData {
  return {
    plantillaClave: "manual",
    tipo: "documental",
    descripcion: "",
    centroTrabajoId: "",
    trabajadorId: "none",
    responsableId: "none",
    obligacionClave: "none",
    prioridad: "media",
    fechaCompromiso: "",
    medidaCorrectivaSugerida: "",
  };
}

export default function HallazgosClient({
  initialHallazgos,
  opciones,
  iaConfigurada,
}: {
  initialHallazgos: Hallazgo[];
  opciones: OpcionesHallazgo;
  iaConfigurada: boolean;
}) {
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>(initialHallazgos);
  const [hallazgosSeleccionados, setHallazgosSeleccionados] = useState<Set<string>>(new Set());
  const [generandoInforme, setGenerandoInforme] = useState(false);
  const [eliminandoMasivo, setEliminandoMasivo] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoHallazgo | "todos">("todos");
  const [filtroTipo, setFiltroTipo] = useState<string | "todos">("todos");
  const [filtroCentro, setFiltroCentro] = useState<string>("todos");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<HallazgoFormData>(FORM_EMPTY());
  const [soloIncumplidas, setSoloIncumplidas] = useState(true);
  const [modalIAOpen, setModalIAOpen] = useState(false);

  const [selected, setSelected] = useState<Hallazgo | null>(null);
  const [detalle, setDetalle] = useState<HallazgoDetalle | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [detalleAreaId, setDetalleAreaId] = useState("");
  const [detalleResponsableId, setDetalleResponsableId] = useState("none");
  const [comentarioCierre, setComentarioCierre] = useState("");
  const [cierreError, setCierreError] = useState<string | null>(null);
  const [evidenciaCierreTexto, setEvidenciaCierreTexto] = useState("");
  const [medidaCorrectivaTexto, setMedidaCorrectivaTexto] = useState("");
  const [evidenciaCierreArchivo, setEvidenciaCierreArchivo] = useState<File | null>(null);
  const [uploadingEvidencia, setUploadingEvidencia] = useState(false);

  const obligacionesMap = useMemo(() => {
    return new Map(opciones.obligaciones.map((o) => [o.clave, o.nombre]));
  }, [opciones.obligaciones]);

  const trabajadoresMap = useMemo(() => {
    return new Map(opciones.trabajadores.map((trabajador) => [trabajador.id, trabajador]));
  }, [opciones.trabajadores]);

  const responsablesFormulario = useMemo(() => {
    const trabajadorSeleccionado = form.trabajadorId !== "none" ? trabajadoresMap.get(form.trabajadorId) : undefined;
    return opciones.trabajadores.filter((trabajador) => {
      if (trabajadorSeleccionado?.areaId) {
        return trabajador.areaId === trabajadorSeleccionado.areaId;
      }
      if (form.centroTrabajoId) {
        return trabajador.centroTrabajoId === form.centroTrabajoId;
      }
      return true;
    });
  }, [form.centroTrabajoId, form.trabajadorId, opciones.trabajadores, trabajadoresMap]);

  const responsablesDetalle = useMemo(() => {
    if (!selected) return [];
    return opciones.trabajadores.filter((trabajador) => {
      if (detalleAreaId) {
        return trabajador.areaId === detalleAreaId;
      }
      if (selected.centroTrabajoId) {
        return trabajador.centroTrabajoId === selected.centroTrabajoId;
      }
      return true;
    });
  }, [detalleAreaId, opciones.trabajadores, selected]);

  useEffect(() => {
    const vigente = responsablesFormulario.some((trabajador) => trabajador.id === form.responsableId);
    if (vigente) return;

    const sugerido = responsablesFormulario.find((trabajador) => esJefatura(trabajador.cargoNombre))?.id
      ?? responsablesFormulario[0]?.id
      ?? "none";

    if (sugerido !== form.responsableId) {
      setForm((prev) => ({ ...prev, responsableId: sugerido }));
    }
  }, [form.responsableId, responsablesFormulario]);

  useEffect(() => {
    if (!selected) return;

    const vigente = responsablesDetalle.some((trabajador) => trabajador.id === detalleResponsableId);
    if (vigente) return;

    const sugerido = (detalle?.responsable?.id && responsablesDetalle.some((trabajador) => trabajador.id === detalle?.responsable?.id)
      ? detalle.responsable.id
      : undefined)
      ?? responsablesDetalle.find((trabajador) => esJefatura(trabajador.cargoNombre))?.id
      ?? responsablesDetalle[0]?.id
      ?? "none";

    if (sugerido !== detalleResponsableId) {
      setDetalleResponsableId(sugerido);
    }
  }, [detalle?.responsable?.id, detalleResponsableId, responsablesDetalle, selected]);

  async function reloadHallazgos() {
    const latest = await getHallazgos();
    setHallazgos(latest);
    return latest;
  }

  async function subirArchivo(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/dicaprev/documentacion/upload", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as { archivoUrl?: string; archivoNombre?: string; error?: string } | null;
    if (!response.ok) {
      throw new Error("error" in (payload ?? {}) && payload?.error ? payload.error : "No se pudo guardar el archivo.");
    }

    return payload as { archivoUrl: string; archivoNombre: string };
  }

  function applyTemplate(plantilla: PlantillaHallazgo) {
    const sugerida = plantilla.sugerenciaObligacionTexto
      ? opciones.obligaciones.find((o) => o.nombre.toLowerCase().includes(plantilla.sugerenciaObligacionTexto!.toLowerCase()))
      : undefined;

    setForm((prev) => ({
      ...prev,
      plantillaClave: plantilla.clave,
      tipo: plantilla.tipo,
      prioridad: plantilla.prioridad,
      descripcion: plantilla.descripcionBase,
      fechaCompromiso: fechaCompromisoDesdePlantilla(plantilla.diasCompromiso),
      obligacionClave: sugerida?.clave ?? prev.obligacionClave,
    }));
  }

  function openCreate() {
    setEditId(null);
    setForm(FORM_EMPTY());
    setModalOpen(true);
  }

  function openEdit(h: Hallazgo) {
    setEditId(h.id);
    setForm({
      plantillaClave: "manual",
      tipo: h.tipo,
      descripcion: h.descripcion,
      centroTrabajoId: h.centroTrabajoId ?? h.centroId,
      trabajadorId: h.trabajadorId ?? "none",
      responsableId: h.responsableId ?? "none",
      obligacionClave: h.obligacionClave ?? h.obligacionId ?? "none",
      prioridad: h.prioridad,
      fechaCompromiso: h.fechaCompromiso,
      medidaCorrectivaSugerida: "",
    });
    setModalOpen(true);
  }

  async function onSubmit() {
    if (!form.descripcion.trim() || !form.centroTrabajoId || !form.fechaCompromiso) return;
    try {
      setSaving(true);
      if (!editId) {
        await crearHallazgo({
          centroTrabajoId: form.centroTrabajoId,
          trabajadorId: form.trabajadorId === "none" ? null : form.trabajadorId,
          responsableId: form.responsableId === "none" ? null : form.responsableId,
          obligacionClave: form.obligacionClave === "none" ? null : form.obligacionClave,
          tipo: form.tipo,
          prioridad: form.prioridad,
          descripcion: form.descripcion,
          fechaCompromiso: form.fechaCompromiso,
          medidaCorrectivaSugerida: form.medidaCorrectivaSugerida || null,
        });
      } else {
        await actualizarHallazgo(editId, {
          centroTrabajoId: form.centroTrabajoId,
          trabajadorId: form.trabajadorId === "none" ? null : form.trabajadorId,
          responsableId: form.responsableId === "none" ? null : form.responsableId,
          obligacionClave: form.obligacionClave === "none" ? null : form.obligacionClave,
          tipo: form.tipo,
          prioridad: form.prioridad,
          descripcion: form.descripcion,
          fechaCompromiso: form.fechaCompromiso,
        });
      }
      await reloadHallazgos();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function openDetalle(h: Hallazgo) {
    setSelected(h);
    setDetalle(null);
    setDetalleError(null);
    setDetalleAreaId(trabajadoresMap.get(h.trabajadorId ?? "")?.areaId ?? "");
    setDetalleResponsableId(h.responsableId ?? "none");
    setComentarioCierre("");
    setEvidenciaCierreTexto("");
    setMedidaCorrectivaTexto("");
    setCierreError(null);
    try {
      setDetalleLoading(true);
      const detalleHallazgo = await getHallazgoDetalle(h.id);
      if (!detalleHallazgo) {
        setDetalleError("No fue posible cargar el detalle del hallazgo.");
        return;
      }
      setDetalle(detalleHallazgo);
      if (detalleHallazgo.responsable?.id) {
        setDetalleResponsableId(detalleHallazgo.responsable.id);
      }
    } finally {
      setDetalleLoading(false);
    }
  }

  async function onActualizarResponsable(hallazgo: Hallazgo) {
    if (!opciones.puedeEditar) return;
    try {
      setSaving(true);
      setCierreError(null);
      await actualizarHallazgo(hallazgo.id, {
        centroTrabajoId: hallazgo.centroTrabajoId ?? hallazgo.centroId,
        trabajadorId: hallazgo.trabajadorId ?? null,
        responsableId: detalleResponsableId === "none" ? null : detalleResponsableId,
      });
      const latest = await reloadHallazgos();
      const actualizado = latest.find((item) => item.id === hallazgo.id) ?? hallazgo;
      setSelected(actualizado);
      const detalleHallazgo = await getHallazgoDetalle(hallazgo.id);
      if (detalleHallazgo) setDetalle(detalleHallazgo);
    } catch (error) {
      setCierreError(error instanceof Error ? error.message : "No fue posible actualizar el responsable.");
    } finally {
      setSaving(false);
    }
  }

  async function onCerrar(h: Hallazgo) {
    if (!opciones.puedeEditar) return;
    try {
      setSaving(true);
      setCierreError(null);
      await cerrarHallazgo(h.id, comentarioCierre);
      await reloadHallazgos();
      setSelected(null);
      setDetalle(null);
      setComentarioCierre("");
      setEvidenciaCierreTexto("");
    } catch (error) {
      setCierreError(error instanceof Error ? error.message : "No fue posible cerrar el hallazgo.");
    } finally {
      setSaving(false);
    }
  }

  async function onEliminar(h: Hallazgo) {
    if (!opciones.puedeEditar) return;
    const ok = window.confirm("¿Seguro que deseas eliminar este hallazgo? Esta acción no se puede deshacer.");
    if (!ok) return;

    try {
      setSaving(true);
      setCierreError(null);
      await eliminarHallazgo(h.id);
      await reloadHallazgos();
      setSelected(null);
      setDetalle(null);
      setDetalleError(null);
      setDetalleAreaId("");
      setDetalleResponsableId("none");
      setComentarioCierre("");
      setEvidenciaCierreTexto("");
      setMedidaCorrectivaTexto("");
      setEvidenciaCierreArchivo(null);
    } catch (error) {
      setCierreError(error instanceof Error ? error.message : "No fue posible eliminar el hallazgo.");
    } finally {
      setSaving(false);
    }
  }

  async function onEliminarSeleccionados() {
    if (!opciones.puedeEditar || hallazgosSeleccionados.size === 0) return;

    const total = hallazgosSeleccionados.size;
    const ok = window.confirm(
      `¿Seguro que deseas eliminar ${total} hallazgo${total === 1 ? "" : "s"}? Esta acción no se puede deshacer.`,
    );
    if (!ok) return;

    try {
      setEliminandoMasivo(true);
      setCierreError(null);
      await eliminarHallazgos(Array.from(hallazgosSeleccionados));
      await reloadHallazgos();
      setHallazgosSeleccionados(new Set());

      if (selected && hallazgosSeleccionados.has(selected.id)) {
        setSelected(null);
        setDetalle(null);
        setDetalleError(null);
        setDetalleAreaId("");
        setDetalleResponsableId("none");
        setComentarioCierre("");
        setEvidenciaCierreTexto("");
        setMedidaCorrectivaTexto("");
        setEvidenciaCierreArchivo(null);
      }
    } catch (error) {
      setCierreError(error instanceof Error ? error.message : "No fue posible eliminar los hallazgos seleccionados.");
    } finally {
      setEliminandoMasivo(false);
    }
  }

  async function onMarcarMedidaCompletada(hallazgoId: string, medidaId: string) {
    if (!opciones.puedeEditar) return;
    try {
      setSaving(true);
      setCierreError(null);
      await actualizarEstadoMedidaCorrectiva(hallazgoId, medidaId, "completada");
      const detalleHallazgo = await getHallazgoDetalle(hallazgoId);
      if (detalleHallazgo) setDetalle(detalleHallazgo);
      await reloadHallazgos();
    } catch (error) {
      setCierreError(error instanceof Error ? error.message : "No fue posible completar la medida correctiva.");
    } finally {
      setSaving(false);
    }
  }

  async function onActualizarEstadoMedida(
    hallazgoId: string,
    medidaId: string,
    estado: "pendiente" | "en_proceso" | "completada" | "descartada",
  ) {
    if (!opciones.puedeEditar) return;
    try {
      setSaving(true);
      setCierreError(null);
      await actualizarEstadoMedidaCorrectiva(hallazgoId, medidaId, estado);
      const detalleHallazgo = await getHallazgoDetalle(hallazgoId);
      if (detalleHallazgo) setDetalle(detalleHallazgo);
      await reloadHallazgos();
    } catch (error) {
      setCierreError(error instanceof Error ? error.message : "No fue posible actualizar el estado de la medida correctiva.");
    } finally {
      setSaving(false);
    }
  }

  async function onRegistrarMedidaCorrectiva(hallazgoId: string) {
    if (!opciones.puedeEditar) return;
    try {
      setSaving(true);
      setCierreError(null);
      await registrarMedidaCorrectivaHallazgo(hallazgoId, medidaCorrectivaTexto);
      setMedidaCorrectivaTexto("");
      const detalleHallazgo = await getHallazgoDetalle(hallazgoId);
      if (detalleHallazgo) setDetalle(detalleHallazgo);
      await reloadHallazgos();
    } catch (error) {
      setCierreError(error instanceof Error ? error.message : "No fue posible registrar la medida correctiva.");
    } finally {
      setSaving(false);
    }
  }

  async function onAgregarEvidenciaCierre(hallazgoId: string) {
    if (!opciones.puedeEditar) return;
    try {
      setSaving(true);
      setUploadingEvidencia(true);
      setCierreError(null);
      
      let archivoUrl: string | undefined;
      if (evidenciaCierreArchivo) {
        const archivoSubido = await subirArchivo(evidenciaCierreArchivo);
        archivoUrl = archivoSubido.archivoUrl;
      }
      
      await agregarEvidenciaCierreHallazgo(hallazgoId, evidenciaCierreTexto, archivoUrl);
      setEvidenciaCierreTexto("");
      setEvidenciaCierreArchivo(null);
      const detalleHallazgo = await getHallazgoDetalle(hallazgoId);
      if (detalleHallazgo) setDetalle(detalleHallazgo);
      await reloadHallazgos();
    } catch (error) {
      setCierreError(error instanceof Error ? error.message : "No fue posible registrar evidencia de cierre.");
    } finally {
      setSaving(false);
      setUploadingEvidencia(false);
    }
  }

  async function descargarPDFHallazgo() {
    if (!selected) return;
    try {
      const fotos = (detalle?.evidencias ?? []).filter(
        (e) => e.tipo === "fotografia" || e.archivoUrl?.match(/\.(jpg|jpeg|png|webp)$/i),
      );
      const fotosConSrc = await Promise.all(
        fotos.map(async (foto) => ({
          ...foto,
          src: foto.archivoUrl ? await imageUrlToDataUrl(foto.archivoUrl) : null,
        })),
      );

      const html = `
        <style>
          :root {
            --ink: #1f2937;
            --muted: #6b7280;
            --paper: #ffffff;
            --paper-soft: #f9fafb;
            --line: #e5e7eb;
            --accent: #0f766e;
            --accent-soft: #ecfdf5;
          }
          * { box-sizing: border-box; }
          body { font-family: "Georgia", "Times New Roman", serif; color: var(--ink); background: #ffffff; margin: 0; padding: 0; }
          .report-shell { width: 100%; max-width: 680px; margin: 0 auto; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 18px; }
          .header { background: #ffffff; color: var(--ink); padding: 0 0 14px; border-bottom: 2px solid var(--line); }
          .header h1 { margin: 0 0 6px; font-size: 28px; letter-spacing: 0.01em; font-weight: 700; }
          .header p { margin: 0; font-size: 11px; color: var(--muted); }
          .header-sub { margin-top: 8px; font-size: 13px; color: #374151; }
          .header-chips { margin-top: 12px; }
          .chip { display: inline-block; margin: 0 8px 6px 0; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; border: 1px solid #d1d5db; background: #f9fafb; color: #374151; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .section { margin-top: 14px; border: 1px solid var(--line); border-radius: 10px; padding: 12px; background: var(--paper); }
          .section-title { margin: 0 0 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .item { background: var(--paper-soft); border: 1px solid var(--line); border-radius: 8px; padding: 9px; }
          .label { font-size: 9px; color: var(--muted); text-transform: uppercase; font-weight: 700; margin-bottom: 4px; letter-spacing: 0.05em; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .value { font-size: 12px; color: #111827; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .desc { background: var(--paper-soft); border-left: 3px solid var(--accent); border-radius: 8px; padding: 10px; font-size: 12px; line-height: 1.55; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .hero { margin-top: 10px; border-radius: 10px; overflow: hidden; border: 1px solid var(--line); background: var(--paper); }
          .hero-top { display: flex; }
          .hero-accent { width: 8px; }
          .hero-critical { background: #b91c1c; }
          .hero-high { background: #be123c; }
          .hero-medium { background: #b45309; }
          .hero-low { background: #0369a1; }
          .hero-content { flex: 1; padding: 12px; background: #ffffff; }
          .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 9px; font-weight: 700; margin-right: 6px; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .pill-state { background: #ecfeff; color: #155e75; border: 1px solid #bae6fd; }
          .pill-prio { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
          .photo { margin-bottom: 12px; }
          .photo img { width: 100%; max-height: 300px; object-fit: contain; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
          .photo-meta { margin-top: 5px; font-size: 10px; color: #4b5563; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .mc { font-size: 10px; border: 1px solid var(--line); background: var(--paper-soft); padding: 9px; border-radius: 8px; margin-bottom: 7px; line-height: 1.45; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid var(--line); font-size: 10px; color: var(--muted); text-align: center; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
        </style>
        <div class="report-shell">
        <div class="header">
          <h1>Reporte de Hallazgo</h1>
          <p>${escapeHtml(new Date().toLocaleString("es-CL"))}</p>
          <div class="header-sub">Informe ejecutivo de cumplimiento y control operacional</div>
          <div class="header-chips">
            <span class="chip">Centro ${escapeHtml(selected.centroNombre)}</span>
            <span class="chip">Estado ${escapeHtml(ESTADO_CFG[selected.estado as EstadoHallazgo]?.label || selected.estado)}</span>
            <span class="chip">Prioridad ${escapeHtml(PRIORIDAD_CFG[selected.prioridad]?.label || selected.prioridad)}</span>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">Información general</h3>
          <div class="grid">
            <div class="item"><div class="label">Estado</div><div class="value">${escapeHtml(ESTADO_CFG[selected.estado as EstadoHallazgo]?.label || selected.estado)}</div></div>
            <div class="item"><div class="label">Tipo</div><div class="value">${escapeHtml(TIPO_CFG[selected.tipo]?.label || selected.tipo)}</div></div>
            <div class="item"><div class="label">Centro</div><div class="value">${escapeHtml(selected.centroNombre)}</div></div>
            <div class="item"><div class="label">Trabajador</div><div class="value">${escapeHtml(selected.trabajadorNombre || "No asociado")}</div></div>
            <div class="item"><div class="label">Responsable</div><div class="value">${escapeHtml(selected.responsableNombre || detalle?.responsable?.nombre || "Por asignar")}</div></div>
            <div class="item"><div class="label">Prioridad</div><div class="value">${escapeHtml(PRIORIDAD_CFG[selected.prioridad]?.label || selected.prioridad)}</div></div>
            <div class="item"><div class="label">Compromiso</div><div class="value">${escapeHtml(fmtFecha(selected.fechaCompromiso))}</div></div>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">Descripción</h3>
          <div class="hero">
            <div class="hero-top">
              <div class="hero-accent ${selected.prioridad === "critica" ? "hero-critical" : selected.prioridad === "alta" ? "hero-high" : selected.prioridad === "media" ? "hero-medium" : "hero-low"}"></div>
              <div class="hero-content">
                <span class="pill pill-state">${escapeHtml(ESTADO_CFG[selected.estado as EstadoHallazgo]?.label || selected.estado)}</span>
                <span class="pill pill-prio">Prioridad ${escapeHtml(PRIORIDAD_CFG[selected.prioridad]?.label || selected.prioridad)}</span>
                <div class="desc" style="margin-top:10px;">${escapeHtml(selected.descripcion)}</div>
              </div>
            </div>
          </div>
        </div>

        ${fotosConSrc.some((f) => f.src) ? `
          <div class="section">
            <h3 class="section-title">Fotografías del hallazgo</h3>
            ${fotosConSrc
              .filter((f) => f.src)
              .map((foto) => `
                <div class="photo">
                  <img src="${foto.src}" alt="${escapeHtml(foto.titulo)}" />
                  <div class="photo-meta">${escapeHtml(foto.titulo)} - ${escapeHtml(fmtFecha(foto.fechaEvidencia))}</div>
                </div>
              `)
              .join("")}
          </div>
        ` : ""}

        ${detalle?.medidasCorrectivas?.length ? `
          <div class="section">
            <h3 class="section-title">Medidas correctivas</h3>
            ${detalle.medidasCorrectivas
              .map(
                (m) => `<div class="mc"><strong>${escapeHtml(m.descripcion)}</strong><br/>Responsable: ${escapeHtml(m.responsable)} | Estado: ${escapeHtml(m.estado)} | Compromiso: ${escapeHtml(fmtFecha(m.fechaCompromiso))}</div>`,
              )
              .join("")}
          </div>
        ` : ""}

        <div class="footer">Generado por NextPrev</div>
        </div>
      `;

      await renderStyledPdfFromHtml(html, `Hallazgo_${selected.id}_${new Date().getTime()}.pdf`);
    } catch (error) {
      setCierreError("No fue posible descargar el PDF del hallazgo.");
    }
  }

  async function descargarInformeMasivo() {
    if (hallazgosSeleccionados.size === 0) {
      return;
    }

    try {
      setGenerandoInforme(true);
      
      // Cargar detalles de todos los hallazgos seleccionados
      const hallazgosConDetalle = [];
      for (const id of hallazgosSeleccionados) {
        const h = hallazgos.find((h) => h.id === id);
        if (h) {
          const detalleHallazgo = await getHallazgoDetalle(id);
          hallazgosConDetalle.push({ hall: h, detalle: detalleHallazgo });
        }
      }

      const hallazgosConDetalleFotos = await Promise.all(
        hallazgosConDetalle.map(async (item) => {
          const fotos = (item.detalle?.evidencias ?? []).filter(
            (e) => e.tipo === "fotografia" || e.archivoUrl?.match(/\.(jpg|jpeg|png|webp)$/i),
          );

          const fotosConSrc = await Promise.all(
            fotos.map(async (foto) => ({
              ...foto,
              src: foto.archivoUrl ? await imageUrlToDataUrl(foto.archivoUrl) : null,
            })),
          );

          return { ...item, fotosConSrc };
        }),
      );

      const html = `
        <style>
          :root {
            --ink: #1f2937;
            --muted: #6b7280;
            --paper: #ffffff;
            --paper-soft: #f9fafb;
            --line: #e5e7eb;
            --accent: #0f766e;
          }
          * { box-sizing: border-box; }
          body { font-family: "Georgia", "Times New Roman", serif; color: var(--ink); background: #ffffff; margin: 0; padding: 0; }
          .report-shell { width: 100%; max-width: 680px; margin: 0 auto; background: var(--paper); border: 1px solid #d1d5db; border-radius: 12px; padding: 16px; overflow: hidden; }
          .header { background: #ffffff; color: var(--ink); padding: 0 0 14px; border-bottom: 2px solid var(--line); margin-bottom: 14px; }
          .header h1 { margin: 0 0 6px; font-size: 28px; letter-spacing: 0.01em; font-weight: 700; }
          .header p { margin: 0; font-size: 11px; color: var(--muted); }
          .header-sub { margin-top: 8px; font-size: 13px; color: #374151; }
          .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
          .kpi { border-radius: 8px; padding: 9px; border: 1px solid #d6dbe1; }
          .kpi-label { font-size: 9px; color: var(--muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .kpi-value { font-size: 20px; color: #111827; font-weight: 700; margin-top: 2px; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .kpi-abiertos { background: #fff7ed; }
          .kpi-proceso { background: #eff6ff; }
          .kpi-resueltos { background: #f0fdfa; }
          .kpi-cerrados { background: #ecfdf5; }
          .cover-page { min-height: 980px; }
          .summary-page { page-break-before: always; break-before: page; min-height: 980px; }
          .section { margin-top: 14px; border: 1px solid #d6dbe1; border-radius: 10px; padding: 12px; background: #ffffff; }
          .section-title { margin: 0 0 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          table { width: 100%; border-collapse: collapse; font-size: 9px; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; table-layout: fixed; }
          th { background: #0f766e; color: #fff; padding: 7px 6px; text-align: left; font-weight: 700; }
          td { border: 1px solid var(--line); padding: 6px; vertical-align: top; }
          th, td { word-break: break-word; overflow-wrap: anywhere; }
          th:nth-child(1), td:nth-child(1) { width: 13%; }
          th:nth-child(2), td:nth-child(2) { width: 39%; }
          th:nth-child(3), td:nth-child(3) { width: 24%; }
          th:nth-child(4), td:nth-child(4) { width: 24%; }
          .summary-main { font-weight: 600; color: #111827; }
          .summary-sub { margin-top: 3px; color: #6b7280; font-size: 8px; line-height: 1.35; }
          .hallazgo-page { page-break-before: always; break-before: page; min-height: 980px; }
          .card { margin-top: 0; border: 1px solid #d1d5db; border-radius: 10px; padding: 0; page-break-inside: avoid; overflow: hidden; background: #ffffff; }
          .card-wrap { display: flex; }
          .card-band { width: 8px; }
          .band-critical { background: #b91c1c; }
          .band-high { background: #be123c; }
          .band-medium { background: #b45309; }
          .band-low { background: #0369a1; }
          .card-main { flex: 1; padding: 10px; }
          .card h3 { margin: 0 0 8px; color: #111827; font-size: 13px; }
          .card-responsable { margin: 0 0 10px; font-size: 10px; color: #374151; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .desc { background: var(--paper-soft); border-left: 3px solid #0f766e; border-radius: 8px; padding: 9px; font-size: 11px; margin-bottom: 10px; line-height: 1.45; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
          .meta-item { border: 1px solid #d6dbe1; background: var(--paper-soft); border-radius: 8px; padding: 7px; }
          .meta-label { font-size: 9px; color: var(--muted); text-transform: uppercase; font-weight: 700; margin-bottom: 3px; letter-spacing: 0.05em; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .meta-value { font-size: 10px; color: #111827; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: start; }
          .detail-col { min-width: 0; }
          .detail-block-title { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .photo { margin-bottom: 10px; }
          .photo img { width: 100%; max-height: 170px; object-fit: contain; border: 1px solid #d6dbe1; border-radius: 8px; background: #fff; }
          .photo-meta { margin-top: 4px; font-size: 10px; color: #4b5563; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .mc { font-size: 10px; border: 1px solid #d6dbe1; background: var(--paper-soft); padding: 8px; border-radius: 8px; margin-bottom: 6px; line-height: 1.45; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .photo, .desc, .meta, .mc { page-break-inside: avoid; break-inside: avoid; }
          .page-break { page-break-after: always; }
          .footer { margin-top: 14px; padding-top: 10px; border-top: 1px solid #d6dbe1; font-size: 10px; color: var(--muted); text-align: center; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
        </style>
        <div class="report-shell">
        <div class="cover-page">
          <div class="header">
            <h1>Informe de Hallazgos</h1>
            <p>${escapeHtml(new Date().toLocaleString("es-CL"))}</p>
            <div class="header-sub">Dashboard ejecutivo de cumplimiento por hallazgos seleccionados</div>
          </div>

          <div class="kpis">
            <div class="kpi kpi-abiertos"><div class="kpi-label">Abiertos</div><div class="kpi-value">${hallazgosConDetalleFotos.filter((h) => h.hall.estado === "abierto").length}</div></div>
            <div class="kpi kpi-proceso"><div class="kpi-label">En proceso</div><div class="kpi-value">${hallazgosConDetalleFotos.filter((h) => h.hall.estado === "en_proceso" || h.hall.estado === "en_seguimiento").length}</div></div>
            <div class="kpi kpi-resueltos"><div class="kpi-label">Resueltos</div><div class="kpi-value">${hallazgosConDetalleFotos.filter((h) => h.hall.estado === "resuelto").length}</div></div>
            <div class="kpi kpi-cerrados"><div class="kpi-label">Cerrados</div><div class="kpi-value">${hallazgosConDetalleFotos.filter((h) => h.hall.estado === "cerrado").length}</div></div>
          </div>
        </div>

        <div class="summary-page">
          <div class="header">
            <h1>Resumen de Hallazgos</h1>
            <p>${escapeHtml(new Date().toLocaleString("es-CL"))}</p>
            <div class="header-sub">Vista consolidada para revisión y trazabilidad</div>
          </div>

          <div class="section">
            <h3 class="section-title">Resumen de Hallazgos</h3>
            <table>
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Hallazgo</th>
                  <th>Centro</th>
                  <th>Gestión</th>
                </tr>
              </thead>
              <tbody>
                ${hallazgosConDetalleFotos
                  .map(
                    (item) => `
                      <tr>
                        <td>${escapeHtml(ESTADO_CFG[item.hall.estado as EstadoHallazgo]?.label || item.hall.estado)}</td>
                        <td>
                          <div class="summary-main">${escapeHtml(item.hall.descripcion)}</div>
                          <div class="summary-sub">Tipo: ${escapeHtml(TIPO_CFG[item.hall.tipo]?.label || item.hall.tipo)}</div>
                        </td>
                        <td>
                          <div class="summary-main">${escapeHtml(item.hall.centroNombre)}</div>
                          <div class="summary-sub">Trabajador: ${escapeHtml(item.hall.trabajadorNombre || "No asociado")}</div>
                        </td>
                        <td>
                          <div class="summary-main">${escapeHtml(item.hall.responsableNombre || item.detalle?.responsable?.nombre || "Por asignar")}</div>
                          <div class="summary-sub">Prioridad: ${escapeHtml(PRIORIDAD_CFG[item.hall.prioridad]?.label || item.hall.prioridad)} · Compromiso: ${escapeHtml(fmtFecha(item.hall.fechaCompromiso))}</div>
                        </td>
                      </tr>
                    `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>

        ${hallazgosConDetalleFotos
          .map(
            (item, idx) => `
              <div class="hallazgo-page">
                <div class="card">
                  <div class="card-wrap">
                    <div class="card-band ${item.hall.prioridad === "critica" ? "band-critical" : item.hall.prioridad === "alta" ? "band-high" : item.hall.prioridad === "media" ? "band-medium" : "band-low"}"></div>
                    <div class="card-main">
                      <h3>${idx + 1}. ${escapeHtml(item.hall.descripcion)}</h3>
                      <div class="card-responsable">Responsable: <strong>${escapeHtml(item.hall.responsableNombre || item.detalle?.responsable?.nombre || "Por asignar")}</strong></div>
                      <div class="desc">${escapeHtml(item.hall.descripcion)}</div>

                      <div class="detail-grid">
                        <div class="detail-col">
                          <div class="meta">
                            <div class="meta-item"><div class="meta-label">Estado</div><div class="meta-value">${escapeHtml(ESTADO_CFG[item.hall.estado as EstadoHallazgo]?.label || item.hall.estado)}</div></div>
                            <div class="meta-item"><div class="meta-label">Tipo</div><div class="meta-value">${escapeHtml(TIPO_CFG[item.hall.tipo]?.label || item.hall.tipo)}</div></div>
                            <div class="meta-item"><div class="meta-label">Centro</div><div class="meta-value">${escapeHtml(item.hall.centroNombre)}</div></div>
                            <div class="meta-item"><div class="meta-label">Trabajador</div><div class="meta-value">${escapeHtml(item.hall.trabajadorNombre || "No asociado")}</div></div>
                            <div class="meta-item"><div class="meta-label">Responsable</div><div class="meta-value">${escapeHtml(item.hall.responsableNombre || item.detalle?.responsable?.nombre || "Por asignar")}</div></div>
                            <div class="meta-item"><div class="meta-label">Prioridad</div><div class="meta-value">${escapeHtml(PRIORIDAD_CFG[item.hall.prioridad]?.label || item.hall.prioridad)}</div></div>
                            <div class="meta-item"><div class="meta-label">Compromiso</div><div class="meta-value">${escapeHtml(fmtFecha(item.hall.fechaCompromiso))}</div></div>
                          </div>

                          ${item.detalle?.medidasCorrectivas?.length
                            ? `
                              <div class="detail-block-title">Medidas correctivas</div>
                              ${item.detalle.medidasCorrectivas
                                .slice(0, 3)
                                .map(
                                  (m) => `<div class="mc"><strong>${escapeHtml(m.descripcion)}</strong><br/>Responsable: ${escapeHtml(m.responsable)} | Estado: ${escapeHtml(m.estado)} | Compromiso: ${escapeHtml(fmtFecha(m.fechaCompromiso))}</div>`,
                                )
                                .join("")}
                            `
                            : ""}
                        </div>

                        <div class="detail-col">
                          ${item.fotosConSrc.some((foto) => foto.src)
                            ? `
                              <div class="detail-block-title">Fotografías</div>
                              ${item.fotosConSrc
                                .filter((foto) => foto.src)
                                .slice(0, 2)
                                .map(
                                  (foto) => `
                                    <div class="photo">
                                      <img src="${foto.src}" alt="${escapeHtml(foto.titulo)}" />
                                      <div class="photo-meta">${escapeHtml(foto.titulo)} - ${escapeHtml(fmtFecha(foto.fechaEvidencia))}</div>
                                    </div>
                                  `,
                                )
                                .join("")}
                            `
                            : `<div class="detail-block-title">Fotografías</div><div class="mc">Sin fotografías asociadas.</div>`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `,
          )
          .join("")}

        <div class="footer">Total de hallazgos: ${hallazgosConDetalleFotos.length} · Generado por NextPrev</div>
        </div>
      `;

      await renderStyledPdfFromHtml(html, `Informe_Hallazgos_${new Date().getTime()}.pdf`);

      // Limpiar selección
      setHallazgosSeleccionados(new Set());
    } catch (error) {
      console.error("Error al generar informe:", error);
    } finally {
      setGenerandoInforme(false);
    }
  }

  const trabajadoresFiltrados = useMemo(() => {
    return opciones.trabajadores.filter((t) => {
      if (!form.centroTrabajoId) return true;
      return t.centroTrabajoId === form.centroTrabajoId;
    });
  }, [opciones.trabajadores, form.centroTrabajoId]);

  const obligacionesDisponibles = useMemo(() => {
    return opciones.obligaciones.filter((o) => {
      if (!soloIncumplidas) return true;
      return o.incumplida;
    });
  }, [opciones.obligaciones, soloIncumplidas]);

  const abiertos = hallazgos.filter((h) => h.estado === "abierto").length;
  const enProceso = hallazgos.filter((h) => h.estado === "en_seguimiento" || h.estado === "en_proceso").length;
  const resueltos = hallazgos.filter((h) => h.estado === "resuelto").length;
  const cerrados = hallazgos.filter((h) => h.estado === "cerrado").length;

  const hallazgosFiltrados = useMemo(() => {
    const txt = search.toLowerCase();
    return hallazgos.filter((h) => {
      const matchText =
        txt.length === 0 ||
        h.descripcion.toLowerCase().includes(txt) ||
        h.centroNombre.toLowerCase().includes(txt) ||
        (h.trabajadorNombre?.toLowerCase().includes(txt) ?? false);
      const matchEstado = filtroEstado === "todos" || h.estado === filtroEstado;
      const matchTipo = filtroTipo === "todos" || h.tipo === filtroTipo;
      const matchCentro = filtroCentro === "todos" || h.centroId === filtroCentro || h.centroTrabajoId === filtroCentro;
      const matchFechaDesde = !filtroFechaDesde || h.fechaCompromiso >= filtroFechaDesde;
      const matchFechaHasta = !filtroFechaHasta || h.fechaCompromiso <= filtroFechaHasta;
      return matchText && matchEstado && matchTipo && matchCentro && matchFechaDesde && matchFechaHasta;
    });
  }, [hallazgos, search, filtroEstado, filtroTipo, filtroCentro, filtroFechaDesde, filtroFechaHasta]);

  return (
    <div className="min-h-screen bg-slate-50/80 py-10">
      <div className="mx-auto max-w-6xl space-y-8 px-4 lg:px-0">
        <StandardPageHeader
          moduleLabel="Cumplimiento DS44"
          title="Hallazgos DS44"
          description="Registro de hallazgos con plantillas rápidas y vínculos reales a obligaciones, centros y trabajadores."
          icon={AlertTriangle}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setModalIAOpen(true)}
                className="rounded-full px-5 py-2.5 text-sm font-medium"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Analizar foto con IA
              </Button>
              {opciones.puedeEditar ? (
                <Button
                  onClick={openCreate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5 py-2.5 text-sm font-medium shadow-sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo hallazgo
                </Button>
              ) : null}
              {hallazgosSeleccionados.size > 0 ? (
                <Button
                  onClick={() => void onEliminarSeleccionados()}
                  disabled={eliminandoMasivo || generandoInforme}
                  variant="destructive"
                  className="rounded-full px-5 py-2.5 text-sm font-medium shadow-sm"
                >
                  Eliminar seleccionados ({hallazgosSeleccionados.size})
                </Button>
              ) : null}
              {hallazgosSeleccionados.size > 0 ? (
                <Button
                  onClick={() => void descargarInformeMasivo()}
                  disabled={generandoInforme || eliminandoMasivo}
                  className="bg-sky-600 hover:bg-sky-700 text-white rounded-full px-5 py-2.5 text-sm font-medium shadow-sm"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generar informe ({hallazgosSeleccionados.size})
                </Button>
              ) : null}
            </div>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Abiertos", value: abiertos, cls: "from-amber-50 to-amber-100 text-amber-700" },
            { label: "En proceso", value: enProceso, cls: "from-blue-50 to-blue-100 text-blue-700" },
            { label: "Resueltos", value: resueltos, cls: "from-teal-50 to-teal-100 text-teal-700" },
            { label: "Cerrados", value: cerrados, cls: "from-emerald-50 to-emerald-100 text-emerald-700" },
          ].map((kpi) => (
            <Card key={kpi.label} className={`border-none shadow-sm bg-gradient-to-br ${kpi.cls}`}>
              <CardContent className="pt-5 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide">{kpi.label}</p>
                <p className="mt-1 text-3xl font-semibold">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <HallazgoFotoIA
          open={modalIAOpen}
          onOpenChange={setModalIAOpen}
          opciones={{ centros: opciones.centros, areas: opciones.areas }}
          iaConfigurada={iaConfigurada}
          onConfirmed={async () => {
            await reloadHallazgos();
          }}
        />

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-5 flex flex-col gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar hallazgo, centro o trabajador..."
                className="pl-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as typeof filtroEstado)}>
                <SelectTrigger className="w-40 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="abierto">Abierto</SelectItem>
                  <SelectItem value="en_seguimiento">En seguimiento</SelectItem>
                  <SelectItem value="en_proceso">En proceso</SelectItem>
                  <SelectItem value="resuelto">Resuelto</SelectItem>
                  <SelectItem value="cerrado">Cerrado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as typeof filtroTipo)}>
                <SelectTrigger className="w-48 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(TIPO_CFG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroCentro} onValueChange={setFiltroCentro}>
                <SelectTrigger className="w-52 text-sm"><SelectValue placeholder="Centro" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {opciones.centros.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={filtroFechaDesde}
                  onChange={(e) => setFiltroFechaDesde(e.target.value)}
                  className="w-44 text-sm"
                  aria-label="Fecha compromiso desde"
                />
                <Input
                  type="date"
                  value={filtroFechaHasta}
                  onChange={(e) => setFiltroFechaHasta(e.target.value)}
                  className="w-44 text-sm"
                  aria-label="Fecha compromiso hasta"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <th className="py-3 pl-2 w-8">
                      <Checkbox
                        checked={hallazgosFiltrados.length > 0 && hallazgosFiltrados.every((h) => hallazgosSeleccionados.has(h.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setHallazgosSeleccionados(new Set(hallazgosFiltrados.map((h) => h.id)));
                          } else {
                            setHallazgosSeleccionados(new Set());
                          }
                        }}
                      />
                    </th>
                    <th className="py-3 text-left pl-2">Estado</th>
                    <th className="py-3 text-left">Tipo</th>
                    <th className="py-3 text-left">Hallazgo</th>
                    <th className="py-3 text-left">Centro</th>
                    <th className="py-3 text-left">Trabajador</th>
                    <th className="py-3 text-left">Prioridad</th>
                    <th className="py-3 text-left">Compromiso</th>
                    <th className="py-3 text-right pr-2">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {hallazgosFiltrados.map((h) => (
                    <tr key={h.id} className={cn("border-b last:border-0 transition-colors", hallazgosSeleccionados.has(h.id) ? "bg-emerald-50" : "hover:bg-slate-50/60")}>
                      <td className="py-3 pl-2 w-8">
                        <Checkbox
                          checked={hallazgosSeleccionados.has(h.id)}
                          onCheckedChange={(checked) => {
                            const nuevo = new Set(hallazgosSeleccionados);
                            if (checked) {
                              nuevo.add(h.id);
                            } else {
                              nuevo.delete(h.id);
                            }
                            setHallazgosSeleccionados(nuevo);
                          }}
                        />
                      </td>
                      <td className="py-3 pl-2">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", ESTADO_CFG[h.estado].cls)}>
                          {ESTADO_CFG[h.estado].icon}
                          {ESTADO_CFG[h.estado].label}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", TIPO_CFG[h.tipo].cls)}>
                          {TIPO_CFG[h.tipo].label}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-slate-900 max-w-xs">{h.descripcion}</td>
                      <td className="py-3 text-slate-600 text-xs">{h.centroNombre}</td>
                      <td className="py-3 text-slate-500 text-xs">{h.trabajadorNombre ?? "-"}</td>
                      <td className="py-3">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", PRIORIDAD_CFG[h.prioridad].cls)}>
                          {PRIORIDAD_CFG[h.prioridad].label}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600">{fmtFecha(h.fechaCompromiso)}</td>
                      <td className="py-3 pr-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => void openDetalle(h)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {hallazgosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-500">
                        Sin hallazgos que coincidan.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar hallazgo" : "Nuevo hallazgo"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Plantilla de hallazgo</Label>
              <Select
                value={form.plantillaClave}
                onValueChange={(v) => {
                  if (v === "manual") {
                    setForm((prev) => ({ ...prev, plantillaClave: "manual" }));
                    return;
                  }
                  const plantilla = opciones.plantillas.find((p) => p.clave === v);
                  if (!plantilla) return;
                  applyTemplate(plantilla);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plantilla" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  {opciones.plantillas.map((p) => (
                    <SelectItem key={p.clave} value={p.clave}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm((prev) => ({ ...prev, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_CFG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Prioridad</Label>
                <Select value={form.prioridad} onValueChange={(v) => setForm((prev) => ({ ...prev, prioridad: v as PrioridadHallazgo }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORIDAD_CFG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Descripción</Label>
              <Textarea
                rows={3}
                value={form.descripcion}
                onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Centro de trabajo</Label>
                <Select value={form.centroTrabajoId} onValueChange={(v) => setForm((prev) => ({ ...prev, centroTrabajoId: v, trabajadorId: "none", responsableId: "none" }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {opciones.centros.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Trabajador</Label>
                <Select value={form.trabajadorId} onValueChange={(v) => setForm((prev) => ({ ...prev, trabajadorId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No asociado</SelectItem>
                    {trabajadoresFiltrados.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nombreCompleto}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Responsable</Label>
              <Select value={form.responsableId} onValueChange={(v) => setForm((prev) => ({ ...prev, responsableId: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar responsable" /></SelectTrigger>
                <SelectContent>
                  {responsablesFormulario.length === 0 ? (
                    <SelectItem value="none">Sin responsable sugerido</SelectItem>
                  ) : (
                    responsablesFormulario.map((trabajador) => (
                      <SelectItem key={trabajador.id} value={trabajador.id}>
                        {trabajador.nombreCompleto}{trabajador.cargoNombre ? ` · ${trabajador.cargoNombre}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={soloIncumplidas}
                  onCheckedChange={(v) => setSoloIncumplidas(Boolean(v))}
                  id="solo-incumplidas"
                />
                <Label htmlFor="solo-incumplidas">Mostrar solo obligaciones incumplidas</Label>
              </div>

              <div className="space-y-1">
                <Label>Obligación DS44</Label>
                <Select value={form.obligacionClave} onValueChange={(v) => setForm((prev) => ({ ...prev, obligacionClave: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asociar</SelectItem>
                    {obligacionesDisponibles.map((o) => (
                      <SelectItem key={o.clave} value={o.clave}>{o.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Fecha compromiso</Label>
              <Input
                type="date"
                value={form.fechaCompromiso}
                onChange={(e) => setForm((prev) => ({ ...prev, fechaCompromiso: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Medida correctiva sugerida (opcional al crear)</Label>
              <Textarea
                rows={3}
                value={form.medidaCorrectivaSugerida}
                onChange={(e) => setForm((prev) => ({ ...prev, medidaCorrectivaSugerida: e.target.value }))}
                placeholder="Ej. Suspender tarea hasta implementar control de riesgo y verificar evidencia antes de retomar."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onSubmit}
              disabled={saving || !form.descripcion.trim() || !form.centroTrabajoId || !form.fechaCompromiso}
            >
              {editId ? "Guardar cambios" : "Crear hallazgo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => {
        if (!o) {
          setSelected(null);
          setDetalle(null);
          setDetalleError(null);
          setDetalleAreaId("");
          setDetalleResponsableId("none");
          setComentarioCierre("");
          setEvidenciaCierreTexto("");
          setMedidaCorrectivaTexto("");
          setEvidenciaCierreArchivo(null);
          setCierreError(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Detalle del hallazgo</DialogTitle>
              <div className="flex items-center gap-2">
                {selected && selected.estado !== "cerrado" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={descargarPDFHallazgo}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Descargar PDF
                  </Button>
                )}
                {selected && opciones.puedeEditar ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => void onEliminar(selected)}
                    disabled={saving}
                  >
                    Eliminar hallazgo
                  </Button>
                ) : null}
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {selected ? (
              <div className="space-y-3 text-sm px-6 pr-4">
              <p className="font-medium text-slate-900">{selected.descripcion}</p>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {selected.trabajadorNombre ?? "No asociado"}</div>
                <div className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {fmtFecha(selected.fechaCompromiso)}</div>
                <div>Centro: {selected.centroNombre}</div>
                <div>Obligación: {selected.obligacionClave ? (obligacionesMap.get(selected.obligacionClave) ?? selected.obligacionClave) : "Sin asociar"}</div>
                <div className="col-span-2">Responsable actual: {selected.responsableNombre ?? detalle?.responsable?.nombre ?? "Por asignar"}</div>
              </div>

              {opciones.puedeEditar && selected.estado !== "cerrado" ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Responsable del hallazgo</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Área de referencia</Label>
                      <Select value={detalleAreaId || "todas"} onValueChange={(value) => setDetalleAreaId(value === "todas" ? "" : value)}>
                        <SelectTrigger><SelectValue placeholder="Todas las áreas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todas">Todas las áreas</SelectItem>
                          {opciones.areas.map((area) => (
                            <SelectItem key={area.id} value={area.id}>{area.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Responsable</Label>
                      <Select value={detalleResponsableId} onValueChange={setDetalleResponsableId}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar responsable" /></SelectTrigger>
                        <SelectContent>
                          {responsablesDetalle.length === 0 ? (
                            <SelectItem value="none">Sin personal disponible</SelectItem>
                          ) : (
                            responsablesDetalle.map((trabajador) => (
                              <SelectItem key={trabajador.id} value={trabajador.id}>
                                {trabajador.nombreCompleto}{trabajador.cargoNombre ? ` · ${trabajador.cargoNombre}` : ""}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void onActualizarResponsable(selected)}
                    disabled={saving || detalleResponsableId === "none"}
                  >
                    Guardar responsable
                  </Button>
                </div>
              ) : null}

              {detalleLoading ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
                  Cargando evidencias y medida correctiva...
                </div>
              ) : null}

              {detalleError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700">
                  {detalleError}
                </div>
              ) : null}

              {detalle?.medidasCorrectivas?.length ? (
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Medidas correctivas</p>
                  <div className="mt-2 space-y-2">
                    {detalle.medidasCorrectivas.map((medida) => (
                      <div key={medida.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-slate-700">{medida.descripcion}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">Responsable: {medida.responsable}</span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">Compromiso: {fmtFecha(medida.fechaCompromiso)}</span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">Estado: {medida.estado}</span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">Evidencia cierre: {medida.evidenciaCierre ? "Sí" : "No"}</span>
                        </div>
                        {opciones.puedeEditar && selected?.estado !== "cerrado" ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Select
                              value={medida.estado}
                              onValueChange={(v) => void onActualizarEstadoMedida(selected.id, medida.id, v as "pendiente" | "en_proceso" | "completada" | "descartada")}
                            >
                              <SelectTrigger className="h-8 w-40 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendiente">pendiente</SelectItem>
                                <SelectItem value="en_proceso">en_proceso</SelectItem>
                                <SelectItem value="completada">completada</SelectItem>
                                <SelectItem value="descartada">descartada</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void onMarcarMedidaCompletada(selected.id, medida.id)}
                              disabled={saving || medida.estado === "completada"}
                            >
                              Marcar medida como completada
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600 space-y-2">
                  <p>Sin medida correctiva registrada. Pendiente de definir.</p>
                  {selected && opciones.puedeEditar && selected.estado !== "cerrado" ? (
                    <>
                      <Textarea
                        rows={3}
                        value={medidaCorrectivaTexto}
                        onChange={(e) => setMedidaCorrectivaTexto(e.target.value)}
                        placeholder="Describe la medida correctiva para gestionar el cierre del hallazgo"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void onRegistrarMedidaCorrectiva(selected.id)}
                        disabled={saving || !medidaCorrectivaTexto.trim()}
                      >
                        Registrar medida correctiva
                      </Button>
                    </>
                  ) : null}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Evidencias asociadas</p>
                {detalle?.evidencias.length ? (
                  <div className="space-y-2">
                    {detalle.evidencias.map((ev) => (
                      <div key={ev.id} className="rounded-lg border border-slate-200 bg-white p-2">
                        <p className="text-sm font-medium text-slate-900">{ev.titulo}</p>
                        <p className="text-xs text-slate-500">Tipo: {ev.tipo} · Estado: {ev.estado} · Fecha: {fmtFecha(ev.fechaEvidencia)}</p>
                        {ev.observacion ? <p className="mt-1 text-sm text-slate-700">{ev.observacion}</p> : null}
                        {ev.archivoUrl ? (
                          <div className="mt-2 flex items-center gap-2">
                            <img src={ev.archivoUrl} alt={ev.archivoNombre ?? ev.titulo} className="h-14 w-14 rounded border object-cover" />
                            <a href={ev.archivoUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-emerald-700 hover:text-emerald-800">
                              Ver imagen
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
                    Sin evidencias asociadas.
                  </div>
                )}
              </div>

              {selected && opciones.puedeEditar && selected.estado !== "cerrado" ? (
                <div className="space-y-2">
                  <Label>Evidencia de cierre</Label>
                  <Textarea
                    rows={2}
                    value={evidenciaCierreTexto}
                    onChange={(e) => setEvidenciaCierreTexto(e.target.value)}
                    placeholder="Describe la evidencia de cierre asociada a la medida correctiva"
                  />
                  
                  <div className="mt-2 space-y-1">
                    <Label htmlFor="cierre-archivo" className="text-sm">Adjuntar archivo (opcional)</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        id="cierre-archivo"
                        type="file"
                        onChange={(e) => setEvidenciaCierreArchivo(e.target.files?.[0] ?? null)}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
                      />
                      {evidenciaCierreArchivo && (
                        <div className="text-xs text-emerald-700 flex items-center gap-1">
                          <File className="h-3 w-3" />
                          {evidenciaCierreArchivo.name}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Permitidos: PDF, DOC, DOCX, JPG, PNG, XLSX. Máx. 10 MB.
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void onAgregarEvidenciaCierre(selected.id)}
                    disabled={saving || uploadingEvidencia || !evidenciaCierreTexto.trim()}
                  >
                    {uploadingEvidencia ? "Cargando archivo..." : "Agregar evidencia de cierre"}
                  </Button>

                  <Label>Comentario de cierre (complementario)</Label>
                  <Textarea
                    rows={3}
                    value={comentarioCierre}
                    onChange={(e) => setComentarioCierre(e.target.value)}
                    placeholder="Describe la gestión realizada para cerrar el hallazgo"
                  />
                  {cierreError ? (
                    <p className="text-xs text-rose-700">{cierreError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
            ) : null}
          </div>
          <DialogFooter className="border-t pt-4">
            {selected && opciones.puedeEditar && selected.estado !== "cerrado" ? (
              <>
                <Button variant="outline" onClick={() => selected && openEdit(selected)}>Editar</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => selected && void onCerrar(selected)}>
                  Cerrar hallazgo
                </Button>
              </>
            ) : null}
            <Button variant="outline" onClick={() => setSelected(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
