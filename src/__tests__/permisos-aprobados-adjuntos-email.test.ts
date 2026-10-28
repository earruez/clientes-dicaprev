import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/lib/email/send-email";
import { obtenerAdjuntoMunicipal, validarArchivoPermisoAprobado } from "@/lib/permisos/adjunto-aprobado";

const permisoArchivo = {
  archivoNombre: "12345678-1234-1234-1234-123456789abc.pdf",
  archivoNombreOriginal: "Resolucion-Municipal.pdf",
  archivoTipo: "application/pdf",
  archivoPeso: 5,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Correo de permiso municipal con adjunto", () => {
  it("envía a Resend el contenido base64, nombre y tipo del archivo", async () => {
    vi.stubEnv("RESEND_API_KEY", "prueba-clave");
    vi.stubEnv("CAPACITACION_FROM_EMAIL", "NextPrev <notificaciones@example.com>");
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email-test-1" }), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    const resultado = await sendEmail({
      to: "coordinador@example.com",
      subject: "Aprobado | Sucursal",
      html: "<strong>Aprobado</strong>",
      attachments: [{
        filename: "Resolucion-Municipal.pdf",
        content: Buffer.from("PDF de prueba").toString("base64"),
        contentType: "application/pdf",
      }],
    });

    expect(resultado.messageId).toBe("email-test-1");
    const llamada = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(llamada[0]).toBe("https://api.resend.com/emails");
    const payload = JSON.parse(llamada[1].body as string);
    expect(payload.attachments).toEqual([{
      filename: "Resolucion-Municipal.pdf",
      content: Buffer.from("PDF de prueba").toString("base64"),
      content_type: "application/pdf",
    }]);
  });

  it("no adjunta ningún archivo en notificaciones sin documentos", async () => {
    vi.stubEnv("RESEND_API_KEY", "prueba-clave");
    vi.stubEnv("CAPACITACION_FROM_EMAIL", "notificaciones@example.com");
    const mockFetch = vi.fn().mockResolvedValue(new Response('{"id":"email-test-2"}', { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);
    await sendEmail({ to: "destino@example.com", subject: "Solicitado", html: "Solicitado" });
    const llamada = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const payload = JSON.parse(llamada[1].body as string);
    expect(payload.attachments).toBeUndefined();
  });

  it("solo recupera desde el Blob privado de la empresa y codifica el documento", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_storePrueba_secreto");
    const mockFetch = vi.fn().mockResolvedValue(new Response(new Uint8Array([37, 80, 68, 70, 10]), {
      status: 200, headers: { "content-length": "5", "content-type": "application/pdf" },
    }));
    vi.stubGlobal("fetch", mockFetch);
    const adjunto = await obtenerAdjuntoMunicipal("empresa-valida", permisoArchivo);
    expect(adjunto.filename).toBe("Resolucion-Municipal.pdf");
    expect(adjunto.content).toBe(Buffer.from(new Uint8Array([37, 80, 68, 70, 10])).toString("base64"));
    expect(adjunto.contentType).toBe("application/pdf");
    const llamada = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(llamada[0]).toContain("/empresas/empresa-valida/documentos/");
    expect(llamada[0]).toContain("storePrueba.private.blob.vercel-storage.com");
    expect(llamada[1].headers).toEqual({ authorization: "Bearer vercel_blob_rw_storePrueba_secreto" });
  });

  it("rechaza rutas arbitrarias y archivos que no existen", async () => {
    expect(() => validarArchivoPermisoAprobado({ ...permisoArchivo, archivoNombre: "../secreto.pdf" })).toThrow();
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_storePrueba_secreto");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("No existe", { status: 404 })));
    await expect(obtenerAdjuntoMunicipal("empresa", permisoArchivo)).rejects.toThrow("recuperar");
  });
});
