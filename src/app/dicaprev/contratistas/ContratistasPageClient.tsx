"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, BadgeCheck, Building2, CheckCircle2, ChevronDown, Clock3, FileCheck2, FileText, FolderOpen, HardHat, Plus, Search, ShieldCheck, UploadCloud, Users2 } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actualizarEstadoContratistaDocumento, crearContratista, crearContratistaDocumento, getContratistas, type ContratistaRow } from "@/actions/contratistas";
import { obtenerCatalogoContratistas } from "@/actions/contratistas/catalogo";
import { CATALOGO_EMPRESA } from "@/lib/contratistas/catalogo";
import { DOCUMENTO_ACCEPT } from "@/lib/documentacion/archivo-documento";

type Catalogo = Awaited<ReturnType<typeof obtenerCatalogoContratistas>>;
const ESTADO: Record<string, { nombre: string; color: string }> = {
  pendiente: { nombre: "Pendiente", color: "bg-slate-100 text-slate-600" },
  en_revision: { nombre: "En revisión", color: "bg-amber-50 text-amber-700" },
  aprobado: { nombre: "Aprobado", color: "bg-emerald-50 text-emerald-700" },
  rechazado: { nombre: "Rechazado", color: "bg-rose-50 text-rose-700" },
  vencido: { nombre: "Vencido", color: "bg-red-50 text-red-700" },
};
const campo = "min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10";
const principal = "min-h-11 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800";
const panel = "min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6";

export default function ContratistasPageClient() {
  const [rows, setRows] = useState<ContratistaRow[]>([]);
  const [catalogo, setCatalogo] = useState<Catalogo>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [contratistaId, setContratistaId] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [nuevoDoc, setNuevoDoc] = useState(false);
  const [verDetalle, setVerDetalle] = useState<"documentos" | "obras" | "acreditaciones">("documentos");
  const [empresa, setEmpresa] = useState({ nombre: "", rut: "", razonSocial: "", email: "", telefono: "" });
  const [documento, setDocumento] = useState({ clave: "", nombre: "", tipo: "", fechaEmision: "", fechaVencimiento: "" });
  const [archivos, setArchivos] = useState<Record<string, File | null>>({});
  const [fechas, setFechas] = useState<Record<string, { emision: string; vencimiento: string }>>({});
  const contratista = rows.find((r) => r.id === contratistaId) || null;
  const visibles = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return !term ? rows : rows.filter((r) => [r.nombre, r.rut, r.razonSocial].some((v) => v?.toLowerCase().includes(term)));
  }, [rows, busqueda]);

  const cargar = useCallback(async () => {
    try {
      const [data, requisitos] = await Promise.all([getContratistas(), obtenerCatalogoContratistas()]);
      setRows(data);
      setCatalogo(requisitos);
      setContratistaId((actual) => data.some((r) => r.id === actual) ? actual : (data[0]?.id || ""));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la gestión de contratistas");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  async function ejecutar(id: string, accion: () => Promise<unknown>, mensaje: string) {
    if (ocupado) return;
    setOcupado(id); setError(""); setAviso("");
    try {
      await accion();
      await cargar();
      setAviso(mensaje);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible completar la operación");
    } finally {
      setOcupado("");
    }
  }

  const docsDisponibles = catalogo.filter((r) => r.alcance === "empresa" && r.categoria === "empresa");
  const docsVigentes = contratista?.documentos.filter((d) => d.estado === "aprobado").length || 0;

  function seleccionarDocumento(clave: string) {
    const r = docsDisponibles.find((x) => x.clave === clave);
    setDocumento((d) => ({ ...d, clave, nombre: r?.nombre || "", tipo: r?.clave || "" }));
  }

  async function crearEmpresa(e: React.FormEvent) {
    e.preventDefault();
    if (!empresa.nombre.trim()) return;
    await ejecutar("crear-empresa", async () => {
      const r = await crearContratista(empresa);
      setContratistaId(r.id);
      setNuevo(false);
      setEmpresa({ nombre: "", rut: "", razonSocial: "", email: "", telefono: "" });
    }, "Empresa contratista registrada. Ahora puedes completar su carpeta corporativa.");
  }

  async function crearDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!contratista) return;
    await ejecutar("crear-documento", async () => {
      await crearContratistaDocumento({
        contratistaId: contratista.id, nombre: documento.nombre, tipo: documento.tipo || undefined,
        fechaEmision: documento.fechaEmision || undefined, fechaVencimiento: documento.fechaVencimiento || undefined,
      });
      setNuevoDoc(false);
      setDocumento({ clave: "", nombre: "", tipo: "", fechaEmision: "", fechaVencimiento: "" });
    }, "Documento corporativo registrado. Ahora puedes adjuntar su archivo.");
  }

  async function subir(id: string) {
    const file = archivos[id];
    if (!file) return setError("Selecciona el archivo que deseas adjuntar.");
    if (file.size > 4 * 1024 * 1024) return setError("El archivo no puede superar 4 MB.");
    await ejecutar("subir:" + id, async () => {
      const actual = contratista?.documentos.find((d) => d.id === id);
      const form = new FormData();
      form.set("documentoId", id); form.set("file", file);
      form.set("fechaEmision", fechas[id]?.emision ?? actual?.fechaEmision?.slice(0, 10) ?? "");
      form.set("fechaVencimiento", fechas[id]?.vencimiento ?? actual?.fechaVencimiento?.slice(0, 10) ?? "");
      const response = await fetch("/api/dicaprev/contratistas/documento-base", { method: "POST", body: form });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo cargar el documento");
      setArchivos((old) => ({ ...old, [id]: null }));
    }, "Archivo guardado de forma privada. Está pendiente de revisión.");
  }

  return <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#f5f7fa]">
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <StandardPageHeader moduleLabel="Gestión de contratistas" title="Empresas contratistas"
        description="Ficha permanente y documentos corporativos reutilizables. Cada obra mantiene su propia revisión."
        icon={<Building2 className="h-5 w-5" />}
        iconWrapClassName="bg-emerald-700"
        actions={<div className="flex flex-wrap gap-2">
          <Button asChild className={principal}><Link href="/dicaprev/contratistas/solicitudes"><FolderOpen className="mr-2 h-4 w-4"/>Contratos y faenas</Link></Button>
          <Button asChild variant="outline" className="rounded-xl"><Link href="/dicaprev/acreditaciones/solicitudes"><BadgeCheck className="mr-2 h-4 w-4"/>Acreditaciones</Link></Button>
          <Button variant="outline" onClick={() => setNuevo((x) => !x)} className="rounded-xl"><Plus className="mr-2 h-4 w-4"/>Nuevo contratista</Button>
        </div>} />
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      {aviso && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{aviso}</p>}
      {nuevo && <form onSubmit={(e) => void crearEmpresa(e)} className={panel}>
        <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-emerald-700"/><h2 className="text-lg font-semibold text-slate-900">Registrar empresa contratista</h2></div>
        <p className="mt-1 text-xs text-slate-500">Datos principales. Los documentos generales se gestionan después, una sola vez.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { id: "nombre", nombre: "Nombre comercial *" }, { id: "rut", nombre: "RUT" },
            { id: "razonSocial", nombre: "Razón social" }, { id: "email", nombre: "Correo de contacto" },
            { id: "telefono", nombre: "Teléfono" },
          ].map((r) => {
            const key = r.id as keyof typeof empresa;
            return <label key={key} className="space-y-1"><Label className="text-xs">{r.nombre}</Label><Input required={key === "nombre"} type={key === "email" ? "email" : "text"} className={campo} value={empresa[key]} onChange={(e) => setEmpresa((old) => ({ ...old, [key]: e.target.value }))}/></label>;
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><Button type="submit" disabled={!!ocupado} className={principal}>Guardar contratista</Button><Button type="button" variant="outline" onClick={() => setNuevo(false)}>Cancelar</Button></div>
      </form>}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-3">
          <section className={panel}>
            <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-800">Directorio</h2><span className="text-xs font-semibold text-slate-500">{rows.length} empresas</span></div>
            <label className="relative block"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><Input placeholder="Buscar por nombre o RUT" className={campo + " pl-9"} value={busqueda} onChange={(e) => setBusqueda(e.target.value)}/></label>
            <div className="mt-3 max-h-[65vh] space-y-2 overflow-y-auto pr-1">
              {visibles.map((r) => <button key={r.id} onClick={() => { setContratistaId(r.id); setAviso(""); setVerDetalle("documentos"); }} type="button"
                className={"w-full rounded-xl border p-3 text-left transition " + (r.id === contratistaId ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50")}>
                <p className="break-words text-sm font-bold text-slate-900">{r.nombre}</p><p className="mt-1 text-xs text-slate-500">{r.rut || r.razonSocial || "Sin RUT ingresado"}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500"><span>{r.totalDocumentos} documentos</span><span>·</span><span>{r.faenasActivas} faenas</span></div>
              </button>)}
              {visibles.length === 0 && <p className="py-7 text-center text-xs text-slate-500">No encontramos empresas con esa búsqueda.</p>}
            </div>
          </section>
        </aside>
        <div className="min-w-0 space-y-4">
          {cargando && <div className={panel}><p className="text-sm text-slate-500">Cargando contratistas…</p></div>}
          {!cargando && !contratista && <div className={panel}><Building2 className="h-8 w-8 text-slate-300"/><h2 className="mt-3 text-lg font-semibold">Sin contratistas</h2><p className="text-sm text-slate-500">Registra la primera empresa para gestionar documentos y obras.</p></div>}
          {contratista && <>
            <section className={panel}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Building2 className="h-6 w-6"/></div>
                  <div><h2 className="break-words text-xl font-extrabold text-slate-900">{contratista.nombre}</h2><p className="mt-1 break-words text-xs text-slate-500">{contratista.razonSocial || "Ficha corporativa"} {contratista.rut ? " · " + contratista.rut : ""}</p><p className="mt-1 text-xs text-slate-500">{contratista.email || "Correo no ingresado"}</p></div>
                </div>
                <span className={"rounded-full px-3 py-1.5 text-xs font-bold " + (ESTADO[contratista.estadoGlobal] || ESTADO.pendiente).color}>{(ESTADO[contratista.estadoGlobal] || ESTADO.pendiente).nombre}</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[{ valor: contratista.totalDocumentos, label: "Docs. empresa", icono: FileText }, { valor: contratista.faenasActivas, label: "Faenas", icono: HardHat }, { valor: contratista.acreditacionesActivas, label: "Acreditaciones", icono: BadgeCheck }].map((i) => { const Icon = i.icono; return <div key={i.label} className="rounded-xl bg-slate-50 p-3 text-center"><Icon className="mx-auto h-4 w-4 text-slate-500"/><strong className="mt-2 block text-xl font-extrabold text-slate-900">{i.valor}</strong><p className="mt-1 text-[11px] text-slate-500">{i.label}</p></div>; })}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                {[{key:"documentos" as const,label:"Documentos"},{key:"obras" as const,label:"Obras"},{key:"acreditaciones" as const,label:"Acreditaciones"}].map((item) => <button type="button" key={item.key} onClick={() => setVerDetalle(item.key)} className={"rounded-lg px-2 py-2.5 text-xs font-semibold transition sm:text-sm " + (verDetalle === item.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}>{item.label}</button>)}
              </div>
            </section>

            {verDetalle === "documentos" && <section className={panel}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Carpeta permanente</p><h3 className="mt-1 text-lg font-extrabold text-slate-900">Documentación corporativa</h3><p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-500">Documentos de la empresa que pueden reutilizarse en distintas obras, mientras sigan vigentes y la mandante los acepte.</p></div>
                <Button onClick={() => setNuevoDoc((v) => !v)} variant="outline" className="min-h-10 rounded-xl"><Plus className="mr-2 h-4 w-4"/>Agregar documento</Button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800"><ShieldCheck className="h-4 w-4 shrink-0"/>{docsVigentes} aprobados · {contratista.totalDocumentos} registrados · los documentos deben cargarse y aprobarse antes de reutilizarlos.</div>
              {nuevoDoc && <form onSubmit={(e) => void crearDoc(e)} className="mt-4 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5"><Label className="text-xs font-semibold">Catálogo documental</Label><select className={campo} value={documento.clave} onChange={(e) => seleccionarDocumento(e.target.value)}><option value="">Documento personalizado...</option>{docsDisponibles.map((item) => <option key={item.id} value={item.clave}>{item.nombre}</option>)}</select></label>
                  <label className="space-y-1.5"><Label className="text-xs font-semibold">Nombre del documento *</Label><Input required className={campo} value={documento.nombre} onChange={(e) => setDocumento((old) => ({ ...old, nombre: e.target.value, clave: "", tipo: "" }))}/></label>
                  <label className="space-y-1.5"><Label className="text-xs">Fecha emisión (opcional)</Label><Input className={campo} type="date" value={documento.fechaEmision} onChange={(e) => setDocumento((old) => ({ ...old, fechaEmision: e.target.value }))}/></label>
                  <label className="space-y-1.5"><Label className="text-xs">Vencimiento (opcional)</Label><Input className={campo} type="date" value={documento.fechaVencimiento} onChange={(e) => setDocumento((old) => ({ ...old, fechaVencimiento: e.target.value }))}/></label>
                </div>
                <div className="flex gap-2"><Button type="submit" disabled={!!ocupado} className={principal}>Crear documento</Button><Button type="button" variant="outline" onClick={() => setNuevoDoc(false)}>Cancelar</Button></div>
              </form>}
              <div className="mt-5 space-y-3">
                {contratista.documentos.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 p-7 text-center"><FolderOpen className="mx-auto h-7 w-7 text-slate-300"/><p className="mt-2 text-sm text-slate-500">Aún no hay documentos de empresa. Agrega alguno del catálogo o crea uno personalizado.</p><p className="mt-2 text-xs text-slate-400">Catálogo disponible: {CATALOGO_EMPRESA.length} requisitos estándar.</p></div>}
                {contratista.documentos.map((d) => {
                  const status = ESTADO[d.estado] || ESTADO.pendiente;
                  const fechaActual = fechas[d.id] || { emision: d.fechaEmision?.slice(0, 10) || "", vencimiento: d.fechaVencimiento?.slice(0, 10) || "" };
                  return <article key={d.id} className="min-w-0 rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h4 className="break-words text-sm font-bold text-slate-900">{d.nombre}</h4><p className="mt-1 text-xs text-slate-500">{d.archivoOriginal || (d.archivoNombre ? "Archivo adjunto" : "Archivo pendiente")} · v{d.version}</p></div><span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + status.color}>{status.nombre}</span></div>
                    {d.fechaVencimiento && <p className="mt-2 text-xs text-slate-500"><Clock3 className="mr-1 inline h-3.5 w-3.5"/>Vence {new Date(d.fechaVencimiento).toLocaleDateString("es-CL")}</p>}
                    {d.archivoNombre && <div className="mt-2 flex flex-wrap gap-3 text-xs">{<a className="font-semibold text-emerald-700 underline" href={"/api/dicaprev/contratistas/documento-base?documentoId=" + d.id} target="_blank" rel="noopener noreferrer">Ver archivo</a>}{d.versiones.slice(1,4).map((v) => <a key={v.id} className="text-slate-500 underline" href={"/api/dicaprev/contratistas/documento-base?documentoId=" + d.id + "&versionId=" + v.id} target="_blank" rel="noopener noreferrer">Versión {v.version}</a>)}</div>}
                    <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_145px_145px]">
                      <label className="min-w-0 space-y-1"><span className="text-xs font-semibold text-slate-600">Adjuntar / actualizar (máx. 4 MB)</span><Input type="file" className="h-auto min-w-0 py-2 text-xs" accept={DOCUMENTO_ACCEPT} aria-label={"Archivo " + d.nombre} onChange={(e) => setArchivos((old) => ({ ...old, [d.id]: e.target.files?.[0] || null }))}/></label>
                      <label className="space-y-1"><span className="text-xs text-slate-500">Emisión</span><Input type="date" className={campo} value={fechaActual.emision} onChange={(e) => setFechas((old) => ({ ...old, [d.id]: { ...fechaActual, emision: e.target.value } }))}/></label>
                      <label className="space-y-1"><span className="text-xs text-slate-500">Vencimiento</span><Input type="date" className={campo} value={fechaActual.vencimiento} onChange={(e) => setFechas((old) => ({ ...old, [d.id]: { ...fechaActual, vencimiento: e.target.value } }))}/></label>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      {d.archivoNombre && d.estado === "en_revision" && <>
                        <Button disabled={!!ocupado} variant="outline" size="sm" className="rounded-xl" onClick={() => void ejecutar("rechazar:" + d.id, () => actualizarEstadoContratistaDocumento(d.id, "rechazado"), "Documento rechazado.")}>Rechazar</Button>
                        <Button disabled={!!ocupado} size="sm" className="rounded-xl bg-emerald-700 text-white" onClick={() => void ejecutar("aprobar:" + d.id, () => actualizarEstadoContratistaDocumento(d.id, "aprobado"), "Documento aprobado para reutilización.")}><CheckCircle2 className="mr-1 h-4 w-4"/>Aprobar</Button>
                      </>}
                      <Button disabled={!!ocupado || !archivos[d.id]} size="sm" className="rounded-xl bg-sky-700 text-white hover:bg-sky-800" onClick={() => void subir(d.id)}><UploadCloud className="mr-1 h-4 w-4"/>{ocupado === "subir:" + d.id ? "Guardando…" : "Cargar archivo"}</Button>
                    </div>
                  </article>;
                })}
              </div>
            </section>}
            {verDetalle === "obras" && <section className={panel}><h3 className="flex items-center gap-2 text-lg font-bold text-slate-900"><HardHat className="h-5 w-5 text-emerald-700"/>Contratos y faenas</h3><p className="mt-2 text-sm text-slate-500">Cada expediente agrupa requisitos específicos, trabajadores y equipos de una obra. No duplica la documentación permanente.</p>
              <div className="mt-4 space-y-2">
                {contratista.faenas.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Todavía no tiene contratos o faenas registrados.</p>}
                {contratista.faenas.map((faena) => <div key={faena.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                  <div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-900">{faena.nombre}</p><p className="mt-1 text-xs text-slate-500">{faena.faena || "Sin centro especificado"} · {faena.estado.replaceAll("_", " ")}</p></div>
                  <Link href={"/dicaprev/contratistas/solicitudes?expediente=" + faena.id} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">Abrir <ArrowRight className="h-3.5 w-3.5"/></Link>
                </div>)}
              </div>
              <Button asChild className={"mt-4 " + principal}><Link href="/dicaprev/contratistas/solicitudes">Abrir solicitudes por faena <ArrowRight className="ml-2 h-4 w-4"/></Link></Button>
            </section>}
            {verDetalle === "acreditaciones" && <section className={panel}>
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900"><BadgeCheck className="h-5 w-5 text-emerald-700"/>Historial de acreditaciones</h3><p className="mt-2 text-sm text-slate-500">Las acreditaciones se crean y vinculan desde su módulo, por mandante y proyecto. Una empresa puede tener varias.</p>
              <div className="mt-4 space-y-2">{contratista.acreditaciones.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Todavía no tiene acreditaciones vinculadas.</p>}
                {contratista.acreditaciones.map((a) => <Link key={a.id} href={"/dicaprev/acreditaciones/" + a.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50"><span className="min-w-0"><strong className="block break-words text-sm text-slate-900">{a.proyecto}</strong><span className="text-xs text-slate-500">{a.estado.replaceAll("_", " ")}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-slate-400"/></Link>)}
              </div><Button variant="outline" asChild className="mt-4 rounded-xl"><Link href="/dicaprev/acreditaciones/solicitudes">Gestionar acreditaciones <ArrowRight className="ml-2 h-4 w-4"/></Link></Button>
            </section>}
          </>}
        </div>
      </div>
      <p className="px-2 pb-6 text-center text-xs text-slate-400">NextPrev · Documentos corporativos y control documental por obra</p>
    </div>
  </main>;
}
