import { randomUUID } from "crypto";
import { getDocumentoExtension, validarArchivoDocumento } from "@/lib/documentacion/archivo-documento";

function getBlobConfig() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("Almacenamiento privado no configurado");
  const [, , , storeId = ""] = token.split("_");
  if (!storeId) throw new Error("Almacenamiento privado inválido");
  return { token, storeId };
}

export async function subirArchivoContratista(empresaId: string, file: File) {
  const valida = validarArchivoDocumento(file);
  if (!valida.ok) throw new Error(valida.error || "Archivo no permitido");
  const archivoNombre = `${randomUUID()}${getDocumentoExtension(file.name)}`;
  const pathname = `empresas/${empresaId}/documentos/${archivoNombre}`;
  const { token, storeId } = getBlobConfig();
  const response = await fetch(`https://vercel.com/api/blob/?pathname=${encodeURIComponent(pathname)}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "x-vercel-blob-store-id": storeId,
      "x-api-version": "12",
      "x-vercel-blob-access": "private",
      "x-add-random-suffix": "0",
      ...(valida.mimeType ? { "x-content-type": valida.mimeType } : {}),
    },
    body: await file.arrayBuffer(),
  });
  if (!response.ok) throw new Error("No fue posible guardar el archivo en almacenamiento privado");
  return { archivoNombre, archivoOriginal: file.name.slice(0, 180), archivoTipo: valida.mimeType, archivoPeso: file.size };
}

export async function descargarArchivoContratista(empresaId: string, archivoNombre: string): Promise<Response> {
  if (!/^[a-f0-9-]{36}\.(pdf|doc|docx|xlsx|jpg|jpeg|png)$/i.test(archivoNombre)) {
    return new Response("Archivo inválido", { status: 400 });
  }
  const { token, storeId } = getBlobConfig();
  const url = `https://${storeId}.private.blob.vercel-storage.com/empresas/${encodeURIComponent(empresaId)}/documentos/${encodeURIComponent(archivoNombre)}`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok || !response.body) return new Response("Archivo no encontrado", { status: 404 });
  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}
