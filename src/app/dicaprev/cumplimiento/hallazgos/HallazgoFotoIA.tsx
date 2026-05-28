"use client";

import React, { useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Camera, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoUrl, setArchivoUrl] = useState<string | null>(null);
  const [archivoNombre, setArchivoNombre] = useState<string | null>(null);
  const [archivoTipo, setArchivoTipo] = useState<string | null>(null);
  const [centroTrabajoId, setCentroTrabajoId] = useState<string>("");
  const [areaId, setAreaId] = useState<string>("");
  const [observacion, setObservacion] = useState("");
  const [sugerencias, setSugerencias] = useState<SugerenciaHallazgoIA[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);

  const imagenPreview = useMemo(() => {
    if (!archivo) return null;
    return URL.createObjectURL(archivo);
  }, [archivo]);

  React.useEffect(() => {
    return () => {
      if (imagenPreview) {
        URL.revokeObjectURL(imagenPreview);
      }
    };
  }, [imagenPreview]);

  function resetFlow() {
    setArchivo(null);
    setArchivoUrl(null);
    setArchivoNombre(null);
    setArchivoTipo(null);
    setCentroTrabajoId("");
    setAreaId("");
    setObservacion("");
    setSugerencias([]);
    setError(null);
    setConfirmingKey(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetFlow();
    }
    onOpenChange(nextOpen);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    setArchivo(file);
    setArchivoUrl(null);
    setArchivoNombre(null);
    setArchivoTipo(file.type || null);
    setSugerencias([]);
    setError(null);
  }

  async function uploadAndAnalyze() {
    if (!archivo) {
      setError("Debes seleccionar una fotografía para analizar.");
      return;
    }

    if (!iaConfigurada) {
      setError(IA_NO_CONFIGURADA);
      return;
    }

    setError(null);
    setSugerencias([]);

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
      throw new Error(uploadJson.error ?? "No fue posible cargar la imagen.");
    }

    setArchivoUrl(uploadJson.archivoUrl);
    setArchivoNombre(uploadJson.archivoNombre ?? archivo.name);

    const analysis = await analizarFotoHallazgoIA({
      archivoUrl: uploadJson.archivoUrl,
      archivoNombre: uploadJson.archivoNombre ?? archivo.name,
      archivoTipo: uploadJson.archivoTipo ?? archivo.type,
      centroTrabajoId: centroTrabajoId || null,
      areaId: areaId || null,
      observacion: observacion.trim() || null,
    });

    if (!analysis.ok) {
      setError(analysis.error === "IA no configurada" ? IA_NO_CONFIGURADA : analysis.error);
      setSugerencias([]);
      return;
    }

    setSugerencias(analysis.sugerencias);
  }

  async function handleConfirmar(sugerencia: SugerenciaHallazgoIA) {
    if (!archivoUrl) return;
    const confirmationKey = `${sugerencia.titulo}-${sugerencia.confianza}`;
    setConfirmingKey(confirmationKey);
    setError(null);

    try {
      await confirmarHallazgoDesdeFotoIA({
        sugerencia,
        archivoUrl,
        archivoNombre,
        archivoTipo,
        centroTrabajoId: centroTrabajoId || null,
        areaId: areaId || null,
        observacion: observacion.trim() || null,
      });
      await onConfirmed();
      resetFlow();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No fue posible confirmar el hallazgo.";
      setError(message);
    } finally {
      setConfirmingKey(null);
    }
  }

  function handleDescartar(index: number) {
    setSugerencias((prev) => prev.filter((_, idx) => idx !== index));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto" size="lg">
        <DialogHeader>
          <DialogTitle>Analizar fotografía con IA</DialogTitle>
          <DialogDescription>
            Sube o toma una foto. La IA sugerirá hallazgos visibles, pero debes confirmarlos manualmente.
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

          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Camera className="mr-2 h-4 w-4" />
                {archivo ? "Cambiar foto" : "Seleccionar foto"}
              </Button>
              <p className="text-xs text-slate-500">Puedes usar cámara móvil o subir archivo desde computador.</p>
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              {imagenPreview ? (
                <img
                  src={imagenPreview}
                  alt="Vista previa de la foto"
                  className="h-16 w-16 rounded-lg border object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                  <Upload className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{archivo?.name ?? "Sin foto seleccionada"}</p>
                <p className="truncate text-xs text-slate-500">{archivoUrl ?? "La foto se asociará como evidencia al confirmar."}</p>
              </div>
            </div>
          </div>

          {!iaConfigurada ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {IA_NO_CONFIGURADA}
            </div>
          ) : null}

          {isPending ? (
            <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analizando fotografía...
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
              {sugerencias.map((sugerencia, index) => {
                const confirmationKey = `${sugerencia.titulo}-${sugerencia.confianza}-${index}`;
                const noConcluyente = sugerencia.titulo.toLowerCase().includes("no concluyente");
                return (
                  <div key={confirmationKey} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-900">{sugerencia.titulo}</h4>
                          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", prioridadClass(sugerencia.confianza))}>
                            Confianza {sugerencia.confianza}%
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {tipoLabel(sugerencia.tipo)}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            Prioridad {sugerencia.prioridad}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">{sugerencia.descripcion}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => handleDescartar(index)}>
                          Descartar sugerencia
                        </Button>
                        <Button
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => void handleConfirmar(sugerencia)}
                          disabled={confirmingKey === confirmationKey || noConcluyente}
                        >
                          {confirmingKey === confirmationKey ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          Crear hallazgo
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-white p-3 text-sm text-slate-700">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Evidencia visible</p>
                        <p className="mt-1">{sugerencia.evidenciaVisible}</p>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-sm text-slate-700">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Acción sugerida</p>
                        <p className="mt-1">{sugerencia.accionSugerida}</p>
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
              startTransition(() => {
                void uploadAndAnalyze().catch((err: unknown) => {
                  const message = err instanceof Error ? err.message : "No fue posible analizar la imagen.";
                  setError(message);
                  setSugerencias([]);
                });
              });
            }}
            disabled={isPending || !archivo || !iaConfigurada}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Analizar foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
