"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { crearEvidenciaDs44, revisarEvidenciaDs44 } from "./actions";
import type { Ds44EvidenciaAccion, Ds44EvidenciaEstado, Ds44EvidenciasData } from "./types";

const ESTADO: Record<Ds44EvidenciaEstado, { label: string; className: string }> = {
  sin_planificar: { label: "Sin planificar", className: "border-slate-200 bg-slate-100 text-slate-700" },
  pendiente_evidencia: { label: "Pendiente evidencia", className: "border-amber-200 bg-amber-50 text-amber-700" },
  en_revision: { label: "En revisión", className: "border-blue-200 bg-blue-50 text-blue-700" },
  valida: { label: "Válida", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  rechazada: { label: "Rechazada", className: "border-rose-200 bg-rose-50 text-rose-700" },
  vencida: { label: "Vencida", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

function fecha(value: string | null): string {
  if (!value) return "Sin fecha definida";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function responsable(accion: Ds44EvidenciaAccion): string {
  const nombre = accion.responsableTrabajadorNombre || accion.responsableReal;
  return nombre ? `${nombre}${accion.responsableTrabajadorCargo ? ` · ${accion.responsableTrabajadorCargo}` : ""}` : "Sin responsable";
}

export default function Ds44EvidenciasClient({ data }: { data: Ds44EvidenciasData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [formId, setFormId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivoUrl, setArchivoUrl] = useState("");
  const [archivoNombre, setArchivoNombre] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function submit(accionId: string) {
    startTransition(async () => {
      try {
        await crearEvidenciaDs44({ ds44PlanAccionId: accionId, titulo, descripcion, archivoUrl, archivoNombre });
        setTitulo(""); setDescripcion(""); setArchivoUrl(""); setArchivoNombre(""); setFormId(null);
        setMessage("Evidencia registrada y enviada a revisión.");
        router.refresh();
      } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible registrar la evidencia."); }
    });
  }

  function review(evidenciaId: string, estado: "valida" | "rechazada") {
    startTransition(async () => {
      try { await revisarEvidenciaDs44({ evidenciaId, estado }); setMessage(estado === "valida" ? "Evidencia validada." : "Evidencia rechazada."); router.refresh(); }
      catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible revisar la evidencia."); }
    });
  }

  if (data.databaseUpdateRequired) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-medium text-amber-900 shadow-sm">Las evidencias DS44 requieren actualizar la base de datos. Ejecuta prisma migrate deploy.</div>;

  const cards = [
    ["Total acciones", data.resumen.totalAcciones], ["Planificadas", data.resumen.planificadas], ["Con evidencia válida", data.resumen.conEvidenciaValida],
    ["Pendientes de evidencia", data.resumen.pendientesEvidencia], ["En revisión", data.resumen.enRevision], ["Rechazadas/vencidas", data.resumen.rechazadasOVencidas], ["Cobertura", `${data.resumen.coberturaPorcentaje}%`],
  ];

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <Card key={label} className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p></CardContent></Card>)}</div>
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900 shadow-sm">Las evidencias DS44 también se reflejan en Evidencias generales de Cumplimiento, que funciona como repositorio maestro.</div>
    {message && <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-sm">{message}</div>}
    {data.acciones.length === 0 ? <Card className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="space-y-4 p-6"><p>No hay acciones DS44 para evidenciar. Primero completa diagnóstico y plan de implementación.</p><Button className="rounded-2xl font-semibold" asChild variant="outline"><Link href="/dicaprev/ds44/plan-implementacion">Ir al Plan DS44</Link></Button></CardContent></Card> :
      <div className="space-y-5">{data.acciones.map((accion) => <Card key={accion.id} className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm"><CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{accion.prioridad}</Badge><Badge variant="outline">{accion.bloque || "DS44"}</Badge><Badge variant="outline" className={ESTADO[accion.estadoEvidencia].className}>{ESTADO[accion.estadoEvidencia].label}</Badge></div></CardHeader><CardContent className="space-y-5 p-5 text-sm">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Acción</p><h2 className="mt-1 text-lg font-semibold text-slate-900">{accion.accionSugerida}</h2></div>
        <div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidencia esperada</p><p className="mt-1 text-slate-700">{accion.evidenciaEsperada || "Sin definición"}</p></div><div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ruta sugerida</p><p className="mt-1 text-slate-700">{accion.rutaSugerida || "Sin ruta sugerida"}</p></div><div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Responsable</p><p className="mt-1 text-slate-700">{responsable(accion)}</p></div><div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha compromiso</p><p className="mt-1 text-slate-700">{fecha(accion.fechaCompromiso)}</p></div></div>
        {!accion.planificada && <p className="rounded-xl bg-slate-100 p-3 text-slate-700">Primero define responsable y fecha compromiso en el Plan DS44.</p>}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4"><Button className="rounded-2xl font-semibold" disabled={!accion.planificada || isPending} onClick={() => setFormId(formId === accion.id ? null : accion.id)}>Registrar evidencia</Button><Button className="rounded-2xl font-semibold" variant="outline" onClick={() => setOpenId(openId === accion.id ? null : accion.id)}>Ver evidencias ({accion.evidencias.length})</Button></div>
        {formId === accion.id && <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4"><input className="rounded-xl border border-slate-200 bg-white p-3 outline-none focus:ring-2 focus:ring-slate-200" placeholder="Título de evidencia" value={titulo} onChange={(e) => setTitulo(e.target.value)} /><textarea className="min-h-24 rounded-xl border border-slate-200 bg-white p-3 outline-none focus:ring-2 focus:ring-slate-200" placeholder="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /><input className="rounded-xl border border-slate-200 bg-white p-3 outline-none focus:ring-2 focus:ring-slate-200" placeholder="URL del archivo o respaldo (opcional)" value={archivoUrl} onChange={(e) => setArchivoUrl(e.target.value)} /><input className="rounded-xl border border-slate-200 bg-white p-3 outline-none focus:ring-2 focus:ring-slate-200" placeholder="Nombre del archivo o respaldo (opcional)" value={archivoNombre} onChange={(e) => setArchivoNombre(e.target.value)} /><Button className="w-fit rounded-2xl font-semibold" disabled={isPending} onClick={() => submit(accion.id)}>Guardar evidencia</Button></div>}
        {openId === accion.id && <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">{accion.evidencias.length === 0 ? <p className="text-slate-500">Aún no hay evidencias registradas.</p> : accion.evidencias.map((item) => <div key={item.id} className="space-y-2 border-b border-slate-200 pb-3 last:border-0"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold text-slate-900">{item.titulo}</p><p className="text-slate-600">{item.descripcion}</p></div><Badge variant="outline">{item.estado}</Badge></div>{item.archivoUrl && <a className="font-medium text-blue-700 underline" href={item.archivoUrl} target="_blank" rel="noreferrer">{item.archivoNombre || "Abrir respaldo"}</a>}{item.estado === "pendiente" && <div className="flex gap-2"><Button className="rounded-2xl font-semibold" size="sm" disabled={isPending} onClick={() => review(item.id, "valida")}>Validar</Button><Button className="rounded-2xl font-semibold" size="sm" variant="destructive" disabled={isPending} onClick={() => review(item.id, "rechazada")}>Rechazar</Button></div>}</div>)}</div>}
      </CardContent></Card>)}</div>}
  </div>;
}
