import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { crearSesion, setCookieSesion } from "@/lib/auth/sessions";
import { firmarRbacToken } from "@/lib/auth/rbac-token";
import { setCookieRbac } from "@/lib/auth/rbac-cookie";

const schema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

function redirectConError(req: Request, msg: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", msg);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const parsed = schema.safeParse({
      identifier: String(form.get("identifier") || "").toLowerCase().trim(),
      password: String(form.get("password") || ""),
    });
    if (!parsed.success) return redirectConError(req, "Datos inválidos.");

    const where = parsed.data.identifier.includes("@")
      ? { email: parsed.data.identifier }
      : { username: parsed.data.identifier };

    const user = await prisma.user.findFirst({
      where: where as { email?: string; username?: string },
      include: { roles: { include: { role: true } } },
    });
    if (!user) return redirectConError(req, "Correo/usuario o contraseña incorrectos.");
    if (user.status !== "ACTIVE") return redirectConError(req, "Tu cuenta está suspendida.");

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) return redirectConError(req, "Correo/usuario o contraseña incorrectos.");

    const roles = user.roles.map((ur) => ur.role.code);
    const { token, expiresAt } = await crearSesion(user.id);
    await setCookieSesion(token, expiresAt);

    // RBAC token is optional. Server-side guards use session+DB roles, so do not hard-fail login.
    try {
      const rbac = await firmarRbacToken({ userId: user.id, roles });
      await setCookieRbac(rbac, expiresAt);
    } catch (e) {
      console.warn("[auth/login] RBAC token skipped:", e);
    }

    const destino =
      roles.includes("ROOT") || roles.includes("ADMIN") ? "/admin" : "/";

    return NextResponse.redirect(new URL(destino, req.url), { status: 303 });
  } catch (e) {
    console.error("[auth/login] error:", e);
    return redirectConError(req, "No se pudo iniciar sesión. Intenta de nuevo.");
  }
}
