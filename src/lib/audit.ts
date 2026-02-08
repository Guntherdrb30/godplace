import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function registrarAuditoria(input: {
  actorUserId?: string | null;
  accion: string;
  entidadTipo?: string;
  entidadId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const h = await headers();
  const ip = h.get("x-forwarded-for") || h.get("x-real-ip") || undefined;
  const userAgent = h.get("user-agent") || undefined;

  await prisma.auditLog.create({
    data: {
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
