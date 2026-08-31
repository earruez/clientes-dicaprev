import { Suspense } from "react";
import { requirePermission } from "@/server/auth/permissions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { obtenerClientes, obtenerOrganismos, obtenerResponsables, obtenerComunasConRegion } from "./actions/permisos";
import { NuevoPermisoModal } from "./NuevoPermisoModal";
import { InformeMensualModal } from "./InformeMensualModal";
import { PermisosTable } from "./PermisosTable";

async function PermisosContent() {
  const { empresaId } = await requirePermission("canReadPermisos");

  // Obtener estadísticas
  const [permisos, clientes, organismos, responsables, comunas] = await Promise.all([
    prisma.permisoInstalacion.findMany({
      where: { empresaId },
      include: {
        organismo: true,
        responsable: true,
        cliente: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    obtenerClientes({ activos: true }),
    obtenerOrganismos({ activos: true }),
    obtenerResponsables({ activos: true }),
    obtenerComunasConRegion(),
  ]);

  const estadisticas = {
    permisoCreado: permisos.filter((p) => p.estado === "PERMISO_CREADO").length,
    preparandoDocumentacion: permisos.filter((p) => p.estado === "PREPARANDO_DOCUMENTACION").length,
    solicitado: permisos.filter((p) => p.estado === "SOLICITADO").length,
    observados: permisos.filter((p) => p.estado === "OBSERVADO").length,
    aprobados: permisos.filter((p) => p.estado === "APROBADO").length,
    cancelados: permisos.filter((p) => p.estado === "CANCELADO").length,
  };

  const aprobadosConDuracion = permisos.filter((p) => p.estado === "APROBADO");
  const tiempoPromedioAprobacionDias =
    aprobadosConDuracion.length > 0
      ? Math.round(
          aprobadosConDuracion.reduce(
            (acc, p) => acc + (p.updatedAt.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24),
            0,
          ) / aprobadosConDuracion.length,
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Permisos de instalación</h1>
          <p className="text-slate-600 mt-1">Gestiona solicitudes, plazos y estados de permisos asociados a instalaciones.</p>
          <p className="text-slate-500 text-sm mt-1">
            Tiempo promedio de aprobación:{" "}
            <span className="font-semibold text-slate-700">
              {tiempoPromedioAprobacionDias === null ? "sin datos aún" : `${tiempoPromedioAprobacionDias} días`}
            </span>
          </p>
          <Link href="/dicaprev/permisos/emails-muestra" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
            Ver muestra de correos de notificación
          </Link>
        </div>
        <div className="flex items-start gap-3">
          <InformeMensualModal />
          <NuevoPermisoModal clientes={clientes} organismos={organismos} responsables={responsables} comunas={comunas} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600 font-medium">Permiso creado</div>
          <div className="text-2xl font-bold text-blue-600 mt-2">{estadisticas.permisoCreado}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600 font-medium">Preparando documentación</div>
          <div className="text-2xl font-bold text-cyan-600 mt-2">{estadisticas.preparandoDocumentacion}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600 font-medium">Solicitado / en espera</div>
          <div className="text-2xl font-bold text-indigo-600 mt-2">{estadisticas.solicitado}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600 font-medium">Observados</div>
          <div className="text-2xl font-bold text-orange-600 mt-2">{estadisticas.observados}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600 font-medium">Aprobados</div>
          <div className="text-2xl font-bold text-green-600 mt-2">{estadisticas.aprobados}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600 font-medium">Cancelados</div>
          <div className="text-2xl font-bold text-gray-600 mt-2">{estadisticas.cancelados}</div>
        </div>
      </div>

      <PermisosTable permisos={permisos} />
    </div>
  );
}

export default function PermisosPage() {
  return (
    <Suspense fallback={<div>Cargando permisos...</div>}>
      <PermisosContent />
    </Suspense>
  );
}
