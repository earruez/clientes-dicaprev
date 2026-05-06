import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: {
      rol: true,
      email: true,
    },
  });

  if (!usuario) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    role: usuario.rol,
    email: usuario.email,
  });
}