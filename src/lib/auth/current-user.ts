import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { COOKIE_SESSION } from "./constants";
import { hashTokenSesion } from "./crypto";
import { dbDisponible } from "@/lib/db";

export type CurrentUser = {
  id: string;
  email: string;
  nombre: string | null;
  roles: string[];
  allyProfileId: string | null;
  allyIsInternal: boolean;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!dbDisponible()) return null;
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSION)?.value;
  if (!token) return null;

  const tokenHash = hashTokenSesion(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          roles: { include: { role: true } },
          allyProfile: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({ where: { tokenHash } });
    return null;
  }

  if (session.user.status !== "ACTIVE") return null;

  const roles = session.user.roles.map((ur) => ur.role.code);
  return {
    id: session.user.id,
    email: session.user.email,
    nombre: session.user.nombre ?? null,
    roles,
    allyProfileId: session.user.allyProfile?.id ?? null,
    allyIsInternal: session.user.allyProfile?.isInternal ?? false,
  };
}
