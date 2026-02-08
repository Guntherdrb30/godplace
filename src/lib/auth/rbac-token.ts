import { SignJWT, jwtVerify } from "jose";
import { COOKIE_RBAC, SESSION_DAYS } from "./constants";

type RbacPayload = {
  userId: string;
  roles: string[];
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Falta AUTH_SECRET para firmar/verificar sesión.");
  return new TextEncoder().encode(secret);
}

export async function firmarRbacToken(payload: RbacPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + SESSION_DAYS * 24 * 60 * 60;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setSubject(payload.userId)
    .sign(secretKey());
}

export async function verificarRbacToken(
  token: string,
): Promise<RbacPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.userId !== "string") return null;
    const roles = Array.isArray(payload.roles)
      ? payload.roles.filter((r) => typeof r === "string")
      : [];
    return { userId: payload.userId, roles };
  } catch {
    return null;
  }
}

export function cookieRbac(): string {
  return COOKIE_RBAC;
}

