import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import { descargarArchivoContratista } from "@/lib/contratistas/archivos";
import { crearConstanciaFirmaSst } from "@/lib/firmas-sst/constancia";
import { MODULO_FIRMAS_EXTERNAS, sha256 } from "@/lib/firmas-externas";
import { origenNextPrev } from "@/lib/contratistas/portal";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let empresaId: string;
  try {
    empresaId = (await requirePermission("canReadDocumentacion")).empresaId;
  } catch {
    return new Response("No autorizado", { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[a-z0-9]{12,40}$/.test(id)) return new Response("Documento inválido", { status: 400 });
  const documento = await prisma.documentoGeneradoRegistro.findFirst({
    where: { id, empresaId, modulo: MODULO_FIRMAS_EXTERNAS },
    select: {
      id: true, nombre: true, archivoNombre: true, archivoNombreOriginal: true, metadata: true,
      empresa: { select: { nombre: true, rut: true } },
    },
  });
  if (!documento?.archivoNombre) return new Response("No encontrado", { status: 404 });
  const firma = await prisma.firmaDocumento.findFirst({
    where: { empresaId, documentoId: id, estado: "firmado", tipoFirmante: "externo" },
    select: {
      nombreFirmante: true, rutFirmante: true, emailFirmante: true, firmadoAt: true, createdAt: true,
      aceptoLectura: true, firmaSvg: true, firmaTexto: true, hashDocumento: true,
      tokenTrazabilidad: true, ipFirma: true, userAgentFirma: true, correoValidadoAt: true,
    },
  });
  if (!firma?.firmadoAt || !firma.aceptoLectura) return new Response("Documento aún no firmado", { status: 409 });
  const original = await descargarArchivoContratista(empresaId, documento.archivoNombre);
  if (!original.ok) return new Response("Documento original no disponible", { status: 409 });
  const contenido = Buffer.from(await original.arrayBuffer());
  const meta = documento.metadata && typeof documento.metadata === "object" && !Array.isArray(documento.metadata)
    ? documento.metadata as Record<string, unknown> : {};
  if (sha256(contenido) !== meta.sha256Original || sha256(contenido) !== firma.hashDocumento) {
    return new Response("El PDF original perdió integridad", { status: 409 });
  }
  const pdf = crearConstanciaFirmaSst({
    empresa: documento.empresa.nombre, rutEmpresa: documento.empresa.rut || "-",
    titulo: documento.nombre, archivoOriginal: documento.archivoNombreOriginal || documento.nombre + ".pdf",
    tipoEvidencia: String(meta.tipoEvidencia || "otra"),
    modalidadContrato: String(meta.modalidadContrato || "-"),
    fechaInicioContrato: String(meta.fechaInicioContrato || "-"),
    fechaTerminoContrato: String(meta.fechaTerminoContrato || "-"),
    actividadPresencial: meta.actividadPresencial ? JSON.stringify(meta.actividadPresencial) : undefined,
    nombreFirmante: firma.nombreFirmante || "-", rutFirmante: firma.rutFirmante || "-",
    correoParticular: firma.emailFirmante || "-", solicitadoAt: firma.createdAt,
    firmadoAt: firma.firmadoAt, correoValidadoAt: firma.correoValidadoAt,
    firmaImagen: firma.firmaSvg, firmaTexto: firma.firmaTexto,
    hashDocumento: firma.hashDocumento || "", hashEvidencia: firma.tokenTrazabilidad || "",
    ip: firma.ipFirma, userAgent: firma.userAgentFirma,
    verificacionUrl: origenNextPrev() + "/verificar-firma/" + (firma.tokenTrazabilidad || ""),
  });
  return new Response(new Uint8Array(pdf), { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": 'attachment; filename="constancia-firma-nextprev.pdf"',
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
