/** Compartir un enlace temporal por WhatsApp sin almacenar ni exponer tokens en logs. */
export function mensajeAccesoContratista(input: {
  nombreEmpresa: string;
  obra: string;
  url: string;
  vencimiento: string;
}) {
  const fecha = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(input.vencimiento));
  return `Hola, ${input.nombreEmpresa}. Te compartimos el acceso a la carpeta de acreditación documental de la obra "${input.obra}" en NextPrev.

Desde este enlace puedes subir la documentación de tu empresa y trabajadores:
${input.url}

El enlace vence el ${fecha}. Contiene acceso a documentación laboral: no lo compartas con personas ajenas a la empresa.`;
}

/** No presupone Chile si el número ya viene con código de otro país. */
export function enlaceWhatsAppContratista(mensaje: string, telefono?: string | null): string {
  const limpio = (telefono || "").replace(/\D/g, "");
  const numero = limpio.startsWith("56") ? limpio : limpio.length === 9 ? `56${limpio}` : limpio.length >= 11 ? limpio : "";
  const params = new URLSearchParams({ text: mensaje });
  if (numero) params.set("phone", numero);
  return `https://api.whatsapp.com/send?${params.toString()}`;
}
