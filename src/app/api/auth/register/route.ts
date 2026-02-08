import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { crearSesion, setCookieSesion } from "@/lib/auth/sessions";
import { firmarRbacToken } from "@/lib/auth/rbac-token";
import { setCookieRbac } from "@/lib/auth/rbac-cookie";

const schema = z.object({
  nombre: z.string().trim().max(120).optional(),
  email: z.string().email(),
  password: z.string().min(8),
});

function redirectConError(req: Request, msg: string) {
  const url = new URL("/registro", req.url);
  url.searchParams.set("error", msg);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const parsed = schema.safeParse({
    nombre: String(form.get("nombre") || "").trim() || undefined,
    email: String(form.get("email") || "").toLowerCase().trim(),
    password: String(form.get("password") || ""),
  });
  if (!parsed.success) return redirectConError(req, "Datos inválidos.");

  const roleCliente = await prisma.role.findUnique({ where: { code: "CLIENTE" } });
  if (!roleCliente) return redirectConError(req, "Configuración incompleta: falta rol CLIENTE.");

  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        nombre: parsed.data.nombre,
        passwordHash,
        roles: { create: [{ roleId: roleCliente.id }] },
      },
      include: { roles: { include: { role: true } } },
    });

    const roles = user.roles.map((ur) => ur.role.code);
    const { token, expiresAt } = await crearSesion(user.id);
    await setCookieSesion(token, expiresAt);
    const rbac = await firmarRbacToken({ userId: user.id, roles });
    await setCookieRbac(rbac, expiresAt);

    return NextResponse.redirect(new URL("/", req.url), { status: 303 });
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e && typeof (e as { code?: unknown }).code === "string"
        ? String((e as { code?: unknown }).code)
        : null;
    const msg = code === "P2002" ? "Ese correo ya está registrado." : "No se pudo crear la cuenta.";
    return redirectConError(req, msg);
  }
}
