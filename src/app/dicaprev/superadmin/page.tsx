import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/permissions";
import { getSuperadminData } from "./actions";
import SuperadminClient from "./SuperadminClient";

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
  const appUrl_Str = appUrl();

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

      <SuperadminClient data={data} appUrl={appUrl_Str} />
    </div>
  );
}
