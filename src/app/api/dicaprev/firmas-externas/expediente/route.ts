import { requirePermission } from "@/server/auth/permissions";
import { zipExpedienteFirmadoSst } from "@/lib/firmas-sst/expediente";

export const runtime = "nodejs";
export async function GET(request: Request) {
  let empresaId: string;
  try { empresaId = (await requirePermission("canReadDocumentacion")).empresaId; }
  catch { return new Response("No autorizado", { status: 403 }); }
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[a-z0-9]{12,40}$/.test(id)) return new Response("Documento inválido", { status: 400 });
  try {
    const zip = await zipExpedienteFirmadoSst(empresaId, id);
    return new Response(new Uint8Array(zip), { headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="expediente-firma-sst-nextprev.zip"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return new Response("El expediente no existe, no está firmado o perdió integridad.", { status: 409 });
  }
}
