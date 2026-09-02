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
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link href="/dicaprev/permisos" className="self-start shrink-0">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">Coordinadores</h1>
            <p className="mt-0.5 break-words text-sm text-slate-600">Gestiona los coordinadores de permisos</p>
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
