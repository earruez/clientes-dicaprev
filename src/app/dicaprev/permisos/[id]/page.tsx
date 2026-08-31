import { Suspense } from "react";
import { obtenerPermiso, obtenerHistorialPermiso } from "../actions/permisos";
import { PermisoDetailClient } from "./PermisoDetailClient";

async function PermisoDetailContent({ id }: { id: string }) {
  const [permiso, historial] = await Promise.all([
    obtenerPermiso(id),
    obtenerHistorialPermiso(id),
  ]);

  return <PermisoDetailClient permiso={permiso} historial={historial} />;
}

export default async function PermisoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Suspense fallback={<div>Cargando permiso...</div>}>
      <PermisoDetailContent id={id} />
    </Suspense>
  );
}
