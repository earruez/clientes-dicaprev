"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  getAsignacionByToken,
  getCapacitacionById,
  updateAsignacion,
} from "@/lib/capacitacion/capacitacion-store";
import { registrarAccion } from "@/lib/auditoria/audit-store";
import type { AsignacionCapacitacion, Capacitacion } from "@/lib/capacitacion/capacitacion-store";
import { CheckCircle2, BookOpen, Video, FileText, Clock, AlertTriangle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Simple mock test (same for every capacitacion for now) ─────────────── //
interface Pregunta {
  id: number;
  texto: string;
  opciones: string[];
  correcta: number;
}

const PREGUNTAS_MOCK: Pregunta[] = [
  {
    id: 1,
    texto: "¿Cuál es la principal medida de prevención en el trabajo?",
    opciones: ["Usar EPP adecuado", "Trabajar más rápido", "Ignorar las señales", "Evitar el uso de herramientas"],
    correcta: 0,
  },
  {
    id: 2,
    texto: "¿Qué debe hacer ante un accidente en el lugar de trabajo?",
    opciones: ["Ignorarlo", "Avisar al supervisor inmediatamente", "Continuar trabajando", "Esperar al día siguiente"],
    correcta: 1,
  },
  {
    id: 3,
    texto: "¿Con qué frecuencia debe revisarse el equipo de protección personal?",
    opciones: ["Cada año", "Solo cuando se rompe", "Antes de cada uso", "Una vez al mes"],
    correcta: 2,
  },
];

type Paso = "bienvenida" | "material" | "evaluacion" | "firma" | "completado";

function ProgressBar({ paso }: { paso: Paso }) {
  const pasos: Paso[] = ["bienvenida", "material", "evaluacion", "firma", "completado"];
  const idx = pasos.indexOf(paso);
  return (
    <div className="flex items-center gap-1 mb-6">
      {pasos.slice(0, -1).map((p, i) => (
        <React.Fragment key={p}>
          <div className={cn(
            "h-2 flex-1 rounded-full transition-all duration-300",
            i < idx ? "bg-cyan-500" : i === idx ? "bg-cyan-300" : "bg-slate-200"
          )} />
        </React.Fragment>
      ))}
    </div>
  );
}

export default function ExternaPage() {
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : Array.isArray(params?.token) ? params.token[0] : "";

  const [asignacion, setAsignacion] = useState<AsignacionCapacitacion | null | undefined>(undefined);
  const [capacitacion, setCapacitacion] = useState<Capacitacion | null>(null);
  const [paso, setPaso] = useState<Paso>("bienvenida");
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [firma, setFirma] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [nota, setNota] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    const asig = getAsignacionByToken(token);
    setAsignacion(asig ?? null);
    if (asig) {
      const cap = getCapacitacionById(asig.capacitacionId);
      setCapacitacion(cap ?? null);
      if (asig.estado === "en_proceso") {
        // already opened
      } else if (asig.estado === "enviada") {
        updateAsignacion(asig.id, { estado: "en_proceso", fechaInicio: new Date().toISOString().slice(0, 10) });
      }
    }
  }, [token]);

  function calcularNota() {
    const correctas = PREGUNTAS_MOCK.filter((p) => respuestas[p.id] === p.correcta).length;
    return Math.round((correctas / PREGUNTAS_MOCK.length) * 7 * 10) / 10;
  }

  function handleSubmitEvaluacion() {
    const n = calcularNota();
    setNota(n);
    setPaso("firma");
  }

  async function handleFirmaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!asignacion || !firma.trim()) return;
    setEnviando(true);

    const notaFinal = nota ?? calcularNota();
    const aprobado = notaFinal >= 4;

    updateAsignacion(asignacion.id, {
      estado: aprobado ? "aprobada" : "rechazada",
      nota: notaFinal,
      aprobado,
      fechaRespuesta: new Date().toISOString().slice(0, 10),
    });

    registrarAccion({
      accion: "cambiar_estado",
      modulo: "capacitacion",
      entidadTipo: "Asignación",
      entidadId: asignacion.id,
      descripcion: `Trabajador completó capacitación vía enlace externo. Nota: ${notaFinal.toFixed(1)} — ${aprobado ? "Aprobado" : "Reprobado"}`,
    });

    setPaso("completado");
    setEnviando(false);
  }

  // ── Loading ──────────────────────────────────────────────────────────── //
  if (asignacion === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not found / expired ──────────────────────────────────────────────── //
  if (!asignacion || !capacitacion) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
          <div className="h-14 w-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7 text-slate-400" />
          </div>
          <h1 className="text-lg font-semibold text-slate-800">Enlace no válido</h1>
          <p className="text-sm text-slate-500">Este enlace de capacitación no existe o ya no está activo. Contacta a tu area de prevención.</p>
        </div>
      </div>
    );
  }

  // ── Already completed ────────────────────────────────────────────────── //
  if (["aprobada", "rechazada"].includes(asignacion.estado) && paso !== "completado") {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50/30 p-4 sm:p-6">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Brand header */}
        <div className="text-center pt-4 pb-2">
          <span className="text-sm font-semibold tracking-widest text-cyan-600 uppercase">NEXTPREV</span>
          <p className="text-xs text-slate-400 mt-0.5">Sistema de Gestión de Prevención</p>
        </div>

        {/* Progress */}
        {paso !== "completado" && <ProgressBar paso={paso} />}

        {/* ── Bienvenida ─────────────────────────────────────────────────── */}
        {paso === "bienvenida" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-center h-14 w-14 bg-cyan-100 rounded-xl mx-auto">
              <BookOpen className="h-7 w-7 text-cyan-700" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-lg font-semibold text-slate-800">{capacitacion.nombre}</h1>
              <p className="text-xs text-slate-400 font-mono">{capacitacion.codigo}</p>
            </div>
            {capacitacion.descripcion && (
              <p className="text-sm text-slate-600 text-center">{capacitacion.descripcion}</p>
            )}
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{capacitacion.duracionHoras}h</span>
              {capacitacion.requiereEvaluacion && <span className="flex items-center gap-1 text-blue-600 font-medium">Incluye evaluación</span>}
              {capacitacion.generaCertificado && <span className="flex items-center gap-1 text-emerald-600 font-medium">Genera certificado</span>}
            </div>
            <button
              onClick={() => {
                updateAsignacion(asignacion.id, { estado: "en_proceso" });
                setPaso("material");
              }}
              className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 transition-colors"
            >
              Comenzar capacitación
            </button>
          </div>
        )}

        {/* ── Material ───────────────────────────────────────────────────── */}
        {paso === "material" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
            <h2 className="text-base font-semibold text-slate-800 text-center">Material de capacitación</h2>
            <p className="text-sm text-slate-500 text-center">
              Revisa el material antes de responder la evaluación. Tómate el tiempo necesario.
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
                  <span className="text-xs text-slate-400">Abrir →</span>
                </a>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                  El responsable de prevención entregará el material de forma presencial o por correo.
                </div>
              )}
              {capacitacion.videoUrl && (
                <a
                  href={capacitacion.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:border-cyan-300 hover:bg-cyan-50/40 transition-colors"
                >
                  <Video className="h-5 w-5 text-rose-500 shrink-0" />
                  <span className="flex-1">Video capacitación</span>
                  <span className="text-xs text-slate-400">Ver →</span>
                </a>
              )}
            </div>
            <button
              onClick={() => setPaso(capacitacion.requiereEvaluacion ? "evaluacion" : "firma")}
              className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 transition-colors"
            >
              {capacitacion.requiereEvaluacion ? "Ir a la evaluación" : "Ir a la firma"}
            </button>
          </div>
        )}

        {/* ── Evaluación ─────────────────────────────────────────────────── */}
        {paso === "evaluacion" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="text-center">
              <h2 className="text-base font-semibold text-slate-800">Evaluación</h2>
              <p className="text-sm text-slate-400 mt-0.5">Selecciona la respuesta correcta en cada pregunta</p>
            </div>
            <div className="space-y-6">
              {PREGUNTAS_MOCK.map((p, pi) => (
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
                            : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
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
              disabled={Object.keys(respuestas).length < PREGUNTAS_MOCK.length}
              className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 transition-colors"
            >
              Enviar evaluación
            </button>
          </div>
        )}

        {/* ── Firma ──────────────────────────────────────────────────────── */}
        {paso === "firma" && (
          <form onSubmit={handleFirmaSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-base font-semibold text-slate-800">Confirmación y firma</h2>
              {nota !== null && (
                <div className={cn("inline-block px-4 py-1.5 rounded-full text-sm font-semibold mt-1", nota >= 4 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                  Nota: {nota.toFixed(1)} — {nota >= 4 ? "Aprobado" : "Reprobado"}
                </div>
              )}
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-600 leading-relaxed">
              Declaro que he revisado el material de capacitación <strong>{capacitacion.nombre}</strong> y entiendo los contenidos presentados. Mi firma electrónica a continuación es una confirmación de mi participación.
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 block">Nombre completo (como firma)</label>
              <input
                type="text"
                value={firma}
                onChange={(e) => setFirma(e.target.value)}
                placeholder="Escribe tu nombre completo…"
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
                <><Send className="h-4 w-4" /> Confirmar y firmar</>
              )}
            </button>
          </form>
        )}

        {/* ── Completado ─────────────────────────────────────────────────── */}
        {paso === "completado" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-5">
            <div className={cn("h-16 w-16 rounded-full flex items-center justify-center mx-auto", (nota ?? 0) >= 4 ? "bg-emerald-100" : "bg-amber-100")}>
              <CheckCircle2 className={cn("h-8 w-8", (nota ?? 0) >= 4 ? "text-emerald-600" : "text-amber-600")} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">
                {(nota ?? 0) >= 4 ? "¡Capacitación completada!" : "Registro guardado"}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {(nota ?? 0) >= 4
                  ? "Tu participación ha sido registrada exitosamente. El área de prevención puede verificarlo en el sistema."
                  : "Tu participación fue registrada. El área de prevención tomará contacto contigo si es necesario."}
              </p>
            </div>
            {nota !== null && (
              <div className={cn("inline-block px-5 py-2 rounded-full text-sm font-semibold", nota >= 4 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
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
