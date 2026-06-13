"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  avanzarCapacitacionAsignacionPublica,
  getCapacitacionAsignacionPublica,
  type AsignacionCapacitacion,
  type CapacitacionCatalogo,
  type CapacitacionSesionPregunta,
} from "@/actions/capacitaciones";
import { CheckCircle2, BookOpen, Video, FileText, Clock, AlertTriangle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type Pregunta = CapacitacionSesionPregunta;

type Paso = "bienvenida" | "material" | "evaluacion" | "firma" | "completado";

type SesionExterna = {
  id: string;
  titulo: string;
  modalidad: string;
  videoUrl?: string;
  videoDuracionSegundos?: number;
  minimoVisualizacionPct: number;
  evaluacionPreguntas: CapacitacionSesionPregunta[];
  evaluacionMinimoAprobacion: number;
};

const PREGUNTAS_FALLBACK: Pregunta[] = [
  {
    id: "p1",
    texto: "¿Cuál es la principal medida de prevención en el trabajo?",
    opciones: ["Usar EPP adecuado", "Trabajar más rápido", "Ignorar las señales", "Evitar el uso de herramientas"],
    correcta: 0,
  },
  {
    id: "p2",
    texto: "¿Qué debe hacer ante un accidente en el lugar de trabajo?",
    opciones: ["Ignorarlo", "Avisar al supervisor inmediatamente", "Continuar trabajando", "Esperar al día siguiente"],
    correcta: 1,
  },
  {
    id: "p3",
    texto: "¿Con qué frecuencia debe revisarse el equipo de protección personal?",
    opciones: ["Cada año", "Solo cuando se rompe", "Antes de cada uso", "Una vez al mes"],
    correcta: 2,
  },
  {
    id: "p4",
    texto: "Si detectas una condición insegura, ¿qué corresponde hacer?",
    opciones: ["No reportarla", "Esperar que otro la reporte", "Reportarla de inmediato", "Seguir operando normalmente"],
    correcta: 2,
  },
];

function ProgressBar({ paso }: { paso: Paso }) {
  const pasos: Paso[] = ["bienvenida", "material", "evaluacion", "firma", "completado"];
  const idx = pasos.indexOf(paso);
  return (
    <div className="flex items-center gap-1 mb-6">
      {pasos.slice(0, -1).map((p, i) => (
        <React.Fragment key={p}>
          <div
            className={cn(
              "h-2 flex-1 rounded-full transition-all duration-300",
              i < idx ? "bg-cyan-500" : i === idx ? "bg-cyan-300" : "bg-slate-200",
            )}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

function toYouTubeEmbed(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "").trim();
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return null;
  } catch {
    return null;
  }
}

export default function ExternaPage() {
  const params = useParams();
  const token =
    typeof params?.token === "string"
      ? params.token
      : Array.isArray(params?.token)
        ? params.token[0]
        : "";

  const [asignacion, setAsignacion] = useState<AsignacionCapacitacion | null | undefined>(undefined);
  const [capacitacion, setCapacitacion] = useState<CapacitacionCatalogo | null>(null);
  const [sesion, setSesion] = useState<SesionExterna | null>(null);
  const [paso, setPaso] = useState<Paso>("bienvenida");
  const [respuestas, setRespuestas] = useState<Record<string, number>>({});
  const [firma, setFirma] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [nota, setNota] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoTrackingActive, setVideoTrackingActive] = useState(false);
  const [watchedSeconds, setWatchedSeconds] = useState(0);

  const duracionVideo = useMemo(() => {
    if (!sesion?.videoUrl) return 0;
    return Math.max(30, sesion.videoDuracionSegundos ?? 600);
  }, [sesion]);

  const minWatchPct = useMemo(() => {
    if (!sesion?.videoUrl) return 0;
    return Math.max(0, Math.min(100, sesion.minimoVisualizacionPct ?? 85));
  }, [sesion]);

  const watchPercent = useMemo(() => {
    if (!sesion?.videoUrl || duracionVideo <= 0) return 100;
    return Math.min(100, Math.round((watchedSeconds / duracionVideo) * 100));
  }, [duracionVideo, watchedSeconds, sesion]);

  const preguntas = useMemo(() => {
    const base = sesion?.evaluacionPreguntas?.length ? sesion.evaluacionPreguntas : PREGUNTAS_FALLBACK;
    return base.slice(0, 4);
  }, [sesion]);

  const requiereEvaluacion = capacitacion?.requiereEvaluacion ?? true;
  const minimoAprobacion = sesion?.evaluacionMinimoAprobacion ?? 70;

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        setError(null);
        const data = await getCapacitacionAsignacionPublica(token);
        setAsignacion(data?.asignacion ?? null);
        setCapacitacion(data?.capacitacion ?? null);
        setSesion(data?.sesion ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar capacitación");
        setAsignacion(null);
        setCapacitacion(null);
        setSesion(null);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!sesion?.videoUrl || !videoTrackingActive || paso !== "material") return;
    const timer = window.setInterval(() => {
      setWatchedSeconds((prev) => {
        if (prev >= duracionVideo) return prev;
        return prev + 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [duracionVideo, paso, sesion, videoTrackingActive]);

  function calcularResultados() {
    const total = preguntas.length || 1;
    const correctas = preguntas.filter((p) => respuestas[p.id] === p.correcta).length;
    const porcentaje = Math.round((correctas / total) * 100);
    const notaEscala7 = Math.round((1 + (porcentaje / 100) * 6) * 10) / 10;
    return { correctas, total, porcentaje, notaEscala7 };
  }

  function handleSubmitEvaluacion() {
    const resultado = calcularResultados();
    setNota(resultado.notaEscala7);
    setPaso("firma");
  }

  async function handleFirmaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!asignacion || !firma.trim()) return;
    setEnviando(true);
    setError(null);

    const { porcentaje, notaEscala7 } = calcularResultados();
    const notaFinal = requiereEvaluacion ? nota ?? notaEscala7 : null;
    const aprobado = requiereEvaluacion ? porcentaje >= minimoAprobacion : true;

    try {
      const updated = await avanzarCapacitacionAsignacionPublica(token, {
        estado: "completada",
        nota: notaFinal,
        aprobado,
        videoWatchPercent: watchPercent,
        observacion: `Firma electrónica registrada por ${firma.trim()}`,
      });
      setAsignacion(updated);
      setPaso("completado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar la firma");
    } finally {
      setEnviando(false);
    }
  }

  if (asignacion === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!asignacion || !capacitacion) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
          <div className="h-14 w-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7 text-slate-400" />
          </div>
          <h1 className="text-lg font-semibold text-slate-800">Enlace no válido</h1>
          <p className="text-sm text-slate-500">
            {error ?? "Este enlace de capacitación no existe o ya no está activo. Contacta a tu área de prevención."}
          </p>
        </div>
      </div>
    );
  }

  if ((asignacion.estado === "completada" || ["aprobada", "rechazada"].includes(asignacion.estado)) && paso !== "completado") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
          <div className={cn("h-14 w-14 rounded-full flex items-center justify-center mx-auto", asignacion.aprobado ? "bg-emerald-100" : "bg-rose-100")}>
            <CheckCircle2 className={cn("h-7 w-7", asignacion.aprobado ? "text-emerald-600" : "text-rose-500")} />
          </div>
          <h1 className="text-lg font-semibold text-slate-800">
            {asignacion.aprobado ? "Capacitación completada" : "Capacitación no aprobada"}
          </h1>
          <p className="text-sm text-slate-500">
            Ya registraste tu participación en <strong>{capacitacion.nombre}</strong>.
            {asignacion.nota !== undefined && ` Nota obtenida: ${asignacion.nota.toFixed(1)}.`}
          </p>
        </div>
      </div>
    );
  }

  const embedUrl = sesion?.videoUrl ? toYouTubeEmbed(sesion.videoUrl) : null;
  const canContinueMaterial = !sesion?.videoUrl || watchPercent >= minWatchPct;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50/30 p-4 sm:p-6">
      <div className="max-w-lg mx-auto space-y-5">
        <div className="text-center pt-4 pb-2">
          <span className="text-sm font-semibold tracking-widest text-cyan-600 uppercase">NEXTPREV</span>
          <p className="text-xs text-slate-400 mt-0.5">Sistema de Gestión de Prevención</p>
        </div>

        {paso !== "completado" && <ProgressBar paso={paso} />}

        {paso === "bienvenida" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-center h-14 w-14 bg-cyan-100 rounded-xl mx-auto">
              <BookOpen className="h-7 w-7 text-cyan-700" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-lg font-semibold text-slate-800">{capacitacion.nombre}</h1>
              <p className="text-xs text-slate-400 font-mono">{capacitacion.codigo}</p>
              {sesion?.titulo && <p className="text-xs text-slate-500">Sesión: {sesion.titulo}</p>}
            </div>
            {capacitacion.descripcion && (
              <p className="text-sm text-slate-600 text-center">{capacitacion.descripcion}</p>
            )}
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {capacitacion.duracionHoras}h
              </span>
              {requiereEvaluacion && <span className="text-blue-600 font-medium">Incluye evaluación</span>}
              {capacitacion.generaCertificado && <span className="text-emerald-600 font-medium">Genera certificado</span>}
            </div>
            <button
              onClick={() => {
                void (async () => {
                  try {
                    setError(null);
                    const updated = await avanzarCapacitacionAsignacionPublica(token, { estado: "en_progreso" });
                    setAsignacion(updated);
                    setPaso("material");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Error al iniciar la capacitación");
                  }
                })();
              }}
              className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 transition-colors"
            >
              Comenzar capacitación
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {paso === "material" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
            <h2 className="text-base font-semibold text-slate-800 text-center">Material de capacitación</h2>
            <p className="text-sm text-slate-500 text-center">
              Revisa todo el material antes de continuar con la evaluación y firma.
            </p>

            <div className="space-y-3">
              {capacitacion.materialUrl ? (
                <a
                  href={capacitacion.materialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:border-cyan-300 hover:bg-cyan-50/40 transition-colors"
                >
                  <FileText className="h-5 w-5 text-cyan-600 shrink-0" />
                  <span className="flex-1">Material de estudio</span>
                  <span className="text-xs text-slate-400">Abrir</span>
                </a>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                  El responsable de prevención entregará el material por correo o presencialmente.
                </div>
              )}

              {sesion?.videoUrl && (
                <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Video className="h-4 w-4 text-rose-500" />
                    Video de capacitación
                  </div>

                  {embedUrl ? (
                    <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200">
                      <iframe
                        src={embedUrl}
                        title="Video capacitación"
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <a
                      href={sesion.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-cyan-700 underline"
                    >
                      Abrir video en nueva pestaña
                    </a>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Visualización registrada: {watchPercent}%</span>
                      <span>Mínimo requerido: {minWatchPct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 transition-all"
                        style={{ width: `${watchPercent}%` }}
                      />
                    </div>
                  </div>

                  {!videoTrackingActive ? (
                    <button
                      type="button"
                      onClick={() => setVideoTrackingActive(true)}
                      className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-medium text-cyan-700"
                    >
                      Iniciar registro de visualización
                    </button>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Registro activo. Mantén abierto el video hasta completar el porcentaje mínimo.
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setPaso(requiereEvaluacion ? "evaluacion" : "firma")}
              disabled={!canContinueMaterial}
              className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 transition-colors"
            >
              {requiereEvaluacion ? "Ir a la evaluación" : "Ir a la firma"}
            </button>
          </div>
        )}

        {paso === "evaluacion" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="text-center">
              <h2 className="text-base font-semibold text-slate-800">Mini test</h2>
              <p className="text-sm text-slate-400 mt-0.5">Responde las {preguntas.length} preguntas de la sesión</p>
            </div>
            <div className="space-y-6">
              {preguntas.map((p, pi) => (
                <div key={p.id} className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">
                    <span className="text-cyan-600 font-semibold mr-1">{pi + 1}.</span>
                    {p.texto}
                  </p>
                  <div className="space-y-2">
                    {p.opciones.map((op, oi) => (
                      <label
                        key={oi}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all text-sm",
                          respuestas[p.id] === oi
                            ? "border-cyan-400 bg-cyan-50 text-cyan-800"
                            : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                        )}
                      >
                        <input
                          type="radio"
                          name={`pregunta-${p.id}`}
                          value={oi}
                          checked={respuestas[p.id] === oi}
                          onChange={() => setRespuestas((r) => ({ ...r, [p.id]: oi }))}
                          className="accent-cyan-600"
                        />
                        {op}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleSubmitEvaluacion}
              disabled={Object.keys(respuestas).length < preguntas.length}
              className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 transition-colors"
            >
              Enviar evaluación
            </button>
          </div>
        )}

        {paso === "firma" && (
          <form
            onSubmit={handleFirmaSubmit}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5"
          >
            <div className="text-center space-y-1">
              <h2 className="text-base font-semibold text-slate-800">Confirmación y firma</h2>
              {requiereEvaluacion && nota !== null && (
                <div
                  className={cn(
                    "inline-block px-4 py-1.5 rounded-full text-sm font-semibold mt-1",
                    nota >= 4 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                  )}
                >
                  Nota: {nota.toFixed(1)}
                </div>
              )}
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-600 leading-relaxed">
              Declaro que revisé el material de capacitación <strong>{capacitacion.nombre}</strong> y que comprendo
              los contenidos presentados. Mi firma electrónica confirma mi participación.
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 block">Nombre completo (como firma)</label>
              <input
                type="text"
                value={firma}
                onChange={(e) => setFirma(e.target.value)}
                placeholder="Escribe tu nombre completo"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition"
              />
            </div>
            <button
              type="submit"
              disabled={!firma.trim() || enviando}
              className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 transition-colors flex items-center justify-center gap-2"
            >
              {enviando ? (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" /> Confirmar y firmar
                </>
              )}
            </button>
          </form>
        )}

        {paso === "completado" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-5">
            <div
              className={cn(
                "h-16 w-16 rounded-full flex items-center justify-center mx-auto",
                (nota ?? 0) >= 4 ? "bg-emerald-100" : "bg-amber-100",
              )}
            >
              <CheckCircle2 className={cn("h-8 w-8", (nota ?? 0) >= 4 ? "text-emerald-600" : "text-amber-600")} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Capacitación completada</h1>
              <p className="text-sm text-slate-500 mt-1">
                Tu participación fue registrada exitosamente. El área de prevención puede revisar el resultado en
                el sistema.
              </p>
            </div>
            {requiereEvaluacion && nota !== null && (
              <div
                className={cn(
                  "inline-block px-5 py-2 rounded-full text-sm font-semibold",
                  nota >= 4 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                )}
              >
                Nota obtenida: {nota.toFixed(1)}
              </div>
            )}
            <p className="text-xs text-slate-400 pt-2">Puedes cerrar esta ventana.</p>
          </div>
        )}

        <p className="text-center text-xs text-slate-300 pb-6">NEXTPREV © 2026 · Gestión de Prevención de Riesgos</p>
      </div>
    </div>
  );
}
