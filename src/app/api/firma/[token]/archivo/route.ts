import { descargarArchivoContratista } from "@/lib/contratistas/archivos";
import { resolverFirmaExterna } from "@/lib/firmas-externas";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resultado = await resolverFirmaExterna(token);
  if (!resultado || !["pendiente", "firmado"].includes(resultado.estado) ||
      (resultado.firma.expiresAt && resultado.firma.expiresAt.getTime() <= Date.now())) {
    return new Response("Enlace inválido o vencido", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const respuesta = await descargarArchivoContratista(resultado.firma.empresaId, resultado.documento.archivoNombre!);
    return new Response(respuesta.body, {
      status: respuesta.status,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=\"documento-a-firmar.pdf\"",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return new Response("No fue posible abrir el PDF", { status: 500 });
  }
}
