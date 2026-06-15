import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bootstrapEmpresaOperativa } from "@/server/bootstrap/empresa-operativa";
import { hashPassword } from "@/lib/password-hash";

type BootstrapBody = {
  secret?: string;
  email?: string;
  password?: string;
  nombre?: string;
  companyName?: string;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const bootstrapSecret = process.env.BOOTSTRAP_SECRET;

  if (!bootstrapSecret) {
    return NextResponse.json(
      { status: "error", message: "BOOTSTRAP_SECRET no esta definida" },
      { status: 500 }
    );
  }

  let body: BootstrapBody;
  try {
    body = (await request.json()) as BootstrapBody;
  } catch {
    return NextResponse.json(
      { status: "error", message: "Body JSON invalido" },
      { status: 400 }
    );
  }

  if (normalizeText(body.secret) !== bootstrapSecret) {
    return NextResponse.json(
      { status: "not_authorized", message: "BOOTSTRAP_SECRET invalido" },
      { status: 401 }
    );
  }

  const existingSuperadmin = await prisma.usuario.findFirst({
    where: { rol: "SUPERADMIN" },
    select: { id: true, email: true },
  });

  if (existingSuperadmin) {
    return NextResponse.json(
      {
        status: "already_exists",
        message: "Ya existe un usuario SUPERADMIN en la base de datos",
        existingSuperadmin,
      },
      { status: 409 }
    );
  }

  const email = normalizeText(body.email).toLowerCase();
  const password = normalizeText(body.password);
  const nombre = normalizeText(body.nombre) || "Superadmin NextPrev";
  const companyName = normalizeText(body.companyName) || "DICAPREV SpA";

  if (!email || !password) {
    return NextResponse.json(
      { status: "error", message: "Email y password son requeridos" },
      { status: 400 }
    );
  }

  const passwordHash = hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    const empresaExistente = await tx.empresa.findFirst({
      where: { nombre: companyName },
      select: { id: true, nombre: true },
    });

    const empresa =
      empresaExistente ??
      (await tx.empresa.create({
        data: {
          nombre: companyName,
          razonSocial: companyName,
          activa: true,
          tipoEmpresa: "servicios",
          giro: "servicios",
        },
        select: { id: true, nombre: true },
      }));

    const usuario = await tx.usuario.upsert({
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

    await tx.usuarioEmpresa.upsert({
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

    const bootstrap = await bootstrapEmpresaOperativa(empresa.id);

    return {
      empresa,
      usuario,
      bootstrap,
    };
  });

  return NextResponse.json(
    {
      status: "created",
      message: "SUPERADMIN y empresa base creados correctamente",
      ...result,
    },
    { status: 201 }
  );
}