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
  tipoCuenta: z.enum(["CLIENTE", "ALIADO"]).default("CLIENTE"),
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
    tipoCuenta: String(form.get("tipoCuenta") || "")
      .toUpperCase()
      .trim() || undefined,
  });
  if (!parsed.success) return redirectConError(req, "Datos inválidos.");

  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const user = await prisma.$transaction(async (tx) => {
      // En producción, `prisma db seed` puede no ejecutarse. Para que el registro funcione
      // siempre, garantizamos roles base de forma idempotente.
      const roleCliente = await tx.role.upsert({
        where: { code: "CLIENTE" },
        update: { nombre: "CLIENTE" },
        create: { code: "CLIENTE", nombre: "CLIENTE" },
      });

      const rolesCreate: { roleId: string }[] = [{ roleId: roleCliente.id }];

      let allyProfile:
        | {
            create: {
              status: "PENDING_KYC";
              isInternal: false;
              wallet: { create: Record<string, never> };
            };
          }
        | undefined;

      if (parsed.data.tipoCuenta === "ALIADO") {
        const roleAliado = await tx.role.upsert({
          where: { code: "ALIADO" },
          update: { nombre: "ALIADO" },
          create: { code: "ALIADO", nombre: "ALIADO" },
        });
        rolesCreate.push({ roleId: roleAliado.id });
        allyProfile = {
          create: {
            status: "PENDING_KYC",
            isInternal: false,
            wallet: { create: {} },
          },
        };
      }

      return tx.user.create({
        data: {
          email: parsed.data.email,
          nombre: parsed.data.nombre,
          passwordHash,
          roles: { create: rolesCreate },
          allyProfile,
        },
        include: { roles: { include: { role: true } }, allyProfile: true },
      });
    });

    const roles = user.roles.map((ur) => ur.role.code);
    const { token, expiresAt } = await crearSesion(user.id);
    await setCookieSesion(token, expiresAt);
    const rbac = await firmarRbacToken({ userId: user.id, roles });
    await setCookieRbac(rbac, expiresAt);

    const nextUrl = parsed.data.tipoCuenta === "ALIADO" ? "/aliado/kyc" : "/";
    return NextResponse.redirect(new URL(nextUrl, req.url), { status: 303 });
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e && typeof (e as { code?: unknown }).code === "string"
        ? String((e as { code?: unknown }).code)
        : null;
    const msg = code === "P2002" ? "Ese correo ya está registrado." : "No se pudo crear la cuenta.";
    return redirectConError(req, msg);
  }
}
