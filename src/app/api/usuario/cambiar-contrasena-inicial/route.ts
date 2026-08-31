import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password-hash";
import { esTokenExpirado } from "@/lib/password-reset";

type RequestBody = {
  token?: string;
  nuevaContraseña?: string;
  confirmarContraseña?: string;
};

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const { token, nuevaContraseña, confirmarContraseña } = body;

    // Validaciones básicas
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token es requerido" },
        { status: 400 }
      );
    }

    if (!nuevaContraseña || typeof nuevaContraseña !== "string") {
      return NextResponse.json(
        { error: "Contraseña es requerida" },
        { status: 400 }
      );
    }

    if (nuevaContraseña.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    if (nuevaContraseña !== confirmarContraseña) {
      return NextResponse.json(
        { error: "Las contraseñas no coinciden" },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(nuevaContraseña);

    const result = await prisma.$transaction(async (tx) => {
      const tokenRecord = await tx.usuarioCambioContraseña.findUnique({
        where: { token },
        include: { usuario: { select: { id: true, email: true } } },
      });

      if (!tokenRecord) return { status: "not-found" as const };
      if (tokenRecord.usado || esTokenExpirado(tokenRecord.expires)) {
        return { status: "invalid" as const };
      }

      const tokenUsed = await tx.usuarioCambioContraseña.updateMany({
        where: { id: tokenRecord.id, usado: false, expires: { gt: new Date() } },
        data: { usado: true },
      });

      if (tokenUsed.count !== 1) return { status: "invalid" as const };

      await tx.usuario.update({
        where: { id: tokenRecord.usuario.id },
        data: { passwordHash },
      });

      return { status: "updated" as const, email: tokenRecord.usuario.email };
    });

    if (result.status === "not-found") {
      return NextResponse.json({ error: "Token inválido o no encontrado" }, { status: 404 });
    }

    if (result.status === "invalid") {
      return NextResponse.json(
        { error: "El enlace no es válido, ya fue utilizado o ha expirado." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Contraseña actualizada correctamente. Puedes iniciar sesión.",
      email: result.email,
    });
  } catch (error) {
    console.error("Error en cambio de contraseña:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// GET para validar token
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token es requerido" },
        { status: 400 }
      );
    }

    const tokenRecord = await prisma.usuarioCambioContraseña.findUnique({
      where: { token },
      select: {
        id: true,
        usado: true,
        expires: true,
        usuario: { select: { nombre: true, email: true } },
      },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { error: "Token no encontrado", valid: false },
        { status: 404 }
      );
    }

    if (tokenRecord.usado) {
      return NextResponse.json(
        {
          error: "Este token ya ha sido utilizado",
          valid: false,
        },
        { status: 400 }
      );
    }

    if (esTokenExpirado(tokenRecord.expires)) {
      return NextResponse.json(
        {
          error: "El token ha expirado",
          valid: false,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      usuario: {
        nombre: tokenRecord.usuario.nombre,
        email: tokenRecord.usuario.email,
      },
    });
  } catch (error) {
    console.error("Error validando token:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", valid: false },
      { status: 500 }
    );
  }
}
