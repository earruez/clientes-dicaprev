"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, XCircle, ArrowLeft, Download } from "lucide-react";
import * as XLSX from "xlsx";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  importarTrabajadores,
  type FilaTrabajadorImportar,
  type ResultadoImportar,
} from "@/actions/trabajadores/importar";

// ─── column header aliases ─────────────────────────────────────────────────
const COLUMNAS: Record<keyof FilaTrabajadorImportar, string[]> = {
  rut: ["rut"],
  nombres: ["nombres", "nombre"],
  apellidos: ["apellidos", "apellido"],
  email: ["email", "correo"],
  cargo: ["cargo"],
  area: ["area", "área"],
  centroTrabajo: ["centrotrabajo", "centro_trabajo", "centro"],
  tipoContrato: ["tipocontrato", "tipo_contrato", "contrato"],
};

function mapHeader(raw: string): keyof FilaTrabajadorImportar | null {
  const norm = raw.toLowerCase().replace(/\s+/g, "");
  for (const [field, aliases] of Object.entries(COLUMNAS)) {
    if (aliases.includes(norm)) return field as keyof FilaTrabajadorImportar;
  }
  return null;
}

function parseSheet(wb: XLSX.WorkBook): FilaTrabajadorImportar[] {
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (!rows.length) return [];

  return rows.map((row) => {
    const mapped: Partial<FilaTrabajadorImportar> = {};
    for (const [rawKey, value] of Object.entries(row)) {
      const field = mapHeader(rawKey);
      if (field) mapped[field] = String(value).trim();
    }
    return mapped as FilaTrabajadorImportar;
  });
}

const PREVIEW_LIMIT = 20;

export default function ImportarClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filas, setFilas] = useState<FilaTrabajadorImportar[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportar | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setResultado(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const parsed = parseSheet(wb);
        if (!parsed.length) {
          setParseError("El archivo no contiene filas o las columnas no coinciden con el formato esperado.");
          setFilas([]);
        } else {
          setFilas(parsed);
        }
      } catch {
        setParseError("No se pudo leer el archivo. Asegúrese de que sea un archivo Excel (.xlsx) o CSV válido.");
        setFilas([]);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleImportar() {
    if (!filas.length) return;
    startTransition(async () => {
      try {
        const res = await importarTrabajadores(filas);
        setResultado(res);
        setFilas([]);
        setFileName(null);
        if (inputRef.current) inputRef.current.value = "";
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Error al importar trabajadores.");
      }
    });
  }

  function handleReset() {
    setFilas([]);
    setFileName(null);
    setParseError(null);
    setResultado(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const preview = filas.slice(0, PREVIEW_LIMIT);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <StandardPageHeader
          moduleLabel="Módulo Personas"
          title="Importar Trabajadores"
          description="Carga masiva desde archivo Excel o CSV"
          icon={<Upload className="h-6 w-6" />}
          iconWrapClassName="bg-sky-700"
          actions={
            <Link
              href="/dicaprev/trabajadores"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          }
        />

        {/* Instrucciones y zona de carga */}
        {!resultado && (
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">
                Formato esperado del archivo
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                El archivo debe contener las siguientes columnas (en cualquier orden):
              </p>
            </CardHeader>
            <CardContent className="px-6 py-4">
              <div className="mb-4 flex flex-wrap gap-2">
                {(
                  [
                    { col: "rut", req: true },
                    { col: "nombres", req: true },
                    { col: "apellidos", req: true },
                    { col: "email", req: false },
                    { col: "cargo", req: false },
                    { col: "area", req: false },
                    { col: "centroTrabajo", req: false },
                    { col: "tipoContrato", req: false },
                  ] as { col: string; req: boolean }[]
                ).map(({ col, req }) => (
                  <span
                    key={col}
                    className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-mono font-medium ${
                      req
                        ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {col}
                    {req && <span className="ml-1 text-sky-500">*</span>}
                  </span>
                ))}
              </div>
              <p className="mb-5 text-xs text-slate-400">
                * Campo requerido. Los campos opcionales se omiten si están vacíos. El campo{" "}
                <span className="font-medium">tipoContrato</span> acepta: Indefinido, Plazo Fijo, Por Obra, Part Time.
              </p>

              {/* File input */}
              <label
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 transition hover:border-sky-400 hover:bg-sky-50"
                htmlFor="archivo-importar"
              >
                <FileSpreadsheet className="h-10 w-10 text-slate-300" />
                <span className="text-sm font-medium text-slate-600">
                  {fileName ? fileName : "Haga clic para seleccionar un archivo .xlsx o .csv"}
                </span>
                {fileName && (
                  <span className="text-xs text-slate-400">{filas.length} filas detectadas</span>
                )}
              </label>
              <input
                ref={inputRef}
                id="archivo-importar"
                type="file"
                accept=".xlsx,.csv,.xls"
                className="sr-only"
                onChange={handleFile}
                disabled={isPending}
              />

              {parseError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {parseError}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Vista previa */}
        {filas.length > 0 && !resultado && (
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Vista previa</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {filas.length > PREVIEW_LIMIT
                    ? `Mostrando las primeras ${PREVIEW_LIMIT} de ${filas.length} filas`
                    : `${filas.length} fila${filas.length !== 1 ? "s" : ""} detectadas`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={isPending}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleImportar}
                  disabled={isPending}
                  className="rounded-xl bg-sky-700 text-white hover:bg-sky-800"
                >
                  {isPending ? "Importando…" : `Importar ${filas.length} trabajador${filas.length !== 1 ? "es" : ""}`}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      #
                    </th>
                    {(
                      ["rut", "nombres", "apellidos", "email", "cargo", "area", "centroTrabajo", "tipoContrato"] as (keyof FilaTrabajadorImportar)[]
                    ).map((col) => (
                      <th
                        key={col}
                        className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-xs text-slate-400">{idx + 1}</td>
                      {(
                        ["rut", "nombres", "apellidos", "email", "cargo", "area", "centroTrabajo", "tipoContrato"] as (keyof FilaTrabajadorImportar)[]
                      ).map((col) => (
                        <td key={col} className="px-4 py-2.5 text-slate-700">
                          {row[col] ?? (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Resultado */}
        {resultado && (
          <div className="space-y-4">
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-base font-semibold text-slate-800">Resultado de la importación</h2>
              </CardHeader>
              <CardContent className="px-6 py-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl bg-emerald-50 px-4 py-3">
                    <p className="text-2xl font-bold text-emerald-700">{resultado.creados}</p>
                    <p className="mt-0.5 text-xs text-emerald-600">Trabajadores creados</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 px-4 py-3">
                    <p className="text-2xl font-bold text-amber-700">{resultado.omitidos}</p>
                    <p className="mt-0.5 text-xs text-amber-600">Omitidos (RUT duplicado)</p>
                  </div>
                  <div className="rounded-xl bg-sky-50 px-4 py-3">
                    <p className="text-2xl font-bold text-sky-700">{resultado.induccionesCreadas}</p>
                    <p className="mt-0.5 text-xs text-sky-600">Inducciones creadas</p>
                  </div>
                  <div className="rounded-xl bg-red-50 px-4 py-3">
                    <p className="text-2xl font-bold text-red-700">{resultado.errores.length}</p>
                    <p className="mt-0.5 text-xs text-red-600">Errores</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {resultado.errores.length > 0 && (
              <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <CardHeader className="border-b border-slate-100 px-6 py-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-red-700">
                    <XCircle className="h-4 w-4" />
                    Errores en la importación
                  </h2>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Fila
                        </th>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          RUT
                        </th>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Mensaje
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resultado.errores.map((e, idx) => (
                        <tr key={idx} className="hover:bg-red-50">
                          <td className="px-5 py-2.5 text-xs text-slate-500">{e.fila}</td>
                          <td className="px-5 py-2.5 font-mono text-sm text-slate-700">{e.rut}</td>
                          <td className="px-5 py-2.5 text-sm text-red-700">{e.mensaje}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                className="rounded-xl"
              >
                <Upload className="mr-2 h-4 w-4" />
                Nueva importación
              </Button>
              <Link
                href="/dicaprev/trabajadores"
                className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
              >
                <CheckCircle2 className="h-4 w-4" />
                Ver trabajadores
              </Link>
              <Link
                href="/dicaprev/trabajadores/inducciones"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Ver inducciones
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
