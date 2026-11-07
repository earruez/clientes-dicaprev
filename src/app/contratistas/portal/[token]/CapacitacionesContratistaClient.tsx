"use client";

import { useState } from "react";
import { ClipboardList, FileCheck2, FilePlus2, GraduationCap, UploadCloud } from "lucide-react";
import { DOCUMENTO_ACCEPT } from "@/lib/documentacion/archivo-documento";
import { validarArchivoPortal } from "@/lib/contratistas/validacion-carga";
import {
  DS44_CAPACITACION_BASE, DS44_CONTENIDOS, CAPACITACIONES_SEGUN_RIESGO,
  TIPOS_ACTIVIDAD_CONTRATISTA, TEMAS_ACTIVIDAD_CONTRATISTA, resumenCursoDs44,
  validarActividadFormativa, type ActividadFormativaEntrada,
} from "@/lib/contratistas/capacitaciones-ds44";
import { obtenerPortalContratista } from "@/actions/contratistas/portal";

type Portal = NonNullable<Awaited<ReturnType<typeof obtenerPortalContratista>>>;
type Registro = Portal["actividadesFormativas"][number];

const campo = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500";
const fechaChile = (fecha: Date | string) => new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric",
}).format(new Date(fecha));

export default function CapacitacionesContratistaClient({
  token, trabajador, actividades, onSaved,
}: {
  token: string;
  trabajador: { id: string; nombre: string; cargo: string | null };
  actividades: Registro[];
  onSaved: () => Promise<void>;
}) {
  const [tipo, setTipo] = useState("charla");
  const [temaCodigo, setTemaCodigo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [duracionMinutos, setDuracionMinutos] = useState("");
  const [relator, setRelator] = useState("");
  const [ds44, setDs44] = useState(false);
  const [contenidos, setContenidos] = useState<string[]>([]);
  const [evaluacion, setEvaluacion] = useState("no_informada");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const registros = actividades.filter((r) => r.recursoId === trabajador.id);
  const avance = resumenCursoDs44(registros);

  async function registrar() {
    if (procesando) return;
    setError(""); setExito("");
    const data: ActividadFormativaEntrada = {
      tipo, temaCodigo, titulo, fecha, duracionMinutos: Number(duracionMinutos),
      relator, vinculadaCursoDs44: ds44,
      contenidosDs44: ds44 ? contenidos : [], evaluacion,
    };
    const errorCampos = validarActividadFormativa(data);
    if (errorCampos) { setError(errorCampos); return; }
    const errorArchivo = validarArchivoPortal(archivo);
    if (errorArchivo) { setError(errorArchivo); return; }
    setProcesando(true);
    try {
      const form = new FormData();
      form.set("recursoId", trabajador.id);
      form.set("tipo", tipo);
      form.set("temaCodigo", temaCodigo);
      form.set("titulo", titulo.trim());
      form.set("fecha", fecha);
      form.set("duracionMinutos", String(data.duracionMinutos));
      form.set("relator", relator.trim());
      form.set("vinculadaCursoDs44", ds44 ? "true" : "false");
      form.set("contenidosDs44", JSON.stringify(data.contenidosDs44));
      form.set("evaluacion", evaluacion);
      if (archivo) form.set("file", archivo);
      const response = await fetch("/api/contratistas/portal/" + token + "/capacitaciones", {
        method: "POST", body: form,
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "No se pudo guardar la actividad (HTTP " + response.status + ").");
      await onSaved();
      setTitulo(""); setFecha(""); setDuracionMinutos(""); setRelator("");
      setTemaCodigo(""); setContenidos([]); setDs44(false); setArchivo(null);
      setEvaluacion("no_informada");
      setExito("Actividad registrada con su respaldo. La mandante debe revisar la evidencia.");
    } catch(e) {
      setError(e instanceof Error ? e.message : "No fue posible registrar la actividad.");
    } finally {
      setProcesando(false);
    }
  }

  return <div className="space-y-3">
    <details open className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold text-sky-950">
        <GraduationCap className="h-5 w-5 text-sky-700"/>
        01 · Capacitaciones obligatorias y exigidas por el cargo
      </summary>
      <div className="mt-3 space-y-3">
        <div className="rounded-xl border border-sky-100 bg-white p-3">
          <p className="text-sm font-bold text-slate-900">{DS44_CAPACITACION_BASE.nombre}</p>
          <p className="mt-1 text-xs text-slate-700">Mínimo {DS44_CAPACITACION_BASE.horasMinimas} horas en total; periodicidad definida por el programa preventivo, máximo {DS44_CAPACITACION_BASE.periodicidadMaxMeses} meses. Debe comprobarse asistencia, contenidos, evaluación y evidencia.</p>
          <p className="mt-2 text-xs font-medium text-slate-700">Respaldo validado: {avance.horas} de 8 horas · {avance.contenidos.filter((x) => x.cubierto).length} de {DS44_CONTENIDOS.length} materias cubiertas</p>
          <p className="mt-1 text-xs text-amber-800">{avance.evidenciaSuficienteParaRevision ? "Evidencia horaria y temática disponible para revisión integral de cumplimiento." : "Acreditación pendiente o incompleta. Registrar actividades no implica que el curso obligatorio esté acreditado."}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {avance.contenidos.map((i) =>
            <div key={i.codigo} className="flex items-start gap-2 rounded-lg border border-sky-100 bg-white p-2 text-xs text-slate-700">
              <span className={i.cubierto ? "font-bold text-emerald-700" : "text-amber-600"}>{i.cubierto ? "✓" : "○"}</span>
              <span>{i.nombre}</span>
            </div>)}
        </div>
        <details className="rounded-lg border border-sky-100 bg-white p-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-800">
            Capacitaciones adicionales según riesgos de {trabajador.cargo || "este cargo"}
          </summary>
          <p className="mt-2 text-xs text-slate-600">Son ejemplos condicionados por la MIPER, las tareas y otras normas aplicables. No todas son legalmente obligatorias para cada cargo.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">{CAPACITACIONES_SEGUN_RIESGO.map((item) => <li key={item.codigo}>{item.nombre}</li>)}</ul>
        </details>
        <p className="text-xs text-slate-500">Referencia: {DS44_CAPACITACION_BASE.referencia}. La IRL del artículo 15 es un requisito distinto del curso del artículo 16.</p>
      </div>
    </details>

    <details className="rounded-2xl border border-emerald-200 bg-white p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-900">
        <ClipboardList className="h-5 w-5 text-emerald-700"/>
        02 · Charlas, capacitaciones, difusiones y talleres
        <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">{registros.length} registrados</span>
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-xs text-slate-600">Selecciona el tipo y tema de la actividad realizada para {trabajador.nombre}. Cada registro requiere un respaldo, por ejemplo certificado o lista de asistencia.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-semibold text-slate-700">Tipo de actividad *
            <select className={campo} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_ACTIVIDAD_CONTRATISTA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-700">Tema *
            <select className={campo} value={temaCodigo} onChange={(e) => {
              setTemaCodigo(e.target.value);
              const seleccionado = TEMAS_ACTIVIDAD_CONTRATISTA.find((t) => t.value === e.target.value);
              if (seleccionado && seleccionado.value !== "otro") setTitulo(seleccionado.label);
            }}>
              <option value="">Selecciona un tema</option>
              {TEMAS_ACTIVIDAD_CONTRATISTA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-700">Título o actividad específica *
            <input className={campo} value={titulo} maxLength={180} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej.: Manejo seguro de herramientas"/>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-700">Fecha realizada *
            <input className={campo} type="date" value={fecha} max={new Date().toISOString().slice(0,10)} onChange={(e) => setFecha(e.target.value)}/>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-700">Duración en minutos *
            <input className={campo} type="number" min={5} max={2880} step={5} value={duracionMinutos} onChange={(e) => setDuracionMinutos(e.target.value)} placeholder="Ej.: 60"/>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-700">Relator o responsable *
            <input className={campo} value={relator} maxLength={160} onChange={(e) => setRelator(e.target.value)}/>
          </label>
        </div>
        <label className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs text-sky-900">
          <input type="checkbox" checked={ds44} onChange={(e) => setDs44(e.target.checked)} />
          Esta actividad forma parte del curso de prevención de riesgos del artículo 16 del DS 44
        </label>
        {ds44 && <div className="space-y-2 rounded-xl border border-sky-100 bg-white p-3">
          <p className="text-xs font-semibold text-slate-700">Contenidos efectivamente abordados (selecciona uno o más) *</p>
          <div className="grid gap-2 sm:grid-cols-2">{DS44_CONTENIDOS.map((c) =>
            <label key={c.codigo} className="flex items-start gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={contenidos.includes(c.codigo)} onChange={(e) =>
                setContenidos((prev) => e.target.checked ? [...prev,c.codigo] : prev.filter((x) => x !== c.codigo))}/>
              {c.nombre}
            </label>)}
          </div>
        </div>}
        <label className="block space-y-1 text-xs font-semibold text-slate-700">Evaluación del aprendizaje
          <select className={campo} value={evaluacion} onChange={(e) => setEvaluacion(e.target.value)}>
            <option value="no_informada">Sin resultado registrado</option>
            <option value="pendiente">Pendiente de evaluación</option>
            <option value="aprobada">Aprobada (adjuntar respaldo)</option>
            <option value="no_aplica">No aplica (actividad complementaria)</option>
          </select>
        </label>
        <label className="block space-y-1 text-xs font-semibold text-slate-700">
          Respaldo documental * (PDF, Word, Excel o imagen; máximo 4,5 MB)
          <input className={campo} type="file" accept={DOCUMENTO_ACCEPT} onChange={(e)=>setArchivo(e.target.files?.[0] || null)}/>
        </label>
        {archivo && <p className="text-xs text-slate-600">Seleccionado: {archivo.name} · {(archivo.size / 1e6).toFixed(2)} MB</p>}
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{error}</p>}
        {exito && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{exito}</p>}
        <button type="button" disabled={procesando} onClick={() => void registrar()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
          <FilePlus2 className="h-4 w-4"/>{procesando ? "Guardando registro…" : "Agregar actividad"}
        </button>
        <div className="border-t border-slate-100 pt-3">
          <h4 className="mb-2 text-sm font-semibold text-slate-900">Actividades registradas ({registros.length})</h4>
          {!registros.length && <p className="text-xs text-slate-500">Aún no hay actividades registradas para este trabajador.</p>}
          <div className="space-y-2">{registros.map((r) => {
            const clase = r.estado === "validada" ? "text-emerald-700" : r.estado === "observada" ? "text-rose-700" : "text-amber-800";
            return <div key={r.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900">{TIPOS_ACTIVIDAD_CONTRATISTA.find(t=>t.value===r.tipo)?.label || r.tipo} · {r.titulo}</p>
                  <p className="mt-1 text-xs text-slate-600">{fechaChile(r.fecha)} · {r.duracionMinutos} minutos · {r.relator}</p>
                </div>
                <span className={"text-xs font-semibold " + clase}>{r.estado === "validada" ? "Respaldo validado" : r.estado === "observada" ? "Observada" : "Pendiente de validación"}</span>
              </div>
              {r.observacionRevision && <p className="mt-2 text-xs text-rose-800">Observación: {r.observacionRevision}</p>}
              <a target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                href={"/api/contratistas/portal/" + token + "/capacitaciones?registroId=" + encodeURIComponent(r.id)}>
                <UploadCloud className="h-3.5 w-3.5"/>Ver respaldo: {r.archivoOriginal}
              </a>
              {r.vinculadaCursoDs44 && <span className="ml-3 inline-flex items-center gap-1 text-xs text-sky-700"><FileCheck2 className="h-3.5 w-3.5"/>Vinculada al artículo 16 (sujeta a revisión)</span>}
            </div>;
          })}</div>
        </div>
      </div>
    </details>
  </div>;
}
