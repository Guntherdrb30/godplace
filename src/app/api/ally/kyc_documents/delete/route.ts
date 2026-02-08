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

  const doc = await prisma.kycDocument.findUnique({ where: { id: parsed.data.id } });
  if (!doc || doc.allyProfileId !== user.allyProfileId) {
    return NextResponse.json({ ok: false, message: "No existe." }, { status: 404 });
  }

  await prisma.kycDocument.delete({ where: { id: doc.id } });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "kyc_document.delete",
    entidadTipo: "kyc_document",
    entidadId: doc.id,
    metadata: { pathname: doc.pathname },
  });

  return NextResponse.json({ ok: true, pathname: doc.pathname });
}

