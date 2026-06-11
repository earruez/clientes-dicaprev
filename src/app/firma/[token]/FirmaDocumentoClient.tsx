"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completarFirmaDocumento, type FirmaPublicaView } from "@/actions/firmas";

type Props = {
  firma: FirmaPublicaView;
};

export default function FirmaDocumentoClient({ firma }: Props) {
  const [nombreFirmante, setNombreFirmante] = useState(firma.nombreFirmante ?? "");
  const [rutFirmante, setRutFirmante] = useState(firma.rutFirmante ?? "");
  const [firmaTexto, setFirmaTexto] = useState(firma.nombreFirmante ?? "");
  const [aceptoLectura, setAceptoLectura] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    firma.estado === "firmado" && firma.firmadoAt
      ? `Documento firmado el ${new Date(firma.firmadoAt).toLocaleString("es-CL")}.`
      : null,
  );
  const [isPending, startTransition] = useTransition();

  const disabled = firma.estado !== "pendiente" || isPending;

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

        setSuccess(`Documento firmado correctamente el ${new Date(result.firmadoAt).toLocaleString("es-CL")}.`);
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
              Expira: {new Date(firma.expiresAt).toLocaleString("es-CL")}
            </span>
          ) : null}
        </div>

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
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rutFirmante">RUT</Label>
                <Input
                  id="rutFirmante"
                  value={rutFirmante}
                  onChange={(event) => setRutFirmante(event.target.value)}
                  placeholder="12.345.678-9"
                  disabled={disabled}
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
                disabled={disabled}
              />
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <Checkbox
                checked={aceptoLectura}
                onCheckedChange={(checked) => setAceptoLectura(checked === true)}
                disabled={disabled}
              />
              <span>Declaro haber leído y acepto el documento indicado.</span>
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
            ) : null}

            <Button type="submit" className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800" disabled={disabled}>
              {isPending ? "Firmando..." : "Firmar documento"}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}