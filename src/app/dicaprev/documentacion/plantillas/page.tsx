"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, FileCode2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  actualizarPlantillaEmpresa,
  crearPlantillaEmpresa,
  obtenerPlantillaEmpresa,
  type PlantillaDocumentoEmpresaDTO,
} from "@/app/dicaprev/documentacion/actions";

type CodigoPlantilla = "IRL" | "EPP";

export default function PlantillasDocumentalesPage() {
  const [codigo, setCodigo] = useState<CodigoPlantilla>("IRL");
  const [plantilla, setPlantilla] = useState<PlantillaDocumentoEmpresaDTO | null>(null);
  const [contenidoBase, setContenidoBase] = useState("");
  const [version, setVersion] = useState("1.0");
  const [activa, setActiva] = useState(true);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cargarPlantilla = (nextCodigo: CodigoPlantilla) => {
    setMensaje(null);
    setError(null);
    startTransition(async () => {
      try {
        const data = await obtenerPlantillaEmpresa(nextCodigo);
        setPlantilla(data);
        setContenidoBase(data.contenidoBase);
        setVersion(data.version);
        setActiva(data.activa);
      } catch (err) {
        const message = err instanceof Error ? err.message : "No fue posible cargar la plantilla.";
        setError(message);
      }
    });
  };

  useEffect(() => {
    cargarPlantilla(codigo);
  }, [codigo]);

  const guardar = () => {
    setMensaje(null);
    setError(null);

    startTransition(async () => {
      const payload = {
        codigo,
        contenidoBase,
        version,
        activa,
      };

      const response =
        plantilla?.fuente === "empresa"
          ? await actualizarPlantillaEmpresa(payload)
          : await crearPlantillaEmpresa(payload);

      if (!response.ok || !response.plantilla) {
        setError(response.error ?? "No fue posible guardar la plantilla.");
        return;
      }

      setPlantilla(response.plantilla);
      setMensaje(`Plantilla ${codigo} guardada correctamente para esta empresa.`);
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <FileCode2 className="h-5 w-5 text-emerald-600" />
            Plantillas Documentales por Empresa
          </h1>
          <p className="text-sm text-muted-foreground">
            Edita las plantillas IRL y EPP de tu empresa. Si no existe una plantilla personalizada,
            se usa la plantilla base de DICAPREV.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={codigo === "IRL" ? "default" : "outline"}
              onClick={() => setCodigo("IRL")}
              disabled={isPending}
            >
              IRL
            </Button>
            <Button
              variant={codigo === "EPP" ? "default" : "outline"}
              onClick={() => setCodigo("EPP")}
              disabled={isPending}
            >
              EPP
            </Button>
          </div>

          <div className="grid gap-3 rounded-md border bg-slate-50 p-4 text-sm md:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Fuente actual</p>
              <p className="font-medium">{plantilla?.fuente === "empresa" ? "Personalizada" : "Base DICAPREV"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Version</p>
              <p className="font-medium">{version || "1.0"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Estado</p>
              <p className="font-medium">{activa ? "Activa" : "Inactiva"}</p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contenido-base">Contenido base (Markdown)</Label>
            <Textarea
              id="contenido-base"
              value={contenidoBase}
              onChange={(event) => setContenidoBase(event.target.value)}
              className="min-h-[460px] font-mono text-xs"
              placeholder="Escribe aquí la estructura de la plantilla..."
              disabled={isPending}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={guardar} disabled={isPending || !contenidoBase.trim()}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar plantilla
            </Button>
          </div>

          {mensaje ? (
            <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4" />
              <p>{mensaje}</p>
            </div>
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <p>{error}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
