"use client";

import { useEffect, useState, useTransition } from "react";
import {
  solicitarAccesoDtSst, validarAccesoDtSst, consultarExpedienteDtSst,
  ratificarDocumentoDtSst, salirFiscalizacionDtSst,
} from "@/actions/firmas-fiscalizacion";

type Datos = Awaited<ReturnType<typeof consultarExpedienteDtSst>>;

export default function FiscalizacionFirmaClient({ autorizado }: { autorizado: boolean }) {
  const [sesion, setSesion] = useState(autorizado);
  const [rut, setRut] = useState("");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [codigoSolicitado, setCodigoSolicitado] = useState(false);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, startTransition] = useTransition();

  async function cargar(skip = 0) {
    try {
      const respuesta = await consultarExpedienteDtSst(skip);
      setDatos(respuesta); setError("");
    } catch (e) {
      setDatos(null); setError(e instanceof Error ? e.message : "No se pudo consultar el expediente.");
    }
  }
  useEffect(() => { if (sesion) void cargar(0); }, [sesion]);

  function solicitar(e: React.FormEvent) {
    e.preventDefault(); setError("");
    startTransition(async () => {
      try {
        const respuesta = await solicitarAccesoDtSst(rut, correo);
        setCodigoSolicitado(true); setMensaje(respuesta.mensaje);
      } catch { setError("No fue posible solicitar el código."); }
    });
  }
  function ingresar(e: React.FormEvent) {
    e.preventDefault(); setError("");
    startTransition(async () => {
      try {
        await validarAccesoDtSst(rut, correo, codigo);
        setSesion(true); setMensaje(""); setCodigo("");
      } catch (e) { setError(e instanceof Error ? e.message : "Verificación inválida."); }
    });
  }
  function ratificar(id: string, titulo: string) {
    if (!window.confirm("¿Confirmas que verificaste los antecedentes de «" + titulo + "» y deseas registrar tu ratificación electrónica? Esta acción queda auditada a tu identidad.")) return;
    setError(""); setMensaje("");
    startTransition(async () => {
      try {
        await ratificarDocumentoDtSst(id, true);
        setMensaje("Ratificación electrónica registrada en la auditoría de fiscalización.");
      } catch (e) { setError(e instanceof Error ? e.message : "No se pudo ratificar."); }
    });
  }
  function cerrar() {
    startTransition(async () => {
      await salirFiscalizacionDtSst();
      setSesion(false); setDatos(null); setCodigoSolicitado(false);
    });
  }
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl bg-slate-900 p-7 text-white">
          <p className="text-sm font-semibold text-sky-200">NextPrev · Documentación laboral electrónica</p>
          <h1 className="mt-2 text-2xl font-semibold">Portal de fiscalización · Documentos SST</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">Consulta directa por RUT del empleador, acceso seguro para fiscalizadores habilitados por el operador independiente, descarga de documentos y ratificación electrónica.</p>
        </header>
        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
        {mensaje ? <p role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">{mensaje}</p> : null}
        {!sesion ? (
          <section className="max-w-xl rounded-2xl bg-white p-7 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Identificación del fiscalizador</h2>
            <form className="space-y-4" onSubmit={codigoSolicitado ? ingresar : solicitar}>
              <label className="block text-sm font-medium">RUT empleador
                <input required value={rut} onChange={(e) => setRut(e.target.value)} placeholder="76.123.456-7"
                  className="mt-1 block w-full rounded-xl border border-slate-200 p-3"/>
              </label>
              <label className="block text-sm font-medium">Correo institucional habilitado por NextPrev
                <input type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 p-3"/>
              </label>
              {codigoSolicitado ? (
                <label className="block text-sm font-medium">Código de verificación
                  <input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}"
                    value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="mt-1 block w-full rounded-xl border border-slate-200 p-3"/>
                </label>
              ) : null}
              <button disabled={cargando} type="submit" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {cargando ? "Procesando..." : codigoSolicitado ? "Ingresar al expediente" : "Solicitar código"}
              </button>
              {codigoSolicitado ? <button type="button" onClick={() => void solicitarAccesoDtSst(rut, correo).then((r)=>setMensaje(r.mensaje)).catch(()=>setError("No fue posible reenviar."))} className="ml-3 text-sm text-sky-800 underline">Reenviar código</button> : null}
            </form>
            <p className="mt-4 text-xs text-slate-500">El proveedor verifica previamente la identidad y habilita el correo del inspector; Baker no administra estos permisos.</p>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-slate-900">{datos?.empresa.nombre || "Consulta documental SST"} · {datos?.empresa.rut || ""}</p>
                <p className="mt-1 text-xs text-slate-500">{datos?.inspector || "Fiscalizador"} {datos?.rutInspector ? "· " + datos.rutInspector : ""} · {datos?.total ?? "…"} solicitudes</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => void cargar(0)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Actualizar</button>
                <button onClick={cerrar} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Cerrar sesión</button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-700"><tr>
                  <th className="p-3">Documento / tipo</th><th className="p-3">Trabajador</th>
                  <th className="p-3">Estado</th><th className="p-3">Firma / identidad</th><th className="p-3">Acciones de fiscalización</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {datos?.documentos.map((doc) => (
                    <tr key={doc.id}>
                      <td className="p-3"><strong>{doc.titulo}</strong><div className="text-xs text-slate-500">{doc.tipoEvidencia}</div></td>
                      <td className="p-3">{doc.nombreFirmante}<div className="text-xs text-slate-500">{doc.rutFirmante}</div></td>
                      <td className="p-3">{doc.estado}</td>
                      <td className="p-3 text-xs">{doc.firmadoAt ? new Date(doc.firmadoAt).toLocaleString("es-CL") : "Pendiente"}<div>{doc.otp ? "OTP validado" : "Sin OTP"}</div></td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <a href={"/api/fiscalizacion/firmas/archivo?id=" + encodeURIComponent(doc.id) + "&tipo=original"} target="_blank" rel="noreferrer" className="rounded-lg border px-2 py-2 text-xs text-sky-800">PDF original</a>
                          {doc.estado === "firmado" ? <>
                            <a href={"/api/fiscalizacion/firmas/archivo?id=" + encodeURIComponent(doc.id) + "&tipo=constancia"} className="rounded-lg border px-2 py-2 text-xs text-emerald-800">Constancia</a>
                            <button disabled={cargando} onClick={() => ratificar(doc.id, doc.titulo)} className="rounded-lg border px-2 py-2 text-xs text-slate-900">Ratificar</button>
                          </> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {datos && datos.documentos.length === 0 ? <p className="p-6 text-sm text-slate-500">No existen antecedentes registrados en este módulo SST.</p> : null}
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <button disabled={!datos || datos.skip === 0 || cargando} onClick={() => void cargar(Math.max(0, (datos?.skip || 0) - 100))} className="rounded-lg border px-4 py-2 disabled:opacity-40">Anterior</button>
              <span className="self-center text-slate-600">Mostrando {datos ? Math.min(datos.total, datos.skip + 1) : 0}–{datos ? Math.min(datos.total, datos.skip + datos.documentos.length) : 0} de {datos?.total ?? 0}</span>
              <button disabled={!datos || datos.skip + 100 >= datos.total || cargando} onClick={() => void cargar((datos?.skip || 0) + 100)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Siguiente</button>
            </div>
            <p className="text-xs text-slate-500">La ratificación queda registrada con identidad autorizada, fecha, IP y huella de evidencia. Este portal no reemplaza los canales oficiales de fiscalización ni certifica jurídicamente el software.</p>
          </section>
        )}
      </div>
    </main>
  );
}
