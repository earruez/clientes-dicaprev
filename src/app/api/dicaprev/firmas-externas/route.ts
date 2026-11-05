import { NextResponse } from "next/server";
import { crearSolicitudFirmaExterna } from "@/lib/firmas-externas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const datos = await request.formData();
    const archivo = datos.get("archivo");
    if (!(archivo instanceof File)) {
      return NextResponse.json({ error: "Selecciona un PDF." }, { status: 400 });
    }
    const resultado = await crearSolicitudFirmaExterna({
      archivo,
      titulo: String(datos.get("titulo") || ""),
      nombreFirmante: String(datos.get("nombreFirmante") || ""),
      rutFirmante: String(datos.get("rutFirmante") || ""),
      emailFirmante: String(datos.get("emailFirmante") || ""),
      diasVigencia: Number(datos.get("diasVigencia") || 7),
      trabajadorId: String(datos.get("trabajadorId") || ""),
      modalidadContrato: String(datos.get("modalidadContrato") || "") as "Plazo Fijo" | "Por Obra",
      fechaInicio: String(datos.get("fechaInicio") || ""),
      fechaTermino: String(datos.get("fechaTermino") || ""),
      tipoEvidencia: String(datos.get("tipoEvidencia") || "") as "irl" | "extintores" | "capacitacion_epp" | "entrega_epp" | "reglamento" | "procedimientos" | "miper" | "otra",
    });
    return NextResponse.json(resultado, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No fue posible crear la solicitud.";
    const esValidacion = /PDF|Completa|vigencia|Adjunta|RUT válido|trabajador|RUT debe|contrato|documento SST|período|Selecciona|Indica/.test(mensaje);
    const esSesion = /sesion|autorizado|autentic|permiso|No autorizado/.test(mensaje);
    return NextResponse.json(
      { error: esValidacion ? mensaje : esSesion ? "Acceso no autorizado." : "No se pudo guardar la solicitud. Verifica el almacenamiento y vuelve a intentar." },
      { status: esValidacion ? 400 : esSesion ? 403 : 500 },
    );
  }
}
