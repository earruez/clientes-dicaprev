import { requirePermission } from "@/server/auth/permissions";
import { generarInformeContratista } from "@/lib/contratistas/informe-acreditacion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Descarga sin enviar correos; la emisión por email es una acción distinta y explícita. */
export async function GET(request: Request) {
  let empresaId: string;
  try {
    empresaId = (await requirePermission("canReadDocumentacion")).empresaId;
  } catch {
    return new Response("No autorizado", { status: 403 });
  }
  const solicitudId = new URL(request.url).searchParams.get("solicitudId") || "";
  if (!/^[a-z0-9]{12,40}$/.test(solicitudId)) return new Response("Expediente inválido", { status: 400 });
  try {
    const { pdf } = await generarInformeContratista(empresaId, solicitudId);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="NextPrev_Informe_Acreditacion_Contratista.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return new Response("No se pudo generar el informe de este expediente", { status: 404 });
  }
}
