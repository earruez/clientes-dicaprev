import { Suspense } from "react";
import { requirePermission } from "@/server/auth/permissions";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OrganismosTable } from "./OrganismosTable";

async function OrganismosContent() {
  const { empresaId } = await requirePermission("canManagePermisos");

  const organismos = await prisma.permisoOrganismo.findMany({
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
            <h1 className="text-2xl font-bold text-slate-900">Municipalidades</h1>
            <p className="mt-0.5 break-words text-sm text-slate-600">Gestiona las municipalidades para permisos de instalación</p>
          </div>
        </div>
        <Link href="/dicaprev/permisos/organismos/nuevo" className="self-start">
          <Button className="gap-2">+ Nueva municipalidad</Button>
        </Link>
      </div>

      <OrganismosTable organismos={organismos} />
    </div>
  );
}

export default function OrganismosPage() {
  return (
    <Suspense fallback={<div>Cargando municipalidades...</div>}>
      <OrganismosContent />
    </Suspense>
  );
}

