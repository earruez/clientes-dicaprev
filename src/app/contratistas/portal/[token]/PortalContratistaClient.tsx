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
    const actual = fechas[r.id] || { emision: isoFecha(r.fechaEmision), vencimiento: isoFecha(r.fechaVencimiento) };
    const abierto = expandido === r.id;
    const requiereCorreccion = ["observado", "rechazado", "vencido"].includes(r.estadoEfectivo);
    const recursoRelacionado = portal.recursos.find((item) => item.id === r.recursoId);
    return <article key={r.id} className={"min-w-0 overflow-hidden rounded-2xl border bg-white transition-all " + (requiereCorreccion ? "border-orange-200 shadow-sm" : abierto ? "border-emerald-300 shadow-md shadow-emerald-100/50" : "border-slate-200 hover:border-slate-300")}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5">
        <div className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl " + (r.estadoEfectivo === "aprobado" ? "bg-emerald-50 text-emerald-700" : requiereCorreccion ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-600")}>
          {r.estadoEfectivo === "aprobado" ? <FileCheck2 className="h-5 w-5"/> : <FileText className="h-5 w-5"/>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <h4 className="min-w-0 flex-1 break-words text-sm font-bold leading-relaxed text-slate-900 sm:text-[15px]">{r.nombre}</h4>
            <span className={"inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold " + (COLORES[r.estadoEfectivo] || COLORES.pendiente)}>
              {r.estadoEfectivo === "aprobado" ? <CheckCircle2 className="h-3.5 w-3.5"/> : requiereCorreccion ? <AlertCircle className="h-3.5 w-3.5"/> : <Clock3 className="h-3.5 w-3.5"/>}{ESTADOS[r.estadoEfectivo] || r.estadoEfectivo}
            </span>
          </div>
          {recursoRelacionado && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500"><Users2 className="h-3.5 w-3.5"/>{recursoRelacionado.nombre}{recursoRelacionado.patente ? " · " + recursoRelacionado.patente : ""}</p>}
          <p className="mt-1.5 break-all text-xs text-slate-500">{r.archivoOriginal || "Todavía no se ha adjuntado un archivo."}{r.version ? " · Versión " + r.version : ""}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={"text-[11px] font-semibold " + (r.obligatorio ? "text-slate-700" : "text-slate-400")}>{r.obligatorio ? "● Obligatorio" : "○ Opcional"}</span>
            {r.fechaVencimiento && <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><Clock3 className="h-3.5 w-3.5"/>Vence {new Date(r.fechaVencimiento).toLocaleDateString("es-CL", {timeZone:"UTC"})}</span>}
            {r.archivoNombre && <a href={"/api/contratistas/portal/" + token + "/archivo?requisitoId=" + r.id} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">Ver archivo <ExternalLink className="h-3.5 w-3.5"/></a>}
          </div>
        </div>
        <button type="button" aria-expanded={abierto} disabled={!!enProceso} onClick={() => setExpandido(abierto ? null : r.id)}
          className={"flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition " + (abierto ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100")}>
          <UploadCloud className="h-4 w-4"/>{abierto ? "Cerrar" : r.archivoNombre ? "Actualizar" : "Adjuntar"} <ChevronDown className={"h-3.5 w-3.5 transition-transform " + (abierto ? "rotate-180" : "")}/>
        </button>
      </div>
      {r.observacionRevision && <div className="mx-4 mb-4 flex gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 sm:mx-5"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600"/><p className="text-xs leading-relaxed text-orange-900"><strong>Observación de la mandante:</strong> {r.observacionRevision}</p></div>}
      {abierto && <div className="space-y-4 border-t border-slate-100 bg-gradient-to-b from-emerald-50/40 to-white p-4 sm:p-5">
        <div><h5 className="text-sm font-bold text-slate-900">{r.archivoNombre ? "Cargar una nueva versión" : "Adjuntar documento"}</h5><p className="mt-1 text-xs text-slate-500">PDF, Word, Excel o imagen. Tamaño máximo: 4 MB.</p></div>
        <label className={"group flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition " + (archivo[r.id] ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/30")}>
          <span className={"flex h-10 w-10 items-center justify-center rounded-xl " + (archivo[r.id] ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>{archivo[r.id] ? <Check className="h-5 w-5"/> : <CloudUpload className="h-5 w-5"/>}</span>
          <span className="max-w-full break-all text-sm font-bold text-slate-800">{archivo[r.id]?.name || "Elegir archivo"}</span>
          <span className="text-xs text-slate-500">{archivo[r.id] ? "Toca para cambiar el archivo" : "Toca aquí para seleccionar desde tu dispositivo"}</span>
          <input type="file" className="sr-only" accept={DOCUMENTO_ACCEPT} aria-label={"Archivo para " + r.nombre} onChange={(e) => setArchivo((prev) => ({ ...prev, [r.id]: e.target.files?.[0] || null }))}/>
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">Fecha de emisión <span className="font-normal text-slate-400">(si aplica)</span></span><Input type="date" className="h-11 rounded-xl border-slate-200" value={actual.emision} onChange={(e) => setFechas((prev) => ({ ...prev, [r.id]: { ...actual, emision: e.target.value } }))}/></label>
          <label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">Fecha de vencimiento <span className="font-normal text-slate-400">(si aplica)</span></span><Input type="date" className="h-11 rounded-xl border-slate-200" value={actual.vencimiento} onChange={(e) => setFechas((prev) => ({ ...prev, [r.id]: { ...actual, vencimiento: e.target.value } }))}/></label>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="min-h-11 rounded-xl" disabled={!!enProceso} onClick={() => setExpandido(null)}>Cancelar</Button>
          <Button type="button" disabled={!!enProceso || !archivo[r.id]} onClick={() => subir(r)} className="min-h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 px-5 font-semibold text-white hover:from-emerald-700 hover:to-sky-700">
            <CloudUpload className="mr-2 h-4 w-4"/>{enProceso === r.id ? "Guardando…" : r.archivoNombre ? "Guardar nueva versión" : "Guardar documento"}
          </Button>
        </div>
      </div>}
    </article>;
  }

  const pasos: { key: typeof paso; label: string; numero: string; icono: typeof Building2 }[] = [
    { key: "inicio", label: "Resumen", numero: "01", icono: Layers3 },
    { key: "empresa", label: "Mi empresa", numero: "02", icono: Building2 },
    { key: "recursos", label: "Personal y equipos", numero: "03", icono: Users2 },
    { key: "documentos", label: "Documentos", numero: "04", icono: FolderOpen },
  ];
  const grupos: { key: typeof categoria; label: string; icono: typeof Building2 }[] = [
    { key: "empresa", label: "Empresa", icono: Building2 },
    { key: "trabajador", label: "Trabajadores", icono: Users2 },
    { key: "vehiculo", label: "Vehículos", icono: CarFront },
    { key: "equipo", label: "Maquinaria", icono: HardHat },
  ];
  const botonPrincipal = "min-h-[44px] rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/10 transition hover:from-emerald-700 hover:to-sky-700";
  const tarjeta = "min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_35px_-25px_rgba(15,23,42,0.3)] sm:p-7";
  const textoInput = "h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10";

  return (
    <main className="relative min-h-[100dvh] min-w-0 overflow-x-hidden bg-[#f4f7fa] pb-28 text-slate-900 sm:pb-8">
      <div className="border-b border-white/10 bg-[#080f20]">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400 via-emerald-500 to-sky-500 shadow-lg shadow-emerald-500/20">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                <path d="M5 5l9 7-9 7V5z" fill="white" />
                <path d="M13 5l6 7-6 7V5z" fill="rgba(255,255,255,0.5)" />
              </svg>
            </span>
            <div>
              <span className="block text-base font-extrabold tracking-[0.16em] text-white">NEXTPREV</span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Safety &amp; compliance</span>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-300">
            <LockKeyhole className="h-4 w-4 text-emerald-400" />
            <span className="hidden sm:inline">Portal seguro de contratistas</span>
            <span className="sm:hidden">Acceso seguro</span>
          </span>
        </div>
      </div>

      <header className="relative isolate overflow-hidden bg-[#0b1428]">
        <div className="pointer-events-none absolute -left-32 -top-40 h-[430px] w-[430px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -top-24 h-[380px] w-[380px] rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-9 sm:px-7 sm:pb-16 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-center lg:px-10">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" /> Gestión documental
            </span>
            <h1 className="mt-5 text-[32px] font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-[43px]">
              Tu documentación,<span className="block bg-gradient-to-r from-emerald-300 via-teal-300 to-sky-300 bg-clip-text text-transparent">siempre al día.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Completa tu carpeta de forma fácil y segura. Todos tus documentos, trabajadores y equipos, en un solo lugar.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-emerald-400" />{portal.contratista.nombre}</span>
              <span className="inline-flex items-center gap-2"><ClipboardList className="h-4 w-4 text-sky-400" />{portal.nombre}</span>
              {portal.faena && <span className="inline-flex items-center gap-2"><Layers3 className="h-4 w-4 text-sky-400" />{portal.faena}</span>}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-sm sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">Tu progreso</p>
              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">{portal.estado.replaceAll("_", " ")}</span>
            </div>
            <div className="mt-5 flex items-center gap-5">
              <div aria-label={porcentaje + " por ciento entregado"} role="img" className="flex h-[112px] w-[112px] shrink-0 items-center justify-center rounded-full p-[8px]" style={{ background: "conic-gradient(#34d399 " + porcentaje + "%,rgba(255,255,255,0.12) 0)" }}>
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#101c32]">
                  <span className="text-3xl font-extrabold text-white">{porcentaje}<span className="text-base text-emerald-300">%</span></span>
                  <span className="text-[10px] font-medium text-slate-400">Entregado</span>
                </div>
              </div>
              <div className="space-y-3">
                <div><p className="text-2xl font-bold text-white">{entregados}<span className="text-base font-normal text-slate-400"> / {total}</span></p><p className="text-xs text-slate-400">Documentos obligatorios</p></div>
                <span className="inline-flex rounded-lg bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">{aprobados} aprobados</span>
                {observados > 0 && <span className="ml-1 inline-flex rounded-lg bg-orange-400/10 px-2 py-1 text-[11px] font-semibold text-orange-300">{observados} observados</span>}
              </div>
            </div>
            <div className="mt-5 flex gap-2 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-slate-400"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" /> Documentos privados para esta relación contractual.</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-7 lg:px-10">
        <nav aria-label="Etapas del portal" className="relative z-10 -mt-6 overflow-x-auto rounded-[22px] border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 [-webkit-overflow-scrolling:touch]">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {pasos.map((item) => {
              const Icon = item.icono;
              const activo = paso === item.key;
              return <button key={item.key} type="button" aria-current={activo ? "step" : undefined} onClick={() => irA(item.key)} className={"group flex min-h-[68px] items-center gap-2.5 rounded-2xl px-3 text-left transition sm:px-4 " + (activo ? "bg-[#0f1e33] text-white shadow-md" : "text-slate-600 hover:bg-slate-50")}>
                <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl " + (activo ? "bg-gradient-to-br from-emerald-500 to-sky-600 text-white" : "bg-slate-100 text-slate-500 group-hover:text-emerald-700")}><Icon className="h-[18px] w-[18px]" /></span>
                <span><span className={"block text-[10px] font-bold " + (activo ? "text-emerald-300" : "text-slate-400")}>PASO {item.numero}</span><span className="block text-xs font-bold sm:text-sm">{item.label}</span></span>
              </button>;
            })}
          </div>
        </nav>

        {(error || exito) && <div className="mt-5 space-y-2" aria-live="polite">
          {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0"/><span className="flex-1">{error}</span><button onClick={() => setError("")} aria-label="Cerrar error"><X className="h-4 w-4"/></button></div>}
          {exito && <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0"/><span className="flex-1">{exito}</span><button onClick={() => setExito("")} aria-label="Cerrar aviso"><X className="h-4 w-4"/></button></div>}
        </div>}

        {paso === "inicio" && <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className={tarjeta}>
            <div className="flex items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Sparkles className="h-6 w-6" /></span>
              <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Bienvenido a NextPrev</p><h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Tu carpeta documental, simplificada.</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600"><strong>{portal.empresaMandante}</strong> te invita a presentar los antecedentes del servicio <strong>{portal.nombre}</strong>. Completa estos pasos para que la mandante los revise.</p>
              </div>
            </div>
            <div className="mt-7 space-y-3">
              {[
                { key: "empresa" as const, label: "Confirma los datos de tu empresa", info: "Razón social, RUT y representante legal.", icono: Building2, listo: datosCompletos },
                { key: "recursos" as const, label: "Registra trabajadores y equipos", info: "Personal, vehículos y maquinaria que participarán.", icono: Users2, listo: portal.recursos.length > 0 },
                { key: "documentos" as const, label: "Entrega los documentos", info: "Adjunta archivos y fechas de vencimiento.", icono: FolderOpen, listo: total > 0 && faltantes === 0 },
              ].map((item) => {
                const Icon = item.icono;
                return <button key={item.key} type="button" onClick={() => irA(item.key)} className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/30">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-700"><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900">{item.label}</strong><span className="mt-1 block text-xs text-slate-500">{item.info}</span></span>
                  <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-full " + (item.listo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>{item.listo ? <Check className="h-4 w-4"/> : <ArrowUpRight className="h-4 w-4"/>}</span>
                </button>;
              })}
            </div>
            {observados > 0 && <button onClick={() => irA("documentos")} className="mt-5 flex w-full items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-left text-xs font-semibold text-orange-800"><AlertCircle className="h-5 w-5 shrink-0"/>{observados} documento(s) requieren corrección <ArrowRight className="ml-auto h-4 w-4"/></button>}
          </section>
          <aside className="space-y-5">
            <section className={tarjeta}><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tu carpeta en números</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { label: "Entregados", value: entregados, color: "bg-sky-50 text-sky-700", icono: CloudUpload },
                  { label: "Aprobados", value: aprobados, color: "bg-emerald-50 text-emerald-700", icono: CheckCircle2 },
                  { label: "Pendientes", value: faltantes, color: "bg-amber-50 text-amber-700", icono: Clock3 },
                  { label: "Observados", value: observados, color: "bg-orange-50 text-orange-700", icono: AlertCircle },
                ].map((item) => { const Icon = item.icono; return <div key={item.label} className={"rounded-2xl p-4 " + item.color}><Icon className="h-5 w-5"/><p className="mt-4 text-3xl font-extrabold">{item.value}</p><p className="mt-1 text-xs font-semibold">{item.label}</p></div>; })}
              </div>
            </section>
            <section className="rounded-3xl border border-sky-100 bg-sky-50/80 p-5"><p className="flex items-start gap-2 text-xs leading-relaxed text-slate-600"><Info className="h-5 w-5 shrink-0 text-sky-700"/> La aprobación documental no reemplaza la autorización de ingreso a faena. Esa decisión corresponde a la empresa mandante.</p></section>
          </aside>
        </div>}

        {paso === "empresa" && <section className={"mt-6 " + tarjeta}>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Etapa 01 · Identificación</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Antecedentes de tu empresa</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">Confirma tus datos legales. Los campos marcados con * son obligatorios.</p>
          <div className="my-6 h-px bg-slate-100"/>
          <form onSubmit={(e) => { e.preventDefault(); void ejecutar("datos", () => guardarDatosEmpresaPortal(token, empresaDatos), "Datos de empresa actualizados correctamente."); }}>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {[
                { key: "razonSocial", label: "Razón social *", placeholder: "Nombre legal de la empresa", required: true },
                { key: "rut", label: "RUT de empresa *", placeholder: "76.123.456-7", required: true },
                { key: "giro", label: "Giro", placeholder: "Actividad económica", required: false },
                { key: "direccion", label: "Dirección", placeholder: "Calle, número y comuna", required: false },
                { key: "representanteLegal", label: "Representante legal", placeholder: "Nombre completo", required: false },
                { key: "rutRepresentante", label: "RUT del representante", placeholder: "12.345.678-9", required: false },
                { key: "telefono", label: "Teléfono de contacto", placeholder: "+56 9 1234 5678", required: false },
              ].map((campo) => {
                const key = campo.key as keyof typeof empresaDatos;
                return <label key={key} className="block min-w-0 space-y-2"><Label className="text-xs font-bold text-slate-700">{campo.label}</Label><Input required={campo.required} type={key === "telefono" ? "tel" : "text"} placeholder={campo.placeholder} className={textoInput} value={empresaDatos[key]} onChange={(e) => setEmpresaDatos((prev) => ({ ...prev, [key]: e.target.value }))}/></label>;
              })}
            </div>
            <div className="mt-7 flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <p className="flex items-start gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700"/>Información utilizada exclusivamente para gestionar este servicio con la mandante.</p>
              <Button disabled={!!enProceso} type="submit" className={botonPrincipal}>{enProceso === "datos" ? "Guardando…" : "Guardar antecedentes"} <Check className="ml-2 h-4 w-4"/></Button>
            </div>
          </form>
        </section>}

        {paso === "recursos" && <section className={"mt-6 " + tarjeta}>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Etapa 02 · Recursos</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Personal, vehículos y equipos</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">Añade los recursos que participarán del contrato. Se habilitarán automáticamente sus documentos requeridos.</p></div>
            <Button type="button" onClick={() => setFormVisible((v) => !v)} className={botonPrincipal}><Plus className="mr-2 h-4 w-4"/>Agregar recurso</Button>
          </div>
          {formVisible && <form className="mt-6 grid gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:grid-cols-2 sm:p-5" onSubmit={(e) => {
            e.preventDefault(); void ejecutar("recurso", async () => {
              const grupo = recurso.tipo;
              await agregarRecursoPortal(token, recurso);
              setRecurso({ tipo: "trabajador", nombre: "", identificador: "", cargo: "", patente: "" });
              setCategoria(grupo);
              setFormVisible(false);
            }, "Recurso agregado. Revisa sus documentos en la siguiente etapa.");
          }}>
            <label className="space-y-2"><Label className="text-xs font-semibold">Tipo de recurso</Label><select className={textoInput} value={recurso.tipo} onChange={(e) => setRecurso({ ...recurso, tipo: e.target.value as typeof recurso.tipo })}><option value="trabajador">Trabajador</option><option value="vehiculo">Vehículo</option><option value="equipo">Equipo / maquinaria</option></select></label>
            <label className="space-y-2"><Label className="text-xs font-semibold">Nombre o descripción *</Label><Input required className={textoInput} value={recurso.nombre} placeholder="Nombre y apellidos o identificación" onChange={(e) => setRecurso({ ...recurso, nombre: e.target.value })}/></label>
            {recurso.tipo === "trabajador" && <><label className="space-y-2"><Label className="text-xs font-semibold">RUT *</Label><Input required className={textoInput} value={recurso.identificador} onChange={(e) => setRecurso({ ...recurso, identificador: e.target.value })}/></label><label className="space-y-2"><Label className="text-xs font-semibold">Cargo</Label><Input className={textoInput} value={recurso.cargo} onChange={(e) => setRecurso({ ...recurso, cargo: e.target.value })}/></label></>}
            {recurso.tipo === "vehiculo" && <label className="space-y-2"><Label className="text-xs font-semibold">Patente *</Label><Input required className={textoInput} value={recurso.patente} onChange={(e) => setRecurso({ ...recurso, patente: e.target.value })}/></label>}
            {recurso.tipo === "equipo" && <label className="space-y-2"><Label className="text-xs font-semibold">N° serie o identificación</Label><Input className={textoInput} value={recurso.identificador} onChange={(e) => setRecurso({ ...recurso, identificador: e.target.value })}/></label>}
            <div className="flex flex-wrap items-end gap-2 sm:col-span-2"><Button type="submit" disabled={!!enProceso} className={botonPrincipal}>{enProceso === "recurso" ? "Guardando…" : "Incorporar recurso"}</Button><Button type="button" variant="outline" onClick={() => setFormVisible(false)}>Cancelar</Button></div>
          </form>}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {portal.recursos.length === 0 && <div className="col-span-full flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-12 text-center"><Users2 className="h-9 w-9 text-slate-300"/><p className="mt-3 font-semibold text-slate-700">Sin recursos registrados</p><p className="mt-1 text-xs text-slate-500">Puedes agregar personas, vehículos o maquinaria.</p></div>}
            {portal.recursos.map((r) => {
              const docs = portal.requisitos.filter((d) => d.recursoId === r.id && d.obligatorio);
              const aprobadosRecurso = docs.filter((d) => d.estadoEfectivo === "aprobado").length;
              const Icon = r.tipo === "trabajador" ? Users2 : r.tipo === "vehiculo" ? CarFront : HardHat;
              return <div key={r.id} className="min-w-0 rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Icon className="h-5 w-5"/></span><button type="button" aria-label={"Eliminar " + r.nombre} disabled={!!enProceso} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-red-600" onClick={() => { if (window.confirm("¿Eliminar " + r.nombre + "?")) void ejecutar(r.id, () => eliminarRecursoPortal(token, r.id), "Recurso eliminado."); }}><Trash2 className="h-4 w-4"/></button></div>
                <p className="mt-3 break-words text-sm font-bold text-slate-900">{r.nombre}</p><p className="mt-1 break-all text-xs text-slate-500">{r.tipo} · {r.patente || r.identificador || r.cargo || "Sin identificador"}</p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-xs text-slate-500">{aprobadosRecurso}/{docs.length} aprobados</span><button type="button" onClick={() => irA("documentos", r.tipo as typeof categoria)} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">Documentos <ArrowUpRight className="h-3.5 w-3.5"/></button></div>
              </div>;
            })}
          </div>
        </section>}

        {paso === "documentos" && <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
          <section className="min-w-0 space-y-5">
            <div className={tarjeta}>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Etapa 03 · Documentación</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Tu carpeta documental</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">Elige una categoría y adjunta los archivos correspondientes. Si recibes una observación, puedes subir una nueva versión.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {grupos.map((grupo) => { const Icon = grupo.icono; const docs = portal.requisitos.filter((d) => d.categoria === grupo.key); return <button key={grupo.key} type="button" aria-pressed={grupo.key === categoria} onClick={() => { setCategoria(grupo.key); setExpandido(null); }} className={"inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition " + (grupo.key === categoria ? "border-slate-900 bg-[#0f1e33] text-white shadow-md" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}><Icon className="h-4 w-4"/>{grupo.label}<span className={"rounded-md px-1.5 py-0.5 text-[10px] " + (grupo.key === categoria ? "bg-white/15" : "bg-slate-100")}>{docs.length}</span></button>; })}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between gap-2"><h3 className="text-base font-extrabold text-slate-900">{grupos.find((g) => g.key === categoria)?.label}</h3><span className="text-xs text-slate-500">{documentosCategoria.length} documentos</span></div>
              {documentosCategoria.length === 0 && <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center"><FolderOpen className="h-10 w-10 text-slate-300"/><p className="mt-3 text-sm font-semibold text-slate-700">No hay documentos en esta categoría.</p>{categoria !== "empresa" && <button type="button" onClick={() => irA("recursos")} className="mt-2 text-xs font-semibold text-emerald-700">Agregar un recurso <ArrowRight className="inline h-3.5 w-3.5"/></button>}</div>}
              {documentosCategoria.map((r) => bloqueRequisito(r))}
            </div>
          </section>
          <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
            <section className={tarjeta}><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldCheck className="h-5 w-5 text-emerald-600"/>Control de entrega</h3><div className="mt-5 flex justify-between gap-2"><strong className="text-3xl font-extrabold text-slate-900">{porcentaje}%</strong><span className="self-end text-xs text-slate-500">{entregados}/{total} obligatorios</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500" style={{ width: porcentaje + "%" }}/></div>
              <p className="mt-4 text-xs leading-relaxed text-slate-500">{faltantes ? "Faltan " + faltantes + " documentos obligatorios por entregar o actualizar." : "Todos los documentos obligatorios están entregados."}</p>
              {!datosCompletos && <button type="button" onClick={() => irA("empresa")} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-amber-700"><AlertCircle className="h-4 w-4"/>Completa primero tus datos de empresa</button>}
              <Button disabled={!puedeEnviar} onClick={() => void ejecutar("enviar", () => enviarCarpetaContratista(token), "Carpeta enviada a revisión de la empresa mandante.")} className={"mt-5 w-full " + botonPrincipal}><Send className="mr-2 h-4 w-4"/>{enProceso === "enviar" ? "Enviando…" : "Enviar a revisión"}</Button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-400">La empresa mandante revisará tus documentos y te informará cualquier corrección.</p>
            </section>
            <section className="rounded-3xl border border-sky-100 bg-sky-50 p-5"><p className="flex gap-2 text-xs leading-relaxed text-slate-600"><LockKeyhole className="h-4 w-4 shrink-0 text-emerald-600"/> Tus archivos se guardan de manera privada. No compartas tu enlace de acceso.</p></section>
          </aside>
        </div>}

        <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-200 py-6 text-center text-xs text-slate-500 sm:flex-row sm:text-left"><strong className="font-extrabold tracking-[0.17em] text-slate-800">NEXTPREV</strong><p>Generado por NextPrev · Gestión documental segura</p><span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5"/>Acceso privado</span></footer>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_35px_-25px_rgba(15,23,42,0.5)] backdrop-blur-xl [padding-bottom:max(12px,env(safe-area-inset-bottom))] sm:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tu carpeta</p><p className="text-sm font-extrabold text-slate-900">{entregados}/{total} <span className="text-xs font-medium text-slate-500">entregados</span></p></div>
          {paso === "documentos" ? <Button disabled={!puedeEnviar} onClick={() => void ejecutar("enviar", () => enviarCarpetaContratista(token), "Carpeta enviada a revisión.")} className={botonPrincipal}><Send className="mr-2 h-4 w-4"/>Enviar a revisión</Button> : <Button onClick={() => irA(paso === "inicio" ? "empresa" : paso === "empresa" ? "recursos" : "documentos")} className={botonPrincipal}>Continuar<ArrowRight className="ml-2 h-4 w-4"/></Button>}
        </div>
      </div>
    </main>
  );
}
