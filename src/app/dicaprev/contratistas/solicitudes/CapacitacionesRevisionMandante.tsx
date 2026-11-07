"use client";

import { useState } from "react";
import { BookOpenCheck, ExternalLink } from "lucide-react";
import { listarSolicitudesContratistas, revisarActividadFormativaContratista } from "@/actions/contratistas/solicitudes";
import {
  DS44_CAPACITACION_BASE, DS44_CONTENIDOS, TIPOS_ACTIVIDAD_CONTRATISTA, resumenCursoDs44,
} from "@/lib/contratistas/capacitaciones-ds44";

type Expediente = Awaited<ReturnType<typeof listarSolicitudesContratistas>>[number];
type Actividad = Expediente["actividadesFormativas"][number];
const fecha = (d: Date | string) => new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago", dateStyle: "short", timeStyle: "short",
}).format(new Date(d));

export default function CapacitacionesRevisionMandante({
  actividades, recursoId, puedeEditar, onUpdated,
}: {
  actividades: Actividad[]; recursoId: string; puedeEditar: boolean; onUpdated: () => Promise<void>;
}) {
  const [procesando, setProcesando] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const registros = actividades.filter(r=>r.recursoId === recursoId);
  const avance = resumenCursoDs44(registros);

  async function revisar(r: Actividad, estado: "validada" | "observada") {
    if (procesando) return;
    let observacion = "";
    if (estado === "observada") {
      observacion = window.prompt("Indica por qué la evidencia debe corregirse:")?.trim() || "";
      if (observacion.length < 4) { setError("La observación requiere un motivo de al menos 4 caracteres."); return; }
    } else if (!window.confirm("¿Validar el respaldo de esta actividad? La validación no certifica por sí sola el cumplimiento integral del DS 44.")) {
      return;
    }
    setError(""); setAviso(""); setProcesando(r.id);
    try {
      await revisarActividadFormativaContratista({ actividadId: r.id, estado, observacion });
      await onUpdated();
      setAviso(estado === "validada" ? "Respaldo validado y registrado con auditoría." : "Actividad observada; aparecerá en el portal de la contratista.");
    } catch(e) {
      setError(e instanceof Error ? e.message : "No se pudo revisar la actividad.");
    } finally { setProcesando(""); }
  }

  return <details className="group/capacitaciones overflow-hidden rounded-xl border border-sky-200 bg-white">
    <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-3 text-sm font-semibold text-sky-900 sm:p-4">
      <BookOpenCheck className="h-5 w-5 text-sky-700"/>
      Capacitaciones exigidas y actividades ({registros.length})
      <span className="ml-auto text-xs text-slate-500">{registros.filter(r=>r.estado==="pendiente_validacion").length} por validar</span>
    </summary>
    <div className="space-y-3 border-t border-sky-100 p-3 sm:p-4">
      <div className="rounded-xl bg-sky-50 p-3 text-xs text-sky-950">
        <p className="font-bold">{DS44_CAPACITACION_BASE.nombre}</p>
        <p className="mt-1">Mínimo 8 horas y periodicidad máxima 24 meses. Evidencia revisada con evaluación aprobada: {avance.horas} h; materias cubiertas: {avance.contenidos.filter(x=>x.cubierto).length}/{DS44_CONTENIDOS.length}.</p>
        <p className="mt-1 text-sky-800">Los cursos específicos adicionales dependen de los riesgos del cargo y la MIPER. La aprobación de respaldos no sustituye la comprobación integral de los requisitos de capacitación.</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs text-rose-800">{error}</p>}
      {aviso && <p role="status" className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{aviso}</p>}
      {!registros.length && <p className="text-xs text-slate-600">La contratista aún no registró charlas, capacitaciones, difusiones o talleres para este trabajador.</p>}
      {registros.map((r) => <div key={r.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{TIPOS_ACTIVIDAD_CONTRATISTA.find(t=>t.value===r.tipo)?.label || r.tipo} · {r.titulo}</p>
            <p className="mt-1 text-xs text-slate-600">{fecha(r.fecha)} · {r.duracionMinutos} minutos · {r.relator}</p>
            <p className="mt-1 text-xs text-slate-600">Evaluación: {r.evaluacion.replaceAll("_", " ")} · {r.vinculadaCursoDs44 ? "Declarada para art. 16 DS 44" : "Actividad adicional"}</p>
          </div>
          <span className={"text-xs font-semibold "+(r.estado==="validada"?"text-emerald-800":r.estado==="observada"?"text-rose-800":"text-amber-800")}>
            {r.estado==="validada"?"Respaldo validado":r.estado==="observada"?"Observada":"Pendiente de validación"}
          </span>
        </div>
        {r.observacionRevision && <p className="text-xs text-rose-800">Motivo: {r.observacionRevision}</p>}
        <a className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
          href={"/api/dicaprev/contratistas/capacitaciones?actividadId="+encodeURIComponent(r.id)}
          target="_blank" rel="noopener noreferrer">
          Ver respaldo: {r.archivoOriginal} <ExternalLink className="h-3 w-3"/>
        </a>
        {puedeEditar && <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" disabled={!!procesando || r.estado==="validada"} onClick={()=>void revisar(r,"validada")}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Validar respaldo</button>
          <button type="button" disabled={!!procesando || r.estado==="observada"} onClick={()=>void revisar(r,"observada")}
            className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-900 disabled:opacity-40">Observar</button>
        </div>}
        {r.historial.length > 0 && <details className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
          <summary className="cursor-pointer font-medium">Historial de revisión ({r.historial.length})</summary>
          <div className="mt-2 space-y-1">{r.historial.map(h=>
            <p key={h.id}>{fecha(h.createdAt)} · {h.estadoAnterior} → {h.estadoNuevo} · Revisor: {h.usuarioId}{h.motivo?" · "+h.motivo:""}</p>
          )}</div>
        </details>}
      </div>)}
    </div>
  </details>;
}
