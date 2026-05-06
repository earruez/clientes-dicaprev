import CentrosTrabajoPrismaClient from "./CentrosTrabajoPrismaClient";
import { getCentrosTrabajo } from "./actions";

export default async function EmpresaCentrosPage() {
  const centros = await getCentrosTrabajo();

  const serializados = centros.map((centro) => ({
    id: centro.id,
    nombre: centro.nombre,
    direccion: centro.direccion,
    comuna: centro.comuna,
    region: centro.region,
    tipo: centro.tipo,
    estado: centro.estado,
    cantidadTrabajadores: centro.cantidadTrabajadores,
    createdAt: centro.createdAt.toISOString(),
    updatedAt: centro.updatedAt.toISOString(),
  }));

  return <CentrosTrabajoPrismaClient initialCentros={serializados} />;
}
