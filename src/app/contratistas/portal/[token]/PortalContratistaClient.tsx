"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, ArrowUpRight, Building2, CarFront, Check, CheckCircle2, ChevronDown, ClipboardList, Clock3, CloudUpload, ExternalLink, FileCheck2, FileText, FolderOpen, HardHat, Info, Layers3, LockKeyhole, Plus, Send, ShieldCheck, Sparkles, Trash2, UploadCloud, Users2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agregarRecursoPortal, eliminarRecursoPortal, enviarCarpetaContratista, guardarDatosEmpresaPortal, obtenerPortalContratista } from "@/actions/contratistas/portal";
import { DOCUMENTO_ACCEPT } from "@/lib/documentacion/archivo-documento";

type DatosPortal = NonNullable<Awaited<ReturnType<typeof obtenerPortalContratista>>>;
type RequisitoPortal = DatosPortal["requisitos"][number];
const CATEGORIAS = [
  { key: "empresa", label: "Documentación de empresa" },
  { key: "trabajador", label: "Trabajadores" },
  { key: "vehiculo", label: "Vehículos" },
  { key: "equipo", label: "Maquinaria y equipos" },
] as const;
const ESTADOS: Record<string, string> = {
  pendiente: "Pendiente", en_revision: "En revisión", aprobado: "Aprobado",
  observado: "Observado", rechazado: "Rechazado", vencido: "Vencido",
};
const COLORES: Record<string, string> = {
  pendiente: "bg-slate-100 text-slate-700", en_revision: "bg-amber-100 text-amber-800",
  aprobado: "bg-emerald-100 text-emerald-800", observado: "bg-orange-100 text-orange-800",
  rechazado: "bg-red-100 text-red-800", vencido: "bg-red-100 text-red-800",
};
function isoFecha(d: Date | string | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export default function PortalContratistaClient({ token, inicial }: { token: string; inicial: DatosPortal }) {
  const [portal, setPortal] = useState(inicial);
  const [paso, setPaso] = useState<"inicio" | "empresa" | "recursos" | "documentos">("inicio");
  const [categoria, setCategoria] = useState<"empresa" | "trabajador" | "vehiculo" | "equipo">("empresa");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [empresaDatos, setEmpresaDatos] = useState({
    razonSocial: inicial.contratista.razonSocial || "",
    rut: inicial.contratista.rut || "",
    giro: inicial.contratista.giro || "",
    direccion: inicial.contratista.direccion || "",
    representanteLegal: inicial.contratista.representanteLegal || "",
    rutRepresentante: inicial.contratista.rutRepresentante || "",
    telefono: inicial.contratista.telefono || "",
  });
  const [archivo, setArchivo] = useState<Record<string, File | null>>({});
  const [fechas, setFechas] = useState<Record<string, { emision: string; vencimiento: string }>>({});
  const [enProceso, setEnProceso] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [recurso, setRecurso] = useState({ tipo: "trabajador" as "trabajador" | "vehiculo" | "equipo", nombre: "", identificador: "", cargo: "", patente: "" });

  const aprobados = useMemo(() => portal.requisitos.filter((r) => r.obligatorio && r.estadoEfectivo === "aprobado").length, [portal.requisitos]);
  const total = useMemo(() => portal.requisitos.filter((r) => r.obligatorio).length, [portal.requisitos]);
  const entregados = useMemo(() => portal.requisitos.filter((r) => r.obligatorio && r.archivoNombre && r.estadoEfectivo !== "vencido").length, [portal.requisitos]);
  const faltantes = total - entregados;
  const porcentaje = total ? Math.round((entregados / total) * 100) : 0;
  const observados = portal.requisitos.filter((r) => ["observado", "rechazado", "vencido"].includes(r.estadoEfectivo)).length;
  const datosCompletos = Boolean(portal.contratista.rut && portal.contratista.razonSocial);
  const tieneCambios = portal.requisitos.some((r) => r.archivoNombre && r.estado !== "aprobado" && r.estado !== "en_revision");
  const puedeEnviar = !enProceso && faltantes === 0 && total > 0 && datosCompletos && tieneCambios;
  const documentosCategoria = portal.requisitos.filter((r) => r.categoria === categoria);

  async function recargar() {
    const datos = await obtenerPortalContratista(token);
    if (!datos) throw new Error("La invitación ya no está disponible");
    setPortal(datos);
  }

  async function ejecutar(id: string, action: () => Promise<unknown>, message: string) {
    if (enProceso) return;
    setEnProceso(id); setError(""); setExito("");
    try {
      await action();
      await recargar();
      setExito(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible completar la acción");
    } finally {
      setEnProceso("");
    }
  }

  function irA(destino: typeof paso, grupo?: typeof categoria) {
    setPaso(destino);
    if (grupo) setCategoria(grupo);
    setError("");
    setSuccessMessages();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function setSuccessMessages() {
    setExito("");
  }

  function subir(r: RequisitoPortal) {
    const file = archivo[r.id];
    if (!file) { setError("Selecciona un archivo antes de guardarlo"); return; }
    if (file.size > 4 * 1024 * 1024) { setError("El archivo no puede superar 4 MB"); return; }
    void ejecutar(r.id, async () => {
      const form = new FormData();
      form.set("requisitoId", r.id);
      form.set("file", file);
      form.set("fechaEmision", fechas[r.id]?.emision ?? isoFecha(r.fechaEmision));
      form.set("fechaVencimiento", fechas[r.id]?.vencimiento ?? isoFecha(r.fechaVencimiento));
      const response = await fetch(`/api/contratistas/portal/${token}/archivo`, { method: "POST", body: form });
      const json = await response.json() as { error?: string };
      if (!response.ok) throw new Error(json.error || "Error al cargar documento");
      setArchivo((prev) => ({ ...prev, [r.id]: null }));
      setExpandido(null);
    }, "Documento cargado correctamente. Debes enviarlo a revisión.");
  }

  function bloqueRequisito(r: RequisitoPortal) {
    const fechasDoc = fechas[r.id] || { emision: isoFecha(r.fechaEmision), vencimiento: isoFecha(r.fechaVencimiento) };
    return <article key={r.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="break-words text-sm font-semibold text-slate-900">{r.nombre} {r.obligatorio ? <span className="text-red-500">*</span> : <span className="text-xs font-normal text-slate-400">(opcional)</span>}</h4>
          <p className="mt-1 break-all text-xs text-slate-500">{r.archivoOriginal || "Sin documento cargado"} · Versión {r.version}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${COLORES[r.estadoEfectivo] || COLORES.pendiente}`}>{ESTADOS[r.estadoEfectivo] || r.estadoEfectivo}</span>
      </div>
      {r.observacionRevision && <p className="mt-3 rounded-lg bg-orange-50 p-3 text-xs text-orange-800">Observación de la mandante: {r.observacionRevision}</p>}
      {r.archivoNombre && <a className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-700 underline" href={`/api/contratistas/portal/${token}/archivo?requisitoId=${r.id}`} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4"/>Ver archivo entregado</a>}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px_140px]">
        <label className="space-y-1 text-xs text-slate-600">
          <span className="font-medium">Archivo (máx. 4 MB)</span>
          <Input aria-label={`Archivo para ${r.nombre}`} className="h-auto min-w-0 py-2 text-xs file:mr-2 file:max-w-[94px] file:truncate" type="file" accept={DOCUMENTO_ACCEPT} onChange={(e) => setArchivo((prev) => ({ ...prev, [r.id]: e.target.files?.[0] || null }))}/>
        </label>
        <label className="space-y-1 text-xs text-slate-600"><span>Emisión</span><Input type="date" value={fechasDoc.emision} onChange={(e) => setFechas((prev) => ({ ...prev, [r.id]: { ...fechasDoc, emision: e.target.value } }))}/></label>
        <label className="space-y-1 text-xs text-slate-600"><span>Vencimiento</span><Input type="date" value={fechasDoc.vencimiento} onChange={(e) => setFechas((prev) => ({ ...prev, [r.id]: { ...fechasDoc, vencimiento: e.target.value } }))}/></label>
      </div>
      <div className="mt-3 flex justify-end">
        <Button disabled={!!enProceso || !archivo[r.id]} size="sm" onClick={() => subir(r)} className="bg-sky-700 text-white hover:bg-sky-800"><UploadCloud className="mr-2 h-4 w-4"/>{enProceso === r.id ? "Guardando…" : r.archivoNombre ? "Reemplazar documento" : "Subir documento"}</Button>
      </div>
    </article>;
  }

  return <main className="min-h-screen min-w-0 bg-slate-50 px-3 py-6 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-2xl bg-slate-900 px-5 py-6 text-white shadow-sm sm:px-8">
        <p className="text-sm font-semibold tracking-wide text-sky-300">NextPrev · Portal de contratistas</p>
        <h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">Carpeta documental</h1>
        <p className="mt-2 text-sm text-slate-300">{portal.empresaMandante} solicita documentación para <strong className="text-white">{portal.nombre}</strong>.</p>
        <p className="mt-1 text-xs text-slate-400">{portal.faena || "Contrato"} · {portal.contratista.nombre}</p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {exito && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{exito}</p>}
      <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" onSubmit={(e) => {
        e.preventDefault();
        void ejecutar("datos", () => guardarDatosEmpresaPortal(token, empresaDatos), "Datos de empresa actualizados.");
      }}>
        <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-sky-700"/><h2 className="text-lg font-semibold text-slate-900">1. Antecedentes de la empresa</h2></div>
        <p className="mt-1 text-xs text-slate-500">Confirma los datos legales de la empresa que realizará los trabajos. Los campos con * son obligatorios.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1"><Label>Razón social *</Label><Input required value={empresaDatos.razonSocial} onChange={(e) => setEmpresaDatos({ ...empresaDatos, razonSocial: e.target.value })}/></label>
          <label className="space-y-1"><Label>RUT *</Label><Input required value={empresaDatos.rut} onChange={(e) => setEmpresaDatos({ ...empresaDatos, rut: e.target.value })}/></label>
          <label className="space-y-1"><Label>Giro</Label><Input value={empresaDatos.giro} onChange={(e) => setEmpresaDatos({ ...empresaDatos, giro: e.target.value })}/></label>
          <label className="space-y-1"><Label>Dirección</Label><Input value={empresaDatos.direccion} onChange={(e) => setEmpresaDatos({ ...empresaDatos, direccion: e.target.value })}/></label>
          <label className="space-y-1"><Label>Representante legal</Label><Input value={empresaDatos.representanteLegal} onChange={(e) => setEmpresaDatos({ ...empresaDatos, representanteLegal: e.target.value })}/></label>
          <label className="space-y-1"><Label>RUT del representante</Label><Input value={empresaDatos.rutRepresentante} onChange={(e) => setEmpresaDatos({ ...empresaDatos, rutRepresentante: e.target.value })}/></label>
          <label className="space-y-1"><Label>Teléfono de contacto</Label><Input type="tel" value={empresaDatos.telefono} onChange={(e) => setEmpresaDatos({ ...empresaDatos, telefono: e.target.value })}/></label>
        </div>
        <div className="mt-4 flex justify-end"><Button disabled={!!enProceso} type="submit" className="bg-sky-700 text-white hover:bg-sky-800">{enProceso === "datos" ? "Guardando…" : "Guardar antecedentes"}</Button></div>
      </form>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><div className="flex items-center gap-2 text-slate-900"><ShieldCheck className="h-5 w-5 text-sky-700"/><h2 className="font-semibold">Estado de la carpeta</h2></div>
            <p className="mt-1 text-sm text-slate-600">Documentos obligatorios entregados: {entregados} de {total}. Aprobados por mandante: {aprobados}.</p>
            <p className="mt-1 text-xs text-slate-500">Estado del expediente: {portal.estado.replaceAll("_", " ")}. La entrega no equivale a autorización para ingresar a faena.</p>
          </div>
          <Button disabled={!!enProceso || faltantes > 0 || total === 0 || !portal.requisitos.some((r) => r.archivoNombre && r.estado !== "aprobado" && r.estado !== "en_revision")} onClick={() => void ejecutar("enviar", () => enviarCarpetaContratista(token), "Carpeta enviada a revisión de la empresa mandante.")} className="bg-emerald-700 text-white hover:bg-emerald-800"><Send className="mr-2 h-4 w-4"/>{enProceso === "enviar" ? "Enviando…" : "Enviar a revisión"}</Button>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-600 transition-all" style={{ width: `${total ? Math.round((entregados / total) * 100) : 0}%` }}/></div>
        {faltantes > 0 && <p className="mt-2 text-xs text-amber-700">Faltan {faltantes} documentos obligatorios por entregar o actualizar.</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Building2 className="h-5 w-5 text-sky-700"/>Personal, vehículos y equipos</h2>
            <p className="mt-1 text-xs text-slate-500">Registra los recursos que participarán del contrato. Se abrirán sus requisitos documentales.</p></div>
          <Button variant="outline" onClick={() => setFormVisible((x) => !x)}><Plus className="mr-2 h-4 w-4"/>Agregar recurso</Button>
        </div>
        {formVisible && <form className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2" onSubmit={(e) => {
          e.preventDefault();
          void ejecutar("recurso", async () => {
            await agregarRecursoPortal(token, recurso);
            setRecurso({ tipo: "trabajador", nombre: "", identificador: "", cargo: "", patente: "" });
            setFormVisible(false);
          }, "Recurso incorporado al expediente.");
        }}>
          <label className="space-y-1 text-sm"><Label>Tipo de recurso</Label><select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" value={recurso.tipo} onChange={(e) => setRecurso({ ...recurso, tipo: e.target.value as typeof recurso.tipo })}><option value="trabajador">Trabajador</option><option value="vehiculo">Vehículo</option><option value="equipo">Equipo o maquinaria</option></select></label>
          <label className="space-y-1"><Label>Nombre *</Label><Input required placeholder={recurso.tipo === "trabajador" ? "Nombre y apellido" : "Descripción del recurso"} value={recurso.nombre} onChange={(e) => setRecurso({ ...recurso, nombre: e.target.value })}/></label>
          {recurso.tipo === "trabajador" && <><label className="space-y-1"><Label>RUT *</Label><Input required value={recurso.identificador} onChange={(e) => setRecurso({ ...recurso, identificador: e.target.value })}/></label><label className="space-y-1"><Label>Cargo</Label><Input value={recurso.cargo} onChange={(e) => setRecurso({ ...recurso, cargo: e.target.value })}/></label></>}
          {recurso.tipo === "vehiculo" && <label className="space-y-1"><Label>Patente *</Label><Input required value={recurso.patente} onChange={(e) => setRecurso({ ...recurso, patente: e.target.value })}/></label>}
          {recurso.tipo === "equipo" && <label className="space-y-1"><Label>Identificación o serie</Label><Input value={recurso.identificador} onChange={(e) => setRecurso({ ...recurso, identificador: e.target.value })}/></label>}
          <div className="flex flex-wrap items-end gap-2"><Button type="submit" disabled={!!enProceso} className="bg-sky-700 text-white">Guardar recurso</Button><Button type="button" variant="outline" onClick={() => setFormVisible(false)}>Cancelar</Button></div>
        </form>}
        {portal.recursos.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{portal.recursos.map((r) => <div key={r.id} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
          <div className="min-w-0"><p className="break-words text-sm font-medium text-slate-800">{r.nombre}</p><p className="text-xs text-slate-500">{r.tipo} · {r.patente || r.identificador || r.cargo || "Sin identificador"}</p></div>
          <button type="button" disabled={!!enProceso} title="Quitar recurso sin documentos cargados" aria-label={`Quitar ${r.nombre}`} className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-50" onClick={() => { if (window.confirm(`¿Quitar ${r.nombre}?`)) void ejecutar(r.id, () => eliminarRecursoPortal(token, r.id), "Recurso eliminado."); }}><Trash2 className="h-4 w-4"/></button>
        </div>)}</div>}
      </section>

      {CATEGORIAS.map(({ key, label }) => {
        const grupo = portal.requisitos.filter((r) => r.categoria === key);
        if (!grupo.length && key !== "empresa") return null;
        return <section key={key} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-100/40 p-3 sm:p-5">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-sky-700"/><h2 className="text-lg font-semibold text-slate-900">{label}</h2><span className="text-xs text-slate-500">({grupo.length})</span></div>
          {grupo.length === 0 && <p className="rounded-lg bg-white p-3 text-sm text-slate-500">Sin requisitos en esta categoría.</p>}
          {grupo.map((r) => {
            const recursoActual = portal.recursos.find((re) => re.id === r.recursoId);
            return <div key={r.id}>{recursoActual && <p className="mb-1.5 ml-1 text-xs font-medium text-slate-600">{recursoActual.nombre} · {recursoActual.patente || recursoActual.identificador || recursoActual.cargo || ""}</p>}{bloqueRequisito(r)}</div>;
          })}
        </section>;
      })}
      <footer className="py-5 text-center text-xs text-slate-400">Generado por NextPrev · Documentación exclusiva de este contrato. No compartas el enlace de acceso.</footer>
    </div>
  </main>;
}
