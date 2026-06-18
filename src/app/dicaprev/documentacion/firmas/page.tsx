"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { FileSignature } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  guardarFirmaPrevencionistaActiva,
  obtenerFirmaPrevencionistaActiva,
  type FirmaPrevencionistaPerfilView,
} from "@/actions/firmas";

type FormState = {
  nombre: string;
  rut: string;
  cargo: string;
  imagenFirma: string;
  trazoFirma: string;
  activa: boolean;
};

function fmtFecha(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FirmasDocumentacionPage() {
  const [form, setForm] = useState<FormState>({
    nombre: "",
    rut: "",
    cargo: "",
    imagenFirma: "",
    trazoFirma: "",
    activa: true,
  });
  const [firmaActual, setFirmaActual] = useState<FirmaPrevencionistaPerfilView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  useEffect(() => {
    let active = true;

    startTransition(async () => {
      try {
        const perfil = await obtenerFirmaPrevencionistaActiva();
        if (!active) return;

        setFirmaActual(perfil);
        if (perfil) {
          setForm({
            nombre: perfil.nombre,
            rut: perfil.rut,
            cargo: perfil.cargo ?? "",
            imagenFirma: perfil.imagenFirma ?? "",
            trazoFirma: perfil.trazoFirma ?? "",
            activa: perfil.activa,
          });
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la firma activa.");
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function onStartDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (isPending) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasPoint(event);
    if (!point) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.setPointerCapture(event.pointerId);
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function onDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || isPending) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasPoint(event);
    if (!point) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function onEndDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    setIsDrawing(false);
    setForm((prev) => ({ ...prev, trazoFirma: canvas.toDataURL("image/png") }));
  }

  function limpiarCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setForm((prev) => ({ ...prev, trazoFirma: "" }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const saved = await guardarFirmaPrevencionistaActiva({
          nombre: form.nombre,
          rut: form.rut,
          cargo: form.cargo,
          imagenFirma: form.imagenFirma,
          trazoFirma: form.trazoFirma || null,
          activa: form.activa,
        });

        setFirmaActual(saved);
        setForm({
          nombre: saved.nombre,
          rut: saved.rut,
          cargo: saved.cargo ?? "",
          imagenFirma: saved.imagenFirma ?? "",
          trazoFirma: saved.trazoFirma ?? "",
          activa: saved.activa,
        });
        setSuccess("Firma guardada correctamente y marcada como activa.");
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "No fue posible guardar la firma.");
      }
    });
  }

  const previewSrc = form.trazoFirma || form.imagenFirma || firmaActual?.trazoFirma || firmaActual?.imagenFirma || "";

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <StandardPageHeader
          moduleLabel="Documentación"
          title="Firma simple electrónica"
          description="Configura tu firma activa para aplicar firma automática como prevencionista en documentos generados."
          icon={FileSignature}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <h2 className="text-base font-semibold text-slate-900">Firma del prevencionista</h2>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-slate-500">Cargando configuración de firma...</p>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="firma-nombre">Nombre</Label>
                    <Input
                      id="firma-nombre"
                      value={form.nombre}
                      onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
                      placeholder="Nombre del prevencionista"
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firma-rut">RUT</Label>
                    <Input
                      id="firma-rut"
                      value={form.rut}
                      onChange={(event) => setForm((prev) => ({ ...prev, rut: event.target.value }))}
                      placeholder="12.345.678-9"
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firma-cargo">Cargo</Label>
                    <Input
                      id="firma-cargo"
                      value={form.cargo}
                      onChange={(event) => setForm((prev) => ({ ...prev, cargo: event.target.value }))}
                      placeholder="Prevencionista de riesgos"
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firma-imagen">Imagen de firma (URL opcional)</Label>
                    <Input
                      id="firma-imagen"
                      value={form.imagenFirma}
                      onChange={(event) => setForm((prev) => ({ ...prev, imagenFirma: event.target.value }))}
                      placeholder="https://..."
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Firma dibujada</Label>
                    <canvas
                      ref={canvasRef}
                      width={640}
                      height={180}
                      onPointerDown={onStartDraw}
                      onPointerMove={onDraw}
                      onPointerUp={onEndDraw}
                      onPointerLeave={onEndDraw}
                      className="w-full rounded-xl border border-slate-200 bg-white touch-none"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Dibuja tu firma para usarla en documentos generados.</span>
                      <Button type="button" variant="outline" size="sm" onClick={limpiarCanvas} disabled={isPending}>
                        Limpiar
                      </Button>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <Checkbox
                      checked={form.activa}
                      onCheckedChange={(checked) => setForm((prev) => ({ ...prev, activa: checked === true }))}
                      disabled={isPending}
                    />
                    <span>Firma activa</span>
                  </label>

                  {error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
                  ) : null}

                  {success ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>
                  ) : null}

                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? "Guardando..." : "Guardar firma"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <h2 className="text-base font-semibold text-slate-900">Vista previa y estado</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p><strong>Nombre:</strong> {form.nombre || firmaActual?.nombre || "-"}</p>
                <p><strong>RUT:</strong> {form.rut || firmaActual?.rut || "-"}</p>
                <p><strong>Cargo:</strong> {form.cargo || firmaActual?.cargo || "-"}</p>
                <p>
                  <strong>Estado:</strong>{" "}
                  <span className={form.activa ? "text-emerald-700" : "text-slate-500"}>
                    {form.activa ? "Activa" : "Inactiva"}
                  </span>
                </p>
                <p><strong>Creada:</strong> {fmtFecha(firmaActual?.createdAt)}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Firma</p>
                {previewSrc ? (
                  <div className="relative h-32 w-full max-w-sm overflow-hidden rounded border border-slate-200 bg-white p-2">
                    <Image src={previewSrc} alt="Vista previa firma" fill className="object-contain" unoptimized />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Sin firma cargada.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
