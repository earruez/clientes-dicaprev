"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completarFirmaDocumento, type FirmaPublicaView } from "@/actions/firmas";

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
  const [aceptoLectura, setAceptoLectura] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isRead, setIsRead] = useState(firma.estado !== "pendiente");
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && firma.estado === "firmado" && firma.firmadoAt && success === null) {
      setSuccess(`Documento firmado el ${formatFechaHoraCl(firma.firmadoAt)}.`);
    }
  }, [firma.estado, firma.firmadoAt, mounted, success]);

  const formDisabled = firma.estado !== "pendiente" || isPending;
  const submitDisabled = formDisabled || !isRead || !aceptoLectura;

  const contenidoMarkdown = firma.contenidoMarkdown?.trim() ?? "";
  const contenidoLineas = contenidoMarkdown.length > 0 ? contenidoMarkdown.split("\n") : [];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const result = await completarFirmaDocumento({
          token: firma.token,
          nombreFirmante,
          rutFirmante,
          aceptoLectura,
          firmaTexto,
        });

        setSuccess(`Documento firmado correctamente el ${formatFechaHoraCl(result.firmadoAt) ?? result.firmadoAt}.`);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "No fue posible completar la firma.");
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

        {firma.estado === "pendiente" ? (
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

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <Checkbox
                checked={aceptoLectura}
                onCheckedChange={(checked) => setAceptoLectura(checked === true)}
                disabled={formDisabled}
              />
              <span>Declaro haber leído el documento completo y acepto su contenido.</span>
            </label>

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

            <Button type="submit" className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800" disabled={submitDisabled}>
              {isPending ? "Firmando..." : !isRead ? "Lee el documento para firmar" : !aceptoLectura ? "Acepta la lectura para firmar" : "Firmar documento"}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}