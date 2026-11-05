import { prisma } from "@/lib/prisma";
import { descargarArchivoContratista } from "@/lib/contratistas/archivos";
import { MODULO_FIRMAS_EXTERNAS, sha256 } from "@/lib/firmas-externas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function VerificarFirmaSst({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  let resultado: {
    titulo: string; empleador: string; rut: string; fecha: string; original: string; evidencia: string; correoOtp: boolean;
  } | null = null;
  if (/^[a-f0-9]{64}$/.test(hash)) {
    const firma = await prisma.firmaDocumento.findFirst({
      where: { tokenTrazabilidad: hash, estado: "firmado", tipoFirmante: "externo", documentoOrigen: "otro" },
      select: {
        empresaId: true, documentoId: true, trabajadorId: true, rutFirmante: true,
        hashDocumento: true, firmadoAt: true, correoValidadoAt: true,
      },
    });
    if (firma?.firmadoAt && firma.trabajadorId) {
      const doc = await prisma.documentoGeneradoRegistro.findFirst({
        where: {
          id: firma.documentoId, empresaId: firma.empresaId,
          entidadId: firma.trabajadorId, modulo: MODULO_FIRMAS_EXTERNAS,
        },
        select: {
          nombre: true, archivoNombre: true, metadata: true,
          empresa: { select: { nombre: true } },
        },
      });
      if (doc?.archivoNombre) {
        const metadata = doc.metadata && typeof doc.metadata === "object" && !Array.isArray(doc.metadata)
          ? doc.metadata as Record<string, unknown> : {};
        try {
          const archivo = await descargarArchivoContratista(firma.empresaId, doc.archivoNombre);
          if (archivo.ok) {
            const digest = sha256(Buffer.from(await archivo.arrayBuffer()));
            if (digest === firma.hashDocumento && digest === metadata.sha256Original) {
              const rut = firma.rutFirmante || "";
              resultado = {
                titulo: doc.nombre, empleador: doc.empresa.nombre,
                rut: rut.length > 4 ? "*".repeat(Math.min(rut.length - 4, 12)) + rut.slice(-4) : "Resguardado",
                fecha: firma.firmadoAt.toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "long", timeStyle: "medium" }),
                original: digest, evidencia: hash, correoOtp: !!firma.correoValidadoAt,
              };
            }
          }
        } catch {
          resultado = null;
        }
      }
    }
  }
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-sky-800">NextPrev · Verificación de evidencia SST</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          {resultado ? "Constancia e integridad verificadas" : "No se puede validar esta constancia"}
        </h1>
        {resultado ? (
          <div className="mt-6 space-y-4 text-sm text-slate-700">
            <p>El archivo original almacenado coincide con su huella SHA-256 y existe una firma electrónica simple registrada.</p>
            <p><strong>Empleador:</strong> {resultado.empleador}</p>
            <p><strong>Documento:</strong> {resultado.titulo}</p>
            <p><strong>RUT firmante (parcial):</strong> {resultado.rut}</p>
            <p><strong>Fecha de firma:</strong> {resultado.fecha}</p>
            <p><strong>Correo particular verificado:</strong> {resultado.correoOtp ? "Sí, mediante código OTP" : "No consta"}</p>
            <div className="break-all rounded-xl bg-slate-50 p-4 font-mono text-xs"><strong>SHA-256 PDF:</strong> {resultado.original}</div>
            <div className="break-all rounded-xl bg-slate-50 p-4 font-mono text-xs"><strong>SHA-256 evidencia:</strong> {resultado.evidencia}</div>
            <p className="text-xs text-slate-500">La verificación técnica no equivale a certificación de la Dirección del Trabajo ni a firma electrónica avanzada.</p>
          </div>
        ) : <p className="mt-4 text-sm text-slate-600">El código no existe, la firma no está completa, el original no está disponible o su integridad no coincide. Solicita el expediente al empleador.</p>}
      </div>
    </main>
  );
}
