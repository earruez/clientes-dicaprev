"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSignature, FileText, Link2, RefreshCw, Send, ShieldCheck, XCircle } from "lucide-react";
import {
  listarFirmasExternas, listarTrabajadoresFirmaTemporal, reenviarFirmaExterna, revocarFirmaExterna,
} from "@/actions/firmas-externas";

type Solicitud = Awaited<ReturnType<typeof listarFirmasExternas>>[number];
type Trabajador = Awaited<ReturnType<typeof listarTrabajadoresFirmaTemporal>>[number];
const evidencias = [
  { id: "irl", nombre: "Información de Riesgos Laborales (IRL)" },
  { id: "extintores", nombre: "Capacitación uso y manejo de extintores" },
  { id: "capacitacion_epp", nombre: "Capacitación teórica y práctica de EPP" },
  { id: "entrega_epp", nombre: "Entrega de elementos de protección personal" },
  { id: "reglamento", nombre: "Recepción de reglamento interno" },
  { id: "procedimientos", nombre: "Difusión de procedimiento de trabajo seguro" },
  { id: "miper", nombre: "Difusión de matriz de riesgos" },
  { id: "otra", nombre: "Otra documentación SST" },
] as const;

const colorEstado: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-800",
  firmado: "bg-emerald-50 text-emerald-800",
  rechazado: "bg-rose-50 text-rose-800",
  expirado: "bg-slate-100 text-slate-600",
  revocado: "bg-slate-100 text-slate-600",
};
const nombreEstado: Record<string, string> = {
  pendiente: "Pendiente", firmado: "Firmado", rechazado: "Rechazado",
  expirado: "Vencido", revocado: "Revocado",
};

function fecha(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago",
  });
}

export default function FirmasExternasPage() {
  const [filas, setFilas] = useState<Solicitud[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [trabajadorId, setTrabajadorId] = useState("");
  const [modalidadContrato, setModalidadContrato] = useState<"Plazo Fijo" | "Por Obra">("Plazo Fijo");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaTermino, setFechaTermino] = useState("");
  const [tipoEvidencia, setTipoEvidencia] = useState<(typeof evidencias)[number]["id"]>("irl");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [correo, setCorreo] = useState("");
  const [dias, setDias] = useState(7);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [enlace, setEnlace] = useState("");

  const cargar = useCallback(async () => {
    try {
      const [firmas, personas] = await Promise.all([listarFirmasExternas(), listarTrabajadoresFirmaTemporal()]);
      setFilas(firmas);
      setTrabajadores(personas);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir la bandeja.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  async function nuevaSolicitud(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ocupado || !archivo) return;
    setOcupado("crear"); setError(""); setAviso(""); setEnlace("");
    try {
      const datos = new FormData();
      datos.set("archivo", archivo);
      datos.set("titulo", titulo.trim());
      datos.set("nombreFirmante", nombre.trim());
      datos.set("rutFirmante", rut.trim());
      datos.set("emailFirmante", correo.trim());
      datos.set("diasVigencia", String(dias));
      datos.set("trabajadorId", trabajadorId);
      datos.set("modalidadContrato", modalidadContrato);
      datos.set("fechaInicio", fechaInicio);
      datos.set("fechaTermino", fechaTermino);
      datos.set("tipoEvidencia", tipoEvidencia);
      const respuesta = await fetch("/api/dicaprev/firmas-externas", { method: "POST", body: datos });
      const resultado = await respuesta.json() as { error?: string; aviso?: string; enlace?: string };
      if (!respuesta.ok) throw new Error(resultado.error || "No fue posible enviar el documento.");
      setAviso(resultado.aviso || "Solicitud creada.");
      setEnlace(resultado.enlace || "");
      setTitulo(""); setNombre(""); setRut(""); setCorreo(""); setArchivo(null); setDias(7);
      setTrabajadorId(""); setFechaInicio(""); setFechaTermino(""); setTipoEvidencia("irl");
      const selector = document.getElementById("archivo-firma-externa") as HTMLInputElement | null;
      if (selector) selector.value = "";
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la solicitud.");
    } finally {
      setOcupado("");
    }
  }

  async function ejecutar(id: string, accion: "reenviar" | "revocar") {
    if (ocupado) return;
    if (accion === "revocar" && !window.confirm("¿Revocar el enlace de firma? El destinatario ya no podrá usarlo.")) return;
    setOcupado(id); setError(""); setAviso(""); setEnlace("");
    try {
      if (accion === "revocar") {
        await revocarFirmaExterna(id);
        setAviso("El enlace quedó revocado.");
      } else {
        const resultado = await reenviarFirmaExterna(id);
        setEnlace(resultado.enlace);
        setAviso(resultado.enviado ? "Nuevo enlace enviado. El anterior ya no funciona." : "El enlace se renovó, pero el correo no pudo entregarse. Cópialo aquí.");
      }
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la acción.");
    } finally {
      setOcupado("");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-sky-950 p-6 text-white md:p-8">
        <div className="flex items-center gap-3 text-sm font-medium text-sky-200"><FileSignature size={18} /> Documentación · Firma simple</div>
        <h1 className="mt-2 text-2xl font-semibold md:text-3xl">Firmas SST · Personal temporal</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">Documentos preventivos de personas contratadas directamente por la empresa por plazo fijo u obra/faena, incluso por pocos días. No corresponde a empresas contratistas.</p>
      </div>

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {aviso ? <div role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">{aviso}</div> : null}
      {enlace ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <Link2 size={17} className="text-slate-600" />
          <span className="min-w-0 flex-1 break-all text-sm">{enlace}</span>
          <button type="button" onClick={() => void navigator.clipboard.writeText(enlace)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Copiar enlace</button>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex items-center gap-2"><Send size={18} className="text-emerald-700" /><h2 className="text-lg font-semibold text-slate-900">Nueva solicitud de firma SST</h2></div>
        <p className="mb-4 text-sm text-slate-600">Selecciona un trabajador registrado en <strong>Personas</strong>. Si falta, regístralo allí primero. El empleador es siempre la empresa activa en NextPrev.</p>
        <form onSubmit={(e) => void nuevaSolicitud(e)} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">Trabajador contratado por la empresa
            <select required value={trabajadorId} onChange={(e) => {
              const id = e.target.value;
              setTrabajadorId(id);
              const t = trabajadores.find((x) => x.id === id);
              setNombre(t?.nombre || "");
              setRut(t?.rut || "");
              setCorreo(t?.email || "");
              if (t?.tipoContrato === "Por Obra" || t?.tipoContrato === "Plazo Fijo") setModalidadContrato(t.tipoContrato);
            }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="">Seleccionar trabajador</option>
              {trabajadores.map((t) => <option key={t.id} value={t.id}>{t.nombre} · {t.rut} · {t.centroTrabajo}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Tipo de contrato laboral
            <select required value={modalidadContrato} onChange={(e) => setModalidadContrato(e.target.value as "Plazo Fijo" | "Por Obra")} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="Plazo Fijo">Plazo fijo</option><option value="Por Obra">Por obra o faena</option>
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Inicio de contratación
            <input required type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Término / fecha referencial de faena
            <input required type="date" value={fechaTermino} onChange={(e) => setFechaTermino(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">Tipo de documento de prevención
            <select required value={tipoEvidencia} onChange={(e) => setTipoEvidencia(e.target.value as (typeof evidencias)[number]["id"])} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              {evidencias.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Nombre del documento
            <input required maxLength={180} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej.: Declaración de recepción de antecedentes" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Documento PDF (máximo 10 MB)
            <input id="archivo-firma-externa" required type="file" accept=".pdf,application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Nombre completo del firmante
            <input required maxLength={160} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellidos" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">RUT del firmante
            <input required value={rut} onChange={(e) => setRut(e.target.value)} placeholder="12.345.678-9" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Correo del firmante
            <input required type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="persona@empresa.cl" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Vigencia del enlace (días)
            <input required type="number" min={1} max={30} value={dias} onChange={(e) => setDias(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
            <p className="max-w-lg text-xs text-slate-500">El trabajador recibirá el enlace en su correo personal. La firma registra recepción y aceptación del documento, pero no reemplaza las actividades prácticas presenciales ni el consentimiento para usar documentación electrónica.</p>
            <button disabled={!!ocupado || !archivo} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Send size={16} />{ocupado === "crear" ? "Guardando..." : "Enviar a firma"}</button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 md:p-6">
          <div><h2 className="text-lg font-semibold text-slate-900">Bandeja de firmas</h2><p className="text-xs text-slate-500">Últimas 200 solicitudes de la empresa activa.</p></div>
          <button type="button" onClick={() => void cargar()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700"><RefreshCw size={14} /> Actualizar</button>
        </div>
        {cargando ? <p className="p-6 text-sm text-slate-500">Cargando...</p> : filas.length === 0 ? <p className="p-6 text-sm text-slate-500">Todavía no hay documentos enviados a firma.</p> : (
          <div className="divide-y divide-slate-100">
            {filas.map((fila) => (
              <article key={fila.id} className="flex flex-wrap items-start justify-between gap-4 p-5 md:p-6">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText size={16} className="text-slate-500" />
                    <strong className="text-sm text-slate-900">{fila.titulo}</strong>
                    <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + (colorEstado[fila.estado] || colorEstado.pendiente)}>{nombreEstado[fila.estado] || fila.estado}</span>
                  </div>
                  <p className="text-xs text-slate-600">{fila.nombreFirmante} · {fila.emailFirmante}</p>
                  <p className="text-xs text-slate-500">{fila.archivo} · Solicitado {fecha(fila.creadoAt)} · {fila.firmadoAt ? "Firmado " + fecha(fila.firmadoAt) : "Vence " + fecha(fila.expiraAt)}</p>
                  <p className="text-xs text-slate-500">{evidencias.find((t) => t.id === fila.tipoEvidencia)?.nombre || "Documento SST"} · {fila.modalidadContrato} · {fila.fechaInicioContrato} al {fila.fechaTerminoContrato}</p>
                  <p className="font-mono text-[10px] text-slate-400" title="Huella SHA-256 del PDF original">SHA-256: {fila.hashOriginal || "—"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {fila.archivoNombre ? (
                    <a href={"/api/dicaprev/documentacion/archivo/" + encodeURIComponent(fila.archivoNombre)} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">PDF original</a>
                  ) : null}
                  {fila.certificadoDisponible ? (
                    <a className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800" href={"/api/dicaprev/firmas-externas/constancia?id=" + encodeURIComponent(fila.id)}><ShieldCheck size={15} /> Constancia PDF</a>
                  ) : null}
                  {fila.estado !== "firmado" && fila.estado !== "pendiente" ? (
                    <button disabled={!!ocupado} onClick={() => void ejecutar(fila.id, "reenviar")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700">Nuevo enlace</button>
                  ) : null}
                  {fila.estado === "pendiente" ? (
                    <>
                      <button disabled={!!ocupado} onClick={() => void ejecutar(fila.id, "reenviar")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700">Reenviar</button>
                      <button disabled={!!ocupado} onClick={() => void ejecutar(fila.id, "revocar")} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs text-rose-700"><XCircle size={14} /> Revocar</button>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <p className="text-xs text-slate-500">La constancia registra aceptación, firmante, fecha, huellas SHA-256 e información técnica. Es firma electrónica simple, no firma electrónica avanzada ni certificación de identidad independiente.</p>
    </div>
  );
}
