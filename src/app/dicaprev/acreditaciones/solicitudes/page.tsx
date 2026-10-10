import { crearAcreditacion, getAcreditaciones, getMandantesAcreditacion, getPlantillasAcreditacion } from "@/actions/acreditaciones";
import { getTrabajadores } from "@/actions/trabajadores";
import { getContratistas } from "@/actions/contratistas";
import { getVehiculos } from "@/actions/vehiculos";
import SolicitudesClient from "./solicitudes-client";

export default async function SolicitudesPage() {
  const [acreditaciones, mandantes, plantillas, trabajadores, vehiculos, contratistasResult] = await Promise.all([
    getAcreditaciones({ take: 200 }),
    getMandantesAcreditacion(),
    getPlantillasAcreditacion({ activas: true }),
    getTrabajadores(),
    getVehiculos(),
    getContratistas().catch(() => []),
  ]);

  return (
    <SolicitudesClient
      initialAcreditaciones={acreditaciones.data.map((a) => ({
        id: a.id,
        mandante: a.mandante.nombre,
        proyecto: a.nombreProyecto || a.obraFaena || "Sin proyecto",
        estado: a.estado,
        contratistaId: a.contratistaId,
        trabajadores: a.trabajadores.length,
        vehiculos: a.vehiculos.length,
        updatedAt: a.updatedAt.toISOString(),
      }))}
      contratistas={contratistasResult.map((c) => ({ id: c.id, nombre: c.nombre, rut: c.rut || "" }))}
      mandantes={mandantes.map((m) => ({ id: m.id, nombre: m.nombre, rut: m.rut ?? "", tipo: m.tipo }))}
      plantillas={plantillas.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        mandanteId: p.mandanteId,
        requisitosCount: p._count.requisitos,
      }))}
      trabajadores={trabajadores.map((t) => ({
        id: t.id,
        nombre: `${t.nombre} ${t.apellido}`,
        rut: t.rut,
        cargo: t.cargo,
      }))}
      vehiculos={vehiculos.map((v) => ({
        id: v.id,
        etiqueta: `${v.modelo} ${v.marca}`,
        patente: v.patente,
      }))}
      onCrearAction={crearAcreditacion}
    />
  );
}
