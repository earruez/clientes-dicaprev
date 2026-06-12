"use client";

import React, { useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Camera, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  opciones: Pick<OpcionesHallazgo, "centros" | "areas">;
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
  };
};

const IA_NO_CONFIGURADA = "IA no configurada en este entorno. Configura OPENAI_API_KEY para analizar fotografias.";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef(0);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [archivosData, setArchivosData] = useState<Array<{ file: File; url: string; nombre: string; tipo: string }>>([]);
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

  function resetFlow() {
    setArchivos([]);
    setArchivosData([]);
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
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetFlow();
    }
    onOpenChange(nextOpen);
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
    setSugerencias([]);
    setSugerenciasSeleccionadas(new Set());
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    agregarArchivos(event.target.files);
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
              },
            });
          });
        }

        setArchivosData(datosArchivos);
        setSugerencias(todasLasSugerencias);
        setSugerenciasSeleccionadas(new Set(todasLasSugerencias.map((item) => item.id)));
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
      setSugerencias((prev) => prev.filter((current) => current.id !== item.id));
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
      setSugerencias((prev) => prev.filter((item) => !sugerenciasSeleccionadas.has(item.id)));
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto" size="lg">
        <DialogHeader>
          <DialogTitle>Analizar fotografías con IA (hasta 10)</DialogTitle>
          <DialogDescription>
            Sube o toma hasta 10 fotos. La IA sugerirá hallazgos visibles, pero debes confirmarlos manualmente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Centro opcional</Label>
              <Select value={centroTrabajoId || "todos"} onValueChange={(value) => setCentroTrabajoId(value === "todos" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin centro" />
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

            <div className="space-y-1.5">
              <Label>Área opcional</Label>
              <Select value={areaId || "todos"} onValueChange={(value) => setAreaId(value === "todos" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin área" />
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

            <div className="space-y-1.5">
              <Label>Observación breve</Label>
              <Input
                value={observacion}
                onChange={(event) => setObservacion(event.target.value)}
                placeholder="Ej. extintor en bodega, posible vencimiento"
              />
            </div>
          </div>

          <div
            className={cn(
              "rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 transition-colors",
              isDragActive && "border-emerald-500 bg-emerald-50",
            )}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
              multiple
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Camera className="mr-2 h-4 w-4" />
                {archivos.length === 0 ? "Seleccionar fotos" : "Agregar más fotos"}
              </Button>
              <p className="text-xs text-slate-500">
                {archivos.length}/10 fotos. Puedes usar cámara móvil, subir archivos o arrastrar fotos aquí.
              </p>
            </div>

            {archivos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                {archivos.map((file, idx) => (
                  <div key={idx} className="relative rounded-lg border border-slate-200 overflow-hidden bg-white">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Foto ${idx + 1}`}
                      className="h-20 w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                      <button
                        onClick={() => removerArchivo(idx)}
                        className="text-white font-bold text-sm bg-red-600 rounded-full px-2 py-1"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="px-2 py-1 text-xs text-slate-600 truncate">{file.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!iaConfigurada ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {IA_NO_CONFIGURADA}
            </div>
          ) : null}

          {isPending ? (
            <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analizando fotografías...
            </div>
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {sugerencias.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Checkbox
                    checked={sugerencias.length > 0 && sugerencias.every((item) => sugerenciasSeleccionadas.has(item.id))}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSugerenciasSeleccionadas(new Set(sugerencias.map((item) => item.id)));
                        return;
                      }
                      setSugerenciasSeleccionadas(new Set());
                    }}
                  />
                  <span>Seleccionar todas ({sugerencias.length})</span>
                </div>
                <Button
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => {
                    void handleConfirmarSeleccionadas();
                  }}
                  disabled={confirmingBatch || confirmingKey !== null || sugerenciasSeleccionadas.size === 0}
                >
                  {confirmingBatch ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando hallazgos...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Crear seleccionados ({sugerenciasSeleccionadas.size})
                    </>
                  )}
                </Button>
              </div>

              {sugerencias.map((sugerencia, index) => {
                const confirmationKey = sugerencia.id;
                const bajaConfianza = sugerencia.sugerencia.confianza < 20;
                const disabledByPending = confirmingKey === confirmationKey;
                const requiereConfirmacionManual = bajaConfianza;
                return (
                  <div key={confirmationKey} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Checkbox
                            checked={sugerenciasSeleccionadas.has(sugerencia.id)}
                            onCheckedChange={(checked) => toggleSeleccion(sugerencia.id, checked === true)}
                          />
                          <h4 className="text-sm font-semibold text-slate-900">{sugerencia.sugerencia.titulo}</h4>
                          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", prioridadClass(sugerencia.sugerencia.confianza))}>
                            Confianza {sugerencia.sugerencia.confianza}%
                          </span>
                          {bajaConfianza && (
                            <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                              No concluyente
                            </span>
                          )}
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {tipoLabel(sugerencia.sugerencia.tipo)}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            Prioridad {sugerencia.sugerencia.prioridad}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            Foto: {sugerencia.archivo.nombre}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">{sugerencia.sugerencia.descripcion}</p>
                        {bajaConfianza && (
                          <p className="text-xs text-amber-700">
                            <strong>⚠️ La imagen no permite confirmar el hallazgo con suficiente claridad.</strong>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => handleDescartar(index)}>
                          Descartar sugerencia
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setFotoPreview({ url: sugerencia.archivo.url, nombre: sugerencia.archivo.nombre })}
                        >
                          Ver foto
                        </Button>
                        <Button
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => {
                            if (requiereConfirmacionManual) {
                              const ok = window.confirm(
                                "La IA marcó esta sugerencia como no concluyente. ¿Deseas crear el hallazgo de todas formas bajo tu revisión manual?",
                              );
                              if (!ok) return;
                            }
                            void handleConfirmar(sugerencia);
                          }}
                          disabled={disabledByPending || confirmingBatch}
                        >
                          {confirmingKey === confirmationKey ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          {requiereConfirmacionManual ? "Crear de todas formas" : "Crear hallazgo con evidencia"}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-white p-3 text-sm text-slate-700">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Evidencia visible</p>
                        <p className="mt-1">{sugerencia.sugerencia.evidenciaVisible}</p>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-sm text-slate-700">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Acción sugerida</p>
                        <p className="mt-1">{sugerencia.sugerencia.accionSugerida}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => {
              void analizarTodasLasFotos();
            }}
            disabled={isPending || confirmingBatch || archivos.length === 0 || !iaConfigurada || procesandoIndex >= 0}
          >
            {isPending || procesandoIndex >= 0 ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analizando {procesandoIndex + 1}/{archivos.length}...
              </>
            ) : (
              `Analizar ${archivos.length} foto${archivos.length !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
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
