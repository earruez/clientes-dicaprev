import { getVehiculos, getCentrosList } from "@/actions/vehiculos";
import VehiculosPrismaClient from "./VehiculosPrismaClient";

export default async function VehiculosPage() {
  const [vehiculos, centros] = await Promise.all([
    getVehiculos(),
    getCentrosList(),
  ]);

  return (
    <VehiculosPrismaClient
      initialVehiculos={vehiculos}
      initialCentros={centros}
    />
  );
}
