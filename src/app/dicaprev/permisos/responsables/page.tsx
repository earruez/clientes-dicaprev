import { Suspense } from "react";
import { requirePermission } from "@/server/auth/permissions";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

async function ResponsablesContent() {
  const { empresaId } = await requirePermission("canManagePermisos");

  const responsables = await prisma.permisoResponsable.findMany({
    where: { empresaId },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dicaprev/permisos">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Responsables</h1>
            <p className="text-slate-600 text-sm mt-0.5">Gestiona los responsables de permisos</p>
          </div>
        </div>
        <Button className="gap-2">+ Nuevo responsable</Button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Nombre</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Cargo</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Email</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Teléfono</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Estado</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {responsables.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No hay responsables registrados
                  </td>
                </tr>
              ) : (
                responsables.map((r) => (
                  <tr key={r.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{r.nombre}</td>
                    <td className="px-6 py-3 text-slate-600">{r.cargo}</td>
                    <td className="px-6 py-3 text-slate-600">{r.email}</td>
                    <td className="px-6 py-3 text-slate-600">{r.telefono || "—"}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${r.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                        {r.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <Button variant="outline" size="sm">Editar</Button>
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

export default function ResponsablesPage() {
  return (
    <Suspense fallback={<div>Cargando responsables...</div>}>
      <ResponsablesContent />
    </Suspense>
  );
}
