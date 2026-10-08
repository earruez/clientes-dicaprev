import { getVehiculos, getCentrosList, getResponsablesVehiculoList } from "@/actions/vehiculos";
import VehiculosPrismaClient from "./VehiculosPrismaClient";

export default async function VehiculosPage() {
  const [vehiculos, centros, responsables] = await Promise.all([
    getVehiculos(),
    getCentrosList(),
    getResponsablesVehiculoList(),
  ]);

  return (
    <VehiculosPrismaClient
      initialVehiculos={vehiculos}
      initialCentros={centros}
      initialResponsables={responsables}
    />
  );
}
