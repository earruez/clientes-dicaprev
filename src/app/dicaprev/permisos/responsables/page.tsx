import { Suspense } from "react";
import { requirePermission } from "@/server/auth/permissions";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResponsablesTable } from "./ResponsablesTable";

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
        <Link href="/dicaprev/permisos/responsables/nuevo">
          <Button className="gap-2">+ Nuevo responsable</Button>
        </Link>
      </div>

      <ResponsablesTable responsables={responsables} />
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
