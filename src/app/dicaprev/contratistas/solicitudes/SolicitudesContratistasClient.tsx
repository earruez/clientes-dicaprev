"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, ClipboardCheck, FileText, Mail, Plus, RefreshCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { getContratistas, type ContratistaRow } from "@/actions/contratistas";
import {
  agregarRequisitoContratista, cambiarObligatoriedadContratista, cerrarExpedienteContratista,
  crearSolicitudContratista, invitarContratista, listarSolicitudesContratistas, revisarRequisitoContratista,
} from "@/actions/contratistas/solicitudes";
import { REQUISITOS_EMPRESA, estadoEfectivo } from "@/lib/contratistas/requisitos";

type Expediente = Awaited<ReturnType<typeof listarSolicitudesContratistas>>[number];
const CAMPO = "block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-sky-600 focus:outline-none";
const ESTADOS: Record<string, string> = {
  borrador: "Borrador", enviada: "Invitación enviada", en_revision: "En revisión",
  observada: "Con observaciones", aprobada: "Documentación aprobada", cerrada: "Cerrado",
};
const CLASES: Record<string, string> = {
  pendiente: "bg-slate-100 text-slate-700",
  en_revision: "bg-amber-100 text-amber-800",
  aprobado: "bg-emerald-100 text-emerald-800",
  observado: "bg-orange-100 text-orange-800",
  rechazado: "bg-red-100 text-red-800",
  vencido: "bg-red-100 text-red-800",
};
const ESTADOS_DOC: Record<string, string> = {
  pendiente: "Pendiente", en_revision: "En revisión", aprobado: "Aprobado",
  observado: "Observado", rechazado: "Rechazado", vencido: "Vencido",
};
const CATEGORIAS: Record<string, string> = {
  empresa: "Empresa", trabajador: "Trabajadores", vehiculo: "Vehículos", equipo: "Equipos",
};
function fechaCorta(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-CL", { timeZone: "UTC" });
}
function estadoExpediente(s: Expediente) {
  if (s.estado === "aprobada" && s.totalObligatorios !== s.aprobados) return "Requiere actualización";
  return ESTADOS[s.estado] || s.estado;
}

export default function SolicitudesContratistasClient() {
  const [contratistas, setContratistas] = useState<ContratistaRow[]>([]);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [actualId, setActualId] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({
    contratistaId: "", nombre: "", faena: "", servicio: "", contactoEmail: "",
    responsable: "", dotacionEstimada: "", fechaInicio: "", fechaTermino: "",
  });
  const [seleccionados, setSeleccionados] = useState<string[]>(
    REQUISITOS_EMPRESA.filter((r) => r.obligatorio).map((r) => r.clave),
  );
  const [agregando, setAgregando] = useState(false);
  const [extra, setExtra] = useState({ nombre: "", categoria: "empresa", recursoId: "", obligatorio: true });
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const actual = useMemo(() => expedientes.find((s) => s.id === actualId) || null, [expedientes, actualId]);
  const puedeEditar = !!actual && actual.estado !== "cerrada";

  async function cargar(primera = false) {
    if (primera) setCargando(true);
    try {
      const [c, solicitudes] = await Promise.all([getContratistas(), listarSolicitudesContratistas()]);
      setContratistas(c);
      setExpedientes(solicitudes);
      setActualId((prev) => prev && solicitudes.some((s) => s.id === prev) ? prev : solicitudes[0]?.id || "");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los expedientes");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { void cargar(true); }, []);

  async function ejecutar(accion: () => Promise<unknown>, exito: string) {
    if (procesando) return;
    setProcesando(true); setError(""); setAviso("");
    try {
      await accion();
      setAviso(exito);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la operación");
    } finally {
      setProcesando(false);
    }
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (procesando) return;
    setProcesando(true); setError(""); setAviso("");
    try {
      const creado = await crearSolicitudContratista({
        ...form, dotacionEstimada: form.dotacionEstimada ? Number(form.dotacionEstimada) : undefined,
        requisitos: seleccionados,
      });
      setNuevo(false);
      setForm({ contratistaId: "", nombre: "", faena: "", servicio: "", contactoEmail: "", responsable: "", dotacionEstimada: "", fechaInicio: "", fechaTermino: "" });
      await cargar();
      setActualId(creado.id);
      setAviso("Expediente creado. Revisa los requisitos y envía la invitación.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el expediente");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <main className="min-h-screen min-w-0 bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <StandardPageHeader
          moduleLabel="Contratistas · Empresa mandante"
          title="Solicitudes documentales"
          description="Solicita antecedentes, revisa documentos y controla vencimientos por contrato o faena. Independiente de Acreditaciones."
          icon={<ClipboardCheck className="h-6 w-6" />}
          iconWrapClassName="bg-sky-700"
          actions={<div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild className="rounded-xl"><Link href="/dicaprev/contratistas"><ArrowLeft className="mr-2 h-4 w-4"/>Contratistas</Link></Button>
            <Button className="rounded-xl bg-sky-700 text-white hover:bg-sky-800" onClick={() => setNuevo((x) => !x)}><Plus className="mr-2 h-4 w-4"/>Nuevo expediente</Button>
          </div>}
        />

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {aviso && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{aviso}</p>}

        {nuevo && (
          <form onSubmit={crear} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Nuevo contrato o faena</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1.5"><Label>Empresa contratista *</Label>
                <select required className={CAMPO} value={form.contratistaId} onChange={(e) => {
                  const id = e.target.value;
                  const c = contratistas.find((item) => item.id === id);
                  setForm((prev) => ({ ...prev, contratistaId: id, contactoEmail: c?.email || "" }));
                }}>
                  <option value="">Selecciona empresa</option>
                  {contratistas.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.rut ? ` · ${c.rut}` : ""}</option>)}
                </select>
                <span className="text-xs text-slate-500">Si no aparece, crea la empresa en Gestión contratistas.</span>
              </label>
              <label className="space-y-1.5"><Label>Nombre del expediente *</Label><Input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Instalaciones edificio A" /></label>
              <label className="space-y-1.5"><Label>Centro o faena</Label><Input value={form.faena} onChange={(e) => setForm({ ...form, faena: e.target.value })} /></label>
              <label className="space-y-1.5"><Label>Servicio contratado</Label><Input value={form.servicio} onChange={(e) => setForm({ ...form, servicio: e.target.value })} /></label>
              <label className="space-y-1.5"><Label>Correo del contratista *</Label><Input type="email" required value={form.contactoEmail} onChange={(e) => setForm({ ...form, contactoEmail: e.target.value })} /></label>
              <label className="space-y-1.5"><Label>Responsable en faena</Label><Input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} /></label>
              <label className="space-y-1.5"><Label>Dotación estimada</Label><Input type="number" min="0" value={form.dotacionEstimada} onChange={(e) => setForm({ ...form, dotacionEstimada: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5"><Label>Inicio</Label><Input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}/></label>
                <label className="space-y-1.5"><Label>Término</Label><Input type="date" value={form.fechaTermino} onChange={(e) => setForm({ ...form, fechaTermino: e.target.value })}/></label>
              </div>
            </div>
            <fieldset className="rounded-xl border border-slate-200 p-3 sm:p-4">
              <legend className="px-2 text-sm font-semibold text-slate-800">Documentos iniciales solicitados</legend>
              <p className="mb-3 text-xs text-slate-500">Adapta los requisitos al contrato y riesgos. Puedes agregar otros más adelante.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {REQUISITOS_EMPRESA.map((r) => <label key={r.clave} className="flex items-start gap-2 text-sm text-slate-700">
                  <input className="mt-1 accent-sky-700" type="checkbox" checked={seleccionados.includes(r.clave)} onChange={(e) => setSeleccionados((prev) => e.target.checked ? [...prev, r.clave] : prev.filter((x) => x !== r.clave))} />
                  <span>{r.nombre}</span>
                </label>)}
              </div>
            </fieldset>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={procesando} className="bg-sky-700 text-white">Crear expediente</Button>
              <Button type="button" variant="outline" onClick={() => setNuevo(false)}>Cancelar</Button>
            </div>
          </form>
        )}

        {cargando ? <p className="py-10 text-center text-slate-500">Cargando expedientes…</p> : (
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="min-w-0 space-y-2">
              <div className="flex items-center justify-between px-1"><h2 className="text-sm font-semibold text-slate-700">Contratos ({expedientes.length})</h2><button title="Actualizar" onClick={() => void cargar()} className="text-sky-700"><RefreshCcw className="h-4 w-4"/></button></div>
              {expedientes.length === 0 && <p className="rounded-xl border bg-white p-4 text-sm text-slate-500">No hay expedientes. Crea el primero.</p>}
              {expedientes.map((s) => <button key={s.id} onClick={() => { setActualId(s.id); setAviso(""); }} className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${actualId === s.id ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                <strong className="block break-words text-sm text-slate-900">{s.contratista.nombre}</strong>
                <p className="mt-1 text-xs text-slate-600">{s.nombre}</p>
                <p className="mt-2 text-xs font-medium text-sky-700">{estadoExpediente(s)} · {s.porcentaje}%</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-sky-600" style={{ width: `${s.porcentaje}%` }} /></div>
              </button>)}
            </aside>
            {actual && <section className="min-w-0 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-semibold text-slate-900">{actual.nombre}</h2>
                    <p className="mt-1 text-sm text-slate-600"><Building2 className="mr-1 inline h-4 w-4"/>{actual.contratista.nombre} · {actual.faena || "Sin faena definida"}</p>
                    <p className="mt-1 text-xs text-slate-500">{actual.servicio || "Servicio no especificado"} · {fechaCorta(actual.fechaInicio)} a {fechaCorta(actual.fechaTermino)}</p>
                    <p className="mt-2 text-sm font-medium text-slate-700">{estadoExpediente(actual)} · {actual.aprobados}/{actual.totalObligatorios} requisitos obligatorios aprobados</p>
                    <p className="mt-1 text-xs text-slate-500">Contacto: {actual.contactoEmail} · Recursos registrados: {actual.recursos.length}</p>
                  </div>
                  {puedeEditar && <div className="flex flex-wrap gap-2">
                    <Button disabled={procesando} className="bg-sky-700 text-white" onClick={() => void ejecutar(() => invitarContratista(actual.id), "Correo de invitación enviado al contratista.")}><Mail className="mr-2 h-4 w-4"/>{actual.invitadoAt ? "Reenviar invitación" : "Invitar contratista"}</Button>
                    <Button variant="outline" disabled={procesando} onClick={() => { if (window.confirm("¿Cerrar el expediente e invalidar el acceso externo?")) void ejecutar(() => cerrarExpedienteContratista(actual.id), "Expediente cerrado."); }}><XCircle className="mr-2 h-4 w-4"/>Cerrar</Button>
                  </div>}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h3 className="text-base font-semibold text-slate-800">Control documental por recurso</h3>
                <p className="mt-1 text-xs text-slate-500">La documentación completa no reemplaza la autorización de ingreso a faena, que debe conceder la mandante.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {actual.recursos.length === 0 && <p className="text-sm text-slate-500">El contratista aún no registra trabajadores, vehículos ni equipos.</p>}
                  {actual.recursos.map((recurso) => {
                    const docsRecurso = actual.requisitos.filter((r) => r.recursoId === recurso.id && r.obligatorio);
                    const docsEmpresa = actual.requisitos.filter((r) => r.categoria === "empresa" && r.obligatorio);
                    const todos = [...docsEmpresa, ...docsRecurso];
                    const correctos = todos.filter((r) => estadoEfectivo(r.estado, r.fechaVencimiento) === "aprobado").length;
                    const listo = todos.length > 0 && correctos === todos.length;
                    return <div key={recurso.id} className="flex min-w-0 items-start justify-between gap-2 rounded-xl border border-slate-200 p-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-slate-900">{recurso.nombre}</p>
                        <p className="text-xs text-slate-500">{recurso.tipo} · {recurso.patente || recurso.identificador || recurso.cargo || "Sin identificador"}</p>
                        <p className="mt-1 text-xs text-slate-500">{correctos}/{todos.length} documentos obligatorios aprobados</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${listo ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{listo ? "Documentalmente conforme" : "No conforme"}</span>
                    </div>;
                  })}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-800">Requisitos y revisión</h3>
                  {puedeEditar && <Button variant="outline" size="sm" onClick={() => setAgregando((x) => !x)}><Plus className="mr-1 h-4 w-4"/>Agregar requisito</Button>}
                </div>
                {agregando && puedeEditar && <form className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2" onSubmit={(e) => {
                  e.preventDefault();
                  void ejecutar(async () => {
                    await agregarRequisitoContratista({
                      solicitudId: actual.id, nombre: extra.nombre,
                      categoria: extra.categoria as "empresa" | "trabajador" | "vehiculo" | "equipo",
                      recursoId: extra.recursoId || undefined, obligatorio: extra.obligatorio,
                    });
                    setExtra({ nombre: "", categoria: "empresa", recursoId: "", obligatorio: true });
                    setAgregando(false);
                  }, "Requisito agregado.");
                }}>
                  <label className="space-y-1"><Label>Documento *</Label><Input required value={extra.nombre} onChange={(e) => setExtra({ ...extra, nombre: e.target.value })}/></label>
                  <label className="space-y-1"><Label>Categoría</Label><select className={CAMPO} value={extra.categoria} onChange={(e) => setExtra({ ...extra, categoria: e.target.value, recursoId: "" })}>{Object.entries(CATEGORIAS).map(([key,val]) => <option key={key} value={key}>{val}</option>)}</select></label>
                  {extra.categoria !== "empresa" && <label className="space-y-1"><Label>Recurso</Label><select className={CAMPO} required value={extra.recursoId} onChange={(e) => setExtra({ ...extra, recursoId: e.target.value })}><option value="">Selecciona un recurso</option>{actual.recursos.filter((r) => r.tipo === extra.categoria).map((r) => <option key={r.id} value={r.id}>{r.nombre} {r.patente || r.identificador || ""}</option>)}</select></label>}
                  <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={extra.obligatorio} onChange={(e) => setExtra({ ...extra, obligatorio: e.target.checked })}/>Obligatorio</label>
                  <Button type="submit" disabled={procesando} className="bg-sky-700 text-white">Guardar requisito</Button>
                </form>}
                {Object.entries(CATEGORIAS).map(([key, label]) => {
                  const docs = actual.requisitos.filter((r) => r.categoria === key);
                  if (!docs.length) return null;
                  return <div key={key} className="mt-5 space-y-3">
                    <h4 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-700">{label} ({docs.length})</h4>
                    {docs.map((d) => {
                      const estado = estadoEfectivo(d.estado, d.fechaVencimiento);
                      return <div key={d.id} className="min-w-0 rounded-xl border border-slate-200 p-3 sm:p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-medium text-slate-900">{d.nombre}</p>
                            {d.recurso && <p className="text-xs text-slate-500">{d.recurso.nombre} · {d.recurso.patente || d.recurso.identificador || "Sin identificador"}</p>}
                            <p className="mt-1 text-xs text-slate-500">{d.archivoOriginal || "Aún no entregado"} · Vence: {fechaCorta(d.fechaVencimiento)} · Versión {d.version}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CLASES[estado] || CLASES.pendiente}`}>{ESTADOS_DOC[estado] || estado}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          {d.archivoNombre && <a href={`/api/dicaprev/contratistas/archivo?requisitoId=${d.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 underline"><FileText className="h-3.5 w-3.5"/>Ver documento</a>}
                          {puedeEditar && <label className="flex items-center gap-1 text-xs text-slate-500"><input type="checkbox" disabled={procesando} checked={d.obligatorio} onChange={(e) => void ejecutar(() => cambiarObligatoriedadContratista(d.id, e.target.checked), "Obligatoriedad actualizada.")}/>Obligatorio</label>}
                        </div>
                        {d.observacionRevision && <p className="mt-2 rounded-lg bg-orange-50 p-2 text-xs text-orange-800">Observación: {d.observacionRevision}</p>}
                        {d.versiones.length > 1 && <details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer">Historial ({d.versiones.length} versiones)</summary><div className="mt-2 flex flex-col gap-1">{d.versiones.map((v) => <a key={v.id} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline" href={`/api/dicaprev/contratistas/archivo?requisitoId=${d.id}&versionId=${v.id}`}>Versión {v.version} · {fechaCorta(v.subidoAt)} · {v.archivoOriginal}</a>)}</div></details>}
                        {puedeEditar && d.archivoNombre && d.estado === "en_revision" && <div className="mt-3 flex flex-wrap gap-2">
                          <Button disabled={procesando} size="sm" className="bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => void ejecutar(() => revisarRequisitoContratista({ requisitoId: d.id, estado: "aprobado" }), "Documento aprobado.")}>Aprobar</Button>
                          <input aria-label={`Motivo para ${d.nombre}`} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs" placeholder="Motivo de la observación o rechazo" value={motivos[d.id] || ""} onChange={(e) => setMotivos((prev) => ({ ...prev, [d.id]: e.target.value }))}/>
                          <Button disabled={procesando || !motivos[d.id]?.trim()} variant="outline" size="sm" onClick={() => void ejecutar(() => revisarRequisitoContratista({ requisitoId: d.id, estado: "observado", observacion: motivos[d.id] }), "Observación enviada al contratista.")}>Observar</Button>
                          <Button disabled={procesando || !motivos[d.id]?.trim()} variant="outline" size="sm" onClick={() => void ejecutar(() => revisarRequisitoContratista({ requisitoId: d.id, estado: "rechazado", observacion: motivos[d.id] }), "Documento rechazado.")}>Rechazar</Button>
                        </div>}
                      </div>;
                    })}
                  </div>;
                })}
                {actual.requisitos.length === 0 && <p className="mt-4 text-sm text-slate-500">No se han configurado documentos todavía.</p>}
              </div>
            </section>}
          </div>
        )}
      </div>
    </main>
  );
}
