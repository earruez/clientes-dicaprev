"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { generarDs44Documento, getDs44DocumentoPdfSnapshot } from "./actions";
import { getPlantillaDs44 } from "./catalogo";
import { exportDs44DocumentoPdf } from "./export-ds44-documento-pdf";
import type { Ds44DocumentosData, Ds44PlantillaCodigo, Ds44ResponsableDisponible } from "./types";

function formatFecha(value: string): string {
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function clasificacionLabel(value: Ds44DocumentosData["plantillas"][number]["clasificacion"]): string {
  if (value === "exigible_segun_condicion") return "Exigible según condición";
  if (value === "recomendado") return "Recomendado";
  return "Base inicial";
}

export default function Ds44DocumentosClient({ data }: { data: Ds44DocumentosData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Ds44PlantillaCodigo | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [responsableIds, setResponsableIds] = useState<Record<string, string>>({});
  const [accionId, setAccionId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const plantillaData = data.plantillas.find((plantilla) => plantilla.codigo === selected);
  const plantillaRender = selected ? getPlantillaDs44(selected) : undefined;
  const generatedCodes = useMemo(() => new Set(data.documentosGenerados.map((documento) => documento.plantillaCodigo)), [data.documentosGenerados]);
  const previewHtml = plantillaRender ? plantillaRender.renderHtml({ ...campos, empresaNombre: data.empresaNombre }) : "";
  const faltanResponsables = plantillaData?.campos.some((campo) => campo.type === "responsable" && campo.required && !responsableIds[campo.key]) ?? false;

  function openPlantilla(codigo: Ds44PlantillaCodigo) {
    const plantilla = data.plantillas.find((item) => item.codigo === codigo);
    if (!plantilla) return;
    setSelected(codigo);
    setCampos(Object.fromEntries(plantilla.campos.map((campo) => [campo.key, campo.defaultValue ?? ""])));
    setResponsableIds({});
    setAccionId("");
    setMessage(null);
  }

  function seleccionarResponsable(campoKey: string, trabajadorId: string) {
    const responsable = data.responsablesDisponibles.find((item) => item.trabajadorId === trabajadorId);
    setResponsableIds((current) => ({ ...current, [campoKey]: trabajadorId }));
    setCampos((current) => ({
      ...current,
      [campoKey]: responsable?.nombre ?? "",
      ...(campoKey === "responsableNombre" ? { responsableCargo: responsable?.cargoNombre ?? "" } : {}),
    }));
  }

  function esRecomendadoParaCampo(responsable: Ds44ResponsableDisponible, filtros: Ds44ResponsableDisponible["tipoResponsable"][] | undefined): boolean {
    return Boolean(responsable.recomendado && filtros?.includes(responsable.tipoResponsable));
  }

  function submit() {
    if (!selected) return;
    startTransition(async () => {
      try {
        const result = await generarDs44Documento({ plantillaCodigo: selected, campos, responsables: responsableIds, ds44PlanAccionId: accionId || undefined });
        setMessage(result.evidenciaId ? "Documento registrado y evidencia DS44 creada para revisión." : "Documento DS44 registrado correctamente.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No fue posible registrar el documento DS44.");
      }
    });
  }

  async function exportPdf(documentoId: string) {
    setExportingId(documentoId);
    setExportError(null);
    try {
      const snapshot = await getDs44DocumentoPdfSnapshot(documentoId);
      const blob = await exportDs44DocumentoPdf(snapshot);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fecha = snapshot.generadoEn.slice(0, 10) || new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `ds44-${snapshot.plantillaCodigo.toLowerCase()}-${fecha}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "No fue posible exportar el documento DS44 a PDF.");
    } finally {
      setExportingId(null);
    }
  }

  if (data.databaseUpdateRequired) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-medium text-amber-900 shadow-sm">Los documentos DS44 requieren actualizar la base de datos. Ejecuta prisma migrate deploy.</div>;

  const summary = [
    ["Documentos base", data.resumen.totalPlantillas], ["Documentos generados", data.resumen.documentosGenerados],
    ["Bases generadas", data.resumen.documentosMinimosGenerados], ["Avance base", `${data.resumen.porcentajeAvance}%`],
  ];

  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{summary.map(([label, value]) => <Card key={label} className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p></CardContent></Card>)}</div>
    <div className="space-y-2 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900 shadow-sm"><p>Estos documentos son una base inicial del sistema de gestión SST. La exigibilidad definitiva depende del tamaño, riesgos, estructura preventiva y obligaciones aplicables de la empresa.</p><p>Las evidencias DS44 también se reflejan en Evidencias generales de Cumplimiento, que funciona como repositorio maestro.</p></div>
    {data.responsablesDisponibles.length === 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-medium text-amber-900 shadow-sm">Para generar documentos DS44 debes tener trabajadores activos con cargos de gerencia, jefatura, supervisión o prevención. Revisa Personas &gt; Listado o Empresa &gt; Cargos.</div>}
    {message && <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-sm">{message}</div>}
    {exportError && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm">{exportError}</div>}

    <section className="space-y-3"><div><h2 className="text-lg font-semibold text-slate-900">Documentos base DS44</h2><p className="mt-1 text-sm text-slate-600">Los cinco documentos actuales corresponden al set base inicial. El catálogo queda preparado para distinguir documentos exigibles según condición y recomendados en futuras fases.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.plantillas.map((plantilla) => {
      const generated = generatedCodes.has(plantilla.codigo);
      return <Card key={plantilla.codigo} className="rounded-2xl border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><CardHeader className="space-y-3"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{plantilla.categoria}</Badge><Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">{clasificacionLabel(plantilla.clasificacion)}</Badge><Badge variant="outline" className={generated ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{generated ? "Generado" : "Pendiente"}</Badge></div><h3 className="text-base font-semibold text-slate-900">{plantilla.nombre}</h3></CardHeader><CardContent className="space-y-4 text-sm"><p className="text-slate-600">{plantilla.descripcion}</p><div><p className="font-semibold text-slate-700">Objetivo</p><p className="mt-1 text-slate-600">{plantilla.objetivo}</p></div><Button className="rounded-2xl font-semibold" variant={generated ? "outline" : "default"} onClick={() => openPlantilla(plantilla.codigo)}>{generated ? "Ver / regenerar" : "Generar documento"}</Button></CardContent></Card>;
    })}</div></section>

    {plantillaData && <section className="grid gap-5 lg:grid-cols-2"><Card className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardHeader><h2 className="text-lg font-semibold text-slate-900">Completar {plantillaData.nombre}</h2></CardHeader><CardContent className="space-y-4">{plantillaData.campos.map((campo) => {
        const responsableSeleccionado = campo.type === "responsable" ? data.responsablesDisponibles.find((item) => item.trabajadorId === responsableIds[campo.key]) : undefined;
        return <label key={campo.key} className="block space-y-1 text-sm"><span className="flex items-center gap-2 font-medium text-slate-700">{campo.label}{campo.required ? " *" : ""}{responsableSeleccionado && esRecomendadoParaCampo(responsableSeleccionado, campo.filtroSugerido) && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Recomendado</Badge>}</span>
          {campo.type === "responsable" ? <><select className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200" value={responsableIds[campo.key] ?? ""} onChange={(event) => seleccionarResponsable(campo.key, event.target.value)}><option value="">Selecciona un trabajador responsable</option>{data.responsablesDisponibles.map((responsable) => <option key={responsable.trabajadorId} value={responsable.trabajadorId}>{responsable.nombre} — {responsable.cargoNombre}{esRecomendadoParaCampo(responsable, campo.filtroSugerido) ? " (Recomendado)" : ""}</option>)}</select>{responsableSeleccionado && <span className="block rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600"><strong className="text-slate-700">Cargo: {responsableSeleccionado.cargoNombre}</strong>{responsableSeleccionado.areaNombre ? ` · Área: ${responsableSeleccionado.areaNombre}` : ""}</span>}</> : campo.type === "textarea" ? <textarea className="min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200" placeholder={campo.placeholder} value={campos[campo.key] ?? ""} onChange={(event) => setCampos((current) => ({ ...current, [campo.key]: event.target.value }))} /> : <input type={campo.type} className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200" placeholder={campo.placeholder} value={campos[campo.key] ?? ""} onChange={(event) => setCampos((current) => ({ ...current, [campo.key]: event.target.value }))} />}
        </label>;
      })}
      <label className="block space-y-1 text-sm"><span className="font-medium text-slate-700">Acción DS44 relacionada (opcional)</span><select className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200" value={accionId} onChange={(event) => setAccionId(event.target.value)}><option value="">Sin vínculo a evidencia</option>{data.accionesPlan.map((accion) => <option key={accion.id} value={accion.id}>{accion.prioridad.toUpperCase()} · {accion.accionSugerida}</option>)}</select></label>
      <Button className="rounded-2xl font-semibold" disabled={isPending || data.responsablesDisponibles.length === 0 || faltanResponsables} onClick={submit}>Registrar documento</Button></CardContent></Card>
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardHeader><h2 className="text-lg font-semibold text-slate-900">Vista previa</h2></CardHeader><CardContent><div className="max-h-[720px] overflow-auto rounded-2xl border border-slate-200 bg-white p-5"><div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} /></div></CardContent></Card></section>}

    <section className="space-y-3"><h2 className="text-lg font-semibold text-slate-900">Documentos generados</h2><Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="overflow-x-auto p-0">{data.documentosGenerados.length === 0 ? <p className="p-6 text-sm text-slate-500">Aún no hay documentos DS44 generados.</p> : <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="p-4">Documento</th><th className="p-4">Tipo</th><th className="p-4">Fecha</th><th className="p-4">Estado</th><th className="p-4">Evidencia asociada</th><th className="p-4 text-right">Acción</th></tr></thead><tbody>{data.documentosGenerados.map((documento) => <tr key={documento.id} className="border-t border-slate-100 hover:bg-slate-50/60"><td className="p-4 font-medium text-slate-900">{documento.nombre}</td><td className="p-4 text-slate-600">{documento.tipoDocumento}</td><td className="p-4 text-slate-600">{formatFecha(documento.createdAt)}</td><td className="p-4"><Badge variant="outline">{documento.estado}</Badge></td><td className="p-4 text-slate-600">{documento.evidenciaId ? "Sí" : "No"}</td><td className="p-4 text-right"><Button className="rounded-2xl font-semibold" size="sm" variant="outline" disabled={exportingId === documento.id} onClick={() => exportPdf(documento.id)}><Download className="mr-2 h-4 w-4" />{exportingId === documento.id ? "Exportando..." : "Exportar PDF"}</Button></td></tr>)}</tbody></table>}</CardContent></Card></section>
  </div>;
}
