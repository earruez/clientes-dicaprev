import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password-hash";
import { COMPANY_MODULES } from "@/lib/company-modules";

type BootstrapBody = {
  secret?: string;
  email?: string;
  password?: string;
  nombre?: string;
  companyName?: string;
  resetPassword?: boolean;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function bootstrapDisponible(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.BOOTSTRAP_ENABLED === "true";
}

export async function POST(request: Request) {
  if (!bootstrapDisponible()) {
    return NextResponse.json({ ok: false, message: "No encontrado" }, { status: 404 });
  }

  const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
  if (!bootstrapSecret) {
    return NextResponse.json(
      { ok: false, message: "Bootstrap no configurado" },
      { status: 503 },
    );
  }

  let body: BootstrapBody;
  try {
    body = (await request.json()) as BootstrapBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Body JSON invalido" }, { status: 400 });
  }

  if (normalizeText(body.secret) !== bootstrapSecret) {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
  }

  const existingSuperadmin = await prisma.usuario.findFirst({
    where: { rol: "SUPERADMIN" },
    select: { id: true, email: true },
  });

  if (existingSuperadmin) {
    // Nunca permitir reset remoto del SUPERADMIN en producción. El bootstrap es solo de alta inicial.
    if (body.resetPassword === true && process.env.NODE_ENV !== "production") {
      const newPassword = normalizeText(body.password);
      if (!newPassword) {
        return NextResponse.json({ ok: false, message: "Password requerido para resetPassword" }, { status: 400 });
      }
      await prisma.usuario.update({
        where: { id: existingSuperadmin.id },
        data: { passwordHash: hashPassword(newPassword) },
      });
      return NextResponse.json({ ok: true, message: "Contraseña de SUPERADMIN actualizada en entorno no productivo" });
    }

    return NextResponse.json({ ok: false, message: "Bootstrap ya utilizado" }, { status: 409 });
  }

  const email = normalizeText(body.email).toLowerCase();
  const password = normalizeText(body.password);
  const nombre = normalizeText(body.nombre) || "Superadmin NextPrev";
  const companyName = normalizeText(body.companyName) || "DICAPREV SpA";

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "Email y password son requeridos" }, { status: 400 });
  }

  const passwordHash = hashPassword(password);

  try {
    let empresa = await prisma.empresa.findFirst({
      where: { nombre: companyName },
      select: { id: true, nombre: true },
    });

    if (!empresa) {
      empresa = await prisma.empresa.create({
        data: {
          nombre: companyName,
          razonSocial: companyName,
          activa: true,
          tipoEmpresa: "servicios",
          giro: "servicios",
        },
        select: { id: true, nombre: true },
      });
    }

    const usuario = await prisma.usuario.upsert({
      where: { email },
      create: {
        nombre,
        email,
        rol: "SUPERADMIN",
        activo: true,
        passwordHash,
        empresaId: empresa.id,
      },
      update: {
        nombre,
        rol: "SUPERADMIN",
        activo: true,
        passwordHash,
        empresaId: empresa.id,
      },
      select: { id: true, nombre: true, email: true, rol: true },
    });

    await prisma.usuarioEmpresa.upsert({
      where: { usuarioId_empresaId: { usuarioId: usuario.id, empresaId: empresa.id } },
      create: { usuarioId: usuario.id, empresaId: empresa.id, rol: "SUPERADMIN", activo: true },
      update: { rol: "SUPERADMIN", activo: true },
    });

    let modulosCreados = 0;
    for (const modulo of COMPANY_MODULES) {
      const existente = await prisma.empresaModulo.findUnique({
        where: { empresaId_modulo: { empresaId: empresa.id, modulo } },
        select: { id: true },
      });
      if (!existente) {
        await prisma.empresaModulo.create({ data: { empresaId: empresa.id, modulo, activo: true } });
        modulosCreados += 1;
      }
    }

    const centrosCount = await prisma.centroTrabajo.count({ where: { empresaId: empresa.id } });
    if (centrosCount === 0) {
      await prisma.centroTrabajo.create({
        data: {
          empresaId: empresa.id,
          nombre: "Casa matriz / Principal",
          tipo: "Casa Matriz",
          estado: "activo",
          direccion: "Por definir",
          comuna: "Por definir",
          region: "Por definir",
        },
      });
    }

    return NextResponse.json(
      { ok: true, message: "SUPERADMIN creado. Desactiva BOOTSTRAP_ENABLED inmediatamente.", empresa, usuario, modulosCreados },
      { status: 201 },
    );
  } catch (error) {
    console.error("[bootstrap/superadmin] Error:", error);
    return NextResponse.json({ ok: false, message: "Error interno al crear SUPERADMIN" }, { status: 500 });
  }
}
