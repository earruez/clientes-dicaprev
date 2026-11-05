import { auditarDocumentoFiscalizacion, obtenerAccesoFiscalizacion } from "@/lib/firmas-sst/fiscalizacion";
import { documentoSstVerificado, expedienteFirmadoSst } from "@/lib/firmas-sst/expediente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const acceso = await obtenerAccesoFiscalizacion();
  if (!acceso) return new Response("Fiscalizador no autorizado", { status: 401, headers: { "Cache-Control": "no-store" } });
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  const tipo = url.searchParams.get("tipo");
  if (!/^[a-z0-9]{12,40}$/.test(id) || !["original", "constancia"].includes(tipo || "")) {
    return new Response("Parámetros inválidos", { status: 400 });
  }
  try {
    await auditarDocumentoFiscalizacion(id, tipo === "original" ? "descarga_original" : "descarga_constancia");
    const contenido = tipo === "original"
      ? (await documentoSstVerificado(acceso.empresaId, id)).original
      : (await expedienteFirmadoSst(acceso.empresaId, id)).constancia;
    return new Response(new Uint8Array(contenido), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="' + (tipo === "original" ? "documento-original.pdf" : "constancia-nextprev.pdf") + '"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return new Response("Archivo inexistente o integridad no verificada", { status: 409 });
  }
}
