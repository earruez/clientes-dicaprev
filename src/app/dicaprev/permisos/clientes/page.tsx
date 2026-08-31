import { Suspense } from "react";
import { requirePermission } from "@/server/auth/permissions";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClientesTable } from "./ClientesTable";

async function ClientesContent() {
  const { empresaId } = await requirePermission("canManagePermisos");

  const clientes = await prisma.permisoCliente.findMany({
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
            <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
            <p className="text-slate-600 text-sm mt-0.5">
              Clientes que solicitan permisos de instalación recurrentemente
            </p>
          </div>
        </div>
        <Link href="/dicaprev/permisos/clientes/nuevo">
          <Button className="gap-2">+ Nuevo cliente</Button>
        </Link>
      </div>

      <ClientesTable clientes={clientes} />
    </div>
  );
}

export default function ClientesPage() {
  return (
    <Suspense fallback={<div>Cargando clientes...</div>}>
      <ClientesContent />
    </Suspense>
  );
}
