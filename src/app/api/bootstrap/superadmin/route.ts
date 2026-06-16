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

export async function POST(request: Request) {
  const bootstrapSecret = process.env.BOOTSTRAP_SECRET;

  if (!bootstrapSecret) {
    return NextResponse.json(
      { ok: false, message: "BOOTSTRAP_SECRET no esta definida en el servidor" },
      { status: 500 }
    );
  }

  let body: BootstrapBody;
  try {
    body = (await request.json()) as BootstrapBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Body JSON invalido" },
      { status: 400 }
    );
  }

  if (normalizeText(body.secret) !== bootstrapSecret) {
    return NextResponse.json(
      { ok: false, message: "No autorizado" },
      { status: 401 }
    );
  }

  const existingSuperadmin = await prisma.usuario.findFirst({
    where: { rol: "SUPERADMIN" },
    select: { id: true, email: true },
  });

  if (existingSuperadmin) {
    // Opción: resetear contraseña del SUPERADMIN existente
    if (body.resetPassword === true) {
      const newPassword = normalizeText(body.password);
      if (!newPassword) {
        return NextResponse.json(
          { ok: false, message: "Password requerido para resetPassword" },
          { status: 400 }
        );
      }
      const newHash = hashPassword(newPassword);
      await prisma.usuario.update({
        where: { id: existingSuperadmin.id },
        data: { passwordHash: newHash },
      });
      return NextResponse.json(
        { ok: true, message: "Contraseña de SUPERADMIN actualizada" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { ok: false, message: "Ya existe SUPERADMIN", existingSuperadmin },
      { status: 409 }
    );
  }

  const email = normalizeText(body.email).toLowerCase();
  const password = normalizeText(body.password);
  const nombre = normalizeText(body.nombre) || "Superadmin NextPrev";
  const companyName = normalizeText(body.companyName) || "DICAPREV SpA";

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, message: "Email y password son requeridos" },
      { status: 400 }
    );
  }

  const passwordHash = hashPassword(password);

  try {
    // 1. Empresa base (fuera de transacción para que sea visible de inmediato)
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

    // 2. Usuario SUPERADMIN
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

    // 3. Relación usuario-empresa
    await prisma.usuarioEmpresa.upsert({
      where: {
        usuarioId_empresaId: {
          usuarioId: usuario.id,
          empresaId: empresa.id,
        },
      },
      create: {
        usuarioId: usuario.id,
        empresaId: empresa.id,
        rol: "SUPERADMIN",
        activo: true,
      },
      update: {
        rol: "SUPERADMIN",
        activo: true,
      },
    });

    // 4. Módulos base
    let modulosCreados = 0;
    for (const modulo of COMPANY_MODULES) {
      const existente = await prisma.empresaModulo.findUnique({
        where: { empresaId_modulo: { empresaId: empresa.id, modulo } },
        select: { id: true },
      });
      if (!existente) {
        await prisma.empresaModulo.create({
          data: { empresaId: empresa.id, modulo, activo: true },
        });
        modulosCreados += 1;
      }
    }

    // 5. Centro de trabajo base
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
      {
        ok: true,
        message: "SUPERADMIN creado",
        empresa,
        usuario,
        modulosCreados,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[bootstrap/superadmin] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Error interno al crear SUPERADMIN",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}