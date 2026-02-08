import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verificarRbacToken } from "@/lib/auth/rbac-token";
import { COOKIE_RBAC } from "@/lib/auth/constants";

const RUTAS_ADMIN = ["/admin"];
const RUTAS_ROOT = ["/root"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const esAdmin = RUTAS_ADMIN.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const esRoot = RUTAS_ROOT.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!esAdmin && !esRoot) return NextResponse.next();

  const token = req.cookies.get(COOKIE_RBAC)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  const payload = await verificarRbacToken(token);
  if (!payload) return NextResponse.redirect(new URL("/login", req.url));

  if (esRoot && !payload.roles.includes("ROOT")) {
    return NextResponse.redirect(new URL("/no-autorizado", req.url));
  }
  if (esAdmin && !(payload.roles.includes("ADMIN") || payload.roles.includes("ROOT"))) {
    return NextResponse.redirect(new URL("/no-autorizado", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/root/:path*"],
};

