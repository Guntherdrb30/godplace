import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";

const schema = z.object({
  reason: z.string().trim().min(3).max(1000),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  const isStaff = !!actor && (actor.roles.includes("ADMIN") || actor.roles.includes("ROOT"));
  if (!isStaff) return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const w = await prisma.withdrawalRequest.findUnique({ where: { id } });
  if (!w) return NextResponse.json({ ok: false, message: "No existe." }, { status: 404 });
  if (!["PENDING", "APPROVED"].includes(w.status)) {
    return NextResponse.json({ ok: false, message: "No puedes rechazar en este estado." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Datos inválidos." }, { status: 400 });
  }

  await prisma.withdrawalRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewedByUserId: actor.id,
      reviewedAt: new Date(),
      rejectionReason: parsed.data.reason,
    },
  });

  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "withdrawal_request.reject",
    entidadTipo: "withdrawal_request",
    entidadId: id,
    metadata: { reason: parsed.data.reason },
  });

  return NextResponse.json({ ok: true });
}

