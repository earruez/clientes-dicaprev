import { requirePermission } from "@/server/auth/permissions";
import { prisma } from "@/lib/prisma";
import { generarEmailPermiso } from "../utils/email-templates";
import { PERMISO_ESTADOS } from "../types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function MuestraEmailsPage() {
  const { empresaId } = await requirePermission("canManagePermisos");

  const permiso = await prisma.permisoInstalacion.findFirst({
    where: { empresaId },
    include: { organismo: true, responsable: true, cliente: true },
    orderBy: { createdAt: "asc" },
  });

  if (!permiso) {
    return (
      <div className="space-y-4">
        <Link href="/dicaprev/permisos">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <p className="text-slate-600">
          Crea al menos un permiso para poder generar una muestra de los correos.
        </p>
      </div>
    );
  }

  const muestras: { titulo: string; html: string }[] = [
    {
      titulo: "1. Permiso creado",
      html: generarEmailPermiso(permiso, permiso.responsable, "PERMISO_CREADO"),
    },
    {
      titulo: `2. Cambio de estado → ${PERMISO_ESTADOS.PREPARANDO_DOCUMENTACION}`,
      html: generarEmailPermiso({ ...permiso, estado: "PREPARANDO_DOCUMENTACION" }, permiso.responsable, "CAMBIO_ESTADO", {
        estadoAnterior: "PERMISO_CREADO",
      }),
    },
    {
      titulo: `3. Cambio de estado → ${PERMISO_ESTADOS.SOLICITADO}`,
      html: generarEmailPermiso({ ...permiso, estado: "SOLICITADO" }, permiso.responsable, "CAMBIO_ESTADO", {
        estadoAnterior: "PREPARANDO_DOCUMENTACION",
      }),
    },
    {
      titulo: `4. Cambio de estado → ${PERMISO_ESTADOS.OBSERVADO} (con link de respuesta)`,
      html: generarEmailPermiso({ ...permiso, estado: "OBSERVADO" }, permiso.responsable, "CAMBIO_ESTADO", {
        estadoAnterior: "SOLICITADO",
        comentario: "Falta adjuntar el certificado de factibilidad eléctrica y el plano firmado por el propietario.",
        tokenRespuestaObservacion: "muestra-token-0000000000000000000000000000000",
      }),
    },
    {
      titulo: `5. Cambio de estado → ${PERMISO_ESTADOS.APROBADO}`,
      html: generarEmailPermiso({ ...permiso, estado: "APROBADO" }, permiso.responsable, "CAMBIO_ESTADO", {
        estadoAnterior: "SOLICITADO",
      }),
    },
    {
      titulo: `6. Cambio de estado → ${PERMISO_ESTADOS.CANCELADO}`,
      html: generarEmailPermiso({ ...permiso, estado: "CANCELADO" }, permiso.responsable, "CAMBIO_ESTADO", {
        estadoAnterior: "PERMISO_CREADO",
        comentario: "El cliente decidió no continuar con la instalación en esta dirección.",
      }),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dicaprev/permisos">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Muestra de correos de permisos</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            Vista previa (no se envían correos reales). Generado a partir del permiso &quot;{permiso.direccion}&quot;.
          </p>
        </div>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
        Este entorno local no tiene configurado un proveedor de correo (falta <code>RESEND_API_KEY</code> y{" "}
        <code>EMAIL_FROM</code> en <code>.env.local</code>), por lo que no se pueden enviar correos reales a
        dianamarin@dicaprev.cl todavía. Estas son las mismas plantillas HTML que se enviarían.
      </div>

      <div className="space-y-8">
        {muestras.map((muestra) => (
          <div key={muestra.titulo} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 font-semibold text-sm text-slate-900">
              {muestra.titulo}
            </div>
            <iframe title={muestra.titulo} srcDoc={muestra.html} className="w-full h-[700px] border-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
