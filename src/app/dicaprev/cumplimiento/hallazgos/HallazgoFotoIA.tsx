"use client";

import React, { useMemo, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Camera, Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { OpcionesHallazgo } from "./actions";
import {
  analizarFotoHallazgoIA,
  confirmarHallazgoDesdeFotoIA,
  type AnalisisFotoHallazgoIAResultado,
  type SugerenciaHallazgoIA,
} from "./ia";

type Props = {
  opciones: Pick<OpcionesHallazgo, "centros" | "areas">;
  onConfirmed: () => Promise<void>;
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

export default function HallazgoFotoIA({ opciones, onConfirmed }: Props) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoUrl, setArchivoUrl] = useState<string | null>(null);
  const [archivoNombre, setArchivoNombre] = useState<string | null>(null);
  const [archivoTipo, setArchivoTipo] = useState<string | null>(null);
  const [centroTrabajoId, setCentroTrabajoId] = useState<string>("");
  const [areaId, setAreaId] = useState<string>("");
  const [observacion, setObservacion] = useState("");
  const [resultado, setResultado] = useState<AnalisisFotoHallazgoIAResultado | null>(null);
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

  async function uploadAndAnalyze(file: File) {
    setError(null);
    setResultado(null);
    setArchivo(file);
    setArchivoTipo(file.type || null);

    const formData = new FormData();
    formData.append("file", file);

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
    setArchivoNombre(uploadJson.archivoNombre ?? file.name);

    const analysis = await analizarFotoHallazgoIA({
      archivoUrl: uploadJson.archivoUrl,
      archivoNombre: uploadJson.archivoNombre ?? file.name,
      archivoTipo: uploadJson.archivoTipo ?? file.type,
      centroTrabajoId: centroTrabajoId || null,
      areaId: areaId || null,
      observacion: observacion.trim() || null,
    });

    setResultado(analysis);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    startTransition(() => {
      void uploadAndAnalyze(file).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "No fue posible analizar la imagen.";
        setError(message);
        setResultado(null);
      });
    });
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
      setResultado(null);
      setArchivo(null);
      setArchivoUrl(null);
      setArchivoNombre(null);
      setArchivoTipo(null);
      setObservacion("");
      setCentroTrabajoId("");
      setAreaId("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No fue posible confirmar el hallazgo.";
      setError(message);
    } finally {
      setConfirmingKey(null);
    }
  }

  return (
    <Card className="border-none bg-white shadow-sm">
      <CardHeader className="space-y-1 border-b bg-gradient-to-r from-slate-50 to-white">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          Hallazgos con IA desde fotografía
        </h3>
        <p className="text-sm text-slate-600">
          Sube una foto, revisa la sugerencia y confirma manualmente solo si el hallazgo es real.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Centro de trabajo opcional</Label>
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
            <Label>Area opcional</Label>
            <Select value={areaId || "todos"} onValueChange={(value) => setAreaId(value === "todos" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sin area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Sin area</SelectItem>
                {opciones.areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 lg:col-span-1">
            <Label>Observacion breve</Label>
            <Input
              value={observacion}
              onChange={(event) => setObservacion(event.target.value)}
              placeholder="Ej. extintor en bodega, posible vencimiento"
            />
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
            <Label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Camera className="h-4 w-4" />
              Foto a analizar
            </Label>
            <Input type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
            <p className="text-xs text-slate-500">
              El archivo se carga con el flujo existente y solo se convierte en hallazgo si el usuario lo confirma.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              {imagenPreview ? (
                <img
                  src={imagenPreview}
                  alt="Vista previa de la foto"
                  className="h-20 w-20 rounded-xl border object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                  <Upload className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{archivo?.name ?? "Sin imagen cargada"}</p>
                <p className="text-xs text-slate-500">
                  {archivoUrl ? archivoUrl : "La imagen se almacenara para el analisis."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {isPending ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analizando foto...
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {resultado && resultado.ok ? (
          <div className="space-y-3">
            {resultado.sugerencias.map((sugerencia, index) => {
              const confirmationKey = `${sugerencia.titulo}-${sugerencia.confianza}`;
              const noConcluyente = sugerencia.titulo.toLowerCase().includes("no concluyente");
              return (
                <div key={`${sugerencia.titulo}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
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
                      </div>
                      <p className="text-sm text-slate-700">{sugerencia.descripcion}</p>
                    </div>
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
                      Confirmar hallazgo
                    </Button>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-white p-3 text-sm text-slate-700">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Evidencia visible</p>
                      <p className="mt-1">{sugerencia.evidenciaVisible}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 text-sm text-slate-700">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Accion sugerida</p>
                      <p className="mt-1">{sugerencia.accionSugerida}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
