import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function registrarAuditoria(input: {
  tenantId?: string | null;
  actorUserId?: string | null;
  accion: string;
  entidadTipo?: string;
  entidadId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const h = await headers();
  const ip = h.get("x-forwarded-for") || h.get("x-real-ip") || undefined;
  const userAgent = h.get("user-agent") || undefined;

  const tenantId =
    input.tenantId ??
    (input.actorUserId
      ? (
          await prisma.tenantMembership.findFirst({
            where: {
              userId: input.actorUserId,
              isActive: true,
              tenant: { status: "ACTIVE" },
            },
            include: { tenant: true },
            orderBy: { createdAt: "asc" },
          })
        )?.tenantId ?? null
      : null);

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: input.actorUserId ?? null,
      accion: input.accion,
      entidadTipo: input.entidadTipo,
      entidadId: input.entidadId,
      metadata: input.metadata ?? undefined,
      ip,
      userAgent,
    },
  });
}
