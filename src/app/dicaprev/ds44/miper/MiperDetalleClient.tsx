"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { actualizarCabeceraDs44Miper, cambiarEstadoDs44Miper, crearNuevaRevisionDs44Miper, descargarExcelDs44Miper, guardarDs44MiperControl, guardarDs44MiperItem } from "./actions";
import type { MiperCategoria, MiperControl, MiperControlEstado, MiperControlTipo, MiperDetalleData, MiperEstado, MiperItem } from "./types";

const ESTADOS: Record<MiperEstado, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "border-slate-200 bg-slate-100 text-slate-700" },
  vigente: { label: "Vigente", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  en_revision: { label: "En revisión", className: "border-blue-200 bg-blue-50 text-blue-700" },
  archivado: { label: "Archivado", className: "border-slate-300 bg-slate-50 text-slate-500" },
};

const RIESGOS = {
  bajo: { label: "Bajo", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  medio: { label: "Medio", className: "border-amber-200 bg-amber-50 text-amber-700" },
  alto: { label: "Alto", className: "border-orange-200 bg-orange-50 text-orange-700" },
  critico: { label: "Crítico", className: "border-rose-200 bg-rose-50 text-rose-700" },
  tolerable: { label: "Tolerable", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  moderado: { label: "Moderado", className: "border-amber-200 bg-amber-50 text-amber-700" },
  importante: { label: "Importante", className: "border-orange-200 bg-orange-50 text-orange-700" },
  intolerable: { label: "Intolerable", className: "border-rose-200 bg-rose-50 text-rose-700" },
} as const;

const TIPO_CONTROL: Record<MiperControlTipo, string> = {
  eliminacion: "Eliminación",
  sustitucion: "Sustitución",
  ingenieria: "Ingeniería",
  administrativo: "Administrativo",
  epp: "EPP",
};

const ESTADO_CONTROL: Record<MiperControlEstado, string> = {
  pendiente: "Pendiente",
  implementado: "Implementado",
  en_revision: "En revisión",
  descartado: "Descartado",
};

const inputClass = "rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-slate-200";

function isoDate(value: string | null): string {
  return value?.slice(0, 10) ?? "";
}

function fecha(value: string | null): string {
  if (!value) return "Sin definir";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
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

type ItemForm = {
  itemId?: string;
  centroTrabajoId: string;
  areaId: string;
  cargoId: string;
  actividad: string;
  peligro: string;
  riesgo: string;
  consecuencia: string;
  categoriaRiesgo: MiperCategoria;
  probabilidad: number;
  severidad: number;
  magnitudExposicion: string;
  nivelRiesgoEspecifico: string;
  protocoloAplicable: string;
  estadoEvaluacionEspecifica: "pendiente" | "en_evaluacion" | "evaluado";
  observacionTecnica: string;
  responsableTrabajadorId: string;
  observaciones: string;
};

const EMPTY_ITEM: ItemForm = { centroTrabajoId: "", areaId: "", cargoId: "", actividad: "", peligro: "", riesgo: "", consecuencia: "", categoriaRiesgo: "seguridad", probabilidad: 1, severidad: 1, magnitudExposicion: "", nivelRiesgoEspecifico: "", protocoloAplicable: "", estadoEvaluacionEspecifica: "pendiente", observacionTecnica: "", responsableTrabajadorId: "", observaciones: "" };

type ControlForm = {
  controlId?: string;
  miperItemId: string;
  tipoControl: MiperControlTipo;
  descripcion: string;
  responsableTrabajadorId: string;
  fechaCompromiso: string;
  estado: MiperControlEstado;
};

const EMPTY_CONTROL: ControlForm = { miperItemId: "", tipoControl: "administrativo", descripcion: "", responsableTrabajadorId: "", fechaCompromiso: "", estado: "pendiente" };

export default function MiperDetalleClient({ data }: { data: MiperDetalleData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editHeader, setEditHeader] = useState(false);
  const [nombre, setNombre] = useState(data.miper.nombre);
  const [fechaRevision, setFechaRevision] = useState(isoDate(data.miper.fechaProximaRevision));
  const [observaciones, setObservaciones] = useState(data.miper.observaciones ?? "");
  const [responsableElaboracionId, setResponsableElaboracionId] = useState(data.miper.responsableElaboracionId ?? "");
  const [procesoResponsableId, setProcesoResponsableId] = useState(data.miper.procesoResponsableId ?? "");
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState<ItemForm>(EMPTY_ITEM);
  const [controlForm, setControlForm] = useState<ControlForm>(EMPTY_CONTROL);
  const [showControlForm, setShowControlForm] = useState(false);

  const cargosDisponibles = useMemo(() => data.cargos.filter((cargo) => !itemForm.areaId || !cargo.areaId || cargo.areaId === itemForm.areaId), [data.cargos, itemForm.areaId]);
  const riesgosCriticos = data.items.filter((item) => item.clasificacionRiesgo === "critico" || item.clasificacionRiesgo === "intolerable").length;
  const controlesPendientes = data.items.flatMap((item) => item.controles).filter((control) => control.estado === "pendiente").length;

  function run(action: () => Promise<void>, success: string, after?: () => void) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
        setMessage(success);
        after?.();
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No fue posible completar la operación.");
      }
    });
  }

  function editarItem(item: MiperItem) {
    if (item.metodologiaEvaluacion === "legacy_5x5") {
      setError("Este ítem conserva la evaluación histórica 5×5. Crea una nueva revisión para reevaluarlo explícitamente con metodología ISP.");
      return;
    }
    setItemForm({ itemId: item.id, centroTrabajoId: item.centroTrabajoId ?? "", areaId: item.areaId ?? "", cargoId: item.cargoId ?? "", actividad: item.actividad, peligro: item.peligro, riesgo: item.riesgo, consecuencia: item.consecuencia, categoriaRiesgo: item.categoriaRiesgo ?? "seguridad", probabilidad: item.probabilidad ?? 1, severidad: item.severidad ?? 1, magnitudExposicion: item.magnitudExposicion ?? "", nivelRiesgoEspecifico: item.nivelRiesgoEspecifico ?? "", protocoloAplicable: item.protocoloAplicable ?? "", estadoEvaluacionEspecifica: item.estadoEvaluacionEspecifica ?? "pendiente", observacionTecnica: item.observacionTecnica ?? "", responsableTrabajadorId: item.responsableTrabajadorId ?? "", observaciones: item.observaciones ?? "" });
    setShowItemForm(true);
  }

  function editarControl(itemId: string, control?: MiperControl) {
    setControlForm(control ? { controlId: control.id, miperItemId: itemId, tipoControl: control.tipoControl, descripcion: control.descripcion, responsableTrabajadorId: control.responsableTrabajadorId ?? "", fechaCompromiso: isoDate(control.fechaCompromiso), estado: control.estado } : { ...EMPTY_CONTROL, miperItemId: itemId });
    setShowControlForm(true);
  }

  return <div className="space-y-5">
    {data.miper.estado === "vigente" && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 shadow-sm">Una matriz vigente no puede modificarse directamente. Crea una nueva revisión para actualizarla.</div>}
    {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[["Ítems evaluados", data.items.length], ["Riesgos críticos", riesgosCriticos], ["Controles", data.items.reduce((total, item) => total + item.controles.length, 0)], ["Controles pendientes", controlesPendientes]].map(([label, value]) => <Card key={label} className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{value}</p></CardContent></Card>)}
    </div>

    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold text-slate-900">{data.miper.codigo} · {data.miper.nombre}</h2><Badge variant="outline" className={ESTADOS[data.miper.estado].className}>{ESTADOS[data.miper.estado].label}</Badge></div><p className="mt-2 text-sm text-slate-500">Versión {data.miper.version} · Vigente desde {fecha(data.miper.vigenteDesde)} · Próxima revisión {fecha(data.miper.fechaProximaRevision)}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" className="rounded-2xl" disabled={isPending} onClick={() => run(async () => { const archivo = await descargarExcelDs44Miper(data.miper.id); descargarBase64(archivo.base64, archivo.nombre); }, "Excel MIPER generado y descargado.")}>Descargar matriz Excel</Button>{data.editable && <Button variant="outline" className="rounded-2xl" onClick={() => setEditHeader((value) => !value)}>Editar cabecera</Button>}{data.editable && data.miper.estado === "borrador" && <Button variant="outline" className="rounded-2xl" disabled={isPending} onClick={() => run(() => cambiarEstadoDs44Miper({ miperId: data.miper.id, estado: "en_revision" }), "Matriz enviada a revisión.")}>Enviar a revisión</Button>}{data.miper.estado === "en_revision" && data.puedeAprobar && <Button className="rounded-2xl" disabled={isPending} onClick={() => run(() => cambiarEstadoDs44Miper({ miperId: data.miper.id, estado: "vigente" }), "Matriz declarada vigente.")}>Declarar vigente</Button>}{data.miper.estado === "vigente" && <Button variant="outline" className="rounded-2xl" disabled={isPending} onClick={() => run(async () => { const revision = await crearNuevaRevisionDs44Miper(data.miper.id); router.push(`/dicaprev/ds44/miper/${revision.id}`); }, "Nueva revisión creada.")}>Crear nueva revisión</Button>}</div></div>
      {!editHeader && <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-2"><p><strong>Proceso:</strong> {data.miper.procesoNombre ?? "Sin definir"}</p><p><strong>Responsable del proceso:</strong> {data.miper.procesoResponsable ?? "Sin responsable"}</p>{data.miper.observaciones && <p className="sm:col-span-2"><strong>Observaciones:</strong> {data.miper.observaciones}</p>}</div>}
      {editHeader && <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 md:grid-cols-2"><label className="grid gap-1 text-sm font-medium">Nombre<input className={inputClass} value={nombre} onChange={(event) => setNombre(event.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Próxima revisión<input type="date" className={inputClass} value={fechaRevision} onChange={(event) => setFechaRevision(event.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Responsable del proceso<select className={inputClass} value={procesoResponsableId} onChange={(event) => setProcesoResponsableId(event.target.value)}><option value="">Selecciona trabajador</option>{data.responsables.map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.cargo ? ` · ${item.cargo}` : ""}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Responsable de elaboración<select className={inputClass} value={responsableElaboracionId} onChange={(event) => setResponsableElaboracionId(event.target.value)}><option value="">Selecciona trabajador</option>{data.responsables.map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.cargo ? ` · ${item.cargo}` : ""}</option>)}</select></label><label className="grid gap-1 text-sm font-medium md:col-span-2">Observaciones<textarea className={`${inputClass} min-h-24`} value={observaciones} onChange={(event) => setObservaciones(event.target.value)} /></label><div className="flex gap-2 md:col-span-2"><Button className="rounded-2xl" disabled={isPending} onClick={() => run(() => actualizarCabeceraDs44Miper({ miperId: data.miper.id, nombre, fechaProximaRevision: fechaRevision, observaciones, responsableElaboracionId, procesoResponsableId }), "Cabecera actualizada.", () => setEditHeader(false))}>Guardar</Button><Button variant="outline" className="rounded-2xl" onClick={() => setEditHeader(false)}>Cancelar</Button></div></div>}
      <div className="grid gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:grid-cols-3"><p>Creada por <strong>{data.miper.creadoPor}</strong></p><p>Actualizada por <strong>{data.miper.actualizadoPor}</strong></p><p>Aprobada por <strong>{data.miper.aprobadoPor ?? "Sin aprobación"}</strong></p></div>
    </CardContent></Card>

    {data.editable && <div className="flex justify-end"><Button className="rounded-2xl font-semibold" onClick={() => { setItemForm(EMPTY_ITEM); setShowItemForm(true); }}>Nuevo ítem MIPER</Button></div>}

    {showItemForm && <Card className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardHeader><h2 className="text-lg font-bold text-slate-900">{itemForm.itemId ? "Editar ítem MIPER" : "Nuevo ítem MIPER"}</h2></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <label className="grid gap-1 text-sm font-medium">Centro de trabajo<select className={inputClass} value={itemForm.centroTrabajoId} onChange={(event) => setItemForm((value) => ({ ...value, centroTrabajoId: event.target.value }))}><option value="">Selecciona centro</option>{data.centros.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Área<select className={inputClass} value={itemForm.areaId} onChange={(event) => setItemForm((value) => ({ ...value, areaId: event.target.value, cargoId: "" }))}><option value="">Selecciona área</option>{data.areas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Cargo<select className={inputClass} value={itemForm.cargoId} onChange={(event) => setItemForm((value) => ({ ...value, cargoId: event.target.value }))}><option value="">Selecciona cargo</option>{cargosDisponibles.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Actividad o tarea<input className={inputClass} value={itemForm.actividad} onChange={(event) => setItemForm((value) => ({ ...value, actividad: event.target.value }))} /></label>
      <label className="grid gap-1 text-sm font-medium">Peligro<input className={inputClass} value={itemForm.peligro} onChange={(event) => setItemForm((value) => ({ ...value, peligro: event.target.value }))} /></label>
      <label className="grid gap-1 text-sm font-medium">Riesgo<input className={inputClass} value={itemForm.riesgo} onChange={(event) => setItemForm((value) => ({ ...value, riesgo: event.target.value }))} /></label>
      <label className="grid gap-1 text-sm font-medium lg:col-span-2">Consecuencia<input className={inputClass} value={itemForm.consecuencia} onChange={(event) => setItemForm((value) => ({ ...value, consecuencia: event.target.value }))} /></label>
      <label className="grid gap-1 text-sm font-medium">Responsable<select className={inputClass} value={itemForm.responsableTrabajadorId} onChange={(event) => setItemForm((value) => ({ ...value, responsableTrabajadorId: event.target.value }))}><option value="">Selecciona responsable</option>{data.responsables.map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.cargo ? ` · ${item.cargo}` : ""}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Categoría ISP<select className={inputClass} value={itemForm.categoriaRiesgo} onChange={(event) => setItemForm((value) => ({ ...value, categoriaRiesgo: event.target.value as MiperCategoria }))}><option value="seguridad">Seguridad</option><option value="emergencia">Emergencia</option><option value="higienico">Higiénico</option><option value="psicosocial">Psicosocial</option><option value="musculoesqueletico">Musculoesquelético</option></select></label>
      {(itemForm.categoriaRiesgo === "seguridad" || itemForm.categoriaRiesgo === "emergencia") ? <>
        <label className="grid gap-1 text-sm font-medium">Probabilidad VEP<select className={inputClass} value={itemForm.probabilidad} onChange={(event) => setItemForm((value) => ({ ...value, probabilidad: Number(event.target.value) }))}>{[1,2,4].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium">Consecuencia VEP<select className={inputClass} value={itemForm.severidad} onChange={(event) => setItemForm((value) => ({ ...value, severidad: Number(event.target.value) }))}>{[1,2,4].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"><p className="font-medium">VEP calculado en servidor</p><p className="mt-1 text-slate-500">Vista referencial: {itemForm.probabilidad * itemForm.severidad}</p></div>
      </> : <>
        <label className="grid gap-1 text-sm font-medium">Magnitud de exposición<input className={inputClass} value={itemForm.magnitudExposicion} onChange={(event) => setItemForm((value) => ({ ...value, magnitudExposicion: event.target.value }))} /></label>
        <label className="grid gap-1 text-sm font-medium">Nivel de riesgo específico<input className={inputClass} value={itemForm.nivelRiesgoEspecifico} onChange={(event) => setItemForm((value) => ({ ...value, nivelRiesgoEspecifico: event.target.value }))} /></label>
        <label className="grid gap-1 text-sm font-medium">Protocolo o método aplicable<input className={inputClass} value={itemForm.protocoloAplicable} onChange={(event) => setItemForm((value) => ({ ...value, protocoloAplicable: event.target.value }))} /></label>
        <label className="grid gap-1 text-sm font-medium">Estado evaluación<select className={inputClass} value={itemForm.estadoEvaluacionEspecifica} onChange={(event) => setItemForm((value) => ({ ...value, estadoEvaluacionEspecifica: event.target.value as ItemForm["estadoEvaluacionEspecifica"] }))}><option value="pendiente">Pendiente</option><option value="en_evaluacion">En evaluación</option><option value="evaluado">Evaluado</option></select></label>
        <label className="grid gap-1 text-sm font-medium md:col-span-2 lg:col-span-3">Observación técnica<textarea className={`${inputClass} min-h-20`} value={itemForm.observacionTecnica} onChange={(event) => setItemForm((value) => ({ ...value, observacionTecnica: event.target.value }))} /></label>
      </>}
      <label className="grid gap-1 text-sm font-medium md:col-span-2 lg:col-span-3">Observaciones<textarea className={`${inputClass} min-h-24`} value={itemForm.observaciones} onChange={(event) => setItemForm((value) => ({ ...value, observaciones: event.target.value }))} /></label>
      <div className="flex gap-2 md:col-span-2 lg:col-span-3"><Button className="rounded-2xl" disabled={isPending} onClick={() => run(() => guardarDs44MiperItem({ ...itemForm, miperId: data.miper.id }), itemForm.itemId ? "Ítem actualizado." : "Ítem creado.", () => { setShowItemForm(false); setItemForm(EMPTY_ITEM); })}>Guardar ítem</Button><Button variant="outline" className="rounded-2xl" onClick={() => setShowItemForm(false)}>Cancelar</Button></div>
    </CardContent></Card>}

    {showControlForm && <Card className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardHeader><h2 className="text-lg font-bold">{controlForm.controlId ? "Editar medida de control" : "Nueva medida de control"}</h2></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <label className="grid gap-1 text-sm font-medium">Tipo de control<select className={inputClass} value={controlForm.tipoControl} onChange={(event) => setControlForm((value) => ({ ...value, tipoControl: event.target.value as MiperControlTipo }))}>{Object.entries(TIPO_CONTROL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Responsable<select className={inputClass} value={controlForm.responsableTrabajadorId} onChange={(event) => setControlForm((value) => ({ ...value, responsableTrabajadorId: event.target.value }))}><option value="">Selecciona responsable</option>{data.responsables.map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.cargo ? ` · ${item.cargo}` : ""}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Fecha compromiso<input type="date" className={inputClass} value={controlForm.fechaCompromiso} onChange={(event) => setControlForm((value) => ({ ...value, fechaCompromiso: event.target.value }))} /></label>
      <label className="grid gap-1 text-sm font-medium">Estado<select className={inputClass} value={controlForm.estado} onChange={(event) => setControlForm((value) => ({ ...value, estado: event.target.value as MiperControlEstado }))}>{Object.entries(ESTADO_CONTROL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium md:col-span-2">Medida de control<textarea className={`${inputClass} min-h-24`} value={controlForm.descripcion} onChange={(event) => setControlForm((value) => ({ ...value, descripcion: event.target.value }))} /></label>
      <div className="flex gap-2 md:col-span-2 lg:col-span-3"><Button className="rounded-2xl" disabled={isPending} onClick={() => run(() => guardarDs44MiperControl(controlForm), controlForm.controlId ? "Control actualizado." : "Control creado.", () => { setShowControlForm(false); setControlForm(EMPTY_CONTROL); })}>Guardar control</Button><Button variant="outline" className="rounded-2xl" onClick={() => setShowControlForm(false)}>Cancelar</Button></div>
    </CardContent></Card>}

    {data.items.length === 0 ? <Card className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="p-10 text-center text-sm text-slate-500">La matriz todavía no tiene ítems evaluados.</CardContent></Card> : <div className="space-y-4">{data.items.map((item) => <Card key={item.id} className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm"><CardHeader className="border-b border-slate-100 bg-slate-50/60"><div className="flex flex-wrap items-start justify-between gap-3"><div className="space-y-2"><div className="flex flex-wrap items-center gap-2">{item.clasificacionRiesgo && item.nivelRiesgo ? <Badge variant="outline" className={RIESGOS[item.clasificacionRiesgo].className}>{RIESGOS[item.clasificacionRiesgo].label} · {item.nivelRiesgo}</Badge> : <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Evaluación específica · {item.estadoEvaluacionEspecifica ?? "pendiente"}</Badge>}<Badge variant="outline">{item.metodologiaEvaluacion === "legacy_5x5" ? `Histórico 5×5 · P ${item.probabilidad} × S ${item.severidad}` : item.metodologiaEvaluacion === "vep_isp" ? `VEP ISP · P ${item.probabilidad} × C ${item.severidad}` : item.protocoloAplicable ?? "Método específico pendiente"}</Badge></div><h2 className="text-lg font-bold text-slate-900">{item.actividad}</h2><p className="text-sm text-slate-500">{item.centroTrabajoNombre} · {item.areaNombre} · {item.cargoNombre}</p></div>{data.editable && <div className="flex gap-2"><Button size="sm" variant="outline" className="rounded-xl" onClick={() => editarItem(item)}>Editar ítem</Button><Button size="sm" className="rounded-xl" onClick={() => editarControl(item.id)}>Agregar control</Button></div>}</div></CardHeader><CardContent className="space-y-5 p-5">
      <div className="grid gap-3 md:grid-cols-3"><div className="rounded-xl border border-slate-100 p-3"><p className="text-xs font-semibold uppercase text-slate-500">Peligro</p><p className="mt-1 text-sm text-slate-800">{item.peligro}</p></div><div className="rounded-xl border border-slate-100 p-3"><p className="text-xs font-semibold uppercase text-slate-500">Riesgo</p><p className="mt-1 text-sm text-slate-800">{item.riesgo}</p></div><div className="rounded-xl border border-slate-100 p-3"><p className="text-xs font-semibold uppercase text-slate-500">Consecuencia</p><p className="mt-1 text-sm text-slate-800">{item.consecuencia}</p></div></div>
      <p className="text-sm text-slate-600"><strong>Responsable:</strong> {item.responsableNombre ?? "Sin responsable"}</p>
      <div><h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">Medidas de control</h3>{item.controles.length === 0 ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Sin medidas de control registradas.</p> : <div className="space-y-2">{item.controles.map((control) => <div key={control.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap gap-2"><Badge variant="outline">{TIPO_CONTROL[control.tipoControl]}</Badge><Badge variant="outline">{ESTADO_CONTROL[control.estado]}</Badge></div><p className="mt-2 text-sm text-slate-800">{control.descripcion}</p><p className="mt-1 text-xs text-slate-500">{control.responsableNombre ?? "Sin responsable"} · Compromiso {fecha(control.fechaCompromiso)}</p></div>{data.editable && <Button size="sm" variant="outline" className="rounded-xl" onClick={() => editarControl(item.id, control)}>Editar</Button>}</div>)}</div>}</div>
    </CardContent></Card>)}</div>}
  </div>;
}
