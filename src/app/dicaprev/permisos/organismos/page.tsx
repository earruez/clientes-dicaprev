import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

async function OrganismosContent() {
  const { empresaId } = await requirePermission("canManagePermisos");

  const organismos = await prisma.permisoOrganismo.findMany({
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
            <h1 className="text-2xl font-bold text-slate-900">Organismos</h1>
            <p className="text-slate-600 text-sm mt-0.5">Gestiona municipalidades y organismos</p>
          </div>
        </div>
        <Button className="gap-2">+ Nuevo organismo</Button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Organismo</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Región</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Comuna</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Modalidad</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Plazo</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Última verificación</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {organismos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No hay organismos registrados. Importa la matriz municipal o crea uno manualmente.
                  </td>
                </tr>
              ) : (
                organismos.map((o) => (
                  <tr key={o.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{o.nombre}</td>
                    <td className="px-6 py-3 text-slate-600">{o.region || "—"}</td>
                    <td className="px-6 py-3 text-slate-600">{o.comuna || "—"}</td>
                    <td className="px-6 py-3 text-slate-600">{o.modalidad || "—"}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {o.plazoDias ? `${o.plazoDias} ${o.tipoPlazo === "HABILES" ? "hábiles" : "corridos"}` : "No informado"}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {o.fechaVerificacion ? new Date(o.fechaVerificacion).toLocaleDateString("es-CL") : "—"}
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

export default function OrganismosPage() {
  return (
    <Suspense fallback={<div>Cargando organismos...</div>}>
      <OrganismosContent />
    </Suspense>
  );
}
