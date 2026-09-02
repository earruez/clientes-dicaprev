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
            <h1 className="text-2xl font-bold text-slate-900">Municipalidades</h1>
            <p className="text-slate-600 text-sm mt-0.5">Gestiona las municipalidades para permisos de instalación</p>
          </div>
        </div>
        <Link href="/dicaprev/permisos/organismos/nuevo">
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

