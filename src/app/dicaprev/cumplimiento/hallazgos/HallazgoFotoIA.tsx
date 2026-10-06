"use client";

import React, { useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, ArrowLeft, Building2, CheckCircle2, Camera, FileText, ImageIcon, Layers3, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { OpcionesHallazgo } from "./actions";
import {
  analizarFotoHallazgoIA,
  confirmarHallazgoDesdeFotoIA,
  type SugerenciaHallazgoIA,
} from "./ia";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opciones: Pick<OpcionesHallazgo, "empresaId" | "centros" | "areas">;
  iaConfigurada: boolean;
  onConfirmed: () => Promise<void>;
};

type SugerenciaAnalizada = {
  id: string;
  sugerencia: SugerenciaHallazgoIA;
  archivo: {
    url: string;
    nombre: string;
    tipo: string;
    previewUrl?: string;
  };
};

const IA_NO_CONFIGURADA = "IA no configurada en este entorno. Configura OPENAI_API_KEY para analizar fotografias.";

type HallazgoIADraft = {
  version: 1;
  centroTrabajoId: string;
  areaId: string;
  observacion: string;
  sugerencias: SugerenciaAnalizada[];
  sugerenciasSeleccionadas: string[];
  guardadoEn: string;
};

function prioridadClass(confianza: number) {
  if (confianza >= 85) return "bg-red-100 text-red-700 border-red-200";
  if (confianza >= 70) return "bg-rose-100 text-rose-700 border-rose-200";
  if (confianza >= 50) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function tipoLabel(tipo: SugerenciaHallazgoIA["tipo"]) {
  switch (tipo) {
    case "condicion_insegura":
      return "Condición insegura";
    case "acto_inseguro":
      return "Acto inseguro";
    case "documental":
      return "Documental";
    case "emergencia":
      return "Emergencia";
    default:
      return "Otro";
  }
}

export default function HallazgoFotoIA({ open, onOpenChange, opciones, iaConfigurada, onConfirmed }: Props) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef(0);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [centroTrabajoId, setCentroTrabajoId] = useState<string>("");
  const [areaId, setAreaId] = useState<string>("");
  const [observacion, setObservacion] = useState("");
  const [sugerencias, setSugerencias] = useState<SugerenciaAnalizada[]>([]);
  const [sugerenciasSeleccionadas, setSugerenciasSeleccionadas] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  const [confirmingBatch, setConfirmingBatch] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [procesandoIndex, setProcesandoIndex] = useState(-1);
  const [fotoPreview, setFotoPreview] = useState<{ url: string; nombre: string } | null>(null);
  const [loadedDraftKey, setLoadedDraftKey] = useState<string | null>(null);
  const [draftRecovered, setDraftRecovered] = useState(false);
  const [modoResultados, setModoResultados] = useState(false);

  const draftKey = useMemo(
    () => `nextprev:hallazgos-ia:draft:v1:${opciones.empresaId}`,
    [opciones.empresaId],
  );

  const imagenPreview = useMemo(() => {
    if (archivos.length === 0) return null;
    return URL.createObjectURL(archivos[0]);
  }, [archivos]);

  React.useEffect(() => {
    return () => {
      if (imagenPreview) {
        URL.revokeObjectURL(imagenPreview);
      }
    };
  }, [imagenPreview]);

  React.useEffect(() => {
    if (!open || loadedDraftKey === draftKey || typeof window === "undefined") return;

    // Al cambiar de empresa no se reutiliza estado de la empresa anterior.
    setArchivos([]);
    setCentroTrabajoId("");
    setAreaId("");
    setObservacion("");
    setSugerencias([]);
    setSugerenciasSeleccionadas(new Set());
    setModoResultados(false);
    setError(null);
    setConfirmingKey(null);
    setConfirmingBatch(false);
    setProcesandoIndex(-1);
    setFotoPreview(null);
    setDraftRecovered(false);

    try {
      const raw = window.sessionStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<HallazgoIADraft>;
        const sugerenciasGuardadas = Array.isArray(draft.sugerencias)
          ? draft.sugerencias.map((item) => ({
              ...item,
              archivo: {
                ...item.archivo,
                previewUrl: undefined,
              },
            }))
          : [];
        const idsValidos = new Set(sugerenciasGuardadas.map((item) => item.id));
        const seleccionadas = Array.isArray(draft.sugerenciasSeleccionadas)
          ? draft.sugerenciasSeleccionadas.filter((id) => idsValidos.has(id))
          : [];

        setCentroTrabajoId(typeof draft.centroTrabajoId === "string" ? draft.centroTrabajoId : "");
        setAreaId(typeof draft.areaId === "string" ? draft.areaId : "");
        setObservacion(typeof draft.observacion === "string" ? draft.observacion : "");
        setSugerencias(sugerenciasGuardadas);
        setSugerenciasSeleccionadas(new Set(seleccionadas));
        setModoResultados(sugerenciasGuardadas.length > 0);
        setDraftRecovered(
          Boolean(
            sugerenciasGuardadas.length > 0 ||
              draft.centroTrabajoId ||
              draft.areaId ||
              draft.observacion,
          ),
        );
      }
    } catch {
      window.sessionStorage.removeItem(draftKey);
    } finally {
      setLoadedDraftKey(draftKey);
    }
  }, [draftKey, loadedDraftKey, open]);

  React.useEffect(() => {
    if (!open || loadedDraftKey !== draftKey || typeof window === "undefined") return;

    const tieneDatosPersistibles =
      Boolean(centroTrabajoId || areaId || observacion.trim()) || sugerencias.length > 0;

    if (!tieneDatosPersistibles) {
      window.sessionStorage.removeItem(draftKey);
      return;
    }

    const draft: HallazgoIADraft = {
      version: 1,
      centroTrabajoId,
      areaId,
      observacion,
      sugerencias: sugerencias.map((item) => ({
        ...item,
        archivo: {
          ...item.archivo,
          previewUrl: undefined,
        },
      })),
      sugerenciasSeleccionadas: Array.from(sugerenciasSeleccionadas),
      guardadoEn: new Date().toISOString(),
    };

    window.sessionStorage.setItem(draftKey, JSON.stringify(draft));
  }, [
    areaId,
    centroTrabajoId,
    draftKey,
    loadedDraftKey,
    observacion,
    open,
    sugerencias,
    sugerenciasSeleccionadas,
  ]);

  function resetFlow(clearPersistedDraft = true) {
    setArchivos([]);
    setCentroTrabajoId("");
    setAreaId("");
    setObservacion("");
    setSugerencias([]);
    setSugerenciasSeleccionadas(new Set());
    setError(null);
    setConfirmingKey(null);
    setConfirmingBatch(false);
    setProcesandoIndex(-1);
    setFotoPreview(null);
    setDraftRecovered(false);
    setModoResultados(false);
    if (clearPersistedDraft && typeof window !== "undefined") {
      window.sessionStorage.removeItem(draftKey);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
  }

  function descartarBorrador() {
    const tieneTrabajo =
      archivos.length > 0 ||
      Boolean(centroTrabajoId || areaId || observacion.trim()) ||
      sugerencias.length > 0;

    if (tieneTrabajo) {
      const confirmar = window.confirm(
        "Se descartará el análisis de Hallazgos IA que está en curso. ¿Deseas continuar?",
      );
      if (!confirmar) return;
    }

    resetFlow(true);
    onOpenChange(false);
  }

  function agregarArchivos(files: FileList | null) {
    if (!files) return;
    const nuevos = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (archivos.length + nuevos.length > 10) {
      setError(`Máximo 10 fotos permitidas. Actualmente tienes ${archivos.length}.`);
      return;
    }
    const totales = [...archivos, ...nuevos];
    
    if (nuevos.length === 0) {
      setError("Solo se permiten imágenes (JPG, PNG, WEBP).");
      return;
    }
    
    setArchivos(totales);
    setSugerencias([]);
    setSugerenciasSeleccionadas(new Set());
    setError(null);
  }

  function removerArchivo(index: number) {
    setArchivos((prev) => prev.filter((_, i) => i !== index));
    setModoResultados(false);
    setSugerencias([]);
    setSugerenciasSeleccionadas(new Set());
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    agregarArchivos(event.target.files);
    event.currentTarget.value = "";
  }

  function onDragEnter(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current += 1;
    setIsDragActive(true);
  }

  function onDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function onDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragActive(false);
    }
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragActive(false);
    agregarArchivos(event.dataTransfer.files);
  }

  async function analizarTodasLasFotos() {
    if (archivos.length === 0) {
      setError("Debes seleccionar al menos una fotografía para analizar.");
      return;
    }

    if (!iaConfigurada) {
      setError(IA_NO_CONFIGURADA);
      return;
    }

    setError(null);
    setSugerencias([]);
    setSugerenciasSeleccionadas(new Set());

    startTransition(async () => {
      try {
        const todasLasSugerencias: SugerenciaAnalizada[] = [];
        const datosArchivos: Array<{ file: File; url: string; nombre: string; tipo: string }> = [];

        for (let i = 0; i < archivos.length; i++) {
          setProcesandoIndex(i);
          const archivo = archivos[i];

          // Subir archivo
          const formData = new FormData();
          formData.append("file", archivo);

          const uploadResponse = await fetch("/api/dicaprev/documentacion/upload", {
            method: "POST",
            body: formData,
          });

          const uploadJson = (await uploadResponse.json()) as {
            archivoUrl?: string;
            archivoNombre?: string;
            archivoTipo?: string;
            error?: string;
          };

          if (!uploadResponse.ok || !uploadJson.archivoUrl) {
            throw new Error(uploadJson.error ?? `No fue posible cargar la imagen ${i + 1}.`);
          }

          datosArchivos.push({
            file: archivo,
            url: uploadJson.archivoUrl,
            nombre: uploadJson.archivoNombre ?? archivo.name,
            tipo: uploadJson.archivoTipo ?? archivo.type,
          });

          // Analizar con IA
          const analysis = await analizarFotoHallazgoIA({
            archivoUrl: uploadJson.archivoUrl,
            archivoNombre: uploadJson.archivoNombre ?? archivo.name,
            archivoTipo: uploadJson.archivoTipo ?? archivo.type,
            centroTrabajoId: centroTrabajoId || null,
            areaId: areaId || null,
            observacion: observacion.trim() || null,
          });

          if (!analysis || typeof analysis !== "object" || !("ok" in analysis)) {
            throw new Error("No fue posible procesar la respuesta del análisis IA.");
          }

          if (!analysis.ok) {
            throw new Error(analysis.error === "IA no configurada" ? IA_NO_CONFIGURADA : analysis.error);
          }

          (analysis.sugerencias || []).forEach((sugerencia, suggestionIndex) => {
            todasLasSugerencias.push({
              id: `${i}-${suggestionIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              sugerencia,
              archivo: {
                url: uploadJson.archivoUrl!,
                nombre: uploadJson.archivoNombre ?? archivo.name,
                tipo: uploadJson.archivoTipo ?? archivo.type,
                previewUrl: URL.createObjectURL(archivo),
              },
            });
          });

          // Persistir el avance foto a foto para que un cambio de pestaña o recarga
          // no borre los análisis ya completados.
          setSugerencias([...todasLasSugerencias]);
          setSugerenciasSeleccionadas(new Set(todasLasSugerencias.map((item) => item.id)));
        }

        setSugerencias(todasLasSugerencias);
        setSugerenciasSeleccionadas(new Set(todasLasSugerencias.map((item) => item.id)));
        setModoResultados(todasLasSugerencias.length > 0);
        setProcesandoIndex(-1);
      } catch (err) {
        const message = err instanceof Error ? err.message : "No fue posible analizar las imágenes.";
        setError(message);
        setProcesandoIndex(-1);
      }
    });
  }

  async function handleConfirmar(item: SugerenciaAnalizada) {
    const confirmationKey = item.id;
    setConfirmingKey(confirmationKey);
    setError(null);

    try {
      await confirmarHallazgoDesdeFotoIA({
        sugerencia: item.sugerencia,
        archivoUrl: item.archivo.url,
        archivoNombre: item.archivo.nombre,
        archivoTipo: item.archivo.tipo,
        centroTrabajoId: centroTrabajoId || null,
        areaId: areaId || null,
        observacion: observacion.trim() || null,
      });
      await onConfirmed();

      const restantes = sugerencias.filter((current) => current.id !== item.id);
      if (restantes.length === 0) {
        resetFlow(true);
        onOpenChange(false);
        return;
      }

      setSugerencias(restantes);
      setSugerenciasSeleccionadas((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No fue posible confirmar el hallazgo.";
      setError(message);
    } finally {
      setConfirmingKey(null);
    }
  }

  async function handleConfirmarSeleccionadas() {
    if (sugerenciasSeleccionadas.size === 0) {
      setError("Selecciona al menos una sugerencia para crear hallazgos.");
      return;
    }

    const seleccionadas = sugerencias.filter((item) => sugerenciasSeleccionadas.has(item.id));
    const conBajaConfianza = seleccionadas.some((item) => item.sugerencia.confianza < 20);
    if (conBajaConfianza) {
      const ok = window.confirm(
        "Hay sugerencias no concluyentes dentro de la selección. ¿Deseas crear igualmente todos los hallazgos seleccionados?",
      );
      if (!ok) return;
    }

    setConfirmingBatch(true);
    setError(null);

    try {
      for (const item of seleccionadas) {
        await confirmarHallazgoDesdeFotoIA({
          sugerencia: item.sugerencia,
          archivoUrl: item.archivo.url,
          archivoNombre: item.archivo.nombre,
          archivoTipo: item.archivo.tipo,
          centroTrabajoId: centroTrabajoId || null,
          areaId: areaId || null,
          observacion: observacion.trim() || null,
        });
      }

      await onConfirmed();

      const idsConfirmados = new Set(seleccionadas.map((item) => item.id));
      const restantes = sugerencias.filter((item) => !idsConfirmados.has(item.id));

      if (restantes.length === 0) {
        resetFlow(true);
        onOpenChange(false);
        return;
      }

      setSugerencias(restantes);
      setSugerenciasSeleccionadas(new Set());
    } catch (err) {
      const message = err instanceof Error ? err.message : "No fue posible crear los hallazgos seleccionados.";
      setError(message);
    } finally {
      setConfirmingBatch(false);
    }
  }

  function handleDescartar(index: number) {
    setSugerencias((prev) => {
      const target = prev[index];
      if (!target) return prev;
      setSugerenciasSeleccionadas((selected) => {
        const next = new Set(selected);
        next.delete(target.id);
        return next;
      });
      return prev.filter((_, idx) => idx !== index);
    });
  }

  function toggleSeleccion(id: string, checked: boolean) {
    setSugerenciasSeleccionadas((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const tieneTrabajoEnCurso =
    archivos.length > 0 ||
    Boolean(centroTrabajoId || areaId || observacion.trim()) ||
    sugerencias.length > 0 ||
    isPending ||
    confirmingBatch ||
    confirmingKey !== null;

  const bloqueandoResultados = confirmingBatch || confirmingKey !== null;
  const fotosAnalizadas = new Set(sugerencias.map((item) => item.archivo.nombre)).size;
  const todasSeleccionadas =
    sugerencias.length > 0 && sugerencias.every((item) => sugerenciasSeleccionadas.has(item.id));

  const inputClass =
    "h-12 border-slate-600/80 bg-slate-900/70 text-white placeholder:text-slate-500 focus:ring-emerald-500/40";
  const panelClass = "rounded-2xl border border-slate-700/80 bg-slate-900/55";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        withClose={false}
        size="lg"
        className="h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 bg-[#071225] p-0 text-white sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:rounded-2xl sm:border sm:border-slate-700/70"
        onPointerDownOutside={(event) => {
          if (tieneTrabajoEnCurso) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (tieneTrabajoEnCurso) event.preventDefault();
        }}
      >
        <div className="flex h-full min-h-0 flex-col">
          <header className="shrink-0 border-b border-slate-800/90 bg-[#071225]/95 px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))] backdrop-blur sm:px-6 sm:pt-5">
            <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
              <button
                type="button"
                disabled={bloqueandoResultados}
                onClick={() => {
                  if (modoResultados && archivos.length > 0) {
                    setModoResultados(false);
                    return;
                  }
                  handleOpenChange(false);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800/80 text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={modoResultados && archivos.length > 0 ? "Volver" : "Cerrar"}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 text-center">
                <p className="truncate text-[17px] font-semibold tracking-tight text-white">Hallazgos IA</p>
              </div>
              <button
                type="button"
                disabled={bloqueandoResultados}
                onClick={() => handleOpenChange(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800/80 text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Cerrar Hallazgos IA"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            {!modoResultados ? (
              <div className="mx-auto max-w-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-300/10">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Analizar fotos</h2>
                    <p className="mt-1 text-sm leading-5 text-slate-400">
                      La IA sugerirá hallazgos visibles en tus fotos, pero debes revisarlos y validar.
                    </p>
                  </div>
                </div>

                {draftRecovered ? (
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
                    Borrador recuperado automáticamente. Puedes continuar donde quedaste.
                  </div>
                ) : null}

                <section className={cn(panelClass, "space-y-4 p-4")}>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-100">Centro de trabajo</Label>
                    <Select
                      value={centroTrabajoId || "todos"}
                      onValueChange={(value) => setCentroTrabajoId(value === "todos" ? "" : value)}
                    >
                      <SelectTrigger className={inputClass}>
                        <div className="flex min-w-0 items-center gap-2">
                          <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                          <SelectValue placeholder="Sin centro" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Sin centro</SelectItem>
                        {opciones.centros.map((centro) => (
                          <SelectItem key={centro.id} value={centro.id}>
                            {centro.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-100">Área</Label>
                    <Select value={areaId || "todos"} onValueChange={(value) => setAreaId(value === "todos" ? "" : value)}>
                      <SelectTrigger className={inputClass}>
                        <div className="flex min-w-0 items-center gap-2">
                          <Layers3 className="h-4 w-4 shrink-0 text-slate-400" />
                          <SelectValue placeholder="Sin área" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Sin área</SelectItem>
                        {opciones.areas.map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            {area.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-sm font-semibold text-slate-100">Observación inicial</Label>
                      <span className="text-xs text-slate-500">{observacion.length}/500</span>
                    </div>
                    <Textarea
                      value={observacion}
                      maxLength={500}
                      rows={3}
                      onChange={(event) => setObservacion(event.target.value)}
                      placeholder="Describe brevemente el contexto de las fotos o qué quieres que la IA analice..."
                      className="min-h-[96px] resize-none border-slate-600/80 bg-slate-900/70 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500/40"
                    />
                  </div>
                </section>

                <section
                  className={cn(
                    panelClass,
                    "p-4 transition-colors",
                    isDragActive && "border-emerald-400/70 bg-emerald-400/5",
                  )}
                  onDragEnter={onDragEnter}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                >
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    multiple
                  />

                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-white">Fotos para analizar</h3>
                    <span className="text-sm text-slate-500">{archivos.length}/10</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                    {archivos.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="relative aspect-square overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Foto ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removerArchivo(idx)}
                          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/85 text-white shadow"
                          aria-label={`Eliminar foto ${idx + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    {archivos.length < 10 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-900/50 px-2 text-center text-slate-300 transition hover:border-emerald-400/60 hover:text-emerald-200"
                        >
                          <Camera className="h-6 w-6" />
                          <span className="text-xs font-medium">Tomar foto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-900/50 px-2 text-center text-slate-300 transition hover:border-emerald-400/60 hover:text-emerald-200"
                        >
                          <ImageIcon className="h-6 w-6" />
                          <span className="text-xs font-medium">Galería</span>
                        </button>
                      </>
                    ) : null}
                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Puedes usar la cámara del móvil o seleccionar imágenes guardadas.
                  </p>
                </section>

                {!iaConfigurada ? (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
                    {IA_NO_CONFIGURADA}
                  </div>
                ) : null}

                {isPending ? (
                  <div className="flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-sm text-sky-200">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analizando fotografías...
                  </div>
                ) : null}

                {error ? (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Sugerencias detectadas</h2>
                    <p className="mt-1 text-sm leading-5 text-slate-400">
                      Revisa los posibles hallazgos y selecciona cuáles quieres crear.
                    </p>
                  </div>
                </div>

                <div className={cn(panelClass, "grid grid-cols-2 divide-x divide-slate-700 p-3")}>
                  <div className="flex items-center gap-3 px-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-white">{fotosAnalizadas}</p>
                      <p className="text-xs text-slate-400">fotos analizadas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-white">{sugerencias.length}</p>
                      <p className="text-xs text-slate-400">sugerencias</p>
                    </div>
                  </div>
                </div>

                <label className={cn(panelClass, "flex cursor-pointer items-center gap-3 p-3")}>
                  <Checkbox
                    checked={todasSeleccionadas}
                    disabled={bloqueandoResultados}
                    onCheckedChange={(checked) => {
                      setSugerenciasSeleccionadas(
                        checked ? new Set(sugerencias.map((item) => item.id)) : new Set(),
                      );
                    }}
                  />
                  <span className="text-sm font-medium text-slate-200">Seleccionar todas</span>
                </label>

                <div className="space-y-3">
                  {sugerencias.map((item, index) => {
                    const selected = sugerenciasSeleccionadas.has(item.id);
                    const bajaConfianza = item.sugerencia.confianza < 20;
                    const preview = item.archivo.previewUrl || item.archivo.url;

                    return (
                      <article
                        key={item.id}
                        className={cn(
                          "rounded-2xl border p-3 transition",
                          selected
                            ? "border-emerald-400/80 bg-emerald-400/[0.06] shadow-[0_0_0_1px_rgba(52,211,153,0.08)]"
                            : "border-slate-700 bg-slate-900/55",
                        )}
                      >
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setFotoPreview({ url: preview, nombre: item.archivo.nombre })}
                            className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-800"
                          >
                            <img
                              src={preview}
                              alt={item.archivo.nombre}
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap gap-1.5">
                                <span className="rounded-full bg-sky-400/10 px-2 py-1 text-[11px] font-medium text-sky-200">
                                  {tipoLabel(item.sugerencia.tipo)}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-1 text-[11px] font-medium",
                                    item.sugerencia.prioridad === "critica" || item.sugerencia.prioridad === "alta"
                                      ? "bg-rose-400/10 text-rose-200"
                                      : item.sugerencia.prioridad === "media"
                                        ? "bg-amber-400/10 text-amber-200"
                                        : "bg-sky-400/10 text-sky-200",
                                  )}
                                >
                                  {item.sugerencia.prioridad === "critica"
                                    ? "Crítica"
                                    : item.sugerencia.prioridad.charAt(0).toUpperCase() + item.sugerencia.prioridad.slice(1)}
                                </span>
                              </div>
                              <Checkbox
                                checked={selected}
                                disabled={bloqueandoResultados}
                                onCheckedChange={(checked) => toggleSeleccion(item.id, checked === true)}
                                className="mt-0.5 h-6 w-6 border-slate-500 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500"
                              />
                            </div>

                            <h3 className="mt-2 text-base font-semibold leading-5 text-white">{item.sugerencia.titulo}</h3>
                            <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-400">{item.sugerencia.descripcion}</p>
                            <p className="mt-2 text-[11px] text-slate-500">Confianza IA {item.sugerencia.confianza}%</p>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-xl bg-slate-950/35 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Evidencia visible</p>
                            <p className="mt-1 text-xs leading-5 text-slate-300">{item.sugerencia.evidenciaVisible}</p>
                          </div>
                          <div className="rounded-xl bg-slate-950/35 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Acción sugerida</p>
                            <p className="mt-1 text-xs leading-5 text-slate-300">{item.sugerencia.accionSugerida}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
                          <button
                            type="button"
                            disabled={bloqueandoResultados}
                            onClick={() => handleDescartar(index)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Descartar
                          </button>
                          {bajaConfianza ? (
                            <span className="text-[11px] font-medium text-amber-300">Revisión manual recomendada</span>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>

                {error ? (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-slate-800 bg-[#071225]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur sm:px-6 sm:pb-4">
            {!modoResultados ? (
              <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  className="h-12 border-slate-500 bg-transparent px-3 text-sm font-semibold text-white hover:bg-slate-800 hover:text-white"
                >
                  <FileText className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">Guardar borrador</span>
                </Button>
                <Button
                  onClick={() => void analizarTodasLasFotos()}
                  disabled={isPending || confirmingBatch || archivos.length === 0 || !iaConfigurada || procesandoIndex >= 0}
                  className="h-12 bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {isPending || procesandoIndex >= 0 ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="truncate">Analizando {Math.max(1, procesandoIndex + 1)}/{archivos.length}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">Analizar {archivos.length} foto{archivos.length !== 1 ? "s" : ""}</span>
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="mx-auto grid max-w-2xl grid-cols-[0.75fr_1.45fr] gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => setModoResultados(false)}
                  className="h-12 border-slate-500 bg-transparent text-sm font-semibold text-white hover:bg-slate-800 hover:text-white"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
                <Button
                  onClick={() => void handleConfirmarSeleccionadas()}
                  disabled={confirmingBatch || confirmingKey !== null || sugerenciasSeleccionadas.size === 0}
                  className="h-12 bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {confirmingBatch ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">Crear seleccionados ({sugerenciasSeleccionadas.size})</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </footer>
        </div>
      </DialogContent>

      <Dialog open={Boolean(fotoPreview)} onOpenChange={(nextOpen) => !nextOpen && setFotoPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista de fotografía</DialogTitle>
            <DialogDescription>{fotoPreview?.nombre ?? "Imagen de referencia"}</DialogDescription>
          </DialogHeader>

          {fotoPreview ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <img
                src={fotoPreview.url}
                alt={fotoPreview.nombre}
                className="max-h-[70vh] w-full rounded-md object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
