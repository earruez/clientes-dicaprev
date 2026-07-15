"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Loader2, RotateCcw, Upload, XCircle } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  descargarPlantillaTrabajadores,
  importarArchivoTrabajadores,
  validarArchivoTrabajadores,
  type ResultadoImportacionCarga,
  type ResumenValidacionCarga,
} from "@/actions/trabajadores/importar";

type Fase = "inicial" | "seleccionado" | "analizando" | "revisar" | "importando" | "exito" | "error";

const IMPORT_TIMEOUT_MS = 120000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function descargarBase64(base64: string, nombre: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = nombre;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ImportarClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fase, setFase] = useState<Fase>("inicial");
  const [validacion, setValidacion] = useState<ResumenValidacionCarga | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacionCarga | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function seleccionar(file: File | null) {
    setMensaje(null);
    setValidacion(null);
    setResultado(null);
    if (!file) {
      setArchivo(null);
      setFase("inicial");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setMensaje("Selecciona un archivo Excel con extensión .xlsx.");
      setFase("error");
      return;
    }
    setArchivo(file);
    setFase("seleccionado");
  }

  function formDataArchivo() {
    const formData = new FormData();
    if (archivo) formData.set("archivo", archivo);
    return formData;
  }

  function descargarPlantilla() {
    startTransition(async () => {
      try {
        const plantilla = await descargarPlantillaTrabajadores();
        descargarBase64(plantilla.base64, plantilla.nombre);
      } catch (error) {
        setMensaje(error instanceof Error ? error.message : "No se pudo generar la plantilla.");
        setFase("error");
      }
    });
  }

  function analizar() {
    if (!archivo) return;
    setMensaje(null);
    setFase("analizando");
    startTransition(async () => {
      try {
        const response = await validarArchivoTrabajadores(formDataArchivo());
        setValidacion(response);
        setFase("revisar");
      } catch (error) {
        setMensaje(error instanceof Error ? error.message : "No fue posible analizar el archivo.");
        setFase("error");
      }
    });
  }

  function importar() {
    if (!archivo || !validacion?.puedeImportar) return;
    setMensaje(null);
    setFase("importando");
    startTransition(async () => {
      try {
        const response = await withTimeout(
          importarArchivoTrabajadores(formDataArchivo()),
          IMPORT_TIMEOUT_MS,
          "La importación está tardando demasiado. Intenta con menos filas o vuelve a validar el archivo.",
        );
        setResultado(response);
        setFase("exito");
        router.refresh();
      } catch (error) {
        setMensaje(error instanceof Error ? error.message : "No fue posible completar la importación.");
        setFase("error");
      }
    });
  }

  function reiniciar() {
    setArchivo(null);
    setFase("inicial");
    setValidacion(null);
    setResultado(null);
    setMensaje(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const bloqueado = isPending || fase === "analizando" || fase === "importando";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm">
      <main className="ml-auto h-full w-full max-w-6xl overflow-y-auto bg-slate-50 shadow-2xl">
      <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <StandardPageHeader
          moduleLabel="Módulo Personas"
          title="Carga masiva de trabajadores"
          description="Descarga la plantilla, valida todas las filas y confirma la importación."
          icon={<FileSpreadsheet className="h-6 w-6" />}
          iconWrapClassName="bg-sky-700"
          actions={<Link href="/dicaprev/trabajadores" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />Volver</Link>}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          {["Descargar plantilla", "Validar archivo", "Confirmar carga"].map((label, index) => {
            const active = index === 0 ? fase === "inicial" || fase === "seleccionado" : index === 1 ? ["analizando", "revisar", "error"].includes(fase) : ["importando", "exito"].includes(fase);
            return <div key={label} className={`rounded-lg border px-4 py-3 text-sm font-semibold ${active ? "border-sky-300 bg-sky-50 text-sky-800" : "border-slate-200 bg-white text-slate-500"}`}>{index + 1}. {label}</div>;
          })}
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold text-slate-900">1. Plantilla oficial</h2><p className="text-sm text-slate-500">Incluye instrucciones y catálogos actuales de tu empresa.</p></div>
            <Button variant="outline" onClick={descargarPlantilla} disabled={bloqueado}><Download className="mr-2 h-4 w-4" />Descargar plantilla</Button>
          </CardHeader>
          <CardContent className="p-5">
            <label
              htmlFor="archivo-trabajadores"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); seleccionar(event.dataTransfer.files?.[0] ?? null); }}
              className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-sky-400 hover:bg-sky-50"
            >
              <Upload className="h-9 w-9 text-sky-700" />
              <div><p className="font-semibold text-slate-800">{archivo?.name ?? "Selecciona o arrastra el archivo .xlsx"}</p><p className="mt-1 text-xs text-slate-500">Máximo 5 MB y 1.000 trabajadores.</p></div>
            </label>
            <input ref={inputRef} id="archivo-trabajadores" type="file" accept=".xlsx" className="sr-only" disabled={bloqueado} onChange={(event) => seleccionar(event.target.files?.[0] ?? null)} />
            {archivo && fase !== "exito" ? <div className="mt-4 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={reiniciar} disabled={bloqueado}>Cambiar archivo</Button><Button onClick={analizar} disabled={bloqueado}>{fase === "analizando" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}Validar archivo</Button></div> : null}
          </CardContent>
        </Card>

        {mensaje ? <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{mensaje}</div> : null}

        {validacion && fase !== "exito" ? (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">2. Resultado de la validación</h2></CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: "Total de filas", value: validacion.totalFilas, className: "border-slate-200 bg-slate-50 text-slate-700" },
                  { label: "Filas válidas", value: validacion.filasValidas, className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
                  { label: "Filas con error", value: validacion.filasConError, className: "border-red-200 bg-red-50 text-red-700" },
                  { label: "Advertencias", value: validacion.advertencias, className: "border-amber-200 bg-amber-50 text-amber-700" },
                ].map((item) => <div key={item.label} className={`rounded-lg border p-4 ${item.className}`}><p className="text-2xl font-bold">{item.value}</p><p className="text-xs font-medium">{item.label}</p></div>)}
              </div>

              {validacion.incidencias.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Fila</th><th className="px-4 py-3">Trabajador</th><th className="px-4 py-3">Campo</th><th className="px-4 py-3">Detalle</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{validacion.incidencias.map((item, index) => <tr key={`${item.fila}-${item.campo}-${index}`}><td className="px-4 py-3">{item.fila}</td><td className="px-4 py-3 font-medium">{item.trabajador}</td><td className="px-4 py-3">{item.campo}</td><td className={`px-4 py-3 ${item.tipo === "error" ? "text-red-700" : "text-amber-700"}`}>{item.tipo === "error" ? <XCircle className="mr-1 inline h-4 w-4" /> : <AlertCircle className="mr-1 inline h-4 w-4" />}{item.mensaje}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5" />Todas las filas están listas para importar.</div>}

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Fila</th><th className="px-4 py-3">RUT</th><th className="px-4 py-3">Trabajador</th><th className="px-4 py-3">Cargo</th><th className="px-4 py-3">Centro</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{validacion.vistaPrevia.map((item) => <tr key={`${item.fila}-${item.rut}`}><td className="px-4 py-3">{item.fila}</td><td className="px-4 py-3 font-mono">{item.rut}</td><td className="px-4 py-3 font-medium">{item.nombres} {item.apellidos}</td><td className="px-4 py-3">{item.cargo}</td><td className="px-4 py-3">{item.centroTrabajo}</td></tr>)}</tbody>
                </table>
              </div>

              <div className="flex flex-col justify-end gap-2 sm:flex-row"><Button variant="outline" onClick={reiniciar} disabled={bloqueado}><RotateCcw className="mr-2 h-4 w-4" />Reiniciar</Button><Button onClick={importar} disabled={!validacion.puedeImportar || bloqueado}>{fase === "importando" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Confirmar importación</Button></div>
            </CardContent>
          </Card>
        ) : null}

        {fase === "exito" && resultado ? (
          <Card className="border-emerald-200 shadow-sm"><CardContent className="flex flex-col items-center gap-4 p-8 text-center"><CheckCircle2 className="h-12 w-12 text-emerald-600" /><div><h2 className="text-xl font-bold text-slate-900">Importación completada</h2><p className="mt-1 text-slate-600">Se crearon {resultado.creados} trabajadores y se evaluaron documentos para {resultado.documentosEvaluados}.</p></div>{resultado.advertencias.length > 0 ? <div className="w-full rounded-lg bg-amber-50 p-4 text-left text-sm text-amber-800">{resultado.advertencias.map((item) => <p key={item}>{item}</p>)}</div> : null}<div className="flex flex-wrap justify-center gap-2"><Button variant="outline" onClick={reiniciar}>Nueva importación</Button><Link href="/dicaprev/trabajadores" className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Volver al listado</Link></div></CardContent></Card>
        ) : null}
      </div>
      </main>
    </div>
  );
}
