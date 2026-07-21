"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { crearDs44Miper, eliminarDs44MiperBorrador } from "./actions";
import type { MiperEstado, MiperListadoData } from "./types";

const ESTADOS: Record<MiperEstado, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "border-slate-200 bg-slate-100 text-slate-700" },
  vigente: { label: "Vigente", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  en_revision: { label: "En revisión", className: "border-blue-200 bg-blue-50 text-blue-700" },
  archivado: { label: "Archivado", className: "border-slate-300 bg-slate-50 text-slate-500" },
};

function fecha(value: string | null): string {
  if (!value) return "Sin definir";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export default function MiperListadoClient({ data }: { data: MiperListadoData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [fechaRevision, setFechaRevision] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const matrices = useMemo(() => {
    const token = filtro.trim().toLowerCase();
    if (!token) return data.matrices;
    return data.matrices.filter((item) => `${item.codigo} ${item.nombre} ${item.estado}`.toLowerCase().includes(token));
  }, [data.matrices, filtro]);

  function crear() {
    setMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      try {
        const result = await crearDs44Miper({ codigo, nombre, fechaProximaRevision: fechaRevision, observaciones });
        setOpen(false);
        router.push(`/dicaprev/ds44/miper/${result.id}`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No fue posible crear la matriz MIPER.");
      }
    });
  }

  function eliminarBorrador(item: MiperListadoData["matrices"][number]) {
    const confirmado = window.confirm(
      `¿Eliminar el borrador ${item.codigo} · ${item.nombre}?\n\nSe eliminarán también sus tareas, exposiciones, riesgos y controles. Esta acción no se puede deshacer.`,
    );
    if (!confirmado) return;

    setMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      try {
        await eliminarDs44MiperBorrador(item.id);
        setSuccessMessage(`El borrador ${item.codigo} fue eliminado.`);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No fue posible eliminar la matriz MIPER.");
      }
    });
  }

  if (data.databaseUpdateRequired) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-medium text-amber-900 shadow-sm">El módulo MIPER requiere aplicar la migración de base de datos después del merge.</div>;
  }

  const kpis = [
    ["Matrices", data.resumen.matrices],
    ["Vigentes", data.resumen.vigentes],
    ["Ítems evaluados", data.resumen.itemsEvaluados],
    ["Riesgos críticos", data.resumen.riesgosCriticos],
  ];

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map(([label, value]) => <Card key={label} className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p></CardContent></Card>)}
    </div>

    {message && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{message}</div>}
    {successMessage && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{successMessage}</div>}

    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="space-y-5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-slate-200 sm:max-w-md" placeholder="Buscar por código, nombre o estado" value={filtro} onChange={(event) => setFiltro(event.target.value)} />
        <div className="flex flex-wrap gap-2"><Button asChild className="rounded-2xl font-semibold"><Link href="/dicaprev/ds44/miper/asistente">Crear con asistente</Link></Button><Button variant="outline" className="rounded-2xl font-semibold" onClick={() => setOpen((value) => !value)}>Modo experto</Button></div>
      </div>

      {open && <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">Código<input className="rounded-xl border border-slate-200 bg-white p-3 font-normal uppercase" value={codigo} onChange={(event) => setCodigo(event.target.value)} placeholder="MIPER-001" /></label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Nombre<input className="rounded-xl border border-slate-200 bg-white p-3 font-normal" value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Matriz general de riesgos" /></label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Próxima revisión<input type="date" className="rounded-xl border border-slate-200 bg-white p-3 font-normal" value={fechaRevision} onChange={(event) => setFechaRevision(event.target.value)} /></label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Observaciones<textarea className="min-h-24 rounded-xl border border-slate-200 bg-white p-3 font-normal" value={observaciones} onChange={(event) => setObservaciones(event.target.value)} /></label>
        <div className="flex gap-2 md:col-span-2"><Button className="rounded-2xl font-semibold" disabled={isPending} onClick={crear}>Crear manualmente</Button><Button className="rounded-2xl" variant="outline" disabled={isPending} onClick={() => setOpen(false)}>Cancelar</Button></div>
      </div>}

      {matrices.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No hay matrices MIPER que coincidan con la búsqueda.</div> :
        <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">Código</th><th className="p-4">Nombre</th><th className="p-4">Versión</th><th className="p-4">Estado</th><th className="p-4">Vigencia</th><th className="p-4">Próxima revisión</th><th className="p-4">Ítems</th><th className="p-4">Críticos</th><th className="p-4" /></tr></thead><tbody>{matrices.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="p-4 font-semibold text-slate-900">{item.codigo}</td><td className="p-4 text-slate-700">{item.nombre}</td><td className="p-4">v{item.version}</td><td className="p-4"><Badge variant="outline" className={ESTADOS[item.estado].className}>{ESTADOS[item.estado].label}</Badge></td><td className="p-4 text-slate-600">{fecha(item.vigenteDesde)}</td><td className="p-4 text-slate-600">{fecha(item.fechaProximaRevision)}</td><td className="p-4">{item.cantidadItems}</td><td className="p-4 font-semibold text-rose-700">{item.riesgosCriticos}</td><td className="p-4"><div className="flex flex-wrap justify-end gap-2"><Button asChild variant="outline" size="sm" className="rounded-xl"><Link href={item.modoCreacion === "asistente" && item.estado === "borrador" && item.asistentePaso < 8 ? `/dicaprev/ds44/miper/asistente?miperId=${item.id}` : `/dicaprev/ds44/miper/${item.id}`}>{item.modoCreacion === "asistente" && item.estado === "borrador" && item.asistentePaso < 8 ? "Continuar asistente" : "Ver / editar"}</Link></Button>{item.estado === "borrador" && <Button type="button" variant="outline" size="sm" className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800" disabled={isPending} onClick={() => eliminarBorrador(item)}>Eliminar</Button>}</div></td></tr>)}</tbody></table></div>}
    </CardContent></Card>
  </div>;
}
