import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";

const schema = z.object({
  id: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("ALIADO") || !user.allyProfileId) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Datos inválidos." }, { status: 400 });
  }

  const c = await prisma.allyContract.findUnique({ where: { id: parsed.data.id } });
  if (!c || c.allyProfileId !== user.allyProfileId) {
    return NextResponse.json({ ok: false, message: "No existe." }, { status: 404 });
  }
  if (c.status !== "PENDING") {
    return NextResponse.json({ ok: false, message: "Solo puedes eliminar contratos pendientes." }, { status: 400 });
  }

  await prisma.allyContract.delete({ where: { id: c.id } });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "ally_contract.delete",
    entidadTipo: "ally_contract",
    entidadId: c.id,
    metadata: { pathname: c.pathname },
  });

  return NextResponse.json({ ok: true, pathname: c.pathname });
}

