"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FileText, Save, ShieldAlert, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { saveDs44Diagnostico } from "./actions";
import {
  type Ds44Brecha,
  type Ds44DiagnosticoPayload,
  type Ds44PrioridadBrecha,
  type Ds44RespuestaValor,
} from "./catalogo";

type Props = {
  initialData: Ds44DiagnosticoPayload;
};

type RespuestaState = {
  respuesta: Ds44RespuestaValor | null;
  observacion: string;
};

const PRIORIDAD_STYLES: Record<Ds44PrioridadBrecha, string> = {
  critica: "bg-rose-100 text-rose-800 border-rose-200",
  alta: "bg-orange-100 text-orange-800 border-orange-200",
  media: "bg-amber-100 text-amber-800 border-amber-200",
  baja: "bg-slate-100 text-slate-700 border-slate-200",
};

const PRIORIDAD_LABELS: Record<Ds44PrioridadBrecha, string> = {
  critica: "Critica",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

const RESPUESTAS: Array<{ value: Ds44RespuestaValor; label: string }> = [
  { value: "si", label: "Si" },
  { value: "no", label: "No" },
  { value: "no_aplica", label: "No aplica" },
];

const MIGRACION_PENDIENTE_MSG =
  "La persistencia DS44 aun no esta habilitada en este ambiente. La pagina puede visualizarse, pero para guardar se debe aplicar la migracion productiva.";

function getEstadoGuardadoLabel(data: Ds44DiagnosticoPayload): string {
  if (!data.updatedAt) return "Sin guardar";
  const date = new Date(data.updatedAt);
  if (Number.isNaN(date.getTime())) return "Guardado";
  return `Guardado: ${new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(date)}`;
}

function getEstadoBadge(data: Ds44DiagnosticoPayload): { label: string; className: string } {
  if (!data.updatedAt) {
    return { label: "Sin guardar", className: "border-slate-200 bg-slate-100 text-slate-700" };
  }

  if (data.estado === "completado") {
    return { label: "Completado", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }

  return { label: "En evaluacion", className: "border-blue-200 bg-blue-50 text-blue-700" };
}

function normalizeUiErrorMessage(message: string): string {
  if (message.toLowerCase().includes("aun no esta habilitado")) {
    return MIGRACION_PENDIENTE_MSG;
  }

  return message;
}

function groupBrechasByPrioridad(brechas: Ds44Brecha[]): Record<Ds44PrioridadBrecha, Ds44Brecha[]> {
  return {
    critica: brechas.filter((item) => item.prioridad === "critica"),
    alta: brechas.filter((item) => item.prioridad === "alta"),
    media: brechas.filter((item) => item.prioridad === "media"),
    baja: brechas.filter((item) => item.prioridad === "baja"),
  };
}

export default function DiagnosticoDs44Client({ initialData }: Props) {
  const [data, setData] = useState<Ds44DiagnosticoPayload>(initialData);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(
    initialData.persistenciaDisponible === false ? initialData.mensajePersistencia ?? MIGRACION_PENDIENTE_MSG : null,
  );

  const [respuestas, setRespuestas] = useState<Record<string, RespuestaState>>(() => {
    const entries = initialData.bloques.flatMap((bloque) =>
      bloque.preguntas.map((pregunta) => [
        pregunta.preguntaClave,
        {
          respuesta: pregunta.respuesta,
          observacion: pregunta.observacion,
        },
      ] as const),
    );
    return Object.fromEntries(entries);
  });

  const totalPreguntas = useMemo(
    () => data.bloques.reduce((acc, bloque) => acc + bloque.preguntas.length, 0),
    [data.bloques],
  );

  const preguntasRespondidas = useMemo(
    () => Object.values(respuestas).filter((item) => item.respuesta !== null).length,
    [respuestas],
  );

  const avanceGeneral = totalPreguntas > 0 ? Math.round((preguntasRespondidas / totalPreguntas) * 100) : 0;
  const brechasAgrupadas = groupBrechasByPrioridad(data.brechas);
  const estadoBadge = getEstadoBadge(data);

  function updateRespuesta(preguntaClave: string, respuesta: Ds44RespuestaValor) {
    setRespuestas((prev) => ({
      ...prev,
      [preguntaClave]: {
        respuesta,
        observacion: prev[preguntaClave]?.observacion ?? "",
      },
    }));
  }

  function updateObservacion(preguntaClave: string, observacion: string) {
    setRespuestas((prev) => ({
      ...prev,
      [preguntaClave]: {
        respuesta: prev[preguntaClave]?.respuesta ?? null,
        observacion,
      },
    }));
  }

  function guardarDiagnostico() {
    setErrorMsg(null);
    setSuccessMsg(null);
    setWarningMsg(null);

    startTransition(async () => {
      try {
        const payload = await saveDs44Diagnostico({
          respuestas: Object.entries(respuestas).map(([preguntaClave, value]) => ({
            preguntaClave,
            respuesta: value.respuesta,
            observacion: value.observacion,
          })),
        });

        setData(payload);

        if (payload.persistenciaDisponible === false) {
          setWarningMsg(
            payload.mensajePersistencia ??
              "Diagnostico calculado, pero no guardado. La persistencia DS44 aun no esta habilitada en este ambiente. Se debe aplicar la migracion productiva.",
          );
          return;
        }

        setSuccessMsg("Diagnostico guardado correctamente.");
      } catch (error) {
        if (error instanceof Error) {
          setErrorMsg(normalizeUiErrorMessage(error.message));
          return;
        }

        setErrorMsg("No fue posible guardar el diagnostico.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Estado del diagnostico</p>
              <p className="text-sm text-slate-500">{getEstadoGuardadoLabel(data)}</p>
            </div>
            <Badge variant="outline" className={estadoBadge.className}>
              {estadoBadge.label}
            </Badge>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
              <span>Avance general</span>
              <span className="font-medium text-slate-900">
                {preguntasRespondidas}/{totalPreguntas}
              </span>
            </div>
            <Progress value={avanceGeneral} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Score global</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{data.scoreGlobal ?? "--"}</p>
            <p className="mt-1 text-xs text-slate-500">Promedio de bloques respondidos.</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bloques evaluados</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{data.kpis.bloquesEvaluados}</p>
            <p className="mt-1 text-xs text-slate-500">Bloques con puntaje calculado.</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Preguntas cumplidas</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">{data.kpis.preguntasCumplidas}</p>
            <p className="mt-1 text-xs text-slate-500">Respuestas afirmativas registradas.</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Brechas criticas</p>
            <p className="mt-2 text-2xl font-semibold text-rose-700">{data.kpis.brechasCriticas}</p>
            <p className="mt-1 text-xs text-slate-500">Focos de atencion inmediata.</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Brechas altas</p>
            <p className="mt-2 text-2xl font-semibold text-orange-700">{data.kpis.brechasAltas}</p>
            <p className="mt-1 text-xs text-slate-500">Pendientes relevantes en seguimiento.</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Cuestionario DS44 por bloques</h2>
            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
              {getEstadoGuardadoLabel(data)}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Completa cada bloque para obtener un score consolidado y brechas priorizadas para implementacion.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {data.bloques.map((bloque) => {
            const totalBloque = bloque.preguntas.length;
            const respondidasBloque = bloque.preguntas.filter((pregunta) => {
              return respuestas[pregunta.preguntaClave]?.respuesta !== null;
            }).length;
            const avanceBloque = totalBloque > 0 ? Math.round((respondidasBloque / totalBloque) * 100) : 0;

            return (
              <div key={bloque.bloqueId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {bloque.bloqueId}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{bloque.bloqueNombre}</h3>
                      <p className="text-xs text-slate-500">Score bloque: {bloque.score ?? "--"}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                    {respondidasBloque}/{totalBloque} respondidas
                  </Badge>
                </div>

                <Progress value={avanceBloque} className="mb-4 h-2" />

                <div className="space-y-4">
                  {bloque.preguntas.map((pregunta) => {
                    const current = respuestas[pregunta.preguntaClave] ?? { respuesta: null, observacion: "" };

                    return (
                      <div key={pregunta.preguntaClave} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                        <p className="text-sm font-medium text-slate-900">{pregunta.preguntaTexto}</p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {RESPUESTAS.map((opcion) => (
                            <button
                              key={opcion.value}
                              type="button"
                              onClick={() => updateRespuesta(pregunta.preguntaClave, opcion.value)}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
                                current.respuesta === opcion.value
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:bg-slate-100",
                              )}
                              aria-pressed={current.respuesta === opcion.value}
                            >
                              {opcion.label}
                            </button>
                          ))}
                        </div>

                        <textarea
                          value={current.observacion}
                          onChange={(event) => updateObservacion(pregunta.preguntaClave, event.target.value)}
                          placeholder="Observacion opcional"
                          className="mt-3 min-h-16 w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-700 outline-none ring-slate-900/20 focus:ring"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
            <Button onClick={guardarDiagnostico} disabled={isPending}>
              <Save className="mr-2 h-4 w-4" />
              {isPending ? "Guardando..." : "Guardar diagnostico"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/dicaprev/ds44">Volver al dashboard DS44</Link>
            </Button>
          </div>

          {errorMsg ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{errorMsg}</div>
          ) : null}
          {warningMsg ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warningMsg}</div>
          ) : null}
          {successMsg ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{successMsg}</div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ShieldAlert className="h-5 w-5 text-slate-600" />
            Resumen ejecutivo de brechas
          </h2>
          <p className="text-sm text-slate-500">
            Brechas priorizadas desde respuestas &quot;No&quot; con recomendacion, evidencia esperada y acceso sugerido.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {(["critica", "alta", "media", "baja"] as Ds44PrioridadBrecha[]).map((prioridad) => {
            const lista = brechasAgrupadas[prioridad];
            if (lista.length === 0) return null;

            return (
              <div key={prioridad}>
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline" className={PRIORIDAD_STYLES[prioridad]}>
                    {PRIORIDAD_LABELS[prioridad]}
                  </Badge>
                  <span className="text-sm text-slate-500">{lista.length} brechas</span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {lista.map((brecha) => (
                    <div key={brecha.preguntaClave} className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-sm font-semibold text-slate-900">{brecha.preguntaTexto}</p>
                      <p className="mt-1 text-xs text-slate-500">Bloque: {brecha.bloqueId}. {brecha.bloqueNombre}</p>
                      <p className="mt-2 text-sm text-slate-700"><span className="font-medium">Recomendacion:</span> {brecha.recomendacion}</p>
                      <p className="mt-1 text-sm text-slate-700"><span className="font-medium">Evidencia esperada:</span> {brecha.evidenciaEsperada}</p>

                      {brecha.hallazgoRelacionadoId ? (
                        <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700">
                          Hallazgo relacionado detectado: {brecha.hallazgoRelacionadoDescripcion}
                        </div>
                      ) : null}

                      <div className="mt-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={brecha.rutaSugerida}>Ir a frente sugerido</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {data.brechas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Sin brechas priorizadas por ahora. Al completar nuevas respuestas, el panel sugerira focos de accion.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Accesos rapidos</h2>
          <p className="text-sm text-slate-500">Continua gestionando los frentes operativos relacionados al diagnostico.</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 pb-5 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { href: "/dicaprev/documentacion", label: "Documentacion", icon: FileText },
            { href: "/dicaprev/cumplimiento/obligaciones", label: "Obligaciones", icon: Target },
            { href: "/dicaprev/cumplimiento/hallazgos", label: "Hallazgos", icon: AlertTriangle },
            { href: "/dicaprev/cumplimiento/plan-trabajo", label: "Plan de trabajo", icon: Clock3 },
            { href: "/dicaprev/capacitacion", label: "Capacitaciones", icon: CheckCircle2 },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <item.icon className="h-4 w-4 text-slate-500" />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
