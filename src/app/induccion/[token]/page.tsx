import { getInduccionPorToken } from "@/actions/inducciones";
import InduccionClient from "./InduccionClient";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function InduccionPage({ params }: PageProps) {
  const { token } = await params;
  const induccion = await getInduccionPorToken(token);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e8eefc_0%,_#f8fafc_42%,_#f8fafc_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {induccion ? (
          <InduccionClient induccion={induccion} />
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">Enlace inválido</h1>
            <p className="mt-2 text-sm text-slate-500">
              El enlace de inducción no existe o ya no está disponible.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
