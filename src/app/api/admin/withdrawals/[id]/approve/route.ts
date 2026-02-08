import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  const isStaff = !!actor && (actor.roles.includes("ADMIN") || actor.roles.includes("ROOT"));
  if (!isStaff) return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const w = await prisma.withdrawalRequest.findUnique({ where: { id } });
  if (!w) return NextResponse.json({ ok: false, message: "No existe." }, { status: 404 });
  if (w.status !== "PENDING") {
    return NextResponse.json({ ok: false, message: "Solo puedes aprobar solicitudes pendientes." }, { status: 400 });
  }

  const updated = await prisma.withdrawalRequest.update({
    where: { id },
    data: {
      status: "APPROVED",
      reviewedByUserId: actor.id,
      reviewedAt: new Date(),
      rejectionReason: null,
    },
  });

  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "withdrawal_request.approve",
    entidadTipo: "withdrawal_request",
    entidadId: id,
    metadata: { amountCents: updated.amountCents, currency: updated.currency },
  });

  return NextResponse.json({ ok: true });
}

