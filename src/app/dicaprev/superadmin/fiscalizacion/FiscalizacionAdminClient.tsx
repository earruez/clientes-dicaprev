"use client";
import { useEffect, useState, useTransition } from "react";
import { obtenerInspectoresSst, registrarInspectorSst, cambiarAccesoInspectorSst } from "@/actions/firmas-fiscalizacion";

type Datos = Awaited<ReturnType<typeof obtenerInspectoresSst>>;
export default function FiscalizacionAdminClient() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [empresaId, setEmpresaId] = useState("");
  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [email, setEmail] = useState("");
  const [verificado, setVerificado] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [pendiente, startTransition] = useTransition();
  async function cargar() {
    try { setDatos(await obtenerInspectoresSst()); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudieron cargar los accesos."); }
  }
  useEffect(() => { void cargar(); }, []);
  function crear(e: React.FormEvent) {
    e.preventDefault(); setError("");
    startTransition(async () => {
      try {
        const r = await registrarInspectorSst({
          empresaId, inspectorEmail: email, inspectorNombre: nombre,
          inspectorRut: rut, identidadVerificada: verificado,
        });
        setMensaje(r.correoEnviado ? "Acceso creado y correo enviado al fiscalizador." : "Acceso creado, pero falló el correo de habilitación.");
        setNombre(""); setRut(""); setEmail(""); setVerificado(false);
        await cargar();
      } catch (e) { setError(e instanceof Error ? e.message : "No se pudo habilitar al inspector."); }
    });
  }
  function cambiar(id: string, activo: boolean) {
    if (!window.confirm(activo ? "¿Reactivar este acceso?" : "¿Revocar acceso de fiscalización?")) return;
    startTransition(async () => {
      try { await cambiarAccesoInspectorSst(id, activo); await cargar(); }
      catch (e) { setError(e instanceof Error ? e.message : "No se pudo modificar el acceso."); }
    });
  }
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="rounded-3xl bg-slate-900 p-7 text-white">
        <p className="text-sm text-sky-200">NextPrev · SUPERADMIN</p>
        <h1 className="mt-2 text-2xl font-semibold">Acceso independiente de fiscalización SST</h1>
        <p className="mt-2 text-sm text-slate-300">Solo el operador del SaaS autoriza fiscalizadores después de corroborar su identidad por un canal externo. El empleador no controla estos permisos.</p>
      </header>
      {error ? <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {mensaje ? <div role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{mensaje}</div> : null}
      <form className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-2" onSubmit={crear}>
        <h2 className="text-lg font-semibold md:col-span-2">Habilitar inspector</h2>
        <label className="text-sm">Empresa fiscalizada
          <select required className="mt-1 block w-full rounded-lg border p-3" value={empresaId} onChange={(e)=>setEmpresaId(e.target.value)}>
            <option value="">Seleccionar empleador</option>
            {datos?.empresas.filter(e=>!!e.rut).map(e=><option key={e.id} value={e.id}>{e.nombre} · {e.rut}</option>)}
          </select>
        </label>
        <label className="text-sm">Nombre completo fiscalizador
          <input required className="mt-1 block w-full rounded-lg border p-3" value={nombre} onChange={(e)=>setNombre(e.target.value)} />
        </label>
        <label className="text-sm">RUT fiscalizador
          <input required className="mt-1 block w-full rounded-lg border p-3" value={rut} onChange={(e)=>setRut(e.target.value)} />
        </label>
        <label className="text-sm">Correo institucional fiscalizador
          <input type="email" required className="mt-1 block w-full rounded-lg border p-3" value={email} onChange={(e)=>setEmail(e.target.value)} />
        </label>
        <label className="flex items-start gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={verificado} onChange={(e)=>setVerificado(e.target.checked)} className="mt-1" required />
          <span>Confirmo que NextPrev verificó de manera independiente el nombre, RUT, función y correo institucional de la persona. Baker no realizó ni autorizó esta validación.</span>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pendiente || !verificado} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Habilitar acceso</button>
        </div>
      </form>
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Accesos de fiscalización</h2>
        {datos?.accesos.length ? (
          <div className="divide-y divide-slate-100">{datos.accesos.map((a)=><div className="flex flex-wrap items-center justify-between gap-3 py-4" key={a.id}>
            <div className="text-sm">
              <strong>{a.inspectorNombre}</strong> · {a.inspectorRut} <span className="text-slate-600">({a.inspectorEmail})</span>
              <p className="mt-1 text-xs text-slate-500">{a.empresa.nombre} · RUT {a.empresa.rut} · {a.activo ? "Habilitado" : "Revocado"}</p>
            </div>
            <button disabled={pendiente} onClick={()=>cambiar(a.id,!a.activo)} className="rounded-lg border px-3 py-2 text-xs">{a.activo ? "Revocar" : "Reactivar"}</button>
          </div>)}</div>
        ) : <p className="text-sm text-slate-500">Todavía no existen inspectores habilitados.</p>}
      </section>
    </main>
  );
}
