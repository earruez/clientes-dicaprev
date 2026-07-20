"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { finalizarMiperAsistente, guardarControlesAsistente, guardarDescripcionesAsistente, guardarEvaluacionesAsistente, guardarExposicionesAsistente, guardarRiesgosAsistente, guardarTareasAsistente, iniciarMiperAsistente, obtenerSugerenciasTareasIa } from "./actions";

type Data = Awaited<ReturnType<typeof import("./actions").getMiperAsistenteData>>;
type CargoAsistente = { id: string; cargoId: string; nombre: string; descripcionTrabajo: string; tareasTexto: string };
type Tarea = { id: string; asistenteCargoId: string; nombre: string };
type Respuesta = "aplica" | "no_aplica" | "no_se";
type Riesgo = { id?: string; tareaId: string; codigoIsp: string; confirmado: boolean; consecuencia: string; probabilidad: number; severidad: number; magnitudExposicion: string; nivelRiesgoEspecifico: string; estadoEvaluacionEspecifica: "pendiente" | "en_evaluacion" | "evaluado"; observacionTecnica: string; motivoSugerencia: string; control: string; controlTipo: "eliminacion" | "sustitucion" | "ingenieria" | "administrativo" | "epp"; controlResponsableId: string; controlFecha: string; controlEstado: "pendiente" | "implementado" | "en_revision" | "descartado" };

const PASOS = ["Alcance", "Trabajo", "Tareas", "Exposición", "Riesgos", "Evaluación", "Controles", "Resumen"];
const PREGUNTAS = [
  { grupo: "Lugares y desplazamiento", clave: "transito", pregunta: "¿Existe tránsito por superficies con posibilidad de caída?", codigo: "A1" },
  { grupo: "Lugares y desplazamiento", clave: "altura", pregunta: "¿Se trabaja sobre 1,8 metros o en profundidades equivalentes?", codigo: "A3" },
  { grupo: "Equipos y herramientas", clave: "herramientas", pregunta: "¿Se usan herramientas u objetos cortopunzantes?", codigo: "B3" },
  { grupo: "Equipos y herramientas", clave: "vehiculos", pregunta: "¿Hay interacción entre peatones y vehículos en movimiento?", codigo: "I1" },
  { grupo: "Electricidad", clave: "electricidad", pregunta: "¿Existe contacto posible con energía eléctrica?", codigo: "F1" },
  { grupo: "Emergencias", clave: "incendio", pregunta: "¿Existen combustibles, fuentes de ignición o escenarios de incendio?", codigo: "J" },
  { grupo: "Químicos y agentes higiénicos", clave: "quimicos", pregunta: "¿Existe exposición a aerosoles, polvos, fibras o humos?", codigo: "O1" },
  { grupo: "Químicos y agentes higiénicos", clave: "ruido", pregunta: "¿Existe exposición continua a niveles elevados de ruido?", codigo: "P1" },
  { grupo: "Ergonomía y manipulación de cargas", clave: "carga", pregunta: "¿Se levantan, transportan, empujan o arrastran cargas?", codigo: "R1" },
  { grupo: "Ergonomía y manipulación de cargas", clave: "repeticion", pregunta: "¿La tarea exige movimientos repetitivos de miembros superiores?", codigo: "S1" },
  { grupo: "Organización y factores psicosociales", clave: "carga_trabajo", pregunta: "¿La carga o los plazos de trabajo podrían ser una fuente de exposición?", codigo: "D1" },
] as const;

const inputClass = "rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-slate-200";

function construirRiesgos(tareas: Tarea[], respuestas: Record<string, Respuesta>, responsableId: string): Riesgo[] {
  const result: Riesgo[] = [];
  for (const tarea of tareas) for (const pregunta of PREGUNTAS) {
    const respuesta = respuestas[`${tarea.id}:${pregunta.clave}`];
    if (respuesta === "aplica" || respuesta === "no_se") result.push({ tareaId: tarea.id, codigoIsp: pregunta.codigo, confirmado: true, consecuencia: "Consecuencia por determinar y validar técnicamente", probabilidad: 1, severidad: 1, magnitudExposicion: "Pendiente de medición o aplicación del método específico", nivelRiesgoEspecifico: "Pendiente", estadoEvaluacionEspecifica: "pendiente", observacionTecnica: respuesta === "no_se" ? "Respuesta 'No sé': requiere revisión técnica." : "", motivoSugerencia: `${pregunta.grupo}: ${pregunta.pregunta}`, control: "", controlTipo: "administrativo", controlResponsableId: responsableId, controlFecha: "", controlEstado: "pendiente" });
  }
  return result;
}

export default function AsistenteMiperClient({ data }: { data: Data }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const inicial = data.borrador;
  const respuestasIniciales = Object.fromEntries((inicial?.respuestas ?? []).map((item) => [item.clave, item.respuesta])) as Record<string, Respuesta>;
  const [paso, setPaso] = useState(inicial?.paso ?? 1);
  const [miperId, setMiperId] = useState(inicial?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [avisoIa, setAvisoIa] = useState<string | null>(null);
  const [cabecera, setCabecera] = useState(inicial?.cabecera ?? { codigo: "", nombre: "", centroTrabajoId: "", areaId: "", cargoIds: [] as string[], responsableElaboracionId: "", fechaProximaRevision: "", observaciones: "" });
  const [cargos, setCargos] = useState<CargoAsistente[]>(inicial?.cargos ?? []);
  const [tareas, setTareas] = useState<Tarea[]>(inicial?.tareas ?? []);
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState<string[]>((inicial?.tareas ?? []).map((item) => item.id));
  const [preguntaMasiva, setPreguntaMasiva] = useState(PREGUNTAS[0].clave);
  const [respuestaMasiva, setRespuestaMasiva] = useState<Respuesta>("no_se");
  const [respuestas, setRespuestas] = useState<Record<string, Respuesta>>(respuestasIniciales);
  const [riesgos, setRiesgos] = useState<Riesgo[]>(() => inicial?.riesgos.length ? inicial.riesgos as Riesgo[] : construirRiesgos(inicial?.tareas ?? [], respuestasIniciales, inicial?.cabecera.responsableElaboracionId ?? ""));
  const cargosDisponibles = useMemo(() => data.cargos.filter((cargo) => !cabecera.areaId || !cargo.areaId || cargo.areaId === cabecera.areaId), [cabecera.areaId, data.cargos]);
  const catalogo = useMemo(() => new Map(data.catalogo.map((item) => [item.codigoIsp, item])), [data.catalogo]);
  const resumen = useMemo(() => {
    const confirmados = riesgos.filter((item) => item.confirmado);
    const niveles = confirmados.filter((item) => catalogo.get(item.codigoIsp)?.metodologiaEvaluacion === "vep_isp").map((item) => item.probabilidad * item.severidad);
    return {
      riesgos: confirmados.length,
      tolerables: niveles.filter((nivel) => nivel === 1 || nivel === 2).length,
      moderados: niveles.filter((nivel) => nivel === 4).length,
      importantes: niveles.filter((nivel) => nivel === 8).length,
      intolerables: niveles.filter((nivel) => nivel === 16).length,
      especificasPendientes: confirmados.filter((item) => catalogo.get(item.codigoIsp)?.metodologiaEvaluacion === "evaluacion_especifica" && item.estadoEvaluacionEspecifica !== "evaluado").length,
      controlesIncompletos: confirmados.filter((item) => item.control.trim() && (!item.controlResponsableId || !item.controlFecha)).length,
      noSe: tareas.reduce((total, tarea) => total + PREGUNTAS.filter((pregunta) => (respuestas[`${tarea.id}:${pregunta.clave}`] ?? "no_se") === "no_se").length, 0),
    };
  }, [catalogo, respuestas, riesgos, tareas]);

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => { try { await action(); } catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible guardar el paso."); } });
  }

  function crearSugerencias() {
    const next = construirRiesgos(tareas, respuestas, cabecera.responsableElaboracionId);
    if (!next.length) throw new Error("No hay exposiciones aplicables. Revisa las respuestas o agrega la evaluación en Modo experto.");
    setRiesgos(next);
  }

  function continuar() {
    if (paso === 1) return run(async () => {
      const result = await iniciarMiperAsistente(cabecera);
      setMiperId(result.id); setCargos(result.cargos.map((item) => ({ ...item, tareasTexto: "" }))); setPaso(2);
    });
    if (paso === 2) return run(async () => { await guardarDescripcionesAsistente({ miperId, cargos: cargos.map(({ id, descripcionTrabajo }) => ({ id, descripcionTrabajo })) }); setPaso(3); });
    if (paso === 3) return run(async () => {
      const saved = await guardarTareasAsistente({ miperId, cargos: cargos.map((cargo) => ({ asistenteCargoId: cargo.id, tareas: cargo.tareasTexto.split("\n").map((nombre) => nombre.trim()).filter(Boolean).map((nombre) => ({ nombre, origen: "manual" as const })) })) });
      setTareas(saved); setTareasSeleccionadas(saved.map((item) => item.id)); setPaso(4);
    });
    if (paso === 4) return run(async () => {
      const payload = tareas.flatMap((tarea) => PREGUNTAS.map((pregunta) => ({ tareaId: tarea.id, grupo: pregunta.grupo, clave: pregunta.clave, pregunta: pregunta.pregunta, respuesta: respuestas[`${tarea.id}:${pregunta.clave}`] ?? "no_se" })));
      await guardarExposicionesAsistente({ miperId, respuestas: payload }); crearSugerencias(); setPaso(5);
    });
    if (paso === 5) return run(async () => {
      const guardados = await guardarRiesgosAsistente({ miperId, items: riesgos.map((item) => ({ tareaId: item.tareaId, codigoIsp: item.codigoIsp, confirmado: item.confirmado, consecuencia: item.consecuencia, responsableTrabajadorId: cabecera.responsableElaboracionId, motivoSugerencia: item.motivoSugerencia })) });
      const ids = new Map(guardados.map((item) => [`${item.tareaId}:${item.codigoIsp}`, item.id]));
      setRiesgos((values) => values.map((item) => ({ ...item, id: ids.get(`${item.tareaId}:${item.codigoIsp}`) }))); setPaso(6);
    });
    if (paso === 6) return run(async () => {
      if (riesgos.some((item) => !item.id)) throw new Error("Guarda primero las sugerencias de riesgo.");
      await guardarEvaluacionesAsistente({ miperId, items: riesgos.map((item) => ({ id: item.id!, consecuencia: item.consecuencia, probabilidad: item.probabilidad, severidad: item.severidad, magnitudExposicion: item.magnitudExposicion, nivelRiesgoEspecifico: item.nivelRiesgoEspecifico, estadoEvaluacionEspecifica: item.estadoEvaluacionEspecifica, observacionTecnica: item.observacionTecnica })) }); setPaso(7);
    });
    if (paso === 7) return run(async () => {
      if (riesgos.some((item) => !item.id)) throw new Error("Guarda primero las evaluaciones.");
      await guardarControlesAsistente({ miperId, items: riesgos.map((item) => ({ id: item.id!, controles: item.control.trim() ? [{ tipoControl: item.controlTipo, descripcion: item.control, responsableTrabajadorId: item.controlResponsableId, fechaCompromiso: item.controlFecha, estado: item.controlEstado }] : [] })) }); setPaso(8);
    });
    return run(async () => {
      const result = await finalizarMiperAsistente({ miperId }); router.push(`/dicaprev/ds44/miper/${result.id}`); router.refresh();
    });
  }

  function aplicarRespuestaMasiva(aTodas: boolean) {
    const destino = aTodas ? tareas.map((item) => item.id) : tareasSeleccionadas;
    if (!destino.length) { setError("Selecciona al menos una tarea para aplicar la respuesta."); return; }
    setRespuestas((values) => ({ ...values, ...Object.fromEntries(destino.map((tareaId) => [`${tareaId}:${preguntaMasiva}`, respuestaMasiva])) }));
  }

  return <div className="space-y-5">
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"><div className="flex min-w-max gap-1">{PASOS.map((label, index) => <div key={label} className={`rounded-xl px-4 py-2 text-sm font-semibold ${paso === index + 1 ? "bg-slate-900 text-white" : paso > index + 1 ? "bg-emerald-50 text-emerald-700" : "text-slate-400"}`}>{index + 1}. {label}</div>)}</div></div>
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><strong>Motor de asistencia:</strong> la generación de tareas usa IA cuando el proveedor está disponible y mantiene ingreso manual como respaldo. Los riesgos se sugieren mediante reglas determinísticas que conectan cada pregunta con el catálogo ISP; no son generados por IA. La persona usuaria siempre confirma el resultado.</div>
    {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
    {avisoIa && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{avisoIa}</div>}

    {paso === 1 && <Card className="rounded-2xl"><CardHeader><h2 className="text-lg font-bold">1. Alcance de la matriz</h2></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-1 text-sm font-medium">Código<input className={inputClass} value={cabecera.codigo} onChange={(e) => setCabecera((v) => ({ ...v, codigo: e.target.value }))} placeholder="MIPER-002" /></label>
      <label className="grid gap-1 text-sm font-medium">Nombre<input className={inputClass} value={cabecera.nombre} onChange={(e) => setCabecera((v) => ({ ...v, nombre: e.target.value }))} /></label>
      <label className="grid gap-1 text-sm font-medium">Centro<select className={inputClass} value={cabecera.centroTrabajoId} onChange={(e) => setCabecera((v) => ({ ...v, centroTrabajoId: e.target.value }))}><option value="">Selecciona</option>{data.centros.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Área<select className={inputClass} value={cabecera.areaId} onChange={(e) => setCabecera((v) => ({ ...v, areaId: e.target.value, cargoIds: [] }))}><option value="">Selecciona</option>{data.areas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
      <fieldset className="grid gap-2 rounded-xl border border-slate-200 p-4 md:col-span-2"><legend className="px-2 text-sm font-semibold">Cargos incluidos</legend>{cargosDisponibles.map((cargo) => <label key={cargo.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cabecera.cargoIds.includes(cargo.id)} onChange={(e) => setCabecera((v) => ({ ...v, cargoIds: e.target.checked ? [...v.cargoIds, cargo.id] : v.cargoIds.filter((id) => id !== cargo.id) }))} />{cargo.nombre}</label>)}</fieldset>
      <label className="grid gap-1 text-sm font-medium">Responsable de elaboración<select className={inputClass} value={cabecera.responsableElaboracionId} onChange={(e) => setCabecera((v) => ({ ...v, responsableElaboracionId: e.target.value }))}><option value="">Selecciona</option>{data.responsables.map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.cargo ? ` · ${item.cargo}` : ""}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Próxima revisión<input type="date" className={inputClass} value={cabecera.fechaProximaRevision} onChange={(e) => setCabecera((v) => ({ ...v, fechaProximaRevision: e.target.value }))} /></label>
    </CardContent></Card>}

    {paso === 2 && <Card className="rounded-2xl"><CardHeader><h2 className="text-lg font-bold">2. Descripción del trabajo por cargo</h2></CardHeader><CardContent className="space-y-4">{cargos.map((cargo) => <label key={cargo.id} className="grid gap-1 text-sm font-medium">{cargo.nombre}<span className="font-normal text-slate-500">Describe brevemente qué hace este cargo. Puedes escribirlo con tus propias palabras.</span><textarea className={`${inputClass} min-h-28`} value={cargo.descripcionTrabajo} onChange={(e) => setCargos((values) => values.map((item) => item.id === cargo.id ? { ...item, descripcionTrabajo: e.target.value } : item))} /></label>)}</CardContent></Card>}

    {paso === 3 && <Card className="rounded-2xl"><CardHeader><h2 className="text-lg font-bold">3. Tareas propuestas y confirmadas</h2><p className="text-sm text-slate-500">Una tarea por línea. Puedes revisar, editar o reemplazar las sugerencias y continuar manualmente si la asistencia IA no está disponible.</p></CardHeader><CardContent className="space-y-5">{cargos.map((cargo) => <div key={cargo.id} className="space-y-2"><div className="flex items-center justify-between"><strong className="text-sm">{cargo.nombre}</strong><Button size="sm" variant="outline" disabled={pending} onClick={() => run(async () => { const result = await obtenerSugerenciasTareasIa({ miperId, asistenteCargoId: cargo.id }); setAvisoIa(result.mensaje); if (result.resultado.tareas.length) setCargos((values) => values.map((item) => item.id === cargo.id ? { ...item, tareasTexto: result.resultado.tareas.map((tarea) => tarea.nombre).join("\n") } : item)); })}>Sugerir con IA</Button></div><textarea className={`${inputClass} min-h-32 w-full`} value={cargo.tareasTexto} onChange={(e) => setCargos((values) => values.map((item) => item.id === cargo.id ? { ...item, tareasTexto: e.target.value } : item))} placeholder="Inspeccionar área de trabajo&#10;Operar equipo&#10;Realizar limpieza" /></div>)}</CardContent></Card>}

    {paso === 4 && <Card className="rounded-2xl"><CardHeader><h2 className="text-lg font-bold">4. Exposiciones por tarea</h2><p className="text-sm text-slate-500">“No sé” conserva la duda y marca revisión técnica pendiente. Ninguna respuesta se infiere como “No aplica”.</p></CardHeader><CardContent className="space-y-6"><div className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 md:grid-cols-[1fr_180px_auto_auto]"><label className="grid gap-1 text-sm font-medium">Pregunta<select className={inputClass} value={preguntaMasiva} onChange={(e) => setPreguntaMasiva(e.target.value as typeof preguntaMasiva)}>{PREGUNTAS.map((item) => <option key={item.clave} value={item.clave}>{item.grupo} · {item.pregunta}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Respuesta<select className={inputClass} value={respuestaMasiva} onChange={(e) => setRespuestaMasiva(e.target.value as Respuesta)}><option value="aplica">Sí</option><option value="no_aplica">No</option><option value="no_se">No sé</option></select></label><Button variant="outline" className="self-end rounded-xl" onClick={() => aplicarRespuestaMasiva(false)}>Aplicar a seleccionadas</Button><Button className="self-end rounded-xl" onClick={() => aplicarRespuestaMasiva(true)}>Aplicar a todas las tareas</Button></div>{tareas.map((tarea) => <div key={tarea.id} className="space-y-3 rounded-xl border border-slate-200 p-4"><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={tareasSeleccionadas.includes(tarea.id)} onChange={(e) => setTareasSeleccionadas((values) => e.target.checked ? [...values, tarea.id] : values.filter((id) => id !== tarea.id))} />{tarea.nombre}</label>{PREGUNTAS.map((pregunta) => <label key={pregunta.clave} className="grid gap-2 text-sm md:grid-cols-[1fr_160px] md:items-center"><span><Badge variant="outline" className="mr-2">{pregunta.grupo}</Badge>{pregunta.pregunta}</span><select className={inputClass} value={respuestas[`${tarea.id}:${pregunta.clave}`] ?? "no_se"} onChange={(e) => setRespuestas((v) => ({ ...v, [`${tarea.id}:${pregunta.clave}`]: e.target.value as Respuesta }))}><option value="aplica">Sí</option><option value="no_aplica">No</option><option value="no_se">No sé</option></select></label>)}</div>)}</CardContent></Card>}

    {paso === 5 && <Card className="rounded-2xl"><CardHeader><h2 className="text-lg font-bold">5. Riesgos sugeridos</h2><p className="text-sm text-slate-500">Cada sugerencia proviene de una respuesta y del catálogo ISP. Desmarca lo que no corresponda.</p></CardHeader><CardContent className="space-y-3">{riesgos.map((item, index) => { const riesgo = catalogo.get(item.codigoIsp)!; const tarea = tareas.find((value) => value.id === item.tareaId); return <label key={`${item.tareaId}-${item.codigoIsp}`} className="flex gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={item.confirmado} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, confirmado: e.target.checked } : value))} /><span><strong>{riesgo.codigoIsp} · {riesgo.riesgoEspecifico}</strong><span className="mt-1 block text-sm text-slate-500">{tarea?.nombre} · {riesgo.familia} · {riesgo.metodologiaEvaluacion === "vep_isp" ? "VEP ISP" : "Evaluación específica"}</span></span></label>; })}</CardContent></Card>}

    {paso === 6 && <Card className="rounded-2xl"><CardHeader><h2 className="text-lg font-bold">6. Evaluación</h2></CardHeader><CardContent className="space-y-4">{riesgos.map((item, index) => { if (!item.confirmado) return null; const riesgo = catalogo.get(item.codigoIsp)!; return <div key={`${item.tareaId}-${item.codigoIsp}`} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-3"><div className="md:col-span-3"><strong>{riesgo.codigoIsp} · {riesgo.riesgoEspecifico}</strong></div><label className="grid gap-1 text-sm font-medium md:col-span-3">Consecuencia sugerida<input className={inputClass} value={item.consecuencia} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, consecuencia: e.target.value } : value))} /></label>{riesgo.metodologiaEvaluacion === "vep_isp" ? <><label className="grid gap-1 text-sm font-medium">Probabilidad<select className={inputClass} value={item.probabilidad} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, probabilidad: Number(e.target.value) } : value))}><option value={1}>Rara vez</option><option value={2}>Puede ocurrir</option><option value={4}>Ocurre siempre o casi siempre</option></select></label><label className="grid gap-1 text-sm font-medium">Consecuencia VEP<select className={inputClass} value={item.severidad} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, severidad: Number(e.target.value) } : value))}><option value={1}>Lesión menor</option><option value={2}>Lesión con incapacidad temporal</option><option value={4}>Lesión grave, permanente o fatal</option></select></label><div className="rounded-xl bg-slate-50 p-3 text-sm">VEP referencial: <strong>{item.probabilidad * item.severidad}</strong> · el servidor recalcula al guardar</div></> : <><label className="grid gap-1 text-sm font-medium">Magnitud / resultado<input className={inputClass} value={item.magnitudExposicion} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, magnitudExposicion: e.target.value } : value))} /></label><label className="grid gap-1 text-sm font-medium">Nivel de riesgo<input className={inputClass} value={item.nivelRiesgoEspecifico} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, nivelRiesgoEspecifico: e.target.value } : value))} /></label><label className="grid gap-1 text-sm font-medium">Estado<select className={inputClass} value={item.estadoEvaluacionEspecifica} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, estadoEvaluacionEspecifica: e.target.value as Riesgo["estadoEvaluacionEspecifica"] } : value))}><option value="pendiente">Pendiente</option><option value="en_evaluacion">En evaluación</option><option value="evaluado">Evaluado</option></select></label><div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800 md:col-span-3">Método/protocolo: {riesgo.protocoloAplicable}</div><label className="grid gap-1 text-sm font-medium md:col-span-3">Observación técnica<textarea className={`${inputClass} min-h-20`} value={item.observacionTecnica} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, observacionTecnica: e.target.value } : value))} /></label></>}</div>; })}</CardContent></Card>}

    {paso === 7 && <Card className="rounded-2xl"><CardHeader><h2 className="text-lg font-bold">7. Medidas de control</h2><p className="text-sm text-slate-500">Confirma la medida, su nivel en la jerarquía, responsable, plazo y estado.</p></CardHeader><CardContent className="space-y-4">{riesgos.map((item, index) => item.confirmado && <div key={`${item.tareaId}-${item.codigoIsp}`} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2"><strong className="md:col-span-2">{item.codigoIsp} · {catalogo.get(item.codigoIsp)?.riesgoEspecifico}</strong><label className="grid gap-1 text-sm font-medium md:col-span-2">Medida<textarea className={`${inputClass} min-h-20`} value={item.control} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, control: e.target.value } : value))} /></label><label className="grid gap-1 text-sm font-medium">Jerarquía<select className={inputClass} value={item.controlTipo} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, controlTipo: e.target.value as Riesgo["controlTipo"] } : value))}><option value="eliminacion">Eliminación</option><option value="sustitucion">Sustitución</option><option value="ingenieria">Ingeniería</option><option value="administrativo">Administrativa</option><option value="epp">EPP</option></select></label><label className="grid gap-1 text-sm font-medium">Responsable<select className={inputClass} value={item.controlResponsableId} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, controlResponsableId: e.target.value } : value))}><option value="">Selecciona</option>{data.responsables.map((responsable) => <option key={responsable.id} value={responsable.id}>{responsable.nombre}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Fecha de compromiso<input type="date" className={inputClass} value={item.controlFecha} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, controlFecha: e.target.value } : value))} /></label><label className="grid gap-1 text-sm font-medium">Estado<select className={inputClass} value={item.controlEstado} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, controlEstado: e.target.value as Riesgo["controlEstado"] } : value))}><option value="pendiente">Pendiente</option><option value="en_revision">En revisión</option><option value="implementado">Implementado</option><option value="descartado">Descartado</option></select></label></div>)}</CardContent></Card>}

    {paso === 8 && <Card className="rounded-2xl"><CardHeader><h2 className="text-lg font-bold">8. Resumen y creación del borrador</h2></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Tareas evaluadas", tareas.length], ["Riesgos identificados", resumen.riesgos], ["Tolerables", resumen.tolerables], ["Moderados", resumen.moderados], ["Importantes", resumen.importantes], ["Intolerables", resumen.intolerables], ["Evaluaciones específicas pendientes", resumen.especificasPendientes], ["Controles sin responsable o plazo", resumen.controlesIncompletos], ["Respuestas ‘No sé’", resumen.noSe]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 p-3"><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}</div><p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">La matriz quedará en borrador. No se crean hallazgos, acciones DS44, EPP, capacitaciones, documentos ni evidencias automáticamente.</p></CardContent></Card>}

    <div className="flex justify-between"><Button variant="outline" className="rounded-2xl" disabled={pending || paso === 1} onClick={() => setPaso((value) => Math.max(1, value - 1))}>Anterior</Button><Button className="rounded-2xl font-semibold" disabled={pending} onClick={continuar}>{paso === 8 ? "Crear borrador MIPER" : "Guardar y continuar"}</Button></div>
  </div>;
}
