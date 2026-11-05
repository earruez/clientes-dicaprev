"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completarFirmaDocumento, type FirmaPublicaView } from "@/actions/firmas";
import { completarFirmaExterna, rechazarFirmaExterna, solicitarCodigoFirmaExterna } from "@/actions/firmas-externas";

type Props = {
  firma: FirmaPublicaView;
};

function formatFechaHoraCl(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const day = getPart("day");
  const month = getPart("month");
  const year = getPart("year");
  const hour = getPart("hour");
  const minute = getPart("minute");
  const second = getPart("second");
  const dayPeriod = getPart("dayPeriod");

  return `${day}-${month}-${year.slice(-2)}, ${hour}:${minute}:${second} ${dayPeriod}`.replace(/\s+/g, " ").trim();
}

export default function FirmaDocumentoClient({ firma }: Props) {
  const [nombreFirmante, setNombreFirmante] = useState(firma.nombreFirmante ?? "");
  const [rutFirmante, setRutFirmante] = useState(firma.rutFirmante ?? "");
  const [firmaTexto, setFirmaTexto] = useState(firma.nombreFirmante ?? "");
  const [firmaTrazo, setFirmaTrazo] = useState<string | null>(null);
  const [aceptoLectura, setAceptoLectura] = useState(false);
  const [aceptoEnvioElectronico, setAceptoEnvioElectronico] = useState(false);
  const [codigoVerificacion, setCodigoVerificacion] = useState("");
  const [otpEnviado, setOtpEnviado] = useState(false);
  const [otpSolicitando, setOtpSolicitando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isRead, setIsRead] = useState(firma.estado !== "pendiente");
  const [rechazo, setRechazo] = useState("");
  const [rechazado, setRechazado] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && firma.estado === "firmado" && firma.firmadoAt && success === null) {
      setSuccess(`Documento firmado el ${formatFechaHoraCl(firma.firmadoAt)}.`);
    }
  }, [firma.estado, firma.firmadoAt, mounted, success]);

  const formDisabled = firma.estado !== "pendiente" || isPending || finalizado;
  const submitDisabled = formDisabled || !isRead || !aceptoLectura || (!!firma.documentoExternoUrl && (!aceptoEnvioElectronico || !otpEnviado || !/^[0-9]{6}$/.test(codigoVerificacion)));

  const contenidoMarkdown = firma.contenidoMarkdown?.trim() ?? "";
  const contenidoLineas = contenidoMarkdown.length > 0 ? contenidoMarkdown.split("\n") : [];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
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

  function startDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (formDisabled) return;
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

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || formDisabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getCanvasPoint(event);
    if (!point) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function endDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    setIsDrawing(false);
    setFirmaTrazo(canvas.toDataURL("image/png"));
  }

  function limpiarFirmaDibujada() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFirmaTrazo(null);
  }

  async function solicitarOtp() {
    if (!firma.documentoExternoUrl || otpSolicitando || isPending) return;
    setOtpSolicitando(true);
    setError(null);
    try {
      await solicitarCodigoFirmaExterna(firma.token);
      setOtpEnviado(true);
      setCodigoVerificacion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible enviar el código.");
    } finally {
      setOtpSolicitando(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const result = firma.documentoExternoUrl
          ? await completarFirmaExterna({
              token: firma.token, nombreFirmante, rutFirmante, aceptoLectura,
              aceptoEnvioElectronico, codigoVerificacion, firmaSvg: firmaTrazo, firmaTexto,
            })
          : await completarFirmaDocumento({
              token: firma.token, nombreFirmante, rutFirmante, aceptoLectura,
              firmaSvg: firmaTrazo, firmaTexto,
            });

        setSuccess(`Documento firmado correctamente el ${formatFechaHoraCl(result.firmadoAt) ?? result.firmadoAt}.` +
          ("copiaEnviada" in result && result.copiaEnviada
            ? " Se envió copia del PDF y la constancia a tu correo particular."
            : "copiaEnviada" in result ? " La copia queda pendiente de envío; comunícate con el empleador." : ""));
        setFinalizado(true);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "No fue posible completar la firma.");
      }
    });
  }

  function handleRechazo() {
    if (!firma.documentoExternoUrl || !rechazo.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await rechazarFirmaExterna(firma.token, rechazo);
        setRechazado(true);
        setFinalizado(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo registrar el rechazo.");
      }
    });
  }

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 px-6 py-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">{firma.tituloDocumento}</h1>
          {firma.descripcion ? <p className="text-sm text-slate-500">{firma.descripcion}</p> : null}
          {firma.nombreTrabajador ? <p className="text-sm text-slate-600">Documento asociado a {firma.nombreTrabajador}</p> : null}
          {firma.rutTrabajador ? <p className="text-sm text-slate-500">RUT trabajador: {firma.rutTrabajador}</p> : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-6 py-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700">
            Estado: {firma.estado}
          </span>
          {firma.expiresAt ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-600">
              Expira: {formatFechaHoraCl(firma.expiresAt) ?? firma.expiresAt}
            </span>
          ) : null}
        </div>

        {firma.documentoExternoUrl ? (
          <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Documento original que vas a firmar</p>
              <p className="text-xs text-slate-600">Revisa el PDF completo antes de confirmar. El archivo original se conservará sin cambios.</p>
            </div>
            <iframe
              title="Vista previa del documento PDF"
              src={firma.documentoExternoUrl}
              className="h-[460px] w-full rounded-xl border border-slate-200 bg-white"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <a href={firma.documentoExternoUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-sky-700 underline">Abrir PDF en otra pestaña</a>
              <Button type="button" variant="outline" disabled={formDisabled} onClick={() => setIsRead(true)}>
                {isRead ? "Lectura confirmada" : "He revisado el PDF"}
              </Button>
            </div>
            {firma.documentoHash ? <p className="break-all font-mono text-[10px] text-slate-500">SHA-256 del PDF: {firma.documentoHash}</p> : null}
          </div>
        ) : null}

        {contenidoLineas.length > 0 ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Contenido del documento</p>
                <p className="text-xs text-slate-500">Lee el documento completo antes de firmar.</p>
              </div>
              {!isRead ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setIsRead(true)}
                >
                  Marcar como leído
                </Button>
              ) : (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Leído
                </span>
              )}
            </div>
            <div className="max-h-[420px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
              <pre className="whitespace-pre-wrap font-sans">{contenidoMarkdown}</pre>
            </div>
          </div>
        ) : null}

        {firma.estado === "firmado" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success ?? "Documento firmado correctamente."}
          </div>
        ) : null}

        {firma.estado === "expirado" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Este enlace de firma expiró.
          </div>
        ) : null}

        {finalizado && success && !rechazado ? (
          <div role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</div>
        ) : null}

        {rechazado ? (
          <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">Rechazo registrado. El enlace ya no admite una firma.</div>
        ) : null}

        {firma.estado === "rechazado" ? (
          <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">Esta solicitud fue rechazada.</div>
        ) : null}

        {firma.estado === "pendiente" && !finalizado ? (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombreFirmante">Nombre completo</Label>
                <Input
                  id="nombreFirmante"
                  value={nombreFirmante}
                  onChange={(event) => setNombreFirmante(event.target.value)}
                  placeholder="Nombre completo"
                  disabled={formDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rutFirmante">RUT</Label>
                <Input
                  id="rutFirmante"
                  value={rutFirmante}
                  onChange={(event) => setRutFirmante(event.target.value)}
                  placeholder="12.345.678-9"
                  disabled={formDisabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firmaTexto">Firma textual</Label>
              <Input
                id="firmaTexto"
                value={firmaTexto}
                onChange={(event) => setFirmaTexto(event.target.value)}
                placeholder="Escriba su nombre como firma"
                disabled={formDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label>Firma dibujada</Label>
              <canvas
                ref={canvasRef}
                width={640}
                height={180}
                onPointerDown={startDraw}
                onPointerMove={draw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
                className="w-full rounded-xl border border-slate-200 bg-white touch-none"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Dibuja tu firma desde tu teléfono.</span>
                <button
                  type="button"
                  onClick={limpiarFirmaDibujada}
                  disabled={formDisabled}
                  className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <Checkbox
                checked={aceptoLectura}
                onCheckedChange={(checked) => setAceptoLectura(checked === true)}
                disabled={formDisabled}
              />
              <span>Declaro haber leído el documento completo y acepto su contenido.</span>
            </label>

            {firma.documentoExternoUrl ? (
              <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Verificación del correo particular</p>
                <p className="text-xs text-slate-600">Para firmar necesitas un código de seis dígitos que se enviará a {firma.emailPersonal || "tu correo particular"}. Vence en diez minutos y admite cinco intentos.</p>
                <Button type="button" variant="outline" disabled={formDisabled || otpSolicitando} onClick={() => void solicitarOtp()}>
                  {otpSolicitando ? "Enviando código..." : otpEnviado ? "Solicitar nuevo código" : "Enviar código de verificación"}
                </Button>
                {otpEnviado ? (
                  <div className="space-y-1">
                    <Label htmlFor="codigo-firma-temporal">Código recibido por correo</Label>
                    <Input id="codigo-firma-temporal" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
                      value={codigoVerificacion} onChange={(e) => setCodigoVerificacion(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000" disabled={formDisabled} />
                  </div>
                ) : null}
              </div>
            ) : null}

            {firma.documentoExternoUrl ? (
              <label className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-700">
                <Checkbox checked={aceptoEnvioElectronico} onCheckedChange={(v) => setAceptoEnvioElectronico(v === true)} disabled={formDisabled} />
                <span>Acepto expresamente la firma y entrega de este documento laboral por medios electrónicos y confirmo que <strong>{firma.emailPersonal || "el correo indicado"}</strong> es mi correo particular para recibir mi copia. Puedo solicitar a mi empleador documentación en papel si no acepto esta modalidad.</span>
              </label>
            ) : null}

            {!isRead ? (
              <p className="text-xs text-amber-700">
                Debes leer el documento completo antes de habilitar la firma.
              </p>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
            ) : null}

            {firma.documentoExternoUrl ? (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Label htmlFor="rechazo-firma">¿No corresponde firmar este documento?</Label>
                <textarea id="rechazo-firma" value={rechazo} onChange={(e) => setRechazo(e.target.value)} maxLength={600} rows={2} placeholder="Motivo del rechazo" className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm" />
                <Button type="button" variant="outline" onClick={handleRechazo} disabled={formDisabled || rechazo.trim().length < 5} className="border-rose-200 text-rose-700">Rechazar documento</Button>
              </div>
            ) : null}
            <Button type="submit" className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800" disabled={submitDisabled}>
              {isPending ? "Firmando..." : !isRead ? "Lee el documento para firmar" : !aceptoLectura ? "Acepta la lectura para firmar" : "Firmar documento"}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}