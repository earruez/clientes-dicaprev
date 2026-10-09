import { NextResponse } from "next/server";
import { procesarAvisosContratistas } from "@/lib/contratistas/vencimiento-alertas";
import {
  enviarPruebaVencimientoVehiculo,
  procesarAvisosVencimientoVehiculos,
} from "@/lib/vehiculos/vencimiento-alertas";

function autorizado(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const testEmail = url.searchParams.get("testEmail")?.trim();

  if (testEmail) {
    const result = await enviarPruebaVencimientoVehiculo(testEmail);
    return NextResponse.json({
      ok: true,
      mode: "test",
      to: testEmail,
      provider: result.provider,
      messageId: result.messageId ?? null,
    });
  }

  const [vehiculos, contratistas] = await Promise.allSettled([procesarAvisosVencimientoVehiculos(), procesarAvisosContratistas()]);
  const errores = [vehiculos, contratistas].filter((r) => r.status === "rejected");
  if (errores.length) console.error("[cron-vencimientos] Proceso fallido", errores.map((r) => r.status === "rejected" ? String(r.reason) : ""));
  return NextResponse.json({ ok: errores.length === 0, mode: "cron", vehiculos: vehiculos.status === "fulfilled" ? vehiculos.value : null, contratistas: contratistas.status === "fulfilled" ? contratistas.value : null }, { status: errores.length ? 500 : 200 });
}
