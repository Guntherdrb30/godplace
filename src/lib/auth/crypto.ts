import crypto from "crypto";

export function generarTokenSesion(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashTokenSesion(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

