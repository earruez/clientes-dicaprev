import { getEstadoActivacionEmpresa } from "@/actions/empresa/resumen";
import ActivacionClient from "./ActivacionClient";

export default async function ActivacionPage() {
  const activacion = await getEstadoActivacionEmpresa();

  return <ActivacionClient initialActivacion={activacion} />;
}