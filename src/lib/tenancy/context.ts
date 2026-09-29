import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth/current-user";

export function requireTenantId(user: CurrentUser): string {
  if (!user.tenantId) {
    throw new Error("El usuario no tiene un tenant activo.");
  }
  return user.tenantId;
}

export async function assertPropertyInTenant(input: {
  propertyId: string;
  tenantId: string;
}) {
  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, tenantId: input.tenantId },
  });
  if (!property) throw new Error("Propiedad no encontrada en el tenant activo.");
  return property;
}

export async function assertAllyProfileInTenant(input: {
  allyProfileId: string;
  tenantId: string;
}) {
  const allyProfile = await prisma.allyProfile.findFirst({
    where: { id: input.allyProfileId, tenantId: input.tenantId },
  });
  if (!allyProfile) throw new Error("Perfil no encontrado en el tenant activo.");
  return allyProfile;
}
