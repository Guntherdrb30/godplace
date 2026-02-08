import { redirect } from "next/navigation";
import { getCurrentUser } from "./current-user";

export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireRole(rolesPermitidos: string[]) {
  const u = await requireUser();
  const ok = rolesPermitidos.some((r) => u.roles.includes(r));
  if (!ok) redirect("/no-autorizado");
  return u;
}

