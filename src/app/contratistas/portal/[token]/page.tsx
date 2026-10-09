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
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Invitación no disponible</h1>
        <p className="mt-3 text-sm text-slate-600">Este enlace no existe, ha expirado o el expediente fue cerrado. Solicita una nueva invitación a la empresa mandante.</p>
      </div>
    </main>;
  }
  return <PortalContratistaClient token={token} inicial={portal}/>;
}
