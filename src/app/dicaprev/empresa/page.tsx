import EmpresaResumenClient from "./EmpresaResumenClient";
import { getCurrentAppContext } from "@/server/context";
import { requirePermission } from "@/server/auth/permissions";

export default async function EmpresaPage() {
  await requirePermission("canReadEmpresa");
  const { empresaId } = await getCurrentAppContext();
  return <EmpresaResumenClient key={empresaId} />;
}
