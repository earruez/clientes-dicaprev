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
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  File,
  ImageIcon,
  Layers3,
  Plus,
  Search,
  Sparkles,
  User,
  FileText,
  Save,
  Upload,
  X,
} from "lucide-react";
import { guardarFichaHallazgoPdf, guardarInformeHallazgosPdf } from "@/lib/hallazgos/generar-informe-hallazgos-pdf";
import { fechaChile, filtrarHallazgosInforme, rangoInformeHallazgos, type PeriodicidadInformeHallazgos } from "@/lib/hallazgos/informe-periodico";
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
  moverHallazgosEmpresa,
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
  // Fecha civil (YYYY-MM-DD) sin desplazamiento por zona horaria.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso.slice(8, 10) + "-" + iso.slice(5, 7) + "-" + iso.slice(0, 4);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL", { timeZone: "America/Santiago" });
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
        const maxWidth = 1000;
        const maxHeight = 1000;
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
        resolve(canvas.toDataURL("image/jpeg", 0.64));
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    });
  } catch {
    return null;
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
  const [tipoInforme, setTipoInforme] = useState<PeriodicidadInformeHallazgos>("mensual");
  const [fechaReferenciaInforme, setFechaReferenciaInforme] = useState(() => fechaChile(new Date()));
  const [errorInforme, setErrorInforme] = useState("");
  const [eliminandoMasivo, setEliminandoMasivo] = useState(false);
  const [moviendoEmpresa, setMoviendoEmpresa] = useState(false);
  const [modalMoverEmpresaOpen, setModalMoverEmpresaOpen] = useState(false);
  const [empresaDestinoId, setEmpresaDestinoId] = useState("");
  const [moverEmpresaError, setMoverEmpresaError] = useState<string | null>(null);
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

  async function onMoverSeleccionadosEmpresa() {
    if (
      !opciones.puedeMoverEmpresa ||
      hallazgosSeleccionados.size === 0 ||
      !empresaDestinoId
    ) {
      return;
    }

    const empresaDestino = opciones.empresasDestino.find(
      (empresa) => empresa.id === empresaDestinoId,
    );

    if (!empresaDestino) {
      setMoverEmpresaError("Selecciona una empresa destino válida.");
      return;
    }

    const total = hallazgosSeleccionados.size;
    const ok = window.confirm(
      `Vas a mover ${total} hallazgo${total === 1 ? "" : "s"} a ${empresaDestino.nombre}. Se copiarán sus archivos y se limpiarán centro, trabajador y vínculos internos que pertenezcan a la empresa actual. ¿Continuar?`,
    );
    if (!ok) return;

    try {
      setMoviendoEmpresa(true);
      setMoverEmpresaError(null);

      const resultado = await moverHallazgosEmpresa(
        Array.from(hallazgosSeleccionados),
        empresaDestinoId,
      );

      await reloadHallazgos();
      setHallazgosSeleccionados(new Set());
      setEmpresaDestinoId("");
      setModalMoverEmpresaOpen(false);

      window.alert(
        `Movimiento completado: ${resultado.hallazgosMovidos} hallazgos, ${resultado.evidenciasMovidas} evidencias y ${resultado.archivosCopiados + resultado.archivosExistentes} archivos verificados.`,
      );
    } catch (error) {
      setMoverEmpresaError(
        error instanceof Error ? error.message : "No fue posible mover los hallazgos.",
      );
    } finally {
      setMoviendoEmpresa(false);
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
    setGenerandoInforme(true);
    setCierreError(null);
    try {
      const fotos = (detalle?.evidencias ?? []).filter(
        (e) => e.tipo === "fotografia" || e.archivoUrl?.match(/\.(jpg|jpeg|png|webp)$/i),
      );
      const fotografias = await Promise.all(fotos.map(async (foto) => ({
        titulo: foto.titulo,
        src: foto.archivoUrl ? await imageUrlToDataUrl(foto.archivoUrl) : null,
      })));
      guardarFichaHallazgoPdf({
        hallazgo: selected,
        detalle,
        empresaNombre: opciones.empresaNombre,
        fotos: fotografias.filter((f): f is { titulo: string; src: string } => Boolean(f.src)),
      });
    } catch (error) {
      console.error("No se pudo generar la ficha de hallazgo:", error);
      setCierreError("No fue posible generar el PDF del hallazgo.");
    } finally {
      setGenerandoInforme(false);
    }
  }

  async function descargarInformeMasivo() {
    if (!hallazgosSeleccionados.size) return;
    setGenerandoInforme(true);
    setErrorInforme("");
    try {
      guardarInformeHallazgosPdf({
        empresaNombre: opciones.empresaNombre,
        tipo: "seleccion",
        referencia: fechaChile(new Date()),
        hallazgos: hallazgos.filter((h) => hallazgosSeleccionados.has(h.id)),
      });
      setHallazgosSeleccionados(new Set());
    } catch (error) {
      console.error("Error al generar informe seleccionado:", error);
      setErrorInforme("No fue posible generar el PDF de los hallazgos seleccionados.");
    } finally {
      setGenerandoInforme(false);
    }
  }

  async function descargarInformePeriodo() {
    setGenerandoInforme(true);
    setErrorInforme("");
    try {
      const periodo = rangoInformeHallazgos(tipoInforme, fechaReferenciaInforme);
      const items = filtrarHallazgosInforme(hallazgos, tipoInforme, fechaReferenciaInforme);
      guardarInformeHallazgosPdf({
        empresaNombre: opciones.empresaNombre,
        tipo: tipoInforme,
        referencia: periodo.hasta,
        hallazgos: items,
      });
    } catch (error) {
      console.error("Error al generar informe periódico:", error);
      setErrorInforme("No fue posible generar el informe del período seleccionado.");
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

  const resumenPeriodo = useMemo(
    () => filtrarHallazgosInforme(hallazgos, tipoInforme, fechaReferenciaInforme),
    [hallazgos, tipoInforme, fechaReferenciaInforme],
  );
  const rangoPeriodo = useMemo(
    () => rangoInformeHallazgos(tipoInforme, fechaReferenciaInforme),
    [tipoInforme, fechaReferenciaInforme],
  );

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
              {hallazgosSeleccionados.size > 0 && opciones.puedeMoverEmpresa ? (
                <Button
                  onClick={() => {
                    setMoverEmpresaError(null);
                    setModalMoverEmpresaOpen(true);
                  }}
                  disabled={moviendoEmpresa || eliminandoMasivo || generandoInforme}
                  variant="outline"
                  className="rounded-full px-5 py-2.5 text-sm font-medium"
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Mover a empresa ({hallazgosSeleccionados.size})
                </Button>
              ) : null}
              {hallazgosSeleccionados.size > 0 ? (
                <Button
                  onClick={() => void onEliminarSeleccionados()}
                  disabled={eliminandoMasivo || generandoInforme || moviendoEmpresa}
                  variant="destructive"
                  className="rounded-full px-5 py-2.5 text-sm font-medium shadow-sm"
                >
                  Eliminar seleccionados ({hallazgosSeleccionados.size})
                </Button>
              ) : null}
              {hallazgosSeleccionados.size > 0 ? (
                <Button
                  onClick={() => void descargarInformeMasivo()}
                  disabled={generandoInforme || eliminandoMasivo || moviendoEmpresa}
                  className="bg-sky-600 hover:bg-sky-700 text-white rounded-full px-5 py-2.5 text-sm font-medium shadow-sm"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generar informe ({hallazgosSeleccionados.size})
                </Button>
              ) : null}
            </div>
          }
        />

        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-800">Informes · NextPrev</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">Informe de hallazgos por período</h2>
                <p className="mt-1 text-sm text-slate-600">PDF corporativo liviano, con indicadores y una tabla por estado. No requiere seleccionar filas.</p>
              </div>
              <div className="rounded-xl bg-blue-50 px-3 py-2 text-right text-xs font-semibold text-blue-800">
                {resumenPeriodo.length} hallazgo(s) en el período
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Periodicidad</span>
                <select aria-label="Periodicidad del informe" value={tipoInforme}
                  onChange={(e) => setTipoInforme(e.target.value as PeriodicidadInformeHallazgos)}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800">
                  <option value="diario">Diario</option>
                  <option value="semanal">Semanal (lunes a domingo)</option>
                  <option value="mensual">Mensual</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Fecha de referencia</span>
                <Input type="date" aria-label="Fecha de referencia del informe" value={fechaReferenciaInforme}
                  onChange={(e) => setFechaReferenciaInforme(e.target.value)} className="h-11" />
              </label>
              <Button disabled={generandoInforme || !fechaReferenciaInforme} onClick={() => void descargarInformePeriodo()}
                className="h-11 bg-[#07366f] px-5 text-white hover:bg-[#052a57]">
                <Download className="mr-2 h-4 w-4" />{generandoInforme ? "Generando…" : "Descargar PDF"}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Período: {fmtFecha(rangoPeriodo.desde)} a {fmtFecha(rangoPeriodo.hasta)} · Filtrado por fecha de creación del hallazgo.
              Los estados y vencimientos reflejan la situación actual al generar el PDF.
            </p>
            {errorInforme && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorInforme}</p>}
          </CardContent>
        </Card>

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

        <Dialog
          open={modalMoverEmpresaOpen}
          onOpenChange={(open) => {
            if (moviendoEmpresa) return;
            setModalMoverEmpresaOpen(open);
            if (!open) {
              setEmpresaDestinoId("");
              setMoverEmpresaError(null);
            }
          }}
        >
          <DialogContent
            className="max-w-md"
            onPointerDownOutside={(event) => event.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Mover hallazgos a otra empresa</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-800">
                Se moverán {hallazgosSeleccionados.size} hallazgo
                {hallazgosSeleccionados.size === 1 ? "" : "s"} y sus evidencias. Los archivos
                se copiarán a la empresa destino. Centro, trabajador y vínculos internos de la
                empresa actual se limpiarán para evitar referencias cruzadas.
              </div>

              <div className="space-y-2">
                <Label>Empresa destino</Label>
                <Select value={empresaDestinoId} onValueChange={setEmpresaDestinoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {opciones.empresasDestino.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {moverEmpresaError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {moverEmpresaError}
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setModalMoverEmpresaOpen(false)}
                disabled={moviendoEmpresa}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => void onMoverSeleccionadosEmpresa()}
                disabled={moviendoEmpresa || !empresaDestinoId}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {moviendoEmpresa ? "Moviendo..." : "Mover hallazgos"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <HallazgoFotoIA
          open={modalIAOpen}
          onOpenChange={setModalIAOpen}
          opciones={{ empresaId: opciones.empresaId, centros: opciones.centros, areas: opciones.areas }}
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
                    <th className="py-3 text-left">Fecha hallazgo</th>
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
                      <td className="py-3 text-slate-600 whitespace-nowrap">{fmtFecha(h.fechaCreacion)}</td>
                      <td className="py-3 text-slate-600 whitespace-nowrap">{fmtFecha(h.fechaCompromiso)}</td>
                      <td className="py-3 pr-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => void openDetalle(h)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {hallazgosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-slate-500">
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
        <DialogContent
          className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-3rem)]"
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
            <DialogTitle>{editId ? "Editar hallazgo" : "Nuevo hallazgo"}</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-4">
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

          <DialogFooter className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
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
        <DialogContent
          withClose={false}
          className="h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 bg-[#071225] p-0 text-white sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-slate-700/70"
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <div className="flex h-full min-h-0 flex-col">
            <header className="shrink-0 border-b border-slate-800/90 bg-[#071225]/95 px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))] backdrop-blur sm:px-6 sm:pt-5">
              <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800/80 text-slate-100 transition hover:bg-slate-700"
                  aria-label="Volver"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <p className="truncate text-center text-[17px] font-semibold tracking-tight text-white">Hallazgo</p>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800/80 text-slate-100 transition hover:bg-slate-700"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
              {selected ? (
                <div className="mx-auto max-w-xl space-y-4">
                  <section className="rounded-2xl border border-slate-700/80 bg-slate-900/55 p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                          selected.prioridad === "critica" || selected.prioridad === "alta"
                            ? "bg-rose-400/10 text-rose-300"
                            : selected.prioridad === "media"
                              ? "bg-amber-400/10 text-amber-300"
                              : "bg-sky-400/10 text-sky-300",
                        )}
                      >
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold leading-6 text-white">
                          {selected.descripcion.split(".")[0] || "Detalle del hallazgo"}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-200">
                            <Clock className="h-3.5 w-3.5" />
                            {ESTADO_CFG[selected.estado]?.label ?? selected.estado}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-medium",
                              selected.prioridad === "critica" || selected.prioridad === "alta"
                                ? "bg-rose-400/10 text-rose-200"
                                : selected.prioridad === "media"
                                  ? "bg-amber-400/10 text-amber-200"
                                  : "bg-sky-400/10 text-sky-200",
                            )}
                          >
                            {PRIORIDAD_CFG[selected.prioridad]?.label ?? selected.prioridad}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-5 text-slate-400">{selected.descripcion}</p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-700/80 bg-slate-900/55 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-white">Información general</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={descargarPDFHallazgo}
                        className="h-9 gap-2 px-2 text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                    <div className="divide-y divide-slate-800">
                      <div className="flex items-center justify-between gap-4 py-2.5">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Building2 className="h-4 w-4" />
                          Centro de trabajo
                        </div>
                        <span className="text-right text-sm font-medium text-slate-100">{selected.centroNombre}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 py-2.5">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Layers3 className="h-4 w-4" />
                          Área
                        </div>
                        <span className="text-right text-sm font-medium text-slate-100">
                          {opciones.areas.find((area) => area.id === detalleAreaId)?.nombre ?? "Sin área"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 py-2.5">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <User className="h-4 w-4" />
                          Responsable
                        </div>
                        <span className="max-w-[55%] text-right text-sm font-medium text-slate-100">
                          {selected.responsableNombre ?? detalle?.responsable?.nombre ?? "Por asignar"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 py-2.5">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <CalendarDays className="h-4 w-4" />
                          Compromiso
                        </div>
                        <span className="text-right text-sm font-medium text-slate-100">{fmtFecha(selected.fechaCompromiso)}</span>
                      </div>
                    </div>
                  </section>

                  {opciones.puedeEditar && selected.estado !== "cerrado" ? (
                    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/55 p-4">
                      <h3 className="mb-3 text-base font-semibold text-white">Responsable del hallazgo</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm text-slate-300">Área de referencia</Label>
                          <Select value={detalleAreaId || "todas"} onValueChange={(value) => setDetalleAreaId(value === "todas" ? "" : value)}>
                            <SelectTrigger className="h-11 border-slate-600 bg-slate-950/50 text-white">
                              <SelectValue placeholder="Todas las áreas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todas">Todas las áreas</SelectItem>
                              {opciones.areas.map((area) => (
                                <SelectItem key={area.id} value={area.id}>{area.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm text-slate-300">Responsable</Label>
                          <Select value={detalleResponsableId} onValueChange={setDetalleResponsableId}>
                            <SelectTrigger className="h-11 border-slate-600 bg-slate-950/50 text-white">
                              <SelectValue placeholder="Seleccionar responsable" />
                            </SelectTrigger>
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
                        className="mt-3 border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800 hover:text-white"
                      >
                        Guardar responsable
                      </Button>
                    </section>
                  ) : null}

                  {detalleLoading ? (
                    <div className="rounded-xl border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-200">
                      Cargando evidencias y medidas correctivas...
                    </div>
                  ) : null}

                  {detalleError ? (
                    <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">
                      {detalleError}
                    </div>
                  ) : null}

                  <section className="rounded-2xl border border-slate-700/80 bg-slate-900/55 p-4">
                    <h3 className="mb-3 text-base font-semibold text-white">Medidas correctivas</h3>
                    {detalle?.medidasCorrectivas?.length ? (
                      <div className="space-y-3">
                        {detalle.medidasCorrectivas.map((medida) => (
                          <div key={medida.id} className="rounded-xl border border-slate-700 bg-slate-950/35 p-3">
                            <p className="text-sm leading-5 text-slate-200">{medida.descripcion}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
                                {medida.estado}
                              </span>
                              <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
                                {fmtFecha(medida.fechaCompromiso)}
                              </span>
                            </div>
                            {opciones.puedeEditar && selected.estado !== "cerrado" ? (
                              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                                <Select
                                  value={medida.estado}
                                  onValueChange={(v) => void onActualizarEstadoMedida(selected.id, medida.id, v as "pendiente" | "en_proceso" | "completada" | "descartada")}
                                >
                                  <SelectTrigger className="h-10 border-slate-600 bg-slate-900 text-xs text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pendiente">Pendiente</SelectItem>
                                    <SelectItem value="en_proceso">En proceso</SelectItem>
                                    <SelectItem value="completada">Completada</SelectItem>
                                    <SelectItem value="descartada">Descartada</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void onMarcarMedidaCompletada(selected.id, medida.id)}
                                  disabled={saving || medida.estado === "completada"}
                                  className="h-10 border-slate-600 bg-transparent text-xs text-slate-100 hover:bg-slate-800 hover:text-white"
                                >
                                  Marcar completada
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-700 bg-slate-950/35 p-3">
                        <p className="text-sm text-slate-400">Sin medida correctiva registrada.</p>
                        {opciones.puedeEditar && selected.estado !== "cerrado" ? (
                          <div className="mt-3 space-y-2">
                            <Textarea
                              rows={3}
                              value={medidaCorrectivaTexto}
                              onChange={(e) => setMedidaCorrectivaTexto(e.target.value)}
                              placeholder="Describe la medida correctiva"
                              className="resize-none border-slate-600 bg-slate-900 text-white placeholder:text-slate-500"
                            />
                            <Button
                              size="sm"
                              onClick={() => void onRegistrarMedidaCorrectiva(selected.id)}
                              disabled={saving || !medidaCorrectivaTexto.trim()}
                              className="bg-emerald-500 text-white hover:bg-emerald-600"
                            >
                              Registrar medida
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-slate-700/80 bg-slate-900/55 p-4">
                    <h3 className="mb-3 text-base font-semibold text-white">Evidencias asociadas</h3>
                    {detalle?.evidencias.length ? (
                      <div className="space-y-3">
                        {detalle.evidencias.map((ev) => (
                          <div key={ev.id} className="flex gap-3 rounded-xl border border-slate-700 bg-slate-950/35 p-3">
                            {ev.archivoUrl ? (
                              <a
                                href={ev.archivoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-800"
                              >
                                <img
                                  src={ev.archivoUrl}
                                  alt={ev.archivoNombre ?? ev.titulo}
                                  className="h-full w-full object-cover"
                                  onError={(event) => {
                                    event.currentTarget.style.display = "none";
                                  }}
                                />
                              </a>
                            ) : (
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                                <FileText className="h-5 w-5" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold leading-5 text-white">{ev.titulo}</p>
                              {ev.observacion ? (
                                <p className="mt-1 text-sm leading-5 text-slate-300">{ev.observacion}</p>
                              ) : null}
                              <p className="mt-1 text-xs leading-4 text-slate-400">
                                Tipo: {ev.tipo} · Estado: {ev.estado}
                              </p>
                              <p className="text-xs text-slate-500">Fecha: {fmtFecha(ev.fechaEvidencia)}</p>
                              {ev.archivoUrl ? (
                                <a
                                  href={ev.archivoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300"
                                >
                                  <ImageIcon className="h-4 w-4" />
                                  Ver imagen
                                </a>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-700 bg-slate-950/35 p-3 text-sm text-slate-400">
                        Sin evidencias asociadas.
                      </div>
                    )}
                  </section>

                  {opciones.puedeEditar && selected.estado !== "cerrado" ? (
                    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/55 p-4">
                      <h3 className="mb-3 text-base font-semibold text-white">Evidencia de cierre</h3>
                      <div className="space-y-3">
                        <Textarea
                          rows={4}
                          maxLength={500}
                          value={evidenciaCierreTexto}
                          onChange={(e) => setEvidenciaCierreTexto(e.target.value)}
                          placeholder="Describe la evidencia de cierre asociada a la medida correctiva..."
                          className="min-h-[110px] resize-none border-slate-600 bg-slate-950/50 text-white placeholder:text-slate-500"
                        />

                        <label
                          htmlFor="cierre-archivo"
                          className="flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-600 bg-slate-950/35 px-4 py-3 transition hover:border-emerald-400/60"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
                            <Upload className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-100">
                              {evidenciaCierreArchivo ? evidenciaCierreArchivo.name : "Seleccionar archivo"}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">PDF, DOC, DOCX, JPG, PNG o XLSX · máx. 10 MB</p>
                          </div>
                        </label>
                        <input
                          id="cierre-archivo"
                          type="file"
                          onChange={(e) => setEvidenciaCierreArchivo(e.target.files?.[0] ?? null)}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
                        />

                        <div className="space-y-1.5">
                          <Label className="text-sm text-slate-300">Comentario de cierre</Label>
                          <Textarea
                            rows={3}
                            value={comentarioCierre}
                            onChange={(e) => setComentarioCierre(e.target.value)}
                            placeholder="Describe la gestión realizada para cerrar el hallazgo"
                            className="resize-none border-slate-600 bg-slate-950/50 text-white placeholder:text-slate-500"
                          />
                        </div>
                      </div>

                      {cierreError ? (
                        <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                          {cierreError}
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {opciones.puedeEditar ? (
                    <div className="flex items-center justify-between gap-3 px-1 pb-2">
                      {selected.estado !== "cerrado" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(selected)}
                          className="text-slate-300 hover:bg-slate-800 hover:text-white"
                        >
                          Editar hallazgo
                        </Button>
                      ) : <span />}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void onEliminar(selected)}
                        disabled={saving}
                        className="text-rose-300 hover:bg-rose-400/10 hover:text-rose-200"
                      >
                        Eliminar
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <footer className="shrink-0 border-t border-slate-800 bg-[#071225]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur sm:px-6 sm:pb-4">
              <div className="mx-auto max-w-xl">
                {selected && opciones.puedeEditar && selected.estado !== "cerrado" ? (
                  <div className="grid grid-cols-[0.85fr_1.15fr] gap-2.5">
                    <Button
                      variant="outline"
                      onClick={() => selected && void onAgregarEvidenciaCierre(selected.id)}
                      disabled={saving || uploadingEvidencia || !evidenciaCierreTexto.trim()}
                      className="h-12 border-slate-500 bg-transparent px-3 text-sm font-semibold text-white hover:bg-slate-800 hover:text-white disabled:border-slate-700 disabled:text-slate-500"
                    >
                      {uploadingEvidencia ? (
                        "Guardando..."
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4 shrink-0" />
                          <span className="truncate">Guardar evidencia</span>
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => selected && void onCerrar(selected)}
                      disabled={saving}
                      className="h-12 bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-400"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">Cerrar hallazgo</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setSelected(null)}
                    className="h-12 w-full border-slate-500 bg-transparent text-sm font-semibold text-white hover:bg-slate-800 hover:text-white"
                  >
                    Cerrar
                  </Button>
                )}
              </div>
            </footer>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
