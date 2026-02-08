import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_SESSION } from "@/lib/auth/constants";
import { eliminarSesionPorToken, clearCookieSesion } from "@/lib/auth/sessions";
import { clearCookieRbac } from "@/lib/auth/rbac-cookie";

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSION)?.value;
  if (token) await eliminarSesionPorToken(token);
  await clearCookieSesion();
  await clearCookieRbac();
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}

