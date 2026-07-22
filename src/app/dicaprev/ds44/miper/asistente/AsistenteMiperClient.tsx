"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  finalizarMiperAsistente,
  guardarControlesAsistente,
  guardarDescripcionesAsistente,
  guardarEvaluacionesAsistente,
  guardarExposicionesAsistente,
  guardarRiesgosAsistente,
  guardarTareasAsistente,
  iniciarMiperAsistente,
  obtenerSugerenciasTareasIa,
} from "./actions";

type Data = Awaited<ReturnType<typeof import("./actions").getMiperAsistenteData>>;
type Respuesta = "aplica" | "no_aplica" | "no_se";
type RutinaValor = "si" | "no" | "no_informado";
type Distribucion = {
  noInformado?: boolean;
  hombre?: number;
  mujer?: number;
  noBinario?: number;
};

type CargoAsistente = {
  id: string;
  cargoId: string;
  nombre: string;
  descripcionTrabajo: string;
  tareasTexto: string;
};

type Tarea = {
  id: string;
  asistenteCargoId: string;
  nombre: string;
  esRutinaria?: boolean | null;
  lugarEspecifico?: string;
  personasExpuestasTotal?: number | null;
  distribucionSexogenerica?: Record<string, unknown> | null;
  observaciones?: string;
};

type TareaEditor = {
  id?: string;
  nombre: string;
  rutina: RutinaValor;
  lugarEspecifico: string;
  personasExpuestasTotal: string;
  distribucion: Distribucion;
  observaciones: string;
  expandido: boolean;
};

type Riesgo = {
  id?: string;
  tareaId: string;
  codigoIsp: string;
  confirmado: boolean;
  consecuencia: string;
  probabilidad: number | null;
  severidad: number | null;
  magnitudExposicion: string;
  nivelRiesgoEspecifico: string;
  estadoEvaluacionEspecifica: "pendiente" | "en_evaluacion" | "evaluado";
  observacionTecnica: string;
  motivoSugerencia: string;
  control: string;
  controlTipo: "eliminacion" | "sustitucion" | "ingenieria" | "administrativo" | "epp";
  controlResponsableId: string;
  controlFecha: string;
  controlEstado: "pendiente" | "implementado" | "en_revision" | "descartado";
  peligroGente: string;
  peligroEquipos: string;
  peligroMateriales: string;
  peligroAmbiente: string;
  peligroDescripcion: string;
};

const OPCIONES_PROBABILIDAD = [
  { value: 1, label: "Baja (1)" },
  { value: 2, label: "Media (2)" },
  { value: 4, label: "Alta (4)" },
] as const;

const OPCIONES_CONSECUENCIA = [
  { value: 1, label: "Ligeramente dañino (1)" },
  { value: 2, label: "Dañino (2)" },
  { value: 4, label: "Extremadamente dañino (4)" },
] as const;

function calcularVep(probabilidad: number | null, severidad: number | null): number | null {
  if (probabilidad === null || severidad === null) return null;
  return probabilidad * severidad;
}

function clasificarVep(valor: number | null): string {
  if (valor === null) return "Evaluación pendiente";
  if (valor <= 2) return "Tolerable";
  if (valor === 4) return "Moderado";
  if (valor === 8) return "Importante";
  return "Intolerable";
}

const PASOS = ["Alcance", "Trabajo", "Tareas", "Exposición", "Riesgos", "Evaluación", "Controles", "Resumen"];
const inputClass = "rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-slate-200";

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

function normalizarRutina(valor?: boolean | null): RutinaValor {
  if (valor === true) return "si";
  if (valor === false) return "no";
  return "no_informado";
}

function construirEditorDesdeTarea(tarea: Tarea, lugarBase: string): TareaEditor {
  const distribucionRaw = (tarea.distribucionSexogenerica ?? null) as Record<string, unknown> | null;
  return {
    id: tarea.id,
    nombre: tarea.nombre,
    rutina: normalizarRutina(tarea.esRutinaria),
    lugarEspecifico: tarea.lugarEspecifico ?? lugarBase,
    personasExpuestasTotal: typeof tarea.personasExpuestasTotal === "number" ? String(tarea.personasExpuestasTotal) : "",
    distribucion: distribucionRaw
      ? {
          noInformado: false,
          hombre: typeof distribucionRaw.hombre === "number" ? distribucionRaw.hombre : undefined,
          mujer: typeof distribucionRaw.mujer === "number" ? distribucionRaw.mujer : undefined,
          noBinario: typeof distribucionRaw.noBinario === "number" ? distribucionRaw.noBinario : undefined,
        }
      : { noInformado: true },
    observaciones: tarea.observaciones ?? "",
    expandido: false,
  };
}

function construirRiesgos(tareas: Tarea[], respuestas: Record<string, Respuesta>, responsableId: string): Riesgo[] {
  const result: Riesgo[] = [];
  for (const tarea of tareas) {
    for (const pregunta of PREGUNTAS) {
      const respuesta = respuestas[`${tarea.id}:${pregunta.clave}`];
      if (respuesta === "aplica" || respuesta === "no_se") {
        result.push({
          tareaId: tarea.id,
          codigoIsp: pregunta.codigo,
          confirmado: true,
          consecuencia: "Consecuencia por determinar y validar técnicamente",
          probabilidad: null,
          severidad: null,
          magnitudExposicion: "Pendiente de medición o aplicación del método específico",
          nivelRiesgoEspecifico: "Pendiente",
          estadoEvaluacionEspecifica: "pendiente",
          observacionTecnica: respuesta === "no_se" ? "Respuesta 'No sé': requiere revisión técnica." : "",
          motivoSugerencia: `${pregunta.grupo}: ${pregunta.pregunta}`,
          control: "",
          controlTipo: "administrativo",
          controlResponsableId: responsableId,
          controlFecha: "",
          controlEstado: "pendiente",
          peligroGente: "",
          peligroEquipos: "",
          peligroMateriales: "",
          peligroAmbiente: "",
          peligroDescripcion: "",
        });
      }
    }
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

  const [cabecera, setCabecera] = useState(
    inicial?.cabecera ?? {
      codigo: "",
      nombre: "",
      procesoNombre: "",
      procesoTipo: "",
      procesoResponsableId: "",
      centroTrabajoId: "",
      areaId: "",
      cargoIds: [] as string[],
      responsableElaboracionId: "",
      fechaProximaRevision: "",
      observaciones: "",
    },
  );

  const [cargos, setCargos] = useState<CargoAsistente[]>(inicial?.cargos ?? []);
  const [tareas, setTareas] = useState<Tarea[]>(inicial?.tareas ?? []);
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState<string[]>((inicial?.tareas ?? []).map((item) => item.id));
  const [preguntaMasiva, setPreguntaMasiva] = useState(PREGUNTAS[0].clave);
  const [respuestaMasiva, setRespuestaMasiva] = useState<Respuesta>("no_se");
  const [respuestas, setRespuestas] = useState<Record<string, Respuesta>>(respuestasIniciales);
  const [riesgos, setRiesgos] = useState<Riesgo[]>(
    () => (inicial?.riesgos.length ? (inicial.riesgos as Riesgo[]) : construirRiesgos(inicial?.tareas ?? [], respuestasIniciales, inicial?.cabecera.responsableElaboracionId ?? "")),
  );

  const [rutinaMasiva, setRutinaMasiva] = useState<RutinaValor>("no_informado");
  const [lugarMasivo, setLugarMasivo] = useState("");

  const centroSeleccionado = useMemo(() => data.centros.find((c) => c.id === cabecera.centroTrabajoId)?.nombre ?? "", [cabecera.centroTrabajoId, data.centros]);
  const lugarReferencia = centroSeleccionado;
  const nombresCentrosActivos = useMemo(() => new Set(data.centros.map((centro) => centro.nombre)), [data.centros]);

  const [tareasEditorPorCargo, setTareasEditorPorCargo] = useState<Record<string, TareaEditor[]>>(() => {
    if (!inicial?.tareas?.length) return {};
    const grouped: Record<string, TareaEditor[]> = {};
    for (const t of inicial.tareas) {
      grouped[t.asistenteCargoId] = grouped[t.asistenteCargoId] ?? [];
      grouped[t.asistenteCargoId].push(construirEditorDesdeTarea(t as Tarea, ""));
    }
    return grouped;
  });

  const catalogo = useMemo(() => new Map(data.catalogo.map((item) => [item.codigoIsp, item])), [data.catalogo]);
  const cargosDisponibles = useMemo(() => data.cargos.filter((cargo) => !cabecera.areaId || !cargo.areaId || cargo.areaId === cabecera.areaId), [cabecera.areaId, data.cargos]);

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No fue posible guardar el paso.");
      }
    });
  }

  function tareasDesdeTexto(cargo: CargoAsistente, texto: string): TareaEditor[] {
    const actuales = tareasEditorPorCargo[cargo.id] ?? [];
    const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
    return lineas.map((nombre, index) => {
      const anterior = actuales[index];
      return {
        id: anterior?.id,
        nombre,
        rutina: anterior?.rutina ?? "no_informado",
        lugarEspecifico: anterior?.lugarEspecifico ?? lugarReferencia,
        personasExpuestasTotal: anterior?.personasExpuestasTotal ?? "",
        distribucion: anterior?.distribucion ?? { noInformado: true },
        observaciones: anterior?.observaciones ?? "",
        expandido: anterior?.expandido ?? false,
      };
    });
  }

  function actualizarTextoCargo(cargoId: string, texto: string) {
    const cargo = cargos.find((c) => c.id === cargoId);
    if (!cargo) return;
    setCargos((prev) => prev.map((c) => (c.id === cargoId ? { ...c, tareasTexto: texto } : c)));
    setTareasEditorPorCargo((prev) => ({ ...prev, [cargoId]: tareasDesdeTexto({ ...cargo, tareasTexto: texto }, texto) }));
  }

  function editarTarea(cargoId: string, index: number, patch: Partial<TareaEditor>) {
    setTareasEditorPorCargo((prev) => ({
      ...prev,
      [cargoId]: (prev[cargoId] ?? []).map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));
  }

  function aplicarATodasLasTareas() {
    setTareasEditorPorCargo((prev) => {
      const next: Record<string, TareaEditor[]> = {};
      for (const [cargoId, lista] of Object.entries(prev)) {
        next[cargoId] = lista.map((t) => ({
          ...t,
          rutina: rutinaMasiva,
          lugarEspecifico: lugarMasivo.trim() || t.lugarEspecifico || lugarReferencia,
        }));
      }
      return next;
    });
  }

  function crearSugerencias() {
    const next = construirRiesgos(tareas, respuestas, cabecera.responsableElaboracionId);
    if (!next.length) throw new Error("No hay exposiciones aplicables. Revisa las respuestas o agrega la evaluación en Modo experto.");
    setRiesgos(next);
  }

  function continuar() {
    if (paso === 1) {
      return run(async () => {
        const result = await iniciarMiperAsistente({
          ...cabecera,
          procesoTipo: cabecera.procesoTipo === "operacional" || cabecera.procesoTipo === "apoyo" ? cabecera.procesoTipo : undefined,
        });
        setMiperId(result.id);
        setCargos(result.cargos.map((item) => ({ ...item, tareasTexto: "" })));
        setPaso(2);
      });
    }

    if (paso === 2) {
      return run(async () => {
        await guardarDescripcionesAsistente({ miperId, cargos: cargos.map(({ id, descripcionTrabajo }) => ({ id, descripcionTrabajo })) });
        setPaso(3);
      });
    }

    if (paso === 3) {
      return run(async () => {
        const payload = cargos.map((cargo) => {
          const lista = (tareasEditorPorCargo[cargo.id] ?? tareasDesdeTexto(cargo, cargo.tareasTexto)).filter((t) => t.nombre.trim());
          return {
            asistenteCargoId: cargo.id,
            tareas: lista.map((t) => ({
              nombre: t.nombre,
              origen: "manual" as const,
              esRutinaria: t.rutina === "no_informado" ? null : t.rutina === "si",
              lugarEspecifico: t.lugarEspecifico,
              personasExpuestasTotal: t.personasExpuestasTotal ? Number(t.personasExpuestasTotal) : null,
              distribucionSexogenerica: t.distribucion.noInformado
                ? null
                : {
                    hombre: t.distribucion.hombre ?? 0,
                    mujer: t.distribucion.mujer ?? 0,
                    noBinario: t.distribucion.noBinario ?? 0,
                  },
              observaciones: t.observaciones,
            })),
          };
        });

        const saved = await guardarTareasAsistente({ miperId, cargos: payload });
        setTareas(saved as Tarea[]);
        setTareasSeleccionadas(saved.map((item) => item.id));
        setPaso(4);
      });
    }

    if (paso === 4) {
      return run(async () => {
        const payload = tareas.flatMap((tarea) =>
          PREGUNTAS.map((pregunta) => ({
            tareaId: tarea.id,
            grupo: pregunta.grupo,
            clave: pregunta.clave,
            pregunta: pregunta.pregunta,
            respuesta: respuestas[`${tarea.id}:${pregunta.clave}`] ?? "no_se",
          })),
        );
        await guardarExposicionesAsistente({ miperId, respuestas: payload });
        crearSugerencias();
        setPaso(5);
      });
    }

    if (paso === 5) {
      return run(async () => {
        const guardados = await guardarRiesgosAsistente({
          miperId,
          items: riesgos.map((item) => ({
            tareaId: item.tareaId,
            codigoIsp: item.codigoIsp,
            confirmado: item.confirmado,
            consecuencia: item.consecuencia,
            responsableTrabajadorId: cabecera.responsableElaboracionId,
            motivoSugerencia: item.motivoSugerencia,
            peligroGente: item.peligroGente,
            peligroEquipos: item.peligroEquipos,
            peligroMateriales: item.peligroMateriales,
            peligroAmbiente: item.peligroAmbiente,
            peligroDescripcion: item.peligroDescripcion,
          })),
        });
        const ids = new Map(guardados.map((item) => [`${item.tareaId}:${item.codigoIsp}`, item.id]));
        setRiesgos((values) => values.map((item) => ({ ...item, id: ids.get(`${item.tareaId}:${item.codigoIsp}`) })));
        setPaso(6);
      });
    }

    if (paso === 6) {
      return run(async () => {
        if (riesgos.some((item) => !item.id)) throw new Error("Guarda primero las sugerencias de riesgo.");
        const hayVepPendiente = riesgos.some((item) => {
          const riesgo = catalogo.get(item.codigoIsp);
          return item.confirmado && riesgo?.metodologiaEvaluacion === "vep_isp" && (item.probabilidad === null || item.severidad === null);
        });
        if (hayVepPendiente) {
          throw new Error("Completa probabilidad y consecuencia en los riesgos VEP confirmados antes de continuar.");
        }
        await guardarEvaluacionesAsistente({
          miperId,
          items: riesgos.map((item) => ({
            id: item.id!,
            consecuencia: item.consecuencia,
            probabilidad: item.probabilidad,
            severidad: item.severidad,
            magnitudExposicion: item.magnitudExposicion,
            nivelRiesgoEspecifico: item.nivelRiesgoEspecifico,
            estadoEvaluacionEspecifica: item.estadoEvaluacionEspecifica,
            observacionTecnica: item.observacionTecnica,
          })),
        });
        setPaso(7);
      });
    }

    if (paso === 7) {
      return run(async () => {
        if (riesgos.some((item) => !item.id)) throw new Error("Guarda primero las evaluaciones.");
        await guardarControlesAsistente({
          miperId,
          items: riesgos.map((item) => ({
            id: item.id!,
            controles: item.control.trim()
              ? [{
                  tipoControl: item.controlTipo,
                  descripcion: item.control,
                  responsableTrabajadorId: item.controlResponsableId,
                  fechaCompromiso: item.controlFecha,
                  estado: item.controlEstado,
                }]
              : [],
          })),
        });
        setPaso(8);
      });
    }

    return run(async () => {
      const result = await finalizarMiperAsistente({ miperId });
      router.push(`/dicaprev/ds44/miper/${result.id}`);
      router.refresh();
    });
  }

  function aplicarRespuestaMasiva(aTodas: boolean) {
    const destino = aTodas ? tareas.map((item) => item.id) : tareasSeleccionadas;
    if (!destino.length) {
      setError("Selecciona al menos una tarea para aplicar la respuesta.");
      return;
    }
    setRespuestas((values) => ({
      ...values,
      ...Object.fromEntries(destino.map((tareaId) => [`${tareaId}:${preguntaMasiva}`, respuestaMasiva])),
    }));
  }

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-1">
          {PASOS.map((label, index) => (
            <div
              key={label}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${paso === index + 1 ? "bg-slate-900 text-white" : paso > index + 1 ? "bg-emerald-50 text-emerald-700" : "text-slate-400"}`}
            >
              {index + 1}. {label}
            </div>
          ))}
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
      {avisoIa && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{avisoIa}</div>}

      {paso === 1 && (
        <Card className="rounded-2xl">
          <CardHeader><h2 className="text-lg font-bold">1. Alcance de la matriz</h2></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">Código<input className={inputClass} value={cabecera.codigo} onChange={(e) => setCabecera((v) => ({ ...v, codigo: e.target.value }))} /></label>
            <label className="grid gap-1 text-sm font-medium">Nombre<input className={inputClass} value={cabecera.nombre} onChange={(e) => setCabecera((v) => ({ ...v, nombre: e.target.value }))} /></label>
            <label className="grid gap-1 text-sm font-medium">Proceso<input className={inputClass} value={cabecera.procesoNombre ?? ""} onChange={(e) => setCabecera((v) => ({ ...v, procesoNombre: e.target.value }))} /></label>
            <label className="grid gap-1 text-sm font-medium">Tipo proceso<select className={inputClass} value={cabecera.procesoTipo ?? ""} onChange={(e) => setCabecera((v) => ({ ...v, procesoTipo: e.target.value }))}><option value="">Selecciona</option><option value="operacional">Operacional</option><option value="apoyo">Apoyo</option></select></label>
            <label className="grid gap-1 text-sm font-medium md:col-span-2">Responsable del proceso<select className={inputClass} value={cabecera.procesoResponsableId} onChange={(e) => setCabecera((v) => ({ ...v, procesoResponsableId: e.target.value }))}><option value="">Selecciona trabajador</option>{data.responsables.map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.cargo ? ` · ${item.cargo}` : ""}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-medium">Centro<select className={inputClass} value={cabecera.centroTrabajoId} onChange={(e) => setCabecera((v) => ({ ...v, centroTrabajoId: e.target.value }))}><option value="">Selecciona</option>{data.centros.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-medium">Área<select className={inputClass} value={cabecera.areaId} onChange={(e) => setCabecera((v) => ({ ...v, areaId: e.target.value, cargoIds: [] }))}><option value="">Selecciona</option>{data.areas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
            <fieldset className="grid gap-2 rounded-xl border border-slate-200 p-4 md:col-span-2"><legend className="px-2 text-sm font-semibold">Cargos incluidos</legend>{cargosDisponibles.map((cargo) => <label key={cargo.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cabecera.cargoIds.includes(cargo.id)} onChange={(e) => setCabecera((v) => ({ ...v, cargoIds: e.target.checked ? [...v.cargoIds, cargo.id] : v.cargoIds.filter((id) => id !== cargo.id) }))} />{cargo.nombre}</label>)}</fieldset>
            <label className="grid gap-1 text-sm font-medium">Responsable elaboración<select className={inputClass} value={cabecera.responsableElaboracionId} onChange={(e) => setCabecera((v) => ({ ...v, responsableElaboracionId: e.target.value }))}><option value="">Selecciona</option>{data.responsables.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-medium">Próxima revisión<input type="date" className={inputClass} value={cabecera.fechaProximaRevision} onChange={(e) => setCabecera((v) => ({ ...v, fechaProximaRevision: e.target.value }))} /></label>
          </CardContent>
        </Card>
      )}

      {paso === 2 && (
        <Card className="rounded-2xl">
          <CardHeader><h2 className="text-lg font-bold">2. Descripción del trabajo por cargo</h2></CardHeader>
          <CardContent className="space-y-4">
            {cargos.map((cargo) => (
              <label key={cargo.id} className="grid gap-1 text-sm font-medium">
                {cargo.nombre}
                <textarea className={`${inputClass} min-h-28`} value={cargo.descripcionTrabajo} onChange={(e) => setCargos((values) => values.map((item) => item.id === cargo.id ? { ...item, descripcionTrabajo: e.target.value } : item))} />
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {paso === 3 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <h2 className="text-lg font-bold">3. Tareas propuestas y confirmadas</h2>
            <p className="text-sm text-slate-500">Edita nombre, rutina y lugar por tarea. Población y observaciones quedan en bloque expandible.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 md:grid-cols-[220px_1fr_auto]">
              <label className="grid gap-1 text-sm font-medium">Rutina<select className={inputClass} value={rutinaMasiva} onChange={(e) => setRutinaMasiva(e.target.value as RutinaValor)}><option value="no_informado">No informado</option><option value="si">Sí</option><option value="no">No</option></select></label>
              <label className="grid gap-1 text-sm font-medium">Lugar específico (aplicar a todas)<select className={inputClass} value={lugarMasivo} onChange={(e) => setLugarMasivo(e.target.value)}><option value="">Selecciona centro activo</option>{data.centros.map((centro) => <option key={centro.id} value={centro.nombre}>{centro.nombre}</option>)}</select></label>
              <Button className="self-end rounded-xl" variant="outline" onClick={aplicarATodasLasTareas}>Aplicar a todas las tareas</Button>
            </div>

            {cargos.map((cargo) => {
              const lista = tareasEditorPorCargo[cargo.id] ?? [];
              return (
                <div key={cargo.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <strong className="text-sm">{cargo.nombre}</strong>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => run(async () => {
                        const result = await obtenerSugerenciasTareasIa({ miperId, asistenteCargoId: cargo.id });
                        setAvisoIa(result.mensaje);
                        if (result.resultado.tareas.length) {
                          const texto = result.resultado.tareas.map((t) => t.nombre).join("\n");
                          actualizarTextoCargo(cargo.id, texto);
                        }
                      })}
                    >
                      Sugerir con IA
                    </Button>
                  </div>

                  <textarea
                    className={`${inputClass} min-h-24 w-full`}
                    value={cargo.tareasTexto}
                    onChange={(e) => actualizarTextoCargo(cargo.id, e.target.value)}
                    placeholder="Una tarea por línea"
                  />

                  {lista.length === 0 ? <p className="text-sm text-slate-500">Ingresa tareas para este cargo.</p> : (
                    <div className="space-y-3">
                      {lista.map((tarea, index) => (
                        <div key={`${cargo.id}-${index}`} className="rounded-xl border border-slate-200 p-3">
                          <div className="grid gap-3 md:grid-cols-3">
                            <label className="grid gap-1 text-xs font-semibold uppercase text-slate-500">Nombre<input className={inputClass} value={tarea.nombre} onChange={(e) => editarTarea(cargo.id, index, { nombre: e.target.value })} /></label>
                            <label className="grid gap-1 text-xs font-semibold uppercase text-slate-500">Rutinaria<select className={inputClass} value={tarea.rutina} onChange={(e) => editarTarea(cargo.id, index, { rutina: e.target.value as RutinaValor })}><option value="no_informado">No informado</option><option value="si">Sí</option><option value="no">No</option></select></label>
                            <label className="grid gap-1 text-xs font-semibold uppercase text-slate-500">Lugar específico<select className={inputClass} value={nombresCentrosActivos.has(tarea.lugarEspecifico) ? tarea.lugarEspecifico : ""} onChange={(e) => editarTarea(cargo.id, index, { lugarEspecifico: e.target.value })}><option value="">Selecciona centro activo</option>{data.centros.map((centro) => <option key={centro.id} value={centro.nombre}>{centro.nombre}</option>)}</select></label>
                          </div>
                          <details className="mt-3 rounded-xl bg-slate-50 p-3" open={tarea.expandido} onToggle={(e) => editarTarea(cargo.id, index, { expandido: (e.target as HTMLDetailsElement).open })}>
                            <summary className="cursor-pointer text-sm font-medium text-slate-700">Población expuesta y observaciones</summary>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <label className="grid gap-1 text-xs font-semibold uppercase text-slate-500">Personas expuestas total<input type="number" min={0} className={inputClass} value={tarea.personasExpuestasTotal} onChange={(e) => editarTarea(cargo.id, index, { personasExpuestasTotal: e.target.value })} /></label>
                              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(tarea.distribucion.noInformado)} onChange={(e) => editarTarea(cargo.id, index, { distribucion: e.target.checked ? { noInformado: true } : { noInformado: false, hombre: 0, mujer: 0, noBinario: 0 } })} />Distribución sexogenérica: No informado</label>
                              {!tarea.distribucion.noInformado && (
                                <>
                                  <label className="grid gap-1 text-xs font-semibold uppercase text-slate-500">Hombre<input type="number" min={0} className={inputClass} value={tarea.distribucion.hombre ?? 0} onChange={(e) => editarTarea(cargo.id, index, { distribucion: { ...tarea.distribucion, noInformado: false, hombre: Number(e.target.value || 0) } })} /></label>
                                  <label className="grid gap-1 text-xs font-semibold uppercase text-slate-500">Mujer<input type="number" min={0} className={inputClass} value={tarea.distribucion.mujer ?? 0} onChange={(e) => editarTarea(cargo.id, index, { distribucion: { ...tarea.distribucion, noInformado: false, mujer: Number(e.target.value || 0) } })} /></label>
                                  <label className="grid gap-1 text-xs font-semibold uppercase text-slate-500">No binario<input type="number" min={0} className={inputClass} value={tarea.distribucion.noBinario ?? 0} onChange={(e) => editarTarea(cargo.id, index, { distribucion: { ...tarea.distribucion, noInformado: false, noBinario: Number(e.target.value || 0) } })} /></label>
                                </>
                              )}
                              <label className="grid gap-1 text-xs font-semibold uppercase text-slate-500 md:col-span-2">Observaciones<textarea className={`${inputClass} min-h-20`} value={tarea.observaciones} onChange={(e) => editarTarea(cargo.id, index, { observaciones: e.target.value })} /></label>
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {paso === 4 && (
        <Card className="rounded-2xl">
          <CardHeader><h2 className="text-lg font-bold">4. Exposiciones por tarea</h2></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 md:grid-cols-[1fr_180px_auto_auto]">
              <label className="grid gap-1 text-sm font-medium">Pregunta<select className={inputClass} value={preguntaMasiva} onChange={(e) => setPreguntaMasiva(e.target.value as typeof preguntaMasiva)}>{PREGUNTAS.map((item) => <option key={item.clave} value={item.clave}>{item.grupo} · {item.pregunta}</option>)}</select></label>
              <label className="grid gap-1 text-sm font-medium">Respuesta<select className={inputClass} value={respuestaMasiva} onChange={(e) => setRespuestaMasiva(e.target.value as Respuesta)}><option value="aplica">Sí</option><option value="no_aplica">No</option><option value="no_se">No sé</option></select></label>
              <Button variant="outline" className="self-end rounded-xl" onClick={() => aplicarRespuestaMasiva(false)}>Aplicar a seleccionadas</Button>
              <Button className="self-end rounded-xl" onClick={() => aplicarRespuestaMasiva(true)}>Aplicar a todas las tareas</Button>
            </div>
            {tareas.map((tarea) => (
              <div key={tarea.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
                <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={tareasSeleccionadas.includes(tarea.id)} onChange={(e) => setTareasSeleccionadas((values) => e.target.checked ? [...values, tarea.id] : values.filter((id) => id !== tarea.id))} />{tarea.nombre}</label>
                {PREGUNTAS.map((pregunta) => (
                  <label key={pregunta.clave} className="grid gap-2 text-sm md:grid-cols-[1fr_160px] md:items-center"><span><Badge variant="outline" className="mr-2">{pregunta.grupo}</Badge>{pregunta.pregunta}</span><select className={inputClass} value={respuestas[`${tarea.id}:${pregunta.clave}`] ?? "no_se"} onChange={(e) => setRespuestas((values) => ({ ...values, [`${tarea.id}:${pregunta.clave}`]: e.target.value as Respuesta }))}><option value="aplica">Sí</option><option value="no_aplica">No</option><option value="no_se">No sé</option></select></label>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {paso === 5 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <h2 className="text-lg font-bold">5. Riesgos sugeridos</h2>
            <p className="text-sm text-slate-500">Detalla GEMA opcional por riesgo cuando aplique.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {riesgos.map((item, index) => {
              const riesgo = catalogo.get(item.codigoIsp)!;
              const tarea = tareas.find((value) => value.id === item.tareaId);
              return (
                <div key={`${item.tareaId}-${item.codigoIsp}`} className="rounded-xl border border-slate-200 p-4">
                  <label className="flex gap-3"><input type="checkbox" checked={item.confirmado} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, confirmado: e.target.checked } : value))} /><span><strong>{riesgo.codigoIsp} · {riesgo.riesgoEspecifico}</strong><span className="mt-1 block text-sm text-slate-500">{tarea?.nombre} · {riesgo.familia}</span></span></label>
                  <details className="mt-3 rounded-xl bg-slate-50 p-3">
                    <summary className="cursor-pointer text-sm font-medium">Detallar peligros/factores de riesgo (opcional)</summary>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1 text-sm">Gente<input className={inputClass} value={item.peligroGente} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, peligroGente: e.target.value } : value))} /></label>
                      <label className="grid gap-1 text-sm">Equipos<input className={inputClass} value={item.peligroEquipos} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, peligroEquipos: e.target.value } : value))} /></label>
                      <label className="grid gap-1 text-sm">Materiales<input className={inputClass} value={item.peligroMateriales} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, peligroMateriales: e.target.value } : value))} /></label>
                      <label className="grid gap-1 text-sm">Ambiente<input className={inputClass} value={item.peligroAmbiente} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, peligroAmbiente: e.target.value } : value))} /></label>
                      <label className="grid gap-1 text-sm md:col-span-2">Descripción consolidada<input className={inputClass} value={item.peligroDescripcion} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, peligroDescripcion: e.target.value } : value))} /></label>
                    </div>
                  </details>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {paso === 6 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <h2 className="text-lg font-bold">6. Evaluación de riesgos</h2>
            <p className="text-sm text-slate-500">VEP solo admite valores ISP 1, 2 y 4. Si falta alguno, el riesgo queda como Evaluación pendiente.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {riesgos.map((item, index) => {
              const riesgo = catalogo.get(item.codigoIsp);
              const esVep = riesgo?.metodologiaEvaluacion === "vep_isp";
              const vep = calcularVep(item.probabilidad, item.severidad);
              return (
                <div key={`eval-${item.tareaId}-${item.codigoIsp}`} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold">{item.codigoIsp} · {riesgo?.riesgoEspecifico ?? "Riesgo"}</p>
                  {esVep ? (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1 text-sm font-medium">
                        Probabilidad
                        <select
                          className={inputClass}
                          value={item.probabilidad ?? ""}
                          onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, probabilidad: e.target.value ? Number(e.target.value) : null } : value))}
                        >
                          <option value="">Selecciona</option>
                          {OPCIONES_PROBABILIDAD.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-1 text-sm font-medium">
                        Consecuencia
                        <select
                          className={inputClass}
                          value={item.severidad ?? ""}
                          onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, severidad: e.target.value ? Number(e.target.value) : null } : value))}
                        >
                          <option value="">Selecciona</option>
                          {OPCIONES_CONSECUENCIA.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                      </label>
                      <div className="rounded-xl bg-slate-50 p-3 text-sm md:col-span-2">
                        <p><strong>VEP:</strong> {vep ?? "Pendiente"}</p>
                        <p><strong>Nivel:</strong> {clasificarVep(vep)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1 text-sm font-medium">Magnitud<input className={inputClass} value={item.magnitudExposicion} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, magnitudExposicion: e.target.value } : value))} /></label>
                      <label className="grid gap-1 text-sm font-medium">Nivel<input className={inputClass} value={item.nivelRiesgoEspecifico} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, nivelRiesgoEspecifico: e.target.value } : value))} /></label>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {paso === 7 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <h2 className="text-lg font-bold">7. Medidas de control</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {riesgos.map((item, index) => (
              <div key={`ctrl-${item.tareaId}-${item.codigoIsp}`} className="rounded-xl border border-slate-200 p-4">
                <p className="mb-3 text-sm font-semibold">{item.codigoIsp} · {catalogo.get(item.codigoIsp)?.riesgoEspecifico ?? "Riesgo"}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm font-medium md:col-span-2">Medida<textarea className={`${inputClass} min-h-20`} value={item.control} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, control: e.target.value } : value))} /></label>
                  <label className="grid gap-1 text-sm font-medium">Jerarquía<select className={inputClass} value={item.controlTipo} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, controlTipo: e.target.value as Riesgo["controlTipo"] } : value))}><option value="eliminacion">Eliminación</option><option value="sustitucion">Sustitución</option><option value="ingenieria">Ingeniería</option><option value="administrativo">Administrativo</option><option value="epp">EPP</option></select></label>
                  <label className="grid gap-1 text-sm font-medium">Estado<select className={inputClass} value={item.controlEstado} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, controlEstado: e.target.value as Riesgo["controlEstado"] } : value))}><option value="pendiente">Pendiente</option><option value="implementado">Implementado</option><option value="en_revision">En revisión</option><option value="descartado">Descartado</option></select></label>
                  <label className="grid gap-1 text-sm font-medium">Responsable<select className={inputClass} value={item.controlResponsableId} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, controlResponsableId: e.target.value } : value))}><option value="">Selecciona</option>{data.responsables.map((resp) => <option key={resp.id} value={resp.id}>{resp.nombre}</option>)}</select></label>
                  <label className="grid gap-1 text-sm font-medium">Fecha compromiso<input type="date" className={inputClass} value={item.controlFecha} onChange={(e) => setRiesgos((values) => values.map((value, i) => i === index ? { ...value, controlFecha: e.target.value } : value))} /></label>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {paso === 8 && (
        <Card className="rounded-2xl">
          <CardHeader><h2 className="text-lg font-bold">8. Resumen final</h2></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">Se creará el borrador MIPER con tareas, riesgos, evaluaciones y controles registrados.</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" className="rounded-2xl" disabled={pending || paso === 1} onClick={() => setPaso((value) => Math.max(1, value - 1))}>Anterior</Button>
        <Button className="rounded-2xl font-semibold" disabled={pending} onClick={continuar}>{paso === 8 ? "Crear borrador MIPER" : "Guardar y continuar"}</Button>
      </div>
    </div>
  );
}
