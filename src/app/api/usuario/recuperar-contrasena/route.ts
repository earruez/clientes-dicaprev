import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send-email";
import { generarEmailRecuperacionContraseña } from "@/lib/email/templates/password-recovery";
import { calcularFechaExpiracion, generarTokenCambioContraseña, hashTokenCambioContraseña } from "@/lib/password-reset";
import { authRateLimitKey, consumeAuthRateLimit } from "@/server/auth/rate-limit";

const RESPUESTA_NEUTRAL = "Si existe una cuenta activa con ese correo, recibirás un enlace para restablecer tu contraseña.";
const RECOVERY_RATE_LIMIT = {
  maxAttempts: 3,
  windowMs: 30 * 60 * 1000,
  blockMs: 30 * 60 * 1000,
};

export async function POST(request: Request) {
  try {
    const { email } = await request.json() as { email?: string };
    const emailNormalizado = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!emailNormalizado || !emailNormalizado.includes("@")) {
      return NextResponse.json({ error: "Ingresa un correo electrónico válido." }, { status: 400 });
    }

    const rate = await consumeAuthRateLimit(
      authRateLimitKey("password-recovery", emailNormalizado),
      RECOVERY_RATE_LIMIT,
    );
    if (rate.limited) {
      return NextResponse.json(
        { ok: true, message: RESPUESTA_NEUTRAL },
        { headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      );
    }

    const usuario = await prisma.usuario.findFirst({
      where: { email: { equals: emailNormalizado, mode: "insensitive" }, activo: true },
      select: { id: true, nombre: true, email: true },
    });

    if (!usuario) {
      return NextResponse.json({ ok: true, message: RESPUESTA_NEUTRAL });
    }

    const token = generarTokenCambioContraseña();
    const tokenHash = hashTokenCambioContraseña(token);

    await prisma.$transaction([
      prisma.usuarioCambioContraseña.updateMany({
        where: { usuarioId: usuario.id, usado: false },
        data: { usado: true },
      }),
      prisma.usuarioCambioContraseña.create({
        data: { usuarioId: usuario.id, token: tokenHash, expires: calcularFechaExpiracion(24) },
      }),
    ]);

    try {
      const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendEmail({
        to: usuario.email,
        subject: "NextPrev: restablece tu contraseña",
        html: generarEmailRecuperacionContraseña(usuario.nombre, `${appUrl}/cambiar-contrasena/${token}`),
      });
    } catch (error) {
      console.error("Error enviando recuperación de contraseña:", error);
    }

    return NextResponse.json({ ok: true, message: RESPUESTA_NEUTRAL });
  } catch (error) {
    console.error("Error solicitando recuperación de contraseña:", error);
    return NextResponse.json({ error: "No fue posible procesar la solicitud. Intenta nuevamente." }, { status: 500 });
  }
}
