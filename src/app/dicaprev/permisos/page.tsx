import { Suspense } from "react";
import { requirePermission } from "@/server/auth/permissions";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

async function PermisosContent() {
  const { empresaId } = await requirePermission("canReadPermisos");

  // Obtener estadísticas
  const permisos = await prisma.permisoInstalacion.findMany({
    where: { empresaId },
    include: {
      organismo: true,
      responsable: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const estadisticas = {
    activos: permisos.filter((p) => !["APROBADO", "RECHAZADO", "CANCELADO"].includes(p.estado)).length,
    enRevision: permisos.filter((p) => p.estado === "EN_REVISION").length,
    observados: permisos.filter((p) => p.estado === "OBSERVADO").length,
    enRiesgo: permisos.filter((p) => p.nivelRiesgo === "EN_RIESGO").length,
    aprobados: permisos.filter((p) => p.estado === "APROBADO").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Permisos de instalación</h1>
          <p className="text-slate-600 mt-1">Gestiona solicitudes, plazos y estados de permisos asociados a instalaciones.</p>
        </div>
        <Link href="/dicaprev/permisos/nuevo">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo permiso
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600 font-medium">Activos</div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{estadisticas.activos}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600 font-medium">En revisión</div>
          <div className="text-2xl font-bold text-purple-600 mt-2">{estadisticas.enRevision}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600 font-medium">Observados</div>
          <div className="text-2xl font-bold text-orange-600 mt-2">{estadisticas.observados}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600 font-medium">En riesgo</div>
          <div className="text-2xl font-bold text-red-600 mt-2">{estadisticas.enRiesgo}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600 font-medium">Aprobados</div>
          <div className="text-2xl font-bold text-green-600 mt-2">{estadisticas.aprobados}</div>
        </div>
      </div>

      {/* Tabla de permisos */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Estado</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Riesgo</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Cliente</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Dirección</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Fecha instalación</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Organismo</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Responsable</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Último movimiento</th>
              </tr>
            </thead>
            <tbody>
              {permisos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    No hay permisos registrados. Crea tu primer permiso para comenzar.
                  </td>
                </tr>
              ) : (
                permisos.map((permiso) => (
                  <tr key={permiso.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {permiso.estado}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {permiso.nivelRiesgo === "EN_RIESGO" && "🔴"}
                      {permiso.nivelRiesgo === "ATENCION" && "🟡"}
                      {permiso.nivelRiesgo === "EN_PLAZO" && "🟢"}
                      {permiso.nivelRiesgo === "SIN_DATOS" && "⚪"}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-900">{permiso.clienteId || "—"}</td>
                    <td className="px-6 py-3 text-sm text-slate-600 max-w-xs truncate">{permiso.direccion}</td>
                    <td className="px-6 py-3 text-sm text-slate-900">
                      {permiso.fechaInstalacion.toLocaleDateString("es-CL")}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">{permiso.organismo?.nombre || "—"}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{permiso.responsable?.nombre || "—"}</td>
                    <td className="px-6 py-3 text-sm text-slate-500">
                      {new Date().getTime() - new Date(permiso.updatedAt).getTime() < 86400000 ? "Hoy" : "Hace días"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
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
