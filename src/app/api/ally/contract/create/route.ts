import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";

const schema = z.object({
  url: z.string().url(),
  pathname: z.string().min(1),
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

  const prev = await prisma.allyContract.findUnique({
    where: { allyProfileId: user.allyProfileId },
    select: { id: true, pathname: true, status: true },
  });

  if (prev?.status === "APPROVED") {
    return NextResponse.json({ ok: false, message: "Tu contrato ya fue aprobado. Contacta soporte para cambios." }, { status: 400 });
  }

  const c = await prisma.allyContract.upsert({
    where: { allyProfileId: user.allyProfileId },
    update: {
      url: parsed.data.url,
      pathname: parsed.data.pathname,
      status: "PENDING",
      notasAdmin: null,
    },
    create: {
      allyProfileId: user.allyProfileId,
      url: parsed.data.url,
      pathname: parsed.data.pathname,
      status: "PENDING",
    },
  });

  await prisma.allyProfile.update({
    where: { id: user.allyProfileId },
    data: { onboardingSubmittedAt: new Date() },
  });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "ally_contract.upsert",
    entidadTipo: "ally_contract",
    entidadId: c.id,
    metadata: { prevPathname: prev?.pathname || null },
  });

  return NextResponse.json({ ok: true, id: c.id, prevPathname: prev?.pathname || null });
}

