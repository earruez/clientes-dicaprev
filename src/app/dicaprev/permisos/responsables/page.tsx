import { Suspense } from "react";
import { requirePermission } from "@/server/auth/permissions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResponsablesTable } from "./ResponsablesTable";
import { NuevoResponsableModal } from "./NuevoResponsableModal";
import { Button } from "@/components/ui/button";

async function ResponsablesContent() {
  const { empresaId } = await requirePermission("canManagePermisos");

  const responsables = await prisma.permisoResponsable.findMany({
    where: { empresaId, activo: true },
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
            <h1 className="text-2xl font-bold text-slate-900">Coordinadores</h1>
            <p className="text-slate-600 text-sm mt-0.5">Gestiona los coordinadores de permisos</p>
          </div>
        </div>
        <NuevoResponsableModal />
      </div>

      <ResponsablesTable responsables={responsables} />
    </div>
  );
}

export default function ResponsablesPage() {
  return (
    <Suspense fallback={<div>Cargando coordinadores...</div>}>
      <ResponsablesContent />
    </Suspense>
  );
}
