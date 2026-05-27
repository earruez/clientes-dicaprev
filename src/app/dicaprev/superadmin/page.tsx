import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/permissions";
import { COMPANY_MODULE_LABELS, COMPANY_MODULES } from "@/lib/company-modules";
import {
  createEmpresaAction,
  createUsuarioAction,
  ensureBackfillAction,
  getSuperadminData,
  toggleEmpresaActivaAction,
  toggleEmpresaModuloAction,
  toggleUsuarioActivoAction,
  toggleUsuarioEmpresaActivoAction,
  updateEmpresaAction,
  upsertUsuarioEmpresaAction,
} from "./actions";

const SUPERADMIN_ROLES = [
  "SUPERADMIN",
  "ADMIN_EMPRESA",
  "PREVENCIONISTA",
  "SUPERVISOR",
  "TRABAJADOR",
  "AUDITOR",
  "LECTURA",
] as const;

function appUrl() {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export default async function SuperadminPage() {
  try {
    await requireRole("SUPERADMIN");
  } catch {
    redirect("/dicaprev/dashboard");
  }

  const data = await getSuperadminData();
  const baseUrl = appUrl();

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Admin interno</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Panel SUPERADMIN</h1>
        <p className="mt-2 text-sm text-slate-600">
          Administración mínima de empresas, usuarios, asignaciones y módulos por empresa.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total empresas</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{data.totals.empresas}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total usuarios</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{data.totals.usuarios}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Empresas activas</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{data.totals.empresasActivas}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Usuarios activos</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{data.totals.usuariosActivos}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Backfill y consistencia</h2>
          <form action={ensureBackfillAction}>
            <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Ejecutar backfill idempotente
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Empresas</h2>
        <form action={createEmpresaAction} className="mt-4 grid gap-3 md:grid-cols-4">
          <input name="nombre" placeholder="Nombre empresa" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="rut" placeholder="RUT (opcional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Crear empresa</button>
        </form>

        <div className="mt-4 space-y-3">
          {data.empresas.map((empresa) => (
            <div key={empresa.id} className="rounded-lg border border-slate-200 p-3">
              <form action={updateEmpresaAction} className="grid gap-2 md:grid-cols-4">
                <input type="hidden" name="empresaId" value={empresa.id} />
                <input name="nombre" defaultValue={empresa.nombre} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <input name="rut" defaultValue={empresa.rut ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Guardar
                </button>
              </form>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>ID: {empresa.id}</span>
                <form action={toggleEmpresaActivaAction}>
                  <input type="hidden" name="empresaId" value={empresa.id} />
                  <input type="hidden" name="activa" value={empresa.activa ? "0" : "1"} />
                  <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    {empresa.activa ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Usuarios</h2>
        <form action={createUsuarioAction} className="mt-4 grid gap-3 md:grid-cols-5">
          <input name="nombre" placeholder="Nombre" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="email" placeholder="email@dominio.cl" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select name="rol" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {SUPERADMIN_ROLES.map((rol) => (
              <option key={rol} value={rol}>
                {rol}
              </option>
            ))}
          </select>
          <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Crear usuario</button>
        </form>

        <div className="mt-4 space-y-3">
          {data.usuarios.map((usuario) => {
            const inviteLink = `${baseUrl}/login?mode=invite&email=${encodeURIComponent(usuario.email)}`;
            const resetLink = `${baseUrl}/login?mode=reset&email=${encodeURIComponent(usuario.email)}`;
            return (
              <div key={usuario.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{usuario.nombre}</p>
                    <p className="text-xs text-slate-500">{usuario.email}</p>
                    <p className="text-xs text-slate-500">Rol global: {usuario.rol}</p>
                  </div>
                  <form action={toggleUsuarioActivoAction}>
                    <input type="hidden" name="usuarioId" value={usuario.id} />
                    <input type="hidden" name="activo" value={usuario.activo ? "0" : "1"} />
                    <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      {usuario.activo ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-slate-500">
                  <p>Invitación: {inviteLink}</p>
                  <p>Reset: {resetLink}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Asignación usuario-empresa y rol por empresa</h2>

        <form action={upsertUsuarioEmpresaAction} className="mt-4 grid gap-3 md:grid-cols-5">
          <select name="usuarioId" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Usuario</option>
            {data.usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.email}
              </option>
            ))}
          </select>
          <select name="empresaId" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Empresa</option>
            {data.empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre}
              </option>
            ))}
          </select>
          <select name="rol" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {SUPERADMIN_ROLES.map((rol) => (
              <option key={rol} value={rol}>
                {rol}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="activo" defaultChecked />
            Activo
          </label>
          <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Asignar / actualizar</button>
        </form>

        <div className="mt-4 space-y-2">
          {data.asignaciones.map((asignacion) => (
            <div key={asignacion.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">{asignacion.usuarioEmail}</span> → {asignacion.empresaNombre} ({asignacion.rol})
              </p>
              <form action={toggleUsuarioEmpresaActivoAction}>
                <input type="hidden" name="id" value={asignacion.id} />
                <input type="hidden" name="activo" value={asignacion.activo ? "0" : "1"} />
                <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  {asignacion.activo ? "Desactivar" : "Activar"}
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Módulos por empresa</h2>
        <div className="mt-4 space-y-4">
          {data.empresas.map((empresa) => {
            const modulosEmpresa = data.modulos.filter((modulo) => modulo.empresaId === empresa.id);
            return (
              <div key={empresa.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">{empresa.nombre}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {COMPANY_MODULES.map((modulo) => {
                    const current = modulosEmpresa.find((row) => row.modulo === modulo);
                    const activo = current?.activo ?? true;
                    return (
                      <form key={modulo} action={toggleEmpresaModuloAction} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                        <input type="hidden" name="empresaId" value={empresa.id} />
                        <input type="hidden" name="modulo" value={modulo} />
                        <input type="hidden" name="activo" value={activo ? "0" : "1"} />
                        <span className="text-xs text-slate-700">{COMPANY_MODULE_LABELS[modulo]}</span>
                        <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          {activo ? "ON" : "OFF"}
                        </button>
                      </form>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
