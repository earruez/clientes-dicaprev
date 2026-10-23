import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, Car, FileWarning, Users } from "lucide-react";
import { getDashboardEjecutivo } from "../actions";

export const metadata = { title: "Control documental | NextPrev" };

type Estado = "pendientes" | "vencidos";
type PageProps = { searchParams?: Promise<{ estado?: string | string[] }> };

export default async function EstadoDocumentalDashboardPage({ searchParams }: PageProps) {
  const params: { estado?: string | string[] } = searchParams ? await searchParams : {};
  const valor = Array.isArray(params.estado) ? params.estado[0] : params.estado;
  const estado: Estado = valor === "vencidos" ? "vencidos" : "pendientes";
  const resumen = await getDashboardEjecutivo();
  const vencidos = estado === "vencidos";
  const total = vencidos ? resumen.kpis.documentosVencidos : resumen.kpis.documentosPendientes;
  const categorias = [
    { nombre: "Documentos de empresa", descripcion: "Documentos legales, corporativos y sus vencimientos.", icon: Building2,
      count: resumen.documentos.empresa[estado], href: "/dicaprev/documentacion" },
    { nombre: "Documentos de trabajadores", descripcion: "Requisitos documentales por trabajador, pendientes y vencimientos.", icon: Users,
      count: resumen.documentos.trabajadores[estado], href: "/dicaprev/trabajadores/control-documental?tab=" + estado },
    { nombre: "Documentos de vehículos", descripcion: "Expedientes de la flota y documentos por regularizar.", icon: Car,
      count: resumen.documentos.vehiculos[estado], href: "/dicaprev/empresa/vehiculos" },
  ];

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <Link href="/dicaprev/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-800">
        <ArrowLeft className="h-4 w-4" /> Volver al dashboard
      </Link>
      <div className="rounded-2xl bg-[#071e41] p-5 text-white shadow-sm sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-200">NextPrev · Seguimiento documental</p>
        <h1 className="mt-2 text-2xl font-bold">{vencidos ? "Documentos vencidos" : "Documentos pendientes"}</h1>
        <p className="mt-2 text-sm text-slate-200">{resumen.empresa.nombre} · Desglose real de empresa, trabajadores y vehículos.</p>
        <div className="mt-5 flex items-center gap-3"><FileWarning className="h-8 w-8 text-amber-300" />
          <strong className="text-4xl tabular-nums">{total}</strong><span className="text-sm text-slate-300">documentos que requieren revisión</span></div>
      </div>
      <nav aria-label="Estado documental" className="flex flex-wrap gap-2">
        <Link href="?estado=pendientes" aria-current={!vencidos ? "page" : undefined} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${!vencidos ? "border-blue-800 bg-blue-800 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>Pendientes</Link>
        <Link href="?estado=vencidos" aria-current={vencidos ? "page" : undefined} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${vencidos ? "border-blue-800 bg-blue-800 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>Vencidos</Link>
      </nav>
      <div className="grid gap-4 md:grid-cols-3">
        {categorias.map(({ nombre, descripcion, icon: Icon, count, href }) => (
          <Link key={nombre} href={href} className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
            <div className="flex items-start justify-between gap-2"><span className="rounded-xl bg-blue-50 p-3 text-blue-800"><Icon className="h-6 w-6" /></span><ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1" /></div>
            <p className="mt-4 text-sm font-semibold text-slate-700">{nombre}</p>
            <strong className="mt-1 block text-3xl font-bold tabular-nums text-[#071e41]">{count}</strong>
            <p className="mt-2 text-xs text-slate-500">{descripcion}</p>
            <p className="mt-4 text-sm font-semibold text-blue-800">Abrir módulo <ArrowRight className="inline h-4 w-4" /></p>
          </Link>
        ))}
      </div>
      <p className="text-xs text-slate-500">Cada categoría abre el módulo operativo correspondiente para consultar y regularizar documentos. Las cifras se calculan a partir de los registros reales de la empresa activa.</p>
    </main>
  );
}
