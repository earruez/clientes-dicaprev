import { NextResponse } from "next/server";
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

  const result = await procesarAvisosVencimientoVehiculos();
  return NextResponse.json({ ok: true, mode: "cron", ...result });
}
