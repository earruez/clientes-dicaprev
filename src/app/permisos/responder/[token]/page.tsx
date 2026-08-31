import { obtenerPermisoParaResponder } from "@/app/dicaprev/permisos/actions/public";
import { ResponderObservacionForm } from "./ResponderObservacionForm";

export default async function ResponderObservacionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const permiso = await obtenerPermisoParaResponder(token);

  if (!permiso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Enlace inválido o expirado</h1>
          <p className="text-slate-600 text-sm mt-2">
            Este enlace ya fue utilizado o el permiso ya no está en estado de observación. Si crees que esto es un
            error, contacta a NextPrev.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-lg p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Responder observación de permiso</h1>
          <p className="text-slate-600 text-sm mt-1">
            {permiso.direccion} · {permiso.organismoNombre}
          </p>
        </div>

        {permiso.ultimaObservacion && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs font-semibold text-orange-800 uppercase mb-1">Observación del organismo</p>
            <p className="text-sm text-orange-900 whitespace-pre-line">{permiso.ultimaObservacion}</p>
          </div>
        )}

        <ResponderObservacionForm token={token} />
      </div>
    </div>
  );
}
