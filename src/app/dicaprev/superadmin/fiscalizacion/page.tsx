import { requireRole } from "@/server/auth/permissions";
import FiscalizacionAdminClient from "./FiscalizacionAdminClient";
export default async function FiscalizacionAdminPage() {
  await requireRole("SUPERADMIN");
  return <FiscalizacionAdminClient />;
}
