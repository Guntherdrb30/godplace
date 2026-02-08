import { cookies } from "next/headers";
import { COOKIE_RBAC } from "./constants";

export async function setCookieRbac(token: string, expiresAt: Date) {
  const jar = await cookies();
  jar.set(COOKIE_RBAC, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearCookieRbac() {
  const jar = await cookies();
  jar.set(COOKIE_RBAC, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

