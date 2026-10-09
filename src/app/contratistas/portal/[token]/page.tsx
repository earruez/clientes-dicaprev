import type { Metadata } from "next";
import { obtenerPortalContratista } from "@/actions/contratistas/portal";
import PortalContratistaClient from "./PortalContratistaClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Carpeta documental de contratista · NextPrev",
  robots: { index: false, follow: false },
};

export default async function PortalContratistaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const portal = await obtenerPortalContratista(token);
  if (!portal) {
    return <main className="flex min-h-[100dvh] items-center justify-center bg-[#0b1428] px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(16,185,129,0.12),transparent_52%),radial-gradient(circle_at_95%_80%,rgba(14,165,233,0.13),transparent_50%)]" aria-hidden="true"/>
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/10 p-7 text-center shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-400 via-emerald-500 to-sky-500 shadow-lg shadow-emerald-500/20">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden="true"><path d="M5 5l9 7-9 7V5z" fill="white"/><path d="M13 5l6 7-6 7V5z" fill="rgba(255,255,255,0.5)"/></svg>
        </div>
        <p className="mt-5 text-xs font-bold tracking-[0.18em] text-emerald-300">NEXTPREV</p>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white">Tu invitación no está disponible</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">Este enlace expiró, fue reemplazado o el expediente ya se cerró. Solicita una nueva invitación a tu empresa mandante.</p>
        <p className="mt-7 border-t border-white/10 pt-5 text-xs text-slate-400">Acceso privado · Portal de contratistas</p>
      </div>
    </main>;
  }
  return <PortalContratistaClient token={token} inicial={portal}/>;
}
