"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, ClipboardCheck, FileText, Mail, Plus, RefreshCcw, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { getContratistas, type ContratistaRow } from "@/actions/contratistas";
import {
  agregarRequisitoContratista, aplicarPlantillaAcreditacionTrabajadores, cambiarObligatoriedadContratista, configurarRequisitoPorCargoContratista, cerrarExpedienteContratista,
  crearSolicitudContratista, eliminarReglaRequisitosTrabajadores, eliminarRequisitoContratista,
  invitarContratista, listarSolicitudesContratistas, revisarRequisitoContratista,
} from "@/actions/contratistas/solicitudes";
import { estadoEfectivo, vencimientoEfectivoRequisito } from "@/lib/contratistas/requisitos";
import { PLANTILLA_ACREDITACION_TRABAJADORES, describeRequisitoTrabajador } from "@/lib/contratistas/plantilla-acreditacion-trabajadores";
import { CLAVES_PLANTILLA_INTEGRAL_CONTRATISTAS } from "@/lib/contratistas/catalogo";
import { normalizarCargoContratista, claveAgrupacionCargoContratista } from "@/lib/contratistas/cargos";
import JSZip from "jszip";
import { crearCatalogoContratista, listarCentrosMandante, listarDocumentosBaseContratista, obtenerCatalogoContratistas, reutilizarDocumentoContratista } from "@/actions/contratistas/catalogo";

type Expediente = Awaited<ReturnType<typeof listarSolicitudesContratistas>>[number];
type Catalogo = Awaited<ReturnType<typeof obtenerCatalogoContratistas>>;
type Centro = Awaited<ReturnType<typeof listarCentrosMandante>>[number];
type DocumentoBase = Awaited<ReturnType<typeof listarDocumentosBaseContratista>>[number];
const nombreExpediente = (faena: string) => faena.trim() ? `Requerimiento documental ${faena.trim()}` : "";
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
  const [catalogo, setCatalogo] = useState<Catalogo>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [docsBase, setDocsBase] = useState<DocumentoBase[]>([]);
  const [seleccionReuso, setSeleccionReuso] = useState<Record<string, string>>({});
  const [nuevoCatalogo, setNuevoCatalogo] = useState(false);
  const [formCatalogo, setFormCatalogo] = useState({ nombre: "", alcance: "faena" as "empresa" | "faena", categoria: "empresa" as "empresa" | "trabajador" | "vehiculo" | "equipo", obligatorio: false, requiereVencimiento: false });
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [actualId, setActualId] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [nombrePersonalizado, setNombrePersonalizado] = useState(false);
  const [form, setForm] = useState({
    contratistaId: "", nombre: "", faena: "", centroTrabajoId: "", servicio: "", contactoEmail: "",
    responsable: "", dotacionEstimada: "", fechaInicio: "", fechaTermino: "",
  });
  const [seleccionados, setSeleccionados] = useState<string[]>([...CLAVES_PLANTILLA_INTEGRAL_CONTRATISTAS]);
  const [descargandoZip, setDescargandoZip] = useState(false);
  const [filtroTrabajador, setFiltroTrabajador] = useState("");
  const [cargoMasivo, setCargoMasivo] = useState("");
  const [reglaMasiva, setReglaMasiva] = useState("");
  const [obligatorioMasivo, setObligatorioMasivo] = useState(true);
  const [agregando, setAgregando] = useState(false);
  const [extra, setExtra] = useState({ nombre: "", alcance: "faena" as "empresa" | "faena", categoria: "empresa", recursoId: "", aplicaATodosTrabajadores: false, obligatorio: true });
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const actual = useMemo(() => expedientes.find((s) => s.id === actualId) || null, [expedientes, actualId]);
  const puedeEditar = !!actual && actual.estado !== "cerrada";

  async function cargar(primera = false) {
    if (primera) setCargando(true);
    try {
      const [c, solicitudes, requisitos, centrosMandante] = await Promise.all([getContratistas(), listarSolicitudesContratistas(), obtenerCatalogoContratistas(), listarCentrosMandante()]);
      setCatalogo(requisitos);
      setCentros(centrosMandante);
      setContratistas(c);
      setExpedientes(solicitudes);
      const expedId = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("expediente") || "";
      setActualId((prev) => prev && solicitudes.some((s) => s.id === prev) ? prev : solicitudes.some((s) => s.id === expedId) ? expedId : solicitudes[0]?.id || "");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los expedientes");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { void cargar(true); }, []);
  useEffect(() => {
    const c = actual?.contratistaId;
    if (!c) { setDocsBase([]); return; }
    let active = true;
    void listarDocumentosBaseContratista(c).then((docs) => {
      if (active) setDocsBase(docs.filter((d) => d.reutilizable));
    }).catch(() => { if (active) setDocsBase([]); });
    return () => { active = false; };
  }, [actual?.contratistaId]);

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
      setNombrePersonalizado(false);
      setForm({ contratistaId: "", nombre: "", faena: "", centroTrabajoId: "", servicio: "", contactoEmail: "", responsable: "", dotacionEstimada: "", fechaInicio: "", fechaTermino: "" });
      await cargar();
      setActualId(creado.id);
      setAviso("Expediente creado. Revisa los requisitos y envía la invitación.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el expediente");
    } finally {
      setProcesando(false);
    }
  }

  async function descargarCarpetaZip() {
    if (!actual || descargandoZip) return;
    setDescargandoZip(true); setError("");
    try {
      const zip = new JSZip();
      const limpieza = (value: string) => value.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-zA-Z0-9 ._()-]/g, "_").slice(0, 90);
      const usados = new Set<string>();
      const filas = ["Carpeta;Requisito;Estado;Obligatorio;Archivo;Vencimiento"];
      for (const requisito of actual.requisitos) {
        const recurso = actual.recursos.find((r) => r.id === requisito.recursoId);
        const carpeta = requisito.categoria === "empresa"
          ? (requisito.alcance === "empresa" ? "01_Empresa" : "02_Faena_y_SST")
          : requisito.categoria === "trabajador"
            ? `03_Trabajadores/${limpieza(recurso?.identificador || recurso?.nombre || "Sin identificar")}_${limpieza(recurso?.nombre || "")}`
            : `04_${requisito.categoria}/${limpieza(recurso?.nombre || "Sin identificar")}`;
        filas.push([carpeta, requisito.nombre, requisito.estado, requisito.obligatorio ? "Sí" : "No",
          requisito.archivoOriginal || "", requisito.fechaVencimiento ? new Date(requisito.fechaVencimiento).toISOString().slice(0,10) : ""
        ].map(v => String(v).replace(/;/g, ",")).join(";"));
        if (!requisito.archivoNombre) continue;
        const response = await fetch(`/api/dicaprev/contratistas/archivo?requisitoId=${encodeURIComponent(requisito.id)}`);
        if (!response.ok) throw new Error(`No se pudo descargar ${requisito.nombre}. No se generó un ZIP incompleto.`);
        const nombre = limpieza(requisito.archivoOriginal || requisito.archivoNombre);
        let dest = `${carpeta}/${nombre}`, n = 2;
        while (usados.has(dest)) dest = `${carpeta}/${n++}_${nombre}`;
        usados.add(dest);
        zip.file(dest, await response.blob());
      }
      zip.file("INDICE_DOCUMENTAL.csv", "\uFEFF" + filas.join("\r\n"));
      const contenido = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(contenido);
      const link = document.createElement("a");
      link.href = url; link.download = `NextPrev_Contratista_${limpieza(actual.nombre)}.zip`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      setAviso("Carpeta descargada con originales y un índice de pendientes y estados.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo generar la carpeta.");
    } finally { setDescargandoZip(false); }
  }

  async function crearTipoCatalogo(e: React.FormEvent) {
    e.preventDefault();
    await ejecutar(async () => {
      await crearCatalogoContratista(formCatalogo);
      setNuevoCatalogo(false);
      setFormCatalogo({ nombre: "", alcance: "faena", categoria: "empresa", obligatorio: false, requiereVencimiento: false });
    }, "El documento está disponible en tu catálogo para futuras solicitudes.");
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
            <Button variant="outline" className="rounded-xl" onClick={() => setNuevoCatalogo((x) => !x)}><Plus className="mr-2 h-4 w-4"/>Catálogo personalizado</Button>
            <Button className="rounded-xl bg-sky-700 text-white hover:bg-sky-800" onClick={() => setNuevo((x) => !x)}><Plus className="mr-2 h-4 w-4"/>Nuevo expediente</Button>
          </div>}
        />

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {aviso && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{aviso}</p>}

        {nuevoCatalogo && <form className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-6" onSubmit={(e) => void crearTipoCatalogo(e)}>
          <h2 className="text-base font-semibold text-slate-900">Crear documento reutilizable en el catálogo</h2>
          <p className="text-xs text-slate-500">Un requisito personalizado quedará disponible para futuras solicitudes de esta empresa mandante.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1"><Label>Nombre *</Label><Input required minLength={4} value={formCatalogo.nombre} onChange={(e) => setFormCatalogo({ ...formCatalogo, nombre: e.target.value })}/></label>
            <label className="space-y-1"><Label>Alcance</Label><select className={CAMPO} value={formCatalogo.alcance} onChange={(e) => { const alcance = e.target.value as "empresa" | "faena"; setFormCatalogo((v) => ({ ...v, alcance, categoria: "empresa" })); }}><option value="empresa">Permanente de empresa</option><option value="faena">Contrato o faena</option></select></label>
            <label className="space-y-1"><Label>Categoría</Label><select className={CAMPO} value={formCatalogo.categoria} disabled={formCatalogo.alcance === "empresa"} onChange={(e) => setFormCatalogo({ ...formCatalogo, categoria: e.target.value as typeof formCatalogo.categoria })}>{Object.entries(CATEGORIAS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs"><label className="flex gap-2"><input type="checkbox" checked={formCatalogo.obligatorio} onChange={(e) => setFormCatalogo({ ...formCatalogo, obligatorio: e.target.checked })}/>Sugerir obligatorio</label><label className="flex gap-2"><input type="checkbox" checked={formCatalogo.requiereVencimiento} onChange={(e) => setFormCatalogo({ ...formCatalogo, requiereVencimiento: e.target.checked })}/>Con vencimiento</label></div>
          <div className="flex gap-2"><Button disabled={procesando} type="submit" className="bg-emerald-700 text-white">Guardar en catálogo</Button><Button type="button" variant="outline" onClick={() => setNuevoCatalogo(false)}>Cancelar</Button></div>
        </form>}
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
              <label className="space-y-1.5"><Label>Nombre del expediente *</Label><Input required value={form.nombre} onChange={(e) => {
                const nombre = e.target.value;
                setNombrePersonalizado(nombre !== nombreExpediente(form.faena));
                setForm((prev) => ({ ...prev, nombre }));
              }} placeholder="Requerimiento documental BCI - VITACURA" />
                <span className="text-xs text-slate-500">Se propone desde la obra o faena; puedes personalizarlo.</span>
              </label>
              <label className="space-y-1.5"><Label>Centro de trabajo de la mandante</Label>
                <select className={CAMPO} value={form.centroTrabajoId} onChange={(e) => {
                  const c = centros.find((item) => item.id === e.target.value);
                  setForm((prev) => {
                    const faena = c?.nombre || prev.faena;
                    return { ...prev, centroTrabajoId: e.target.value, faena, nombre: nombrePersonalizado ? prev.nombre : nombreExpediente(faena) };
                  });
                }}>
                  <option value="">Otro / sin centro registrado</option>
                  {centros.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              <label className="space-y-1.5"><Label>Obra o faena *</Label><Input required value={form.faena} onChange={(e) => {
                const faena = e.target.value;
                setForm((prev) => ({ ...prev, faena, nombre: nombrePersonalizado ? prev.nombre : nombreExpediente(faena) }));
              }} placeholder="Ej. BCI - VITACURA"/></label>
              <label className="space-y-1.5"><Label>Servicio contratado</Label><Input value={form.servicio} onChange={(e) => setForm({ ...form, servicio: e.target.value })} placeholder="Ej. Electricidad, climatización, cristales" /></label>
              <label className="space-y-1.5"><Label>Correo del contratista *</Label><Input type="email" required value={form.contactoEmail} onChange={(e) => setForm({ ...form, contactoEmail: e.target.value })} /></label>
              <label className="space-y-1.5"><Label>Responsable en faena</Label><Input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} /></label>
              <label className="space-y-1.5"><Label>Dotación estimada</Label><Input type="number" min="0" value={form.dotacionEstimada} onChange={(e) => setForm({ ...form, dotacionEstimada: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5"><Label>Inicio</Label><Input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}/></label>
                <label className="space-y-1.5"><Label>Término</Label><Input type="date" value={form.fechaTermino} onChange={(e) => setForm({ ...form, fechaTermino: e.target.value })}/></label>
              </div>
            </div>
            <fieldset className="space-y-4 rounded-2xl border border-slate-200 p-3 sm:p-5">
              <legend className="px-2 text-sm font-semibold text-slate-800">Requisitos de la obra</legend>
              <p className="text-xs leading-relaxed text-slate-500">Plantilla integral: documentos de empresa, contrato/faena y prevención. Los requisitos individuales se crean al incorporar la nómina. Cada grupo se entrega y revisa de forma independiente.</p>
              <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setSeleccionados([...CLAVES_PLANTILLA_INTEGRAL_CONTRATISTAS])}>Restaurar plantilla integral</Button><Button type="button" variant="outline" onClick={() => setSeleccionados([])}>Limpiar selección</Button></div>
              <div className="space-y-4">
                {[{ alcance: "faena", title: "1 · Documentación del contrato o faena" }, { alcance: "empresa", title: "2 · Documentación corporativa a revalidar (opcional)" }].map((grupo) => {
                  const items = catalogo.filter((r) => r.alcance === grupo.alcance && r.categoria === "empresa");
                  return <div key={grupo.alcance} className="rounded-xl bg-slate-50 p-3 sm:p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{grupo.title}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {items.map((r) => <label key={r.id} className="flex items-start gap-2 rounded-lg bg-white p-2.5 text-xs text-slate-700 sm:text-sm">
                        <input className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700" type="checkbox" checked={seleccionados.includes(r.clave)} onChange={(e) => setSeleccionados((prev) => e.target.checked ? [...prev, r.clave] : prev.filter((x) => x !== r.clave))}/>
                        <span className="break-words">{r.nombre}</span>
                      </label>)}
                    </div>
                  </div>;
                })}
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
                    <p className="mt-1 text-sm text-slate-600"><Building2 className="mr-1 inline h-4 w-4"/>{actual.contratista.nombre} · {actual.centroTrabajo?.nombre || actual.faena || "Sin faena definida"}</p>
                    <p className="mt-1 text-xs text-slate-500"><Link className="font-semibold text-emerald-700 underline" href="/dicaprev/contratistas">Carpeta permanente de empresa</Link> · Requisitos específicos de este expediente</p>
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
                    const correctos = todos.filter((r) => estadoEfectivo(r.estado, r.fechaVencimiento, r.fechaEmision, r.vigenciaMeses) === "aprobado").length;
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
                  <Button variant="outline" size="sm" disabled={descargandoZip} onClick={() => void descargarCarpetaZip()}>{descargandoZip ? "Generando ZIP…" : "Descargar carpeta ZIP"}</Button>
                  {puedeEditar && <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAgregando((x) => !x)}><Plus className="mr-1 h-4 w-4"/>Agregar requisito</Button>
                    <Button variant="outline" size="sm" disabled={procesando} className="border-sky-200 text-sky-800" onClick={() => {
                      if (window.confirm("¿Aplicar la plantilla individual de trabajadores a esta obra? Se asignará al personal actual y futuro. IRL y EPP existentes se reutilizan; no se borrarán archivos ni historiales. Esta exigencia no se aplicará a otras faenas.")) {
                        void ejecutar(async () => {
                          await aplicarPlantillaAcreditacionTrabajadores(actual.id);
                        }, "Plantilla de acreditación aplicada a los trabajadores de este expediente.");
                      }
                    }}><ClipboardCheck className="mr-1 h-4 w-4"/>Plantilla trabajadores ({PLANTILLA_ACREDITACION_TRABAJADORES.length})</Button>
                  </div>}
                </div>
                {puedeEditar && <details className="mt-3 rounded-xl border border-sky-100 bg-sky-50/40 p-3 text-xs text-slate-600">
                  <summary className="cursor-pointer font-semibold text-sky-900">Ver documentos de la plantilla de acreditación</summary>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    {PLANTILLA_ACREDITACION_TRABAJADORES.map((r) => <li key={r.clave}><span className="font-semibold text-slate-800">{describeRequisitoTrabajador(r)}</span><p className="mt-0.5 text-slate-500">{r.detalle}</p></li>)}
                  </ol>
                  <p className="mt-2 text-slate-500">Condicionales: EPP, examen OAL y certificaciones según cargo; la mandante marca cada caso aplicable.</p>
                </details>}
                {agregando && puedeEditar && <form className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2" onSubmit={(e) => {
                  e.preventDefault();
                  void ejecutar(async () => {
                    await agregarRequisitoContratista({
                      solicitudId: actual.id, nombre: extra.nombre, alcance: extra.alcance,
                      categoria: extra.categoria as "empresa" | "trabajador" | "vehiculo" | "equipo",
                      recursoId: extra.recursoId || undefined, obligatorio: extra.obligatorio,
                      aplicaATodosTrabajadores: extra.aplicaATodosTrabajadores,
                    });
                    setExtra({ nombre: "", alcance: "faena", categoria: "empresa", recursoId: "", aplicaATodosTrabajadores: false, obligatorio: true });
                    setAgregando(false);
                  }, "Requisito agregado.");
                }}>
                  <label className="space-y-1"><Label>Elegir del catálogo</Label>
                    <select className={CAMPO} value="" onChange={(e) => {
                      const elegido = catalogo.find((doc) => doc.id === e.target.value);
                      if (elegido) setExtra({ ...extra, nombre: elegido.nombre, alcance: elegido.alcance, categoria: elegido.categoria, recursoId: "", aplicaATodosTrabajadores: elegido.categoria === "trabajador" });
                    }}>
                      <option value="">Documento personalizado...</option>
                      {catalogo.filter((c) => c.categoria === "empresa" || c.categoria === "trabajador" || actual.recursos.some((r) => r.tipo === c.categoria)).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1"><Label>Documento *</Label><Input required value={extra.nombre} onChange={(e) => setExtra({ ...extra, nombre: e.target.value })}/></label>
                  {extra.categoria === "empresa" && <label className="space-y-1"><Label>Ámbito</Label><select className={CAMPO} value={extra.alcance} onChange={(e) => setExtra({ ...extra, alcance: e.target.value as "empresa" | "faena" })}><option value="faena">Específico de esta faena</option><option value="empresa">Corporativo reutilizable</option></select></label>}
                  <label className="space-y-1"><Label>Categoría</Label><select className={CAMPO} value={extra.categoria} onChange={(e) => setExtra({ ...extra, categoria: e.target.value, recursoId: "", aplicaATodosTrabajadores: e.target.value === "trabajador" })}>{Object.entries(CATEGORIAS).map(([key,val]) => <option key={key} value={key}>{val}</option>)}</select></label>
                  {extra.categoria !== "empresa" && <label className="space-y-1"><Label>{extra.categoria === "trabajador" ? "Aplicar a" : "Recurso"}</Label><select className={CAMPO} required value={extra.aplicaATodosTrabajadores ? "__todos__" : extra.recursoId} onChange={(e) => setExtra({ ...extra, aplicaATodosTrabajadores: extra.categoria === "trabajador" && e.target.value === "__todos__", recursoId: e.target.value === "__todos__" ? "" : e.target.value })}><option value="">Selecciona un recurso</option>{extra.categoria === "trabajador" && <option value="__todos__">Todos los trabajadores actuales y futuros</option>}{actual.recursos.filter((r) => r.tipo === extra.categoria).map((r) => <option key={r.id} value={r.id}>{r.nombre} {r.patente || r.identificador || ""}</option>)}</select></label>}
                  <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={extra.obligatorio} onChange={(e) => setExtra({ ...extra, obligatorio: e.target.checked })}/>Obligatorio</label>
                  <Button type="submit" disabled={procesando} className="bg-sky-700 text-white">Guardar requisito</Button>
                </form>}
                {puedeEditar && actual.reglasTrabajadores.length > 0 && actual.recursos.some((r) => r.tipo === "trabajador" && r.cargo) && <section className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <h4 className="text-sm font-bold text-emerald-900">Configuración masiva por cargo</h4>
                  <p className="mt-1 text-xs text-emerald-800">Para 100 trabajadores, selecciona un cargo y marca en bloque si un requisito aplica. No cambia los nombres de documentos ni elimina archivos o historial.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="space-y-1 text-xs font-semibold text-slate-700">Cargo
                      <select className={CAMPO} value={cargoMasivo} onChange={(e) => setCargoMasivo(e.target.value)}>
                        <option value="">Seleccionar cargo</option>
                        {[...new Set(actual.recursos.filter((r) => r.tipo === "trabajador").map((r) => normalizarCargoContratista(r.cargo || "")).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es")).map((cargo) => <option key={cargo} value={cargo}>{cargo} ({actual.recursos.filter((r)=>r.tipo==="trabajador" && claveAgrupacionCargoContratista(r.cargo || "")===claveAgrupacionCargoContratista(cargo)).length})</option>)}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs font-semibold text-slate-700">Documento estándar
                      <select className={CAMPO} value={reglaMasiva} onChange={(e) => setReglaMasiva(e.target.value)}>
                        <option value="">Seleccionar requisito</option>
                        {actual.reglasTrabajadores.map((r)=><option key={r.id} value={r.id}>{r.nombre}</option>)}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs font-semibold text-slate-700">Aplicabilidad
                      <select className={CAMPO} value={obligatorioMasivo ? "si" : "no"} onChange={(e) => setObligatorioMasivo(e.target.value === "si")}>
                        <option value="si">Aplica / obligatorio</option>
                        <option value="no">No aplica / no exigible</option>
                      </select>
                    </label>
                  </div>
                  <Button className="mt-3 bg-emerald-700 text-white" disabled={procesando || !cargoMasivo || !reglaMasiva} onClick={()=>void ejecutar(
                    () => configurarRequisitoPorCargoContratista({ solicitudId: actual.id, reglaId: reglaMasiva, cargo: cargoMasivo, obligatorio: obligatorioMasivo }),
                    "Requisitos actualizados para todos los trabajadores de ese cargo. La documentación permanece intacta."
                  )}>Aplicar a todo el cargo</Button>
                </section>}
                {actual.reglasTrabajadores.length > 0 && <div className="mt-5 space-y-2">
                  <h4 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-700">Requisitos para todos los trabajadores actuales y futuros ({actual.reglasTrabajadores.length})</h4>
                  {actual.reglasTrabajadores.map((regla) => <div key={regla.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/50 p-3 sm:p-4">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-slate-900">{regla.nombre}</p>
                      <p className="text-xs text-slate-600">{regla._count.requisitos} trabajador(es) con este requisito · {regla.condicional ? "Si aplica (configurar por trabajador)" : regla.obligatorio ? "Obligatorio" : "Opcional"}{regla.vigenciaMeses ? ` · máximo ${regla.vigenciaMeses} meses` : ""} · Se asignará automáticamente a los nuevos trabajadores</p>
                    </div>
                    {puedeEditar && <Button variant="outline" size="sm" disabled={procesando} className="text-red-700 hover:text-red-800" onClick={() => {
                      if (window.confirm(`¿Eliminar la regla "${regla.nombre}" para trabajadores actuales y futuros? También se quitarán sus requisitos individuales SIN archivos ni revisión. Si alguno tiene historial, la operación se bloqueará.`))
                        void ejecutar(() => eliminarReglaRequisitosTrabajadores(regla.id), "Regla general eliminada.");
                    }}><Trash2 className="mr-1.5 h-3.5 w-3.5"/>Eliminar regla</Button>}
                  </div>)}
                </div>}
                {Object.entries(CATEGORIAS).map(([key, label]) => {
                  const docs = actual.requisitos.filter((r) => r.categoria === key);
                  if (!docs.length) return null;
                  return <div key={key} className="mt-5 space-y-3">
                    <h4 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-700">{label} ({docs.length})</h4>
                    {key === "trabajador" && <div className="mb-3 rounded-xl bg-sky-50 p-3">
                      <label htmlFor="mandante-trabajador" className="text-xs font-bold text-sky-900">Revisar carpeta por trabajador</label>
                      <select id="mandante-trabajador" className={CAMPO + " mt-2"} value={filtroTrabajador}
                        onChange={(e) => setFiltroTrabajador(e.target.value)}>
                        <option value="">Todos los trabajadores</option>
                        {actual.recursos.filter((r) => r.tipo === "trabajador").map((r) =>
                          <option key={r.id} value={r.id}>{r.nombre} · {r.identificador || "Sin RUT"}</option>)}
                      </select>
                    </div>}
                    {docs.filter((d) => key !== "trabajador" || !filtroTrabajador || d.recursoId === filtroTrabajador).map((d) => {
                      const estado = estadoEfectivo(d.estado, d.fechaVencimiento, d.fechaEmision, d.vigenciaMeses);
                      return <div key={d.id} className="min-w-0 rounded-xl border border-slate-200 p-3 sm:p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-medium text-slate-900">{d.nombre}</p>
                            {d.recurso && <p className="text-xs text-slate-500">{d.recurso.nombre} · {d.recurso.patente || d.recurso.identificador || "Sin identificador"}</p>}
                            <p className="mt-1 text-xs text-slate-500">{d.archivoOriginal || "Aún no entregado"} · Vence: {fechaCorta(vencimientoEfectivoRequisito(d.fechaVencimiento, d.fechaEmision, d.vigenciaMeses))} · Versión {d.version}{d.vigenciaMeses ? ` · Vigencia máxima ${d.vigenciaMeses} meses` : ""}{d.condicional ? " · Si aplica" : ""}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CLASES[estado] || CLASES.pendiente}`}>{ESTADOS_DOC[estado] || estado}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          {d.archivoNombre && <a href={`/api/dicaprev/contratistas/archivo?requisitoId=${d.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 underline"><FileText className="h-3.5 w-3.5"/>Ver documento</a>}
                          {puedeEditar && <label className="flex items-center gap-1 text-xs text-slate-500"><input type="checkbox" disabled={procesando} checked={d.obligatorio} onChange={(e) => void ejecutar(() => cambiarObligatoriedadContratista(d.id, e.target.checked), "Obligatoriedad actualizada.")}/>{d.condicional ? "Aplica / obligatorio" : "Obligatorio"}</label>}
                          {puedeEditar && <button type="button" disabled={procesando || !!(d.reglaTrabajadorId || d.archivoNombre || d.documentoBaseId || d.version > 0 || d.revisadoAt || d.observacionRevision || d.estado !== "pendiente" || d.versiones.length)} title={d.reglaTrabajadorId ? "Gestiona este requisito desde la regla de todos los trabajadores" : d.archivoNombre || d.version > 0 || d.revisadoAt || d.versiones.length ? "No se puede eliminar: contiene documentos o historial de revisión" : "Eliminar requisito sin documentos"} className="inline-flex items-center gap-1 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:text-slate-400" onClick={() => {
                            if (window.confirm(`¿Eliminar el requisito "${d.nombre}"? Esta acción no se puede deshacer.`))
                              void ejecutar(() => eliminarRequisitoContratista(d.id), "Requisito eliminado.");
                          }}><Trash2 className="h-3.5 w-3.5"/>Eliminar requisito</button>}
                        </div>
                        {d.categoria === "empresa" && <p className="mt-2 text-[11px] font-semibold text-slate-500">{d.alcance === "empresa" ? "Documento corporativo sujeto a revisión de esta faena" : "Documento específico de contrato / faena"}{d.documentoBase && <span className="ml-2 text-emerald-700">· Reutilizado de carpeta corporativa</span>}</p>}
                        {d.categoria === "empresa" && puedeEditar && !d.archivoNombre && docsBase.length > 0 && <div className="mt-2 flex flex-col gap-2 rounded-xl bg-emerald-50/60 p-3 sm:flex-row sm:items-center">
                          <div className="flex-1"><label className="text-xs font-semibold text-slate-700">Reutilizar un documento corporativo aprobado</label>
                            <select className={CAMPO + " mt-1"} value={seleccionReuso[d.id] || ""} onChange={(e) => setSeleccionReuso((old) => ({ ...old, [d.id]: e.target.value }))}>
                              <option value="">Seleccionar documento...</option>
                              {docsBase.map((doc) => <option key={doc.id} value={doc.id}>{doc.nombre}</option>)}
                            </select>
                          </div>
                          <Button disabled={procesando || !seleccionReuso[d.id]} size="sm" className="rounded-xl bg-emerald-700 text-white" onClick={() => void ejecutar(() => reutilizarDocumentoContratista({ requisitoId: d.id, documentoBaseId: seleccionReuso[d.id] }), "Archivo reutilizado. Debe enviarse y aprobarse para esta faena.")}>Reutilizar</Button>
                        </div>}
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
                {actual.requisitos.length === 0 && actual.reglasTrabajadores.length === 0 && <p className="mt-4 text-sm text-slate-500">No se han configurado documentos todavía.</p>}
              </div>
            </section>}
          </div>
        )}
      </div>
    </main>
  );
}
