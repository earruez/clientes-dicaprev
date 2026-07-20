"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { generarDs44Documento } from "./actions";
import { getPlantillaDs44 } from "./catalogo";
import type { Ds44DocumentosData, Ds44PlantillaCodigo } from "./types";

function formatFecha(value: string): string {
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export default function Ds44DocumentosClient({ data }: { data: Ds44DocumentosData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Ds44PlantillaCodigo | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [accionId, setAccionId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const plantillaData = data.plantillas.find((plantilla) => plantilla.codigo === selected);
  const plantillaRender = selected ? getPlantillaDs44(selected) : undefined;
  const generatedCodes = useMemo(() => new Set(data.documentosGenerados.map((documento) => documento.plantillaCodigo)), [data.documentosGenerados]);
  const previewHtml = plantillaRender ? plantillaRender.renderHtml({ ...campos, empresaNombre: data.empresaNombre }) : "";

  function openPlantilla(codigo: Ds44PlantillaCodigo) {
    const plantilla = data.plantillas.find((item) => item.codigo === codigo);
    if (!plantilla) return;
    setSelected(codigo);
    setCampos(Object.fromEntries(plantilla.campos.map((campo) => [campo.key, campo.defaultValue ?? ""])));
    setAccionId("");
    setMessage(null);
  }

  function submit() {
    if (!selected) return;
    startTransition(async () => {
      try {
        const result = await generarDs44Documento({ plantillaCodigo: selected, campos, ds44PlanAccionId: accionId || undefined });
        setMessage(result.evidenciaId ? "Documento registrado y evidencia DS44 creada para revisión." : "Documento DS44 registrado correctamente.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No fue posible registrar el documento DS44.");
      }
    });
  }

  if (data.databaseUpdateRequired) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm font-medium text-amber-900">Los documentos DS44 requieren actualizar la base de datos. Ejecuta prisma migrate deploy.</div>;

  const summary = [
    ["Plantillas disponibles", data.resumen.totalPlantillas], ["Documentos generados", data.resumen.documentosGenerados],
    ["Documentos mínimos generados", data.resumen.documentosMinimosGenerados], ["Avance", `${data.resumen.porcentajeAvance}%`],
  ];

  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{summary.map(([label, value]) => <Card key={label} className="border-slate-200 shadow-sm"><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p></CardContent></Card>)}</div>
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">En esta fase el documento queda registrado con trazabilidad. La exportación PDF se abordará en una fase posterior.</div>
    {message && <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">{message}</div>}

    <section className="space-y-3"><h2 className="text-lg font-semibold text-slate-900">Plantillas DS44</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.plantillas.map((plantilla) => {
      const generated = generatedCodes.has(plantilla.codigo);
      return <Card key={plantilla.codigo} className="border-slate-200 shadow-sm"><CardHeader className="space-y-2"><div className="flex items-center justify-between gap-2"><Badge variant="outline">{plantilla.categoria}</Badge><Badge variant="outline" className={generated ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{generated ? "Generado" : "Pendiente"}</Badge></div><h3 className="text-base font-semibold text-slate-900">{plantilla.nombre}</h3></CardHeader><CardContent className="space-y-3 text-sm"><p className="text-slate-600">{plantilla.descripcion}</p><div><p className="font-medium text-slate-700">Objetivo</p><p className="text-slate-600">{plantilla.objetivo}</p></div><Button variant={generated ? "outline" : "default"} onClick={() => openPlantilla(plantilla.codigo)}>{generated ? "Ver / regenerar" : "Generar documento"}</Button></CardContent></Card>;
    })}</div></section>

    {plantillaData && <section className="grid gap-4 lg:grid-cols-2"><Card className="border-slate-200 shadow-sm"><CardHeader><h2 className="text-lg font-semibold text-slate-900">Completar {plantillaData.nombre}</h2></CardHeader><CardContent className="space-y-4">{plantillaData.campos.map((campo) => <label key={campo.key} className="block space-y-1 text-sm"><span className="font-medium text-slate-700">{campo.label}{campo.required ? " *" : ""}</span>{campo.type === "textarea" ? <textarea className="min-h-24 w-full rounded-md border border-slate-300 p-2" placeholder={campo.placeholder} value={campos[campo.key] ?? ""} onChange={(event) => setCampos((current) => ({ ...current, [campo.key]: event.target.value }))} /> : <input type={campo.type} className="w-full rounded-md border border-slate-300 p-2" placeholder={campo.placeholder} value={campos[campo.key] ?? ""} onChange={(event) => setCampos((current) => ({ ...current, [campo.key]: event.target.value }))} />}</label>)}
      <label className="block space-y-1 text-sm"><span className="font-medium text-slate-700">Acción DS44 relacionada (opcional)</span><select className="w-full rounded-md border border-slate-300 p-2" value={accionId} onChange={(event) => setAccionId(event.target.value)}><option value="">Sin vínculo a evidencia</option>{data.accionesPlan.map((accion) => <option key={accion.id} value={accion.id}>{accion.prioridad.toUpperCase()} · {accion.accionSugerida}</option>)}</select></label>
      <Button disabled={isPending} onClick={submit}>Registrar documento</Button></CardContent></Card>
      <Card className="border-slate-200 shadow-sm"><CardHeader><h2 className="text-lg font-semibold text-slate-900">Vista previa</h2></CardHeader><CardContent><div className="prose prose-sm max-w-none rounded-lg border border-slate-200 bg-white p-5" dangerouslySetInnerHTML={{ __html: previewHtml }} /></CardContent></Card></section>}

    <section className="space-y-3"><h2 className="text-lg font-semibold text-slate-900">Documentos generados</h2><Card className="overflow-hidden border-slate-200 shadow-sm"><CardContent className="overflow-x-auto p-0">{data.documentosGenerados.length === 0 ? <p className="p-6 text-sm text-slate-500">Aún no hay documentos DS44 generados.</p> : <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Documento</th><th className="p-3">Tipo</th><th className="p-3">Fecha</th><th className="p-3">Estado</th><th className="p-3">Evidencia asociada</th></tr></thead><tbody>{data.documentosGenerados.map((documento) => <tr key={documento.id} className="border-t border-slate-100"><td className="p-3 font-medium text-slate-900">{documento.nombre}</td><td className="p-3 text-slate-600">{documento.tipoDocumento}</td><td className="p-3 text-slate-600">{formatFecha(documento.createdAt)}</td><td className="p-3"><Badge variant="outline">{documento.estado}</Badge></td><td className="p-3 text-slate-600">{documento.evidenciaId ? "Sí" : "No"}</td></tr>)}</tbody></table>}</CardContent></Card></section>
  </div>;
}
