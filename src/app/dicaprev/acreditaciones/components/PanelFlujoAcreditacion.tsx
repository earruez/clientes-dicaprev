"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Download, FileText, Send, Users, AlertTriangle, FolderCheck, RefreshCw } from "lucide-react";
import DocumentoAccion from "./DocumentoAccion";
import { actualizarPersonalAcreditacion, registrarEntregaAcreditacion } from "@/actions/acreditaciones/flujo";

type Doc = {
  id: string; nombreDocumento: string; estado: string; obligatorio: boolean;
  archivoUrl?: string; archivoNombre?: string; fechaEmision?: string;
  fechaVencimiento?: string; titularTipo: string; titularNombre: string; observaciones?: string;
};
type Trabajador = { id: string; nombre: string; rut: string | null; cargo: string };
type Vehiculo = { id: string; patente: string; modelo: string };
type Personal = { trabajadores: Trabajador[]; vehiculos: Array<{ id: string; nombre: string }> };
type Ac = { id: string; mandante: string; plantillaNombre: string; empresaNombre: string;
  trabajadores: Trabajador[]; vehiculos: Vehiculo[] };
type Estado = "en_preparacion" | "listo_para_enviar" | "enviado" | "observada" | "aprobado" | "rechazado" | "cerrada" | "vencido";

export default function PanelFlujoAcreditacion({
  acreditacion, estado, documentos, recursos, puedeEditar, onZip, onPdf, onSincronizar, onCambiarEstado,
}: {
  acreditacion: Ac; estado: Estado; documentos: Doc[]; recursos: Personal; puedeEditar: boolean;
  onZip: () => Promise<boolean>; onPdf: () => Promise<void>;
  onSincronizar: () => Promise<void>; onCambiarEstado: (estado: Estado) => void;
}) {
  const router = useRouter();
  const [nominaAbierta, setNominaAbierta] = useState(false);
  const [seleccionT, setSeleccionT] = useState<string[]>(acreditacion.trabajadores.map((x) => x.id));
  const [seleccionV, setSeleccionV] = useState<string[]>(acreditacion.vehiculos.map((x) => x.id));
  const [busqueda, setBusqueda] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [medio, setMedio] = useState<"correo" | "portal" | "presencial" | "otro">("portal");
  const [destinatario, setDestinatario] = useState("");
  const [referencia, setReferencia] = useState("");
  const [mostrarEnvio, setMostrarEnvio] = useState(false);
  const totalObligatorios = documentos.filter((d) => d.obligatorio);
  const correcto = (d: Doc) => d.estado === "completo"
    && Boolean(d.archivoNombre || d.archivoUrl)
    && !d.archivoUrl?.startsWith("/demo/")
    && (!d.fechaVencimiento || new Date(d.fechaVencimiento).getTime() >= Date.now());
  const pendientes = totalObligatorios.filter((d) => !correcto(d));
  const completos = totalObligatorios.length - pendientes.length;
  const demo = documentos.filter((d) => d.archivoUrl?.startsWith("/demo/")).length;
  const pct = totalObligatorios.length ? Math.round(completos / totalObligatorios.length * 100) : 0;
  const bloqueada = estado === "cerrada" || estado === "aprobado";
  const listo = totalObligatorios.length > 0 && pendientes.length === 0;
  const etapa = acreditacion.trabajadores.length === 0 ? 1 : !listo ? 2
    : ["enviado", "observada", "rechazado", "aprobado", "cerrada", "vencido"].includes(estado) ? 4 : 3;
  const siguiente = etapa === 1 ? "Agregar trabajadores" : etapa === 2 ? "Completar documentos"
    : etapa === 3 ? "Preparar y registrar el envío" : "Registrar la respuesta del mandante";
  const grupos = useMemo(() => {
    const map = new Map<string, { titulo: string; docs: Doc[] }>();
    for (const d of documentos) {
      const key = d.titularTipo === "trabajador" || d.titularTipo === "vehiculo"
        ? `${d.titularTipo}:${d.titularNombre}` : "empresa";
      if (!map.has(key)) map.set(key, { titulo: key === "empresa" ? "Documentación de la empresa" : d.titularNombre, docs: [] });
      map.get(key)!.docs.push(d);
    }
    return [...map.values()];
  }, [documentos]);
  const toggle = (id: string, list: string[], setter: (v: string[]) => void) =>
    setter(list.includes(id) ? list.filter((v) => v !== id) : [...list, id]);

  async function guardarPersonal() {
    setOcupado(true); setError(""); setMensaje("");
    try {
      await actualizarPersonalAcreditacion(acreditacion.id, seleccionT, seleccionV);
      setNominaAbierta(false); setMensaje("Nómina actualizada y documentos sincronizados.");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo actualizar la nómina"); }
    finally { setOcupado(false); }
  }

  async function registrarEnvio() {
    if (!listo || ocupado) return;
    setOcupado(true); setError(""); setMensaje("");
    try {
      await registrarEntregaAcreditacion(acreditacion.id, { medio, destinatario, referencia });
      setMostrarEnvio(false);
      setMensaje("Envío externo registrado con trazabilidad. Queda pendiente la respuesta del mandante.");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo registrar el envío"); }
    finally { setOcupado(false); }
  }

  return (
    <section className="mx-auto max-w-screen-xl space-y-5 px-4 pt-6 lg:px-6" aria-label="Gestión guiada de acreditación">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Carpeta de acreditación · {acreditacion.mandante}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Acreditar trabajadores</h1>
            <p className="mt-1 text-sm text-slate-600">Gestiona los documentos, el envío y la respuesta desde esta pantalla.</p>
          </div>
          <div className="rounded-xl border bg-blue-50 px-4 py-3">
            <p className="text-xs text-blue-800">Avance documental obligatorio</p>
            <p className="text-2xl font-bold text-blue-900">{pct}%</p>
            <p className="text-xs text-blue-800">{completos} de {totalObligatorios.length} completos</p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          {["Seleccionar personal", "Completar documentos", "Preparar y enviar", "Respuesta del mandante"].map((titulo, i) => (
            <a key={titulo} href={["#acreditacion-personal", "#acreditacion-documentos", "#acreditacion-envio", "#acreditacion-respuesta"][i]} className={`rounded-xl border px-3 py-3 text-left text-xs font-semibold transition-colors hover:border-blue-400 ${i + 1 === etapa ? "border-blue-300 bg-blue-700 text-white" : i + 1 < etapa ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"}`}>
              <span className="block opacity-80">Paso {i + 1}</span>{titulo}
            </a>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-4">
          <ArrowRight className="h-5 w-5 text-blue-600" />
          <p className="flex-1 text-sm text-slate-700">Siguiente paso: <strong>{siguiente}</strong></p>
          <a href={["#acreditacion-personal", "#acreditacion-documentos", "#acreditacion-envio", "#acreditacion-respuesta"][etapa - 1]} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white">Ir al paso</a>
        </div>
        {demo > 0 && <div role="alert" className="mt-3 flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="h-5 w-5 shrink-0" />{demo} documento(s) provienen de rutas de demostración. Deben reemplazarse por archivos reales para acreditar.</div>}
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {mensaje && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</div>}

      <section id="acreditacion-personal" className="scroll-mt-24 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-lg font-bold text-slate-900">1. Personal a acreditar</h2><p className="text-sm text-slate-500">{acreditacion.trabajadores.length} trabajadores · {acreditacion.vehiculos.length} vehículos</p></div>
          {puedeEditar && !bloqueada && <button type="button" onClick={() => setNominaAbierta(!nominaAbierta)} className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700"><Users className="mr-1 inline h-4 w-4" />{nominaAbierta ? "Cerrar selección" : "Modificar personal"}</button>}
        </div>
        <p className="mt-2 text-sm text-slate-700">{acreditacion.trabajadores.length ? acreditacion.trabajadores.map((t) => t.nombre).join(" · ") : "Aún no se han seleccionado trabajadores."}</p>
        {nominaAbierta && <div className="mt-4 space-y-3 rounded-xl border bg-slate-50 p-4">
          <p className="text-sm text-slate-700">Selecciona el personal. NextPrev conserva los archivos y no permite quitar personas con documentación histórica.</p>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar trabajador por nombre o RUT" className="w-full rounded-lg border bg-white p-2.5 text-sm" />
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {recursos.trabajadores.filter((p) => `${p.nombre} ${p.rut}`.toLowerCase().includes(busqueda.toLowerCase())).map((t) => <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm hover:bg-white">
              <input type="checkbox" checked={seleccionT.includes(t.id)} onChange={() => toggle(t.id, seleccionT, setSeleccionT)} />
              {t.nombre} <span className="text-xs text-slate-500">{t.rut}</span>
            </label>)}
          </div>
          <details><summary className="cursor-pointer text-sm font-semibold text-slate-700">Vehículos ({seleccionV.length})</summary>
            {recursos.vehiculos.map((v) => <label key={v.id} className="mt-2 flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={seleccionV.includes(v.id)} onChange={() => toggle(v.id, seleccionV, setSeleccionV)} />{v.nombre}</label>)}
          </details>
          <button type="button" disabled={ocupado || seleccionT.length === 0} onClick={() => void guardarPersonal()} className="rounded-xl bg-blue-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">Guardar nómina y actualizar requisitos</button>
        </div>}
      </section>

      <section id="acreditacion-documentos" className="scroll-mt-24 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">2. Completar documentos</h2>
            <p className="mt-1 text-sm text-slate-500">{pendientes.length === 0 && totalObligatorios.length ? "Todos los documentos obligatorios están listos." : `${pendientes.length} documentos obligatorios requieren atención.`} Selecciona «Resolver» en cada fila.</p>
          </div>
          {puedeEditar && !bloqueada && <button type="button" disabled={ocupado} onClick={() => void onSincronizar()} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold text-slate-700"><RefreshCw className="h-4 w-4" />Buscar archivos actualizados en NextPrev</button>}
        </div>
        <div className="mt-4 grid gap-4">
          {grupos.map((g) => <details key={g.titulo} open className="rounded-xl border bg-slate-50/50 p-3">
            <summary className="cursor-pointer px-1 py-2 text-sm font-bold text-slate-900">{g.titulo} · {g.docs.filter(correcto).length}/{g.docs.length} archivos vigentes</summary>
            <div className="mt-2 space-y-2">
              {g.docs.map((d) => <DocumentoAccion key={d.id} documento={d} puedeEditar={puedeEditar && !bloqueada} />)}
            </div>
          </details>)}
          {documentos.length === 0 && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">No hay requisitos configurados. Revisa la plantilla documental del mandante.</p>}
        </div>
      </section>

      <section id="acreditacion-envio" className="scroll-mt-24 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">3. Preparar y registrar el envío</h2>
        <p className="mt-1 text-sm text-slate-600">Descarga el expediente y entrégalo al mandante por su portal, correo o canal acordado. Registrar un envío aquí no envía archivos automáticamente.</p>
        {!listo && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">El envío está bloqueado hasta completar {pendientes.length} requisito(s) obligatorio(s) con archivos reales y vigentes.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={!listo || ocupado} onClick={() => void onZip()} className="inline-flex items-center gap-1 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Download className="h-4 w-4" />Descargar expediente ZIP</button>
          <button type="button" onClick={() => void onPdf()} className="inline-flex items-center gap-1 rounded-xl border px-4 py-2.5 text-sm font-semibold"><FileText className="h-4 w-4" />Descargar índice PDF</button>
        </div>
        {puedeEditar && !bloqueada && !["enviado"].includes(estado) && listo && <>
          <button type="button" onClick={() => setMostrarEnvio(!mostrarEnvio)} className="mt-4 rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-800"><Send className="mr-1 inline h-4 w-4" />Ya entregué los documentos al mandante</button>
          {mostrarEnvio && <div className="mt-3 grid gap-3 rounded-xl border bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Registrar comprobante del envío</p>
            <label className="text-xs text-slate-700">Medio utilizado
              <select value={medio} onChange={(e) => setMedio(e.target.value as typeof medio)} className="mt-1 block w-full rounded-lg border bg-white p-2.5 text-sm"><option value="portal">Plataforma de mandante</option><option value="correo">Correo electrónico</option><option value="presencial">Entrega presencial</option><option value="otro">Otro</option></select>
            </label>
            <label className="text-xs text-slate-700">Destinatario / plataforma
              <input value={destinatario} onChange={(e) => setDestinatario(e.target.value)} placeholder="Ej. Portal contratistas o correo del coordinador" className="mt-1 block w-full rounded-lg border p-2.5 text-sm" />
            </label>
            <label className="text-xs text-slate-700">Referencia de entrega
              <textarea value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Número de folio, ticket, fecha/correo o referencia comprobable" className="mt-1 block w-full rounded-lg border p-2.5 text-sm" rows={2} />
            </label>
            <button type="button" disabled={ocupado || !destinatario.trim() || !referencia.trim()} onClick={() => void registrarEnvio()} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Confirmar que ya se entregó</button>
          </div>}
        </>}
      </section>

      <section id="acreditacion-respuesta" className="scroll-mt-24 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">4. Respuesta del mandante</h2>
        <p className="mt-1 text-sm text-slate-600">Registra la aprobación o las observaciones recibidas. Si hubo observaciones, corrige los archivos señalados y vuelve a enviar.</p>
        {estado === "enviado" ? <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={!puedeEditar} onClick={() => onCambiarEstado("aprobado")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Aprobado por el mandante</button>
          <button type="button" disabled={!puedeEditar} onClick={() => onCambiarEstado("observada")} className="rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-900 disabled:opacity-50">Recibí observaciones</button>
          <button type="button" disabled={!puedeEditar} onClick={() => onCambiarEstado("rechazado")} className="rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-800 disabled:opacity-50">Rechazado</button>
        </div> : estado === "aprobado"
          ? <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"><FolderCheck className="h-4 w-4" />Acreditación aprobada</p>
          : ["observada", "rechazado"].includes(estado)
            ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Revisa las observaciones, corrige documentos y registra un nuevo envío. La información anterior permanece en el historial.</p>
            : <p className="mt-3 text-sm text-slate-500">Este paso estará disponible cuando registres el envío.</p>}
      </section>
    </section>
  );
}
