import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { COOKIE_SESSION, SESSION_DAYS } from "./constants";
import { generarTokenSesion, hashTokenSesion } from "./crypto";

export function cookieSesion(): string {
  return COOKIE_SESSION;
}

export async function crearSesion(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = generarTokenSesion();
  const tokenHash = hashTokenSesion(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function eliminarSesionPorToken(token: string): Promise<void> {
  const tokenHash = hashTokenSesion(token);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

export async function eliminarSesionesDeUsuario(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function setCookieSesion(token: string, expiresAt: Date) {
  const jar = await cookies();
  jar.set(COOKIE_SESSION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearCookieSesion() {
  const jar = await cookies();
  jar.set(COOKIE_SESSION, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

