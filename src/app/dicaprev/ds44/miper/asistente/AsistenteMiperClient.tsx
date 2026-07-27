"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ChevronDown, Search, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ContextoLevantamientoMiper, EstadoSugerenciaMiper } from "@/lib/ds44/miper-flujo-simplificado";
import { cambiarEstadoDs44Miper } from "../actions";
import {
  finalizarMiperAsistente,
  guardarControlesAsistente,
  guardarDescripcionesAsistente,
  guardarEvaluacionesAsistente,
  guardarRiesgosAsistente,
  guardarTareasAsistente,
  iniciarMiperAsistente,
  obtenerSugerenciasRiesgosIa,
  obtenerSugerenciasTareasIa,
} from "./actions";

type Data = Awaited<ReturnType<typeof import("./actions").getMiperAsistenteData>>;
type Rutina = "si" | "no";
type ControlTipo = "eliminacion" | "sustitucion" | "ingenieria" | "administrativo" | "epp";

type CargoAlcance = {
  id: string;
  cargoId: string;
  nombre: string;
  descripcionTrabajo: string;
  tareasTexto: string;
};

type TareaEditor = {
  id?: string;
  asistenteCargoId: string;
  nombre: string;
  rutina: Rutina;
  lugar: string;
  personas: number;
  distribucion: Record<string, number>;
  observaciones: string;
  origen: "manual" | "ia";
};

type RiesgoEditor = {
  id?: string;
  tareaId: string;
  codigoIsp: string;
  estadoSugerencia: EstadoSugerenciaMiper;
  consecuencia: string;
  motivo: string;
  probabilidad: number | null;
  severidad: number | null;
  responsableId: string;
  controlTipo: ControlTipo | "";
  control: string;
  controlResponsableId: string;
  controlFecha: string;
  peligroGente: string;
  peligroEquipos: string;
  peligroMateriales: string;
  peligroAmbiente: string;
  peligroDescripcion: string;
};

const PASOS = ["Alcance", "Tareas", "Peligros y riesgos", "Evaluación y plan preventivo"];
const inputClass = "rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-slate-300";
const hoy = () => new Date().toISOString().slice(0, 10);

function contextoInicial(): ContextoLevantamientoMiper {
  return {
    fechaLevantamiento: hoy(),
    accidentesEnfermedades: "",
    programasVigilancia: "",
    personasEspecialmenteSensibles: false,
    antecedentesSensibilidad: "",
    participantes: "",
    participacionLaboral: "",
    motivo: "creacion",
    difusionPosterior: "",
    conexionProgramaPreventivo: "",
  };
}

function rutina(value?: boolean | null): Rutina {
  return value === false ? "no" : "si";
}

function numero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export default function AsistenteMiperClient({ data }: { data: Data }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const inicial = data.borrador;
  const contextoGuardado = inicial?.cabecera.contexto;
  const [paso, setPaso] = useState(inicial?.paso ?? 1);
  const [miperId, setMiperId] = useState(inicial?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cabecera, setCabecera] = useState({
    codigo: inicial?.cabecera.codigo || data.sugerencias.codigo,
    nombre: inicial?.cabecera.nombre || `MIPER ${data.empresa.nombre}`,
    procesoNombre: inicial?.cabecera.procesoNombre || "",
    procesoTipo: inicial?.cabecera.procesoTipo || "operacional",
    procesoResponsableId: inicial?.cabecera.procesoResponsableId || "",
    centroTrabajoId: inicial?.cabecera.centroTrabajoId || "",
    areaId: inicial?.cabecera.areaId || "",
    cargoIds: inicial?.cabecera.cargoIds || [] as string[],
    responsableElaboracionId: inicial?.cabecera.responsableElaboracionId || "",
    fechaProximaRevision: inicial?.cabecera.fechaProximaRevision || data.sugerencias.fechaProximaRevision,
    observaciones: inicial?.cabecera.observaciones || "",
  });
  const [contexto, setContexto] = useState<ContextoLevantamientoMiper>(contextoGuardado ?? contextoInicial());
  const [cargos, setCargos] = useState<CargoAlcance[]>(inicial?.cargos ?? []);

  const centroNombre = data.centros.find((item) => item.id === cabecera.centroTrabajoId)?.nombre ?? "";
  const areaNombre = data.areas.find((item) => item.id === cabecera.areaId)?.nombre ?? "";
  const cargosDisponibles = data.cargos.filter((cargo) => !cabecera.areaId || !cargo.areaId || cargo.areaId === cabecera.areaId);
  const trabajadoresAlcance = data.trabajadores.filter((trabajador) =>
    (!cabecera.centroTrabajoId || !trabajador.centroTrabajoId || trabajador.centroTrabajoId === cabecera.centroTrabajoId)
    && (!cabecera.areaId || !trabajador.areaId || trabajador.areaId === cabecera.areaId)
    && (!cabecera.cargoIds.length || !trabajador.cargoId || cabecera.cargoIds.includes(trabajador.cargoId)),
  );
  const distribucionHeredada = { noInformado: trabajadoresAlcance.length };

  const [tareas, setTareas] = useState<TareaEditor[]>(() => (inicial?.tareas ?? []).map((tarea) => ({
    id: tarea.id,
    asistenteCargoId: tarea.asistenteCargoId,
    nombre: tarea.nombre,
    rutina: rutina(tarea.esRutinaria),
    lugar: tarea.lugarEspecifico || centroNombre,
    personas: tarea.personasExpuestasTotal ?? 0,
    distribucion: Object.fromEntries(Object.entries(tarea.distribucionSexogenerica ?? {}).filter((entry): entry is [string, number] => typeof entry[1] === "number")),
    observaciones: tarea.observaciones || "",
    origen: "manual",
  })));

  const [riesgos, setRiesgos] = useState<RiesgoEditor[]>(() => (inicial?.riesgos ?? []).map((item) => ({
    id: item.id,
    tareaId: item.tareaId,
    codigoIsp: item.codigoIsp,
    estadoSugerencia: item.estadoSugerencia,
    consecuencia: item.consecuencia,
    motivo: item.motivoSugerencia,
    probabilidad: item.probabilidad,
    severidad: item.severidad,
    responsableId: inicial?.cabecera.responsableElaboracionId || "",
    controlTipo: item.controlTipo,
    control: item.control,
    controlResponsableId: item.controlResponsableId,
    controlFecha: item.controlFecha,
    peligroGente: item.peligroGente,
    peligroEquipos: item.peligroEquipos,
    peligroMateriales: item.peligroMateriales,
    peligroAmbiente: item.peligroAmbiente,
    peligroDescripcion: item.peligroDescripcion,
  })));
  const [busquedaCatalogo, setBusquedaCatalogo] = useState("");
  const [tareaManualId, setTareaManualId] = useState("");
  const [riesgosSeleccionados, setRiesgosSeleccionados] = useState<string[]>([]);
  const [controlMasivo, setControlMasivo] = useState({ tipo: "" as ControlTipo | "", descripcion: "", responsableId: "", fecha: "" });

  const catalogo = useMemo(() => new Map(data.catalogo.map((item) => [item.codigoIsp, item])), [data.catalogo]);
  const confirmados = riesgos.filter((item) => item.estadoSugerencia === "confirmado");
  const catalogoFiltrado = data.catalogo.filter((item) => {
    const q = busquedaCatalogo.trim().toLocaleLowerCase("es-CL");
    return q && `${item.codigoIsp} ${item.familia} ${item.riesgoEspecifico}`.toLocaleLowerCase("es-CL").includes(q);
  }).slice(0, 12);

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No fue posible guardar los cambios.");
      }
    });
  }

  function actualizarTarea(index: number, patch: Partial<TareaEditor>) {
    setTareas((values) => values.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  function agregarRiesgoManual(codigoIsp: string) {
    if (!tareaManualId) return setError("Selecciona la tarea a la que corresponde el riesgo.");
    if (riesgos.some((item) => item.tareaId === tareaManualId && item.codigoIsp === codigoIsp)) {
      return setError("Ese riesgo ya está incorporado para la tarea.");
    }
    const item = catalogo.get(codigoIsp);
    if (!item) return;
    setRiesgos((values) => [...values, {
      tareaId: tareaManualId,
      codigoIsp,
      estadoSugerencia: "sugerido",
      consecuencia: "Consecuencia pendiente de confirmación",
      motivo: "Agregado manualmente desde el catálogo ISP.",
      probabilidad: null,
      severidad: null,
      responsableId: cabecera.responsableElaboracionId,
      controlTipo: "",
      control: "",
      controlResponsableId: cabecera.responsableElaboracionId,
      controlFecha: "",
      peligroGente: "",
      peligroEquipos: "",
      peligroMateriales: "",
      peligroAmbiente: "",
      peligroDescripcion: "",
    }]);
    setBusquedaCatalogo("");
  }

  function aplicarControlMasivo() {
    if (!riesgosSeleccionados.length) return setError("Selecciona al menos un riesgo confirmado.");
    if (!controlMasivo.tipo || !controlMasivo.descripcion.trim()) return setError("Selecciona la jerarquía y describe el control.");
    setRiesgos((values) => values.map((item) => {
      const ref = item.id || `${item.tareaId}:${item.codigoIsp}`;
      return riesgosSeleccionados.includes(ref) ? {
        ...item,
        controlTipo: controlMasivo.tipo,
        control: controlMasivo.descripcion,
        controlResponsableId: controlMasivo.responsableId || item.controlResponsableId,
        controlFecha: controlMasivo.fecha || item.controlFecha,
      } : item;
    }));
  }

  function guardarAlcance() {
    run(async () => {
      if (!cabecera.centroTrabajoId || !cabecera.areaId || !cabecera.cargoIds.length) throw new Error("Confirma centro, área y al menos un cargo.");
      if (!cabecera.procesoResponsableId || !cabecera.responsableElaboracionId) throw new Error("Selecciona responsable del proceso y responsable de elaboración.");
      if (!contexto.participantes.trim() || !contexto.participacionLaboral.trim()) throw new Error("Registra participantes y forma de participación del levantamiento.");
      const result = await iniciarMiperAsistente({
        ...cabecera,
        procesoTipo: cabecera.procesoTipo as "operacional" | "apoyo",
        contexto,
      });
      await guardarDescripcionesAsistente({
        miperId: result.id,
        cargos: result.cargos.map((cargo) => ({ id: cargo.id, descripcionTrabajo: cargo.descripcionTrabajo || "Descripción pendiente de revisión." })),
      });
      setMiperId(result.id);
      setCargos(result.cargos.map((cargo) => ({ ...cargo, tareasTexto: "" })));
      setPaso(2);
    });
  }

  function guardarTareas() {
    run(async () => {
      if (!tareas.length) throw new Error("Confirma al menos una tarea.");
      const agrupadas = cargos.map((cargo) => ({
        asistenteCargoId: cargo.id,
        tareas: tareas.filter((tarea) => tarea.asistenteCargoId === cargo.id).map((tarea) => ({
          nombre: tarea.nombre,
          origen: tarea.origen,
          esRutinaria: tarea.rutina === "si",
          lugarEspecifico: tarea.lugar || centroNombre,
          personasExpuestasTotal: tarea.personas || trabajadoresAlcance.length,
          distribucionSexogenerica: Object.keys(tarea.distribucion).length ? tarea.distribucion : distribucionHeredada,
          observaciones: tarea.observaciones,
        })),
      }));
      const saved = await guardarTareasAsistente({ miperId, cargos: agrupadas });
      setTareas(saved.map((item) => ({
        id: item.id,
        asistenteCargoId: item.asistenteCargoId,
        nombre: item.nombre,
        rutina: rutina(item.esRutinaria),
        lugar: item.lugarEspecifico || centroNombre,
        personas: item.personasExpuestasTotal ?? trabajadoresAlcance.length,
        distribucion: Object.fromEntries(Object.entries((item.distribucionSexogenerica ?? {}) as Record<string, unknown>).filter((entry): entry is [string, number] => typeof entry[1] === "number")),
        observaciones: item.observaciones || "",
        origen: "manual",
      })));
      setPaso(3);
    });
  }

  function guardarRiesgos() {
    run(async () => {
      if (!riesgos.some((item) => item.estadoSugerencia === "confirmado")) throw new Error("Confirma al menos un riesgo para continuar.");
      const guardados = await guardarRiesgosAsistente({
        miperId,
        items: riesgos.map((item) => ({
          tareaId: item.tareaId,
          codigoIsp: item.codigoIsp,
          confirmado: item.estadoSugerencia === "confirmado",
          estadoSugerencia: item.estadoSugerencia,
          consecuencia: item.consecuencia,
          responsableTrabajadorId: item.responsableId || cabecera.responsableElaboracionId,
          motivoSugerencia: item.motivo,
          peligroGente: item.peligroGente,
          peligroEquipos: item.peligroEquipos,
          peligroMateriales: item.peligroMateriales,
          peligroAmbiente: item.peligroAmbiente,
          peligroDescripcion: item.peligroDescripcion,
        })),
      });
      const ids = new Map(guardados.map((item) => [`${item.tareaId}:${item.codigoIsp}`, item.id]));
      setRiesgos((values) => values.map((item) => ({ ...item, id: ids.get(`${item.tareaId}:${item.codigoIsp}`) })));
      setPaso(4);
    });
  }

  async function persistirPlan() {
    const activos = riesgos.filter((item) => item.estadoSugerencia === "confirmado");
    if (activos.some((item) => !item.id)) throw new Error("Guarda primero la selección de riesgos.");
    const vepPendiente = activos.find((item) => catalogo.get(item.codigoIsp)?.metodologiaEvaluacion === "vep_isp" && (item.probabilidad === null || item.severidad === null));
    if (vepPendiente) throw new Error("Completa probabilidad y consecuencia de todos los riesgos VEP confirmados.");
    await guardarEvaluacionesAsistente({
      miperId,
      items: activos.map((item) => ({
        id: item.id!,
        consecuencia: item.consecuencia,
        probabilidad: item.probabilidad,
        severidad: item.severidad,
        estadoEvaluacionEspecifica: "pendiente",
        observacionTecnica: catalogo.get(item.codigoIsp)?.metodologiaEvaluacion === "evaluacion_especifica"
          ? `Evaluación técnica pendiente según ${catalogo.get(item.codigoIsp)?.protocoloAplicable || "metodología ISP aplicable"}.`
          : undefined,
      })),
    });
    await guardarControlesAsistente({
      miperId,
      items: activos.map((item) => ({
        id: item.id!,
        controles: item.control.trim() && item.controlTipo ? [{
          tipoControl: item.controlTipo,
          descripcion: item.control,
          responsableTrabajadorId: item.controlResponsableId,
          fechaCompromiso: item.controlFecha,
          estado: "pendiente",
        }] : [],
      })),
    });
    return finalizarMiperAsistente({ miperId });
  }

  function guardarBorrador(enviarRevision: boolean) {
    run(async () => {
      const result = await persistirPlan();
      if (enviarRevision) await cambiarEstadoDs44Miper({ miperId: result.id, estado: "en_revision" });
      router.push(`/dicaprev/ds44/miper/${result.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-1">
          {PASOS.map((label, index) => <div key={label} className={`rounded-xl px-4 py-2 text-sm font-semibold ${paso === index + 1 ? "bg-slate-900 text-white" : paso > index + 1 ? "bg-emerald-50 text-emerald-700" : "text-slate-400"}`}>{index + 1}. {label}</div>)}
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <strong>Asistente simplificado:</strong> NextPrev precarga el contexto y la IA propone. La confirmación, evaluación y aprobación siempre son humanas. La revisión profesional usa el mismo registro con información técnica desplegable.
      </div>
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
      {aviso && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{aviso}</div>}

      {paso === 1 && <Card className="rounded-2xl">
        <CardHeader>
          <h2 className="text-lg font-bold">1. Confirma el alcance</h2>
          <p className="text-sm text-slate-500">Empresa, código, versión y revisión se completan automáticamente.</p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">Empresa</span><strong className="block">{data.empresa.nombre || "Empresa activa"}</strong><span>{data.empresa.rut || "RUT no informado"}</span></div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">Identificación</span><strong className="block">{cabecera.codigo} · Versión {data.sugerencias.version}</strong><span>Revisión: {cabecera.fechaProximaRevision}</span></div>
          <label className="grid gap-1 text-sm font-medium md:col-span-2">Nombre de la matriz<input className={inputClass} value={cabecera.nombre} onChange={(e) => setCabecera((value) => ({ ...value, nombre: e.target.value }))} /></label>
          <label className="grid gap-1 text-sm font-medium">Centro de trabajo<select className={inputClass} value={cabecera.centroTrabajoId} onChange={(e) => setCabecera((value) => ({ ...value, centroTrabajoId: e.target.value }))}><option value="">Selecciona</option>{data.centros.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium">Área<select className={inputClass} value={cabecera.areaId} onChange={(e) => setCabecera((value) => ({ ...value, areaId: e.target.value, cargoIds: [] }))}><option value="">Selecciona</option>{data.areas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium">Proceso<input className={inputClass} value={cabecera.procesoNombre} onChange={(e) => setCabecera((value) => ({ ...value, procesoNombre: e.target.value }))} /></label>
          <label className="grid gap-1 text-sm font-medium">Tipo de proceso<select className={inputClass} value={cabecera.procesoTipo} onChange={(e) => setCabecera((value) => ({ ...value, procesoTipo: e.target.value }))}><option value="operacional">Operacional</option><option value="apoyo">Apoyo</option></select></label>
          <label className="grid gap-1 text-sm font-medium">Responsable del proceso<select className={inputClass} value={cabecera.procesoResponsableId} onChange={(e) => setCabecera((value) => ({ ...value, procesoResponsableId: e.target.value }))}><option value="">Selecciona trabajador</option>{data.responsables.map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.cargo ? ` · ${item.cargo}` : ""}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium">Responsable de elaboración<select className={inputClass} value={cabecera.responsableElaboracionId} onChange={(e) => setCabecera((value) => ({ ...value, responsableElaboracionId: e.target.value }))}><option value="">Selecciona trabajador</option>{data.responsables.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
          <fieldset className="rounded-xl border border-slate-200 p-4 md:col-span-2"><legend className="px-2 text-sm font-semibold">Cargos incluidos</legend><div className="grid gap-2 sm:grid-cols-2">{cargosDisponibles.map((cargo) => <label key={cargo.id} className="flex gap-2 text-sm"><input type="checkbox" checked={cabecera.cargoIds.includes(cargo.id)} onChange={(e) => setCabecera((value) => ({ ...value, cargoIds: e.target.checked ? [...value.cargoIds, cargo.id] : value.cargoIds.filter((id) => id !== cargo.id) }))} />{cargo.nombre}</label>)}</div></fieldset>
          <div className="rounded-xl bg-emerald-50 p-3 text-sm md:col-span-2"><strong>{trabajadoresAlcance.length} trabajadores activos precargados</strong><p className="text-emerald-800">La ficha actual no registra sexo; la distribución se conserva como “no informada” para no inferir datos.</p></div>
          <label className="grid gap-1 text-sm font-medium">Fecha del levantamiento<input type="date" className={inputClass} value={contexto.fechaLevantamiento} onChange={(e) => setContexto((value) => ({ ...value, fechaLevantamiento: e.target.value }))} /></label>
          <label className="grid gap-1 text-sm font-medium">Motivo<select className={inputClass} value={contexto.motivo} onChange={(e) => setContexto((value) => ({ ...value, motivo: e.target.value as ContextoLevantamientoMiper["motivo"] }))}><option value="creacion">Creación inicial</option><option value="revision_anual">Revisión anual</option><option value="cambio_condiciones">Cambio de condiciones</option><option value="accidente_enfermedad">Accidente o enfermedad profesional</option><option value="riesgo_grave">Riesgo grave</option></select></label>
          <label className="grid gap-1 text-sm font-medium">Accidentes y enfermedades profesionales anteriores<textarea className={inputClass} value={contexto.accidentesEnfermedades} onChange={(e) => setContexto((value) => ({ ...value, accidentesEnfermedades: e.target.value }))} /></label>
          <label className="grid gap-1 text-sm font-medium">Programas de vigilancia aplicables<textarea className={inputClass} value={contexto.programasVigilancia} onChange={(e) => setContexto((value) => ({ ...value, programasVigilancia: e.target.value }))} /></label>
          <label className="flex items-center gap-2 text-sm font-medium md:col-span-2"><input type="checkbox" checked={contexto.personasEspecialmenteSensibles} onChange={(e) => setContexto((value) => ({ ...value, personasEspecialmenteSensibles: e.target.checked }))} />Existen personas especialmente sensibles (sin registrar diagnósticos)</label>
          {contexto.personasEspecialmenteSensibles && <label className="grid gap-1 text-sm font-medium md:col-span-2">Consideración preventiva breve<textarea className={inputClass} value={contexto.antecedentesSensibilidad} onChange={(e) => setContexto((value) => ({ ...value, antecedentesSensibilidad: e.target.value }))} /></label>}
          <label className="grid gap-1 text-sm font-medium">Participantes del levantamiento<textarea className={inputClass} value={contexto.participantes} onChange={(e) => setContexto((value) => ({ ...value, participantes: e.target.value }))} /></label>
          <label className="grid gap-1 text-sm font-medium">Participación de trabajadores, CPHS o delegado<textarea className={inputClass} value={contexto.participacionLaboral} onChange={(e) => setContexto((value) => ({ ...value, participacionLaboral: e.target.value }))} /></label>
          <details className="rounded-xl border border-slate-200 p-4 md:col-span-2"><summary className="flex cursor-pointer items-center gap-2 font-semibold">Trazabilidad posterior <ChevronDown className="h-4 w-4" /></summary><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-sm">Registro de difusión<textarea className={inputClass} value={contexto.difusionPosterior} onChange={(e) => setContexto((value) => ({ ...value, difusionPosterior: e.target.value }))} /></label><label className="grid gap-1 text-sm">Conexión con programa preventivo<textarea className={inputClass} value={contexto.conexionProgramaPreventivo} onChange={(e) => setContexto((value) => ({ ...value, conexionProgramaPreventivo: e.target.value }))} /></label></div></details>
        </CardContent>
      </Card>}

      {paso === 2 && <Card className="rounded-2xl">
        <CardHeader><h2 className="text-lg font-bold">2. Confirma las tareas</h2><p className="text-sm text-slate-500">Se heredan centro, población, distribución, proceso y responsable. Abre Información avanzada solo si necesitas corregir una excepción.</p></CardHeader>
        <CardContent className="space-y-4">
          {cargos.map((cargo) => <div key={cargo.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong>{cargo.nombre}</strong><Button variant="outline" size="sm" disabled={pending} onClick={() => run(async () => {
              const result = await obtenerSugerenciasTareasIa({ miperId, asistenteCargoId: cargo.id });
              setAviso(result.mensaje);
              const nuevas = result.resultado.tareas.map((sugerencia) => ({ asistenteCargoId: cargo.id, nombre: sugerencia.nombre, rutina: "si" as const, lugar: centroNombre, personas: trabajadoresAlcance.filter((item) => item.cargoId === cargo.cargoId).length, distribucion: distribucionHeredada, observaciones: "", origen: "ia" as const }));
              setTareas((values) => [...values.filter((item) => item.asistenteCargoId !== cargo.id), ...nuevas]);
            })}><Sparkles className="mr-2 h-4 w-4" />Sugerir con IA</Button></div>
            <p className="mt-1 text-xs text-slate-500">{cargo.descripcionTrabajo || "Descripción del cargo precargada."} · {areaNombre} · {centroNombre}</p>
            <div className="mt-3 space-y-3">{tareas.filter((item) => item.asistenteCargoId === cargo.id).map((tarea, indexCargo) => {
              const index = tareas.indexOf(tarea);
              return <div key={`${cargo.id}-${indexCargo}`} className="rounded-xl bg-slate-50 p-3">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_1fr_auto]"><input aria-label="Nombre tarea" className={inputClass} value={tarea.nombre} onChange={(e) => actualizarTarea(index, { nombre: e.target.value })} /><select aria-label="Rutina" className={inputClass} value={tarea.rutina} onChange={(e) => actualizarTarea(index, { rutina: e.target.value as Rutina })}><option value="si">Rutinaria</option><option value="no">No rutinaria</option></select><select aria-label="Lugar" className={inputClass} value={tarea.lugar} onChange={(e) => actualizarTarea(index, { lugar: e.target.value })}>{data.centros.map((centro) => <option key={centro.id} value={centro.nombre}>{centro.nombre}</option>)}</select><Button variant="ghost" size="icon" onClick={() => setTareas((values) => values.filter((_, i) => i !== index))}><X className="h-4 w-4" /></Button></div>
                <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-slate-600">Información avanzada</summary><div className="mt-2 grid gap-2 md:grid-cols-2"><label className="grid gap-1 text-xs">Personas expuestas<input type="number" min={0} className={inputClass} value={tarea.personas} onChange={(e) => actualizarTarea(index, { personas: numero(Number(e.target.value)) })} /></label><label className="grid gap-1 text-xs">Observaciones<textarea className={inputClass} value={tarea.observaciones} onChange={(e) => actualizarTarea(index, { observaciones: e.target.value })} /></label></div></details>
              </div>;
            })}</div>
            <Button className="mt-3" variant="ghost" size="sm" onClick={() => setTareas((values) => [...values, { asistenteCargoId: cargo.id, nombre: "", rutina: "si", lugar: centroNombre, personas: trabajadoresAlcance.filter((item) => item.cargoId === cargo.cargoId).length, distribucion: distribucionHeredada, observaciones: "", origen: "manual" }])}>Agregar tarea manual</Button>
          </div>)}
        </CardContent>
      </Card>}

      {paso === 3 && <Card className="rounded-2xl">
        <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">3. Confirma peligros y riesgos</h2><p className="text-sm text-slate-500">La IA solo propone códigos del catálogo ISP. Ninguna sugerencia queda confirmada por defecto.</p></div><Button disabled={pending} onClick={() => run(async () => {
          const result = await obtenerSugerenciasRiesgosIa({ miperId });
          setAviso(result.mensaje);
          const sugeridos: RiesgoEditor[] = result.riesgos.map((item) => ({
            tareaId: item.tareaRef, codigoIsp: item.codigoIsp, estadoSugerencia: "sugerido", consecuencia: item.consecuenciaSugerida, motivo: item.motivo,
            probabilidad: null, severidad: null, responsableId: cabecera.responsableElaboracionId,
            controlTipo: item.controlesSugeridos[0]?.tipoControl || "", control: item.controlesSugeridos[0]?.descripcion || "",
            controlResponsableId: cabecera.responsableElaboracionId, controlFecha: "", peligroGente: "", peligroEquipos: "", peligroMateriales: "", peligroAmbiente: "", peligroDescripcion: "",
          }));
          if (sugeridos.length) {
            const unicos = new Map(sugeridos.map((item) => [`${item.tareaId}:${item.codigoIsp}`, item]));
            setRiesgos([...unicos.values()]);
          }
        })}><Sparkles className="mr-2 h-4 w-4" />Analizar riesgos con IA</Button></div></CardHeader>
        <CardContent className="space-y-4">
          {(inicial?.pendientesHistoricos ?? []).length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><strong className="flex items-center gap-2 text-amber-900"><AlertTriangle className="h-4 w-4" />Revisión técnica pendiente de registros históricos</strong>{inicial?.pendientesHistoricos.map((item) => <p key={item.id} className="mt-1 text-sm text-amber-800">{item.tarea}: {item.pregunta}</p>)}</div>}
          <div className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[220px_1fr]"><select className={inputClass} value={tareaManualId} onChange={(e) => setTareaManualId(e.target.value)}><option value="">Selecciona tarea</option>{tareas.map((tarea) => <option key={tarea.id} value={tarea.id}>{tarea.nombre}</option>)}</select><div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input className={`${inputClass} w-full pl-9`} value={busquedaCatalogo} onChange={(e) => setBusquedaCatalogo(e.target.value)} placeholder="Buscar otro riesgo: atrapamiento, partículas, temperatura, vibración, biológico, postura, violencia, acoso…" />{catalogoFiltrado.length > 0 && <div className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-white p-2 shadow-xl">{catalogoFiltrado.map((item) => <button key={item.codigoIsp} type="button" className="block w-full rounded-lg p-2 text-left text-sm hover:bg-slate-50" onClick={() => agregarRiesgoManual(item.codigoIsp)}><strong>{item.codigoIsp} · {item.riesgoEspecifico}</strong><span className="block text-xs text-slate-500">{item.familia}</span></button>)}</div>}</div></div>
          {riesgos.length === 0 && <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">Analiza con IA o agrega riesgos desde el catálogo ISP.</div>}
          {riesgos.map((item, index) => {
            const riesgo = catalogo.get(item.codigoIsp);
            const tarea = tareas.find((value) => value.id === item.tareaId);
            return <div key={`${item.tareaId}-${item.codigoIsp}-${index}`} className={`rounded-xl border p-4 ${item.estadoSugerencia === "confirmado" ? "border-emerald-200 bg-emerald-50/40" : item.estadoSugerencia === "revision_tecnica" ? "border-amber-200 bg-amber-50/50" : "border-slate-200"}`}>
              <div className="flex flex-wrap justify-between gap-3"><div><strong>{item.codigoIsp} · {riesgo?.riesgoEspecifico}</strong><p className="text-sm text-slate-600">{tarea?.nombre} · {item.motivo}</p></div><Badge variant="outline">{item.estadoSugerencia === "confirmado" ? "Confirmado" : item.estadoSugerencia === "no_aplica" ? "No aplica" : item.estadoSugerencia === "revision_tecnica" ? "Revisión técnica pendiente" : "Sugerido"}</Badge></div>
              <label className="mt-3 grid gap-1 text-sm font-medium">Consecuencia prevista<input className={inputClass} value={item.consecuencia} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, consecuencia: e.target.value } : value))} /></label>
              <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant={item.estadoSugerencia === "confirmado" ? "default" : "outline"} onClick={() => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, estadoSugerencia: "confirmado" } : value))}><Check className="mr-1 h-4 w-4" />Confirmar</Button><Button size="sm" variant="outline" onClick={() => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, estadoSugerencia: "no_aplica" } : value))}>No aplica</Button><Button size="sm" variant="outline" onClick={() => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, estadoSugerencia: "revision_tecnica" } : value))}><AlertTriangle className="mr-1 h-4 w-4" />Enviar a revisión técnica</Button></div>
              <details className="mt-3 rounded-lg bg-white/70 p-3"><summary className="cursor-pointer text-sm font-semibold">Información técnica avanzada (GEMA)</summary><div className="mt-3 grid gap-2 md:grid-cols-2">{(["peligroGente", "peligroEquipos", "peligroMateriales", "peligroAmbiente"] as const).map((campo) => <label key={campo} className="grid gap-1 text-xs capitalize">{campo.replace("peligro", "")}<input className={inputClass} value={item[campo]} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, [campo]: e.target.value } : value))} /></label>)}</div></details>
            </div>;
          })}
        </CardContent>
      </Card>}

      {paso === 4 && <Card className="rounded-2xl">
        <CardHeader><h2 className="text-lg font-bold">4. Evalúa y planifica controles</h2><p className="text-sm text-slate-500">Solo se muestran riesgos confirmados. Las evaluaciones específicas quedan guiadas para revisión profesional.</p></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 md:grid-cols-2 lg:grid-cols-4">
            <select className={inputClass} value={controlMasivo.tipo} onChange={(e) => setControlMasivo((value) => ({ ...value, tipo: e.target.value as ControlTipo }))}><option value="">Jerarquía del control</option><option value="eliminacion">1. Eliminación</option><option value="sustitucion">2. Sustitución</option><option value="ingenieria">2. Ingeniería</option><option value="administrativo">3. Administrativo</option><option value="epp">4. EPP</option></select>
            <input className={inputClass} placeholder="Medida para riesgos seleccionados" value={controlMasivo.descripcion} onChange={(e) => setControlMasivo((value) => ({ ...value, descripcion: e.target.value }))} />
            <select className={inputClass} value={controlMasivo.responsableId} onChange={(e) => setControlMasivo((value) => ({ ...value, responsableId: e.target.value }))}><option value="">Responsable en bloque</option>{data.responsables.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
            <div className="flex gap-2"><input type="date" className={`${inputClass} min-w-0 flex-1`} value={controlMasivo.fecha} onChange={(e) => setControlMasivo((value) => ({ ...value, fecha: e.target.value }))} /><Button variant="outline" onClick={aplicarControlMasivo}>Aplicar</Button></div>
          </div>
          {confirmados.map((item, indexConfirmado) => {
            const riesgo = catalogo.get(item.codigoIsp);
            const index = riesgos.indexOf(item);
            const ref = item.id || `${item.tareaId}:${item.codigoIsp}`;
            const vep = item.probabilidad !== null && item.severidad !== null ? item.probabilidad * item.severidad : null;
            const especifica = riesgo?.metodologiaEvaluacion === "evaluacion_especifica";
            return <div key={ref} className="rounded-xl border border-slate-200 p-4">
              <div className="flex gap-3"><input type="checkbox" checked={riesgosSeleccionados.includes(ref)} onChange={(e) => setRiesgosSeleccionados((values) => e.target.checked ? [...values, ref] : values.filter((value) => value !== ref))} /><div className="flex-1"><strong>{item.codigoIsp} · {riesgo?.riesgoEspecifico}</strong><p className="text-sm text-slate-500">{tareas.find((tarea) => tarea.id === item.tareaId)?.nombre}</p></div></div>
              {especifica ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Evaluación técnica pendiente</strong><p>Protocolo o metodología: {riesgo?.protocoloAplicable || "Metodología ISP específica aplicable"}. El prevencionista completará la medición y su respaldo en revisión profesional.</p></div> : <div className="mt-3 grid gap-3 md:grid-cols-3"><label className="grid gap-1 text-sm">Probabilidad<select className={inputClass} value={item.probabilidad ?? ""} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, probabilidad: e.target.value ? Number(e.target.value) : null } : value))}><option value="">Pendiente</option><option value="1">Baja (1)</option><option value="2">Media (2)</option><option value="4">Alta (4)</option></select></label><label className="grid gap-1 text-sm">Consecuencia VEP<select className={inputClass} value={item.severidad ?? ""} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, severidad: e.target.value ? Number(e.target.value) : null } : value))}><option value="">Pendiente</option><option value="1">Ligeramente dañina (1)</option><option value="2">Dañina (2)</option><option value="4">Extremadamente dañina (4)</option></select></label><div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">VEP</span><strong className="block text-lg">{vep ?? "Pendiente"}</strong></div></div>}
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4"><select className={inputClass} value={item.controlTipo} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, controlTipo: e.target.value as ControlTipo } : value))}><option value="">Selecciona jerarquía</option><option value="eliminacion">1. Eliminación</option><option value="sustitucion">2. Sustitución</option><option value="ingenieria">2. Ingeniería</option><option value="administrativo">3. Administrativo</option><option value="epp">4. EPP</option></select><input className={inputClass} placeholder="Medida de control" value={item.control} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, control: e.target.value } : value))} /><select className={inputClass} value={item.controlResponsableId} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, controlResponsableId: e.target.value } : value))}><option value="">Responsable</option>{data.responsables.map((responsable) => <option key={responsable.id} value={responsable.id}>{responsable.nombre}</option>)}</select><input type="date" className={inputClass} value={item.controlFecha} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, controlFecha: e.target.value } : value))} /></div>
              <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-slate-600">Revisión profesional y trazabilidad</summary><p className="mt-2 text-sm text-slate-500">Código ISP {item.codigoIsp}; metodología {riesgo?.metodologiaEvaluacion}; protocolo {riesgo?.protocoloAplicable || "no aplica"}; orden {indexConfirmado + 1}.</p></details>
            </div>;
          })}
          <div className="flex flex-wrap justify-end gap-3"><Button variant="outline" disabled={pending} onClick={() => guardarBorrador(false)}>Guardar borrador</Button><Button disabled={pending} onClick={() => guardarBorrador(true)}>Enviar a revisión profesional</Button></div>
        </CardContent>
      </Card>}

      <div className="flex justify-between">
        <Button variant="outline" disabled={pending || paso === 1} onClick={() => setPaso((value) => Math.max(1, value - 1))}>Anterior</Button>
        {paso < 4 && <Button disabled={pending} onClick={paso === 1 ? guardarAlcance : paso === 2 ? guardarTareas : guardarRiesgos}>Guardar y continuar</Button>}
      </div>
    </div>
  );
}
