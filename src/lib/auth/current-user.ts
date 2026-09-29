import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { COOKIE_SESSION } from "./constants";
import { hashTokenSesion } from "./crypto";
import { dbDisponible } from "@/lib/db";
import { COOKIE_ACTIVE_TENANT } from "@/lib/tenancy/cookies";

export type CurrentUser = {
  id: string;
  email: string;
  nombre: string | null;
  roles: string[];
  allyProfileId: string | null;
  allyIsInternal: boolean;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantRole: string | null;
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
          tenantMemberships: {
            where: { isActive: true },
            include: { tenant: true },
          },
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
  const memberships = session.user.tenantMemberships.filter((m) => m.tenant.status === "ACTIVE");
  const requestedTenantId = jar.get(COOKIE_ACTIVE_TENANT)?.value || null;
  const activeMembership =
    (requestedTenantId
      ? memberships.find((m) => m.tenantId === requestedTenantId)
      : null) ||
    memberships.find((m) => m.tenant.isDefault) ||
    memberships[0] ||
    null;

  return {
    id: session.user.id,
    email: session.user.email,
    nombre: session.user.nombre ?? null,
    roles,
    allyProfileId:
      session.user.allyProfile && session.user.allyProfile.tenantId === activeMembership?.tenantId
        ? session.user.allyProfile.id
        : null,
    allyIsInternal:
      session.user.allyProfile?.tenantId === activeMembership?.tenantId
        ? session.user.allyProfile.isInternal
        : false,
    tenantId: activeMembership?.tenantId ?? null,
    tenantSlug: activeMembership?.tenant.slug ?? null,
    tenantRole: activeMembership?.role ?? null,
  };
}
