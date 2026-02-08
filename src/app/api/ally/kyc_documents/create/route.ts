import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";

const schema = z.object({
  type: z.enum(["CEDULA", "RIF", "SELFIE_CEDULA", "PROPIEDAD_O_PODER"]),
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

  const doc = await prisma.kycDocument.create({
    data: {
      allyProfileId: user.allyProfileId,
      type: parsed.data.type,
      url: parsed.data.url,
      pathname: parsed.data.pathname,
      status: "PENDING",
    },
  });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "kyc_document.create",
    entidadTipo: "kyc_document",
    entidadId: doc.id,
    metadata: { type: doc.type },
  });

  return NextResponse.json({ ok: true, id: doc.id });
}

