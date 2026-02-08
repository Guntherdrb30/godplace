import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { crearSesion, setCookieSesion } from "@/lib/auth/sessions";
import { firmarRbacToken } from "@/lib/auth/rbac-token";
import { setCookieRbac } from "@/lib/auth/rbac-cookie";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function redirectConError(req: Request, msg: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", msg);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const parsed = schema.safeParse({
    email: String(form.get("email") || "").toLowerCase().trim(),
    password: String(form.get("password") || ""),
  });
  if (!parsed.success) return redirectConError(req, "Datos inválidos.");

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return redirectConError(req, "Correo o contraseña incorrectos.");
  if (user.status !== "ACTIVE") return redirectConError(req, "Tu cuenta está suspendida.");

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return redirectConError(req, "Correo o contraseña incorrectos.");

  const roles = user.roles.map((ur) => ur.role.code);
  const { token, expiresAt } = await crearSesion(user.id);
  await setCookieSesion(token, expiresAt);

  const rbac = await firmarRbacToken({ userId: user.id, roles });
  await setCookieRbac(rbac, expiresAt);

  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
